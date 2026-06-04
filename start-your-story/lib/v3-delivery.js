// ══════════════════════════════════════════════════════════════
// Start Your Story v3 — delivery layer (Phase 2.3)
// POST /api/v3/complete → playbook email (player) + lead notification
// (Dustin) + Notion save (dual labels) + day-30 re-mirror email.
// ══════════════════════════════════════════════════════════════

const esc = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';

// Tier heuristic (v3 interim — until tier recommendation joins the prompt suite)
function tierHeuristic(player) {
  const v = (player.vocation || '').toLowerCase();
  const online = (player.onlinePresence || {}).baseline || 'not_yet';
  if (v.includes('founder') || v.includes('ceo') || v.includes('executive'))
    return (online === 'regularly' || online === 'occasionally') ? 'Fractional Brand Partner' : 'Leader Sprint';
  if (v.includes('consultant') || v.includes('fractional')) return 'Leader Sprint';
  return 'Game only';
}

// ── Email building blocks (light theme — email clients hate dark) ──
const H = {
  open: (title) => `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f1f8;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <div style="background:linear-gradient(135deg,#7B2FBE,#C724B1);border-radius:6px 6px 0 0;padding:34px 32px;text-align:center;">
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.75);margin-bottom:8px;">Start Your Story · Unicorn for Leaders</div>
      <div style="font-size:30px;font-weight:800;color:#fff;line-height:1.15;">${title}</div>
    </div>
    <div style="background:#ffffff;border-radius:0 0 6px 6px;padding:32px;">`,
  close: () => `<div style="margin-top:34px;padding-top:18px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#999;">
      Made with Start Your Story — <a href="https://unicornunited.co" style="color:#7B2FBE;">unicornunited.co</a></div>
    </div></div></body></html>`,
  kicker: t => `<div style="font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#C724B1;font-weight:700;margin:26px 0 8px;">${t}</div>`,
  h2: t => `<div style="font-size:17px;font-weight:700;color:#1A0A2E;margin:4px 0 6px;">${t}</div>`,
  p: t => `<p style="font-size:14px;line-height:1.7;color:#42375a;margin:0 0 10px;">${t}</p>`,
  quote: t => `<div style="border-left:3px solid #C724B1;padding:10px 16px;background:#faf7fd;font-size:14px;line-height:1.65;color:#42375a;margin:8px 0 14px;">${t}</div>`,
  hr: () => `<div style="height:1px;background:#eee;margin:24px 0;"></div>`,
};

function buildPlaybookEmail({ playerName, coinedName, blend, revealLine, quad, coaching, contentLens, roleModels, personalised, weeklyTitles }) {
  let h = H.open(`The playbook of<br>${esc(coinedName)}`);
  h += H.p(`${esc(playerName)} — this is the playbook you composed. <strong>${esc(blend.primary)} × ${esc(blend.secondary)} × ${esc(blend.tertiary)}</strong>. ${esc(revealLine || '')}`);

  if (quad) {
    h += H.kicker('Your four quadrants');
    h += H.p(`<strong>Light.</strong> ${esc(quad.lightExpression)}`);
    h += H.p(`<strong>Shadow.</strong> ${esc(quad.shadowIntegration)}`);
    h += H.p(`<strong>Dark.</strong> ${esc(quad.darkReflection)}`);
    h += H.p(`<strong>Source.</strong> ${esc(quad.sourceSymbol)}`);
  }

  if (coaching) {
    h += H.hr() + H.kicker('Coaching lens — what to work on');
    (coaching.development_areas || []).forEach(d => {
      h += H.h2(esc(d.title)) + H.p(`${esc(d.why)}<br><em>This week:</em> ${esc(d.first_action)}`);
    });
    if (coaching.boss_monster) {
      h += H.kicker('Your headwind') + H.h2(esc(coaching.boss_monster.name));
      h += H.p((coaching.boss_monster.counter_moves || []).map(m => '— ' + esc(m)).join('<br>'));
    }
    if ((coaching.books_or_thinkers || []).length) {
      h += H.kicker('Read next');
      coaching.books_or_thinkers.forEach(t => { h += H.p(`<strong>${esc(t.name)}</strong> — ${esc(t.work)}. Start with: ${esc(t.first_thing_to_read)}. <span style="color:#8a7fa8;">${esc(t.why_for_this_player)}</span>`); });
    }
    if (coaching.coaching_question) h += H.kicker('Bring to your next 1:1') + H.quote(esc(coaching.coaching_question));
  }

  if (contentLens) {
    h += H.hr() + H.kicker('Content lens — what to say, where, when');
    (contentLens.content_territories || []).forEach(t => { h += H.h2(esc(t.title)) + H.p(esc(t.framing)); });
    if ((contentLens.hook_patterns || []).length) {
      h += H.kicker('Your openers');
      contentLens.hook_patterns.forEach(hp => { h += H.quote('“' + esc(hp.example_filled_in) + '”'); });
    }
    if (contentLens.weekly_rhythm) h += H.kicker('Your rhythm') + H.p(`${esc(contentLens.weekly_rhythm.cadence)} — ${esc(contentLens.weekly_rhythm.format)}`);
    if (contentLens.next_seven_days_piece) {
      const n = contentLens.next_seven_days_piece;
      h += H.kicker(`Publish by ${esc(n.publish_by)}`) + H.h2(esc(n.topic));
      h += H.p(`${esc(n.angle)}<br><em>First line:</em> “${esc(n.first_line_hook)}”<br><span style="color:#8a7fa8;">For: ${esc(n.for_whom)} · ${esc(n.structure_note)}</span>`);
    }
  }

  if (roleModels && (roleModels.selections || []).length) {
    h += H.hr() + H.kicker('Three kindred spirits');
    roleModels.selections.forEach(s => { h += H.h2(`${esc(s.name)} <span style="font-weight:400;color:#8a7fa8;font-size:12px;">· ${esc(s.from_quest)}</span>`) + H.p(esc(s.why_for_this_player)); });
  }

  if ((personalised || []).length) {
    h += H.hr() + H.kicker('Your daily reps — anchored to your real routines');
    personalised.forEach(p => { h += H.h2(esc(p.title)) + H.p(`${esc(p.anchor)} ${esc(p.rep)}<br><em>${esc(p.reinforce)}</em>`); });
  }
  if ((weeklyTitles || []).length) {
    h += H.kicker('Your weekly practice' + (weeklyTitles.length > 1 ? 's' : ''));
    weeklyTitles.forEach(w => { h += H.p('— ' + esc(w)); });
  }

  h += H.hr() + H.p(`<strong>In 30 days we'll check back in.</strong> One small email: which reps actually happened, what you noticed, and whether the blend still fits. Identity is what you rep — see you then.`);
  h += H.close();
  return h;
}

function buildReMirrorEmail({ playerName, coinedName, blend }) {
  let h = H.open('30 days as<br>' + esc(coinedName));
  h += H.p(`${esc(playerName)} — a month ago you composed your playbook as <strong>${esc(coinedName)}</strong> (${esc(blend.primary)} × ${esc(blend.secondary)} × ${esc(blend.tertiary)}). Two minutes, three questions:`);
  h += H.quote('1. Which rep actually happened — even once?');
  h += H.quote('2. What did you notice when it did?');
  h += H.quote('3. Does the name still fit — or has a month of reps tilted the blend?');
  h += H.p(`Hit reply with your answers, or replay the quick version to re-test the blend: <a href="https://unicornunited.co/start-your-story/v3.html" style="color:#7B2FBE;font-weight:700;">re-run the mirror →</a>`);
  h += H.p(`<span style="color:#8a7fa8;">Development without feedback is task-listing. This is the feedback.</span>`);
  h += H.close();
  return h;
}

function buildV3LeadNotification({ playerName, email, player, coinedName, blend, tier }) {
  let h = H.open('New v3 completion');
  h += H.p(`<strong>${esc(playerName)}</strong> (${esc(email)}) just completed Personal Mode v3.`);
  h += H.p(`<strong>Coined name:</strong> ${esc(coinedName)}<br><strong>Blend:</strong> ${esc(blend.primary)} × ${esc(blend.secondary)} × ${esc(blend.tertiary)}<br><strong>Vocation:</strong> ${esc(player.vocation || '—')} ${esc(player.vocationContext ? '— ' + player.vocationContext : '')}<br><strong>Online baseline:</strong> ${esc((player.onlinePresence||{}).baseline || '—')}<br><strong>Suggested tier:</strong> ${esc(tier)}`);
  h += H.close();
  return h;
}

// ── Notion (schema-safe: only properties the personal DB already has) ──
const nP = t => ({ object:'block', type:'paragraph', paragraph:{ rich_text:[{ type:'text', text:{ content:(t||'').slice(0,1900) } }] } });
const nH = (l,t) => ({ object:'block', type:'heading_'+l, ['heading_'+l]:{ rich_text:[{ type:'text', text:{ content:(t||'').slice(0,200) } }] } });
const nDiv = () => ({ object:'block', type:'divider', divider:{} });

function buildV3NotionChildren({ coinedName, blend, quad, coaching, contentLens, roleModels, personalised, recalibration }) {
  const blocks = [];
  blocks.push(nH(1, `${coinedName} — ${blend.primary} × ${blend.secondary} × ${blend.tertiary}`));
  blocks.push(nP(`Structured blend (for aggregation): ${blend.primary}|${blend.secondary}|${blend.tertiary}. Calibration: ${JSON.stringify(recalibration || {})}`));
  if (quad) {
    blocks.push(nH(2, 'Four quadrants'));
    blocks.push(nP('Light: ' + quad.lightExpression));
    blocks.push(nP('Shadow: ' + quad.shadowIntegration));
    blocks.push(nP('Dark: ' + quad.darkReflection));
    blocks.push(nP('Source: ' + quad.sourceSymbol));
  }
  if (coaching) {
    blocks.push(nDiv(), nH(2, 'Coaching Lens'));
    (coaching.development_areas || []).forEach(d => blocks.push(nP(`${d.title} — ${d.why} This week: ${d.first_action}`)));
    if (coaching.boss_monster) blocks.push(nP(`Headwind: ${coaching.boss_monster.name}. Counters: ${(coaching.boss_monster.counter_moves||[]).join(' / ')}`));
    (coaching.books_or_thinkers || []).forEach(t => blocks.push(nP(`Read: ${t.name} — ${t.work} (${t.first_thing_to_read})`)));
    if (coaching.coaching_question) blocks.push(nP('1:1 question: ' + coaching.coaching_question));
  }
  if (contentLens) {
    blocks.push(nDiv(), nH(2, 'Content Lens'));
    (contentLens.content_territories || []).forEach(t => blocks.push(nP(`${t.title} — ${t.framing}`)));
    if (contentLens.weekly_rhythm) blocks.push(nP(`Rhythm: ${contentLens.weekly_rhythm.cadence} — ${contentLens.weekly_rhythm.format}`));
    if (contentLens.next_seven_days_piece) blocks.push(nP(`Next 7 days: ${contentLens.next_seven_days_piece.topic} — ${contentLens.next_seven_days_piece.angle} First line: ${contentLens.next_seven_days_piece.first_line_hook}`));
  }
  if (roleModels && (roleModels.selections || []).length) {
    blocks.push(nDiv(), nH(2, 'Role models'));
    roleModels.selections.forEach(s => blocks.push(nP(`${s.name} (${s.from_quest}) — ${s.why_for_this_player}`)));
  }
  if ((personalised || []).length) {
    blocks.push(nDiv(), nH(2, 'Personalised reps'));
    personalised.forEach(p => blocks.push(nP(`${p.title}: ${p.anchor} ${p.rep} ${p.reinforce}`)));
  }
  return blocks.slice(0, 95); // Notion children cap
}

// ── Route registration ──
function registerV3Delivery(app, { ResendCtor, resendKey, notifyEmail, notion, personalDbId, knownTiers, rateCheck }) {
  app.post('/api/v3/complete', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!rateCheck(ip)) return res.status(429).json({ error: 'Too many requests.' });

    const { email, player, playbook } = req.body || {};
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'A valid email is needed to send the playbook.' });
    if (!player || !playbook || !playbook.blend || !playbook.coinedName) return res.status(400).json({ error: 'Missing player or playbook.' });
    if (!resendKey) return res.status(500).json({ error: 'Email not configured on the server.' });

    const resend = new ResendCtor(resendKey);
    const tier = tierHeuristic(player);
    const { coinedName, blend } = playbook;
    const result = { sent: false, notified: false, notion: false, remirror: false };

    // 1. Playbook email to the player
    try {
      await resend.emails.send({
        from: 'Start your Story <results@unicornunited.co>',
        to: email,
        subject: `The playbook of ${coinedName}`,
        html: buildPlaybookEmail({ playerName: player.playerName, coinedName, blend, revealLine: playbook.revealLine, quad: playbook.quad, coaching: playbook.coaching, contentLens: playbook.contentLens, roleModels: playbook.roleModels, personalised: playbook.personalised, weeklyTitles: playbook.weeklyTitles }),
      });
      result.sent = true;
    } catch (e) { console.error('v3 playbook email failed:', e?.message); }

    // 2. Lead notification
    if (notifyEmail) {
      try {
        await resend.emails.send({
          from: 'Start your Story <results@unicornunited.co>',
          to: notifyEmail,
          subject: `v3 completion: ${player.playerName} — ${coinedName} (${tier})`,
          html: buildV3LeadNotification({ playerName: player.playerName, email, player, coinedName, blend, tier }),
        });
        result.notified = true;
      } catch (e) { console.error('v3 lead notification failed:', e?.message); }
    }

    // 3. Notion save — dual labels (coined name + structured blend)
    if (notion && personalDbId) {
      try {
        const properties = {
          'Player Name': { title: [{ text: { content: player.playerName || 'Unknown' } }] },
          'Archetype': { rich_text: [{ text: { content: `${coinedName} (${blend.primary}×${blend.secondary}×${blend.tertiary})` } }] },
          'POV': { rich_text: [{ text: { content: (playbook.revealLine || '').slice(0, 2000) } }] },
          'Status': { select: { name: 'New' } },
          'Email': { email },
        };
        if (knownTiers && knownTiers.has(tier)) properties['Recommended Tier'] = { select: { name: tier } };
        await notion.pages.create({ parent: { database_id: personalDbId }, properties, children: buildV3NotionChildren(playbook) });
        result.notion = true;
      } catch (e) { console.error('v3 Notion save failed:', e?.message); }
    }

    // 4. Day-30 re-mirror — scheduled via Resend (29 days, inside the
    // scheduling window). Soft feature: failure never blocks completion.
    try {
      const when = new Date(Date.now() + 29 * 24 * 3600 * 1000).toISOString();
      await resend.emails.send({
        from: 'Start your Story <results@unicornunited.co>',
        to: email,
        subject: `30 days as ${coinedName} — two minutes, three questions`,
        html: buildReMirrorEmail({ playerName: player.playerName, coinedName, blend }),
        scheduledAt: when,
      });
      result.remirror = true;
    } catch (e) { console.error('v3 re-mirror scheduling failed (non-fatal):', e?.message); }

    res.json({ ok: result.sent, ...result });
  });
}

module.exports = { registerV3Delivery, buildPlaybookEmail, buildReMirrorEmail, buildV3NotionChildren, tierHeuristic };
