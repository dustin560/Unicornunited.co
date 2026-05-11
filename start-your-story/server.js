// ═══════════════════════════════════════════════════════════════
// Start your Story — Lightweight API Proxy + Email
// Keeps the Claude API key server-side. Players never see it.
// ═══════════════════════════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const path = require('path');
const { Resend } = require('resend');
const { Client: NotionClient } = require('@notionhq/client');

const app = express();
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Config ──
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.MODEL || 'claude-haiku-4-5-20251001';
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || '1024', 10);
const PORT = process.env.PORT || 3000;
const RESEND_KEY = process.env.RESEND_API_KEY || '';
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || ''; // Your email for lead notifications
const NOTION_KEY = process.env.NOTION_API_KEY || '';
const NOTION_DB_ID = process.env.NOTION_GAME_COMPLETIONS_DB_ID || '';
const notion = NOTION_KEY ? new NotionClient({ auth: NOTION_KEY }) : null;

// ── Basic rate limiting (per IP) ──
const rateMap = new Map();
const RATE_WINDOW = 60_000;   // 1 minute
const RATE_LIMIT = 20;        // max requests per window

function rateCheck(ip) {
  const now = Date.now();
  let entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    entry = { start: now, count: 0 };
    rateMap.set(ip, entry);
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// Clean up rate entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW;
  rateMap.forEach((v, k) => { if (v.start < cutoff) rateMap.delete(k); });
}, 5 * 60_000);

// ── AI Proxy Endpoint ──
app.post('/api/ai', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!rateCheck(ip)) {
    return res.status(429).json({ error: 'Too many requests — please slow down.' });
  }
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server API key not configured.' });
  }

  const { system, prompt, max_tokens } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: Math.min(max_tokens || MAX_TOKENS, 2048),
        system: system || '',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) {
      return res.status(502).json({ error: data.error.message });
    }
    const text = data.content?.[0]?.text || '';
    res.json({ text });

  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Claude API.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// EMAIL — Send Brand World results + notify Dustin
// ═══════════════════════════════════════════════════════════════
app.post('/api/send-results', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!rateCheck(ip)) {
    return res.status(429).json({ error: 'Too many requests.' });
  }

  if (!RESEND_KEY) {
    return res.status(500).json({ error: 'Email not configured.' });
  }

  const { email, playerName, brandName, company, brandWorld, archetype, sourceArchetypes, quadrant, values, manifesto, moodSelections, brandWords } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required.' });
  }

  const resend = new Resend(RESEND_KEY);
  const bw = brandWorld || {};
  const vals = values || { foundation: [], current: [], constellation: [] };
  const man = manifesto || {};

  // ── Build the styled HTML email ──
  const playerEmail = buildResultsEmail({
    playerName, brandName, company, bw, archetype,
    sourceArchetypes, quadrant, vals, man,
    moodSelections, brandWords
  });

  // ── Persist completion to Notion (non-blocking — never block the email) ──
  saveCompletionToNotion({
    email, playerName, brandName, company, brandWorld: bw,
    archetype, sourceArchetypes, quadrant, values: vals,
    manifesto: man, brandWords
  }).catch(err => console.error('Notion save error:', err?.message || err));

  try {
    // 1. Send results to the player
    await resend.emails.send({
      from: 'Start your Story <results@unicornunited.co>',
      to: email,
      subject: `${brandName} — Your Brand World`,
      html: playerEmail
    });

    // 2. Notify Dustin about the new lead (if configured)
    if (NOTIFY_EMAIL) {
      await resend.emails.send({
        from: 'Start your Story <results@unicornunited.co>',
        to: NOTIFY_EMAIL,
        subject: `New Game Lead: ${playerName} — ${brandName}`,
        html: buildLeadNotification({ playerName, brandName, company, email, quadrant, archetype, sourceArchetypes })
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Email error:', err);
    res.status(502).json({ error: 'Failed to send email.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

function buildResultsEmail({ playerName, brandName, bw, archetype, sourceArchetypes, quadrant, vals, man, moodSelections, brandWords }) {
  const allValues = [...(vals.foundation || []), ...(vals.current || []), ...(vals.constellation || [])];

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0818;font-family:'Helvetica Neue',Arial,sans-serif;color:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0818;">
<tr><td align="center" style="padding:40px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="text-align:center;padding:30px 0;">
    <div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(248,240,255,.35);margin-bottom:12px;">A Unicorn Workshop Experience</div>
    <h1 style="font-size:32px;font-weight:800;margin:0;letter-spacing:-1px;background:linear-gradient(90deg,#7B2FBE,#C724B1,#E84D8A);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Start your Story</h1>
  </td></tr>

  <!-- Story Opening -->
  <tr><td style="padding:30px;background:#170d2a;border:1px solid rgba(123,47,190,.15);margin-bottom:16px;">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C724B1;margin-bottom:10px;">Your Brand World</div>
    <h2 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">${esc(brandName)}</h2>
    <p style="font-size:15px;line-height:1.7;color:rgba(248,240,255,.7);margin:0;">${esc(bw.story_opening || '')}</p>
  </td></tr>

  <tr><td style="height:16px;"></td></tr>

  ${archetype ? `
  <!-- Archetype -->
  <tr><td style="padding:24px 30px;background:#1e1136;border:1px solid rgba(123,47,190,.12);">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C724B1;margin-bottom:12px;">Your Archetype</div>
    <h3 style="font-size:20px;font-weight:800;margin:0 0 4px;">${esc(archetype.name)}</h3>
    <div style="font-size:12px;font-weight:600;color:#E84D8A;margin-bottom:8px;">${esc(archetype.territory || '')}</div>
    <p style="font-size:14px;line-height:1.65;color:rgba(248,240,255,.6);margin:0 0 12px;">${esc(archetype.desc || '')}</p>
    <div style="font-size:11px;color:rgba(248,240,255,.3);"><strong style="color:rgba(248,240,255,.45);">Shadow:</strong> ${esc(archetype.shadow || '')}</div>
    ${sourceArchetypes && sourceArchetypes.length ? `<div style="font-size:11px;color:rgba(248,240,255,.2);margin-top:8px;">Forged from ${sourceArchetypes.map(n => esc(n)).join(' + ')}</div>` : ''}
  </td></tr>
  <tr><td style="height:16px;"></td></tr>
  ` : ''}

  <!-- Brand Positioning -->
  <tr><td style="padding:24px 30px;background:#170d2a;border:1px solid rgba(123,47,190,.15);">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C724B1;margin-bottom:10px;">Brand Positioning</div>
    <p style="font-size:16px;font-weight:600;line-height:1.6;color:rgba(248,240,255,.85);margin:0;">${esc(bw.positioning || '')}</p>
  </td></tr>

  <tr><td style="height:16px;"></td></tr>

  <!-- Know Believe Act -->
  <tr><td style="padding:24px 30px;background:#1e1136;border:1px solid rgba(123,47,190,.12);">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C724B1;margin-bottom:14px;">Know → Believe → Act</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:10px 12px;background:rgba(123,47,190,.06);border-left:3px solid #7B2FBE;margin-bottom:8px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#7B2FBE;margin-bottom:4px;">KNOW</div>
          <div style="font-size:13px;color:rgba(248,240,255,.65);line-height:1.5;">${esc(bw.know || '')}</div>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:10px 12px;background:rgba(199,36,177,.04);border-left:3px solid #C724B1;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#C724B1;margin-bottom:4px;">BELIEVE</div>
          <div style="font-size:13px;color:rgba(248,240,255,.65);line-height:1.5;">${esc(bw.believe || '')}</div>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:10px 12px;background:rgba(232,77,138,.04);border-left:3px solid #E84D8A;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#E84D8A;margin-bottom:4px;">ACT</div>
          <div style="font-size:13px;color:rgba(248,240,255,.65);line-height:1.5;">${esc(bw.act || '')}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="height:16px;"></td></tr>

  <!-- Core Manifesto -->
  <tr><td style="padding:24px 30px;background:#170d2a;border:1px solid rgba(123,47,190,.15);">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C724B1;margin-bottom:14px;">Core Manifesto</div>
    <div style="margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;color:#E84D8A;margin-bottom:4px;">WHY</div>
      <p style="font-size:14px;line-height:1.65;color:rgba(248,240,255,.7);margin:0;">${esc(bw.manifesto_why || man.why || '')}</p>
    </div>
    <div style="margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;color:#C724B1;margin-bottom:4px;">HOW</div>
      <p style="font-size:14px;line-height:1.65;color:rgba(248,240,255,.7);margin:0;">${esc(bw.manifesto_how || man.how || '')}</p>
    </div>
    <div>
      <div style="font-size:11px;font-weight:700;color:#7B2FBE;margin-bottom:4px;">WHAT</div>
      <p style="font-size:14px;line-height:1.65;color:rgba(248,240,255,.7);margin:0;">${esc(bw.manifesto_what || man.what || '')}</p>
    </div>
  </td></tr>

  <tr><td style="height:16px;"></td></tr>

  <!-- Values + Personality -->
  <tr><td style="padding:24px 30px;background:#1e1136;border:1px solid rgba(123,47,190,.12);">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C724B1;margin-bottom:10px;">Values Profile</div>
    <div style="margin-bottom:14px;">
      ${allValues.map(v => `<span style="display:inline-block;padding:4px 12px;margin:3px 4px 3px 0;font-size:12px;font-weight:600;color:rgba(248,240,255,.6);background:rgba(123,47,190,.1);border:1px solid rgba(123,47,190,.15);border-radius:2px;">${esc(v)}</span>`).join('')}
    </div>
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C724B1;margin-bottom:8px;">Brand Personality</div>
    <p style="font-size:14px;color:rgba(248,240,255,.6);margin:0;">${esc(bw.personality || '')}</p>
    ${brandWords && brandWords.length ? `
    <div style="margin-top:10px;">
      ${brandWords.map(w => `<span style="display:inline-block;padding:4px 12px;margin:3px 4px 3px 0;font-size:12px;font-weight:600;color:rgba(248,240,255,.5);background:rgba(199,36,177,.06);border:1px solid rgba(199,36,177,.1);border-radius:2px;">${esc(w)}</span>`).join('')}
    </div>` : ''}
  </td></tr>

  <tr><td style="height:16px;"></td></tr>

  <!-- Visual Brand World -->
  <tr><td style="padding:24px 30px;background:#170d2a;border:1px solid rgba(123,47,190,.15);">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C724B1;margin-bottom:14px;">Visual Brand World</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding:10px;vertical-align:top;">
          <div style="font-size:10px;font-weight:700;color:rgba(248,240,255,.3);letter-spacing:1px;margin-bottom:4px;">SHAPES</div>
          <div style="font-size:13px;color:rgba(248,240,255,.6);line-height:1.5;">${esc(bw.visual_shapes || '')}</div>
        </td>
        <td width="50%" style="padding:10px;vertical-align:top;">
          <div style="font-size:10px;font-weight:700;color:rgba(248,240,255,.3);letter-spacing:1px;margin-bottom:4px;">IMAGERY</div>
          <div style="font-size:13px;color:rgba(248,240,255,.6);line-height:1.5;">${esc(bw.visual_imagery || '')}</div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding:10px;vertical-align:top;">
          <div style="font-size:10px;font-weight:700;color:rgba(248,240,255,.3);letter-spacing:1px;margin-bottom:4px;">MOTION</div>
          <div style="font-size:13px;color:rgba(248,240,255,.6);line-height:1.5;">${esc(bw.visual_motion || '')}</div>
        </td>
        <td width="50%" style="padding:10px;vertical-align:top;">
          <div style="font-size:10px;font-weight:700;color:rgba(248,240,255,.3);letter-spacing:1px;margin-bottom:4px;">TEXTURE</div>
          <div style="font-size:13px;color:rgba(248,240,255,.6);line-height:1.5;">${esc(bw.visual_texture || '')}</div>
        </td>
      </tr>
    </table>
    <div style="margin-top:12px;padding:12px;background:rgba(199,36,177,.04);border:1px solid rgba(199,36,177,.08);text-align:center;">
      <div style="font-size:10px;font-weight:700;color:rgba(248,240,255,.3);letter-spacing:1px;margin-bottom:4px;">EXPERIENCE</div>
      <div style="font-size:14px;color:rgba(248,240,255,.6);line-height:1.6;font-style:italic;">${esc(bw.visual_experience || '')}</div>
    </div>
  </td></tr>

  <tr><td style="height:16px;"></td></tr>

  <!-- Brand Associations -->
  ${bw.associations && bw.associations.length ? `
  <tr><td style="padding:24px 30px;background:#1e1136;border:1px solid rgba(123,47,190,.12);text-align:center;">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C724B1;margin-bottom:14px;">Brand Associations</div>
    <div>
      ${bw.associations.map(a => `<span style="display:inline-block;padding:6px 16px;margin:4px;font-size:14px;font-weight:500;color:rgba(248,240,255,.55);letter-spacing:0.5px;">${esc(a)}</span>`).join(' · ')}
    </div>
  </td></tr>
  <tr><td style="height:16px;"></td></tr>
  ` : ''}

  <!-- Benchmark Brands -->
  ${bw.benchmark_1_name ? `
  <tr><td style="padding:24px 30px;background:#170d2a;border:1px solid rgba(123,47,190,.15);">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C724B1;margin-bottom:14px;">Kindred Spirits — Brands with Similar Energy</div>

    <div style="margin-bottom:16px;padding:14px;background:rgba(123,47,190,.04);border:1px solid rgba(123,47,190,.08);">
      <div style="font-size:16px;font-weight:700;margin-bottom:4px;">${esc(bw.benchmark_1_name)}</div>
      <div style="font-size:13px;color:rgba(248,240,255,.5);margin-bottom:10px;">${esc(bw.benchmark_1_why || '')}</div>
      ${(bw.benchmark_1_examples || []).map(ex => `<div style="font-size:12px;color:rgba(248,240,255,.45);padding:4px 0 4px 12px;border-left:2px solid rgba(123,47,190,.15);">${esc(ex)}</div>`).join('')}
    </div>

    ${bw.benchmark_2_name ? `
    <div style="padding:14px;background:rgba(199,36,177,.03);border:1px solid rgba(199,36,177,.08);">
      <div style="font-size:16px;font-weight:700;margin-bottom:4px;">${esc(bw.benchmark_2_name)}</div>
      <div style="font-size:13px;color:rgba(248,240,255,.5);margin-bottom:10px;">${esc(bw.benchmark_2_why || '')}</div>
      ${(bw.benchmark_2_examples || []).map(ex => `<div style="font-size:12px;color:rgba(248,240,255,.45);padding:4px 0 4px 12px;border-left:2px solid rgba(199,36,177,.12);">${esc(ex)}</div>`).join('')}
    </div>` : ''}
  </td></tr>
  <tr><td style="height:16px;"></td></tr>
  ` : ''}

  <!-- CTA -->
  <tr><td style="padding:30px;text-align:center;background:#1e1136;border:1px solid rgba(123,47,190,.12);">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(248,240,255,.25);margin-bottom:10px;">Your Story Begins Here</div>
    <p style="font-size:14px;color:rgba(248,240,255,.55);line-height:1.65;margin:0 0 18px;">This is just the opening chapter. To build the full Brand World — identity system, strategy playbook, and live brand operations — Unicorn can take you there.</p>
    <a href="https://unicornunited.co" target="_blank" style="display:inline-block;padding:12px 32px;background:linear-gradient(90deg,#7B2FBE,#C724B1);color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;border-radius:2px;">Explore Unicorn</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:30px 0;text-align:center;">
    <div style="font-size:11px;color:rgba(248,240,255,.15);">Made with intention by <a href="https://unicornunited.co" style="color:rgba(248,240,255,.25);text-decoration:none;">Unicorn</a></div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildLeadNotification({ playerName, brandName, company, email, quadrant, archetype, sourceArchetypes }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:40px;background:#0d0818;font-family:'Helvetica Neue',Arial,sans-serif;color:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;">
  <tr><td style="padding:24px 30px;background:#170d2a;border:1px solid rgba(123,47,190,.15);">
    <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C724B1;margin-bottom:14px;">New Game Lead</div>
    <h2 style="margin:0 0 16px;font-size:22px;">${esc(playerName)} — ${esc(brandName)}</h2>
    <table cellpadding="0" cellspacing="0" style="font-size:14px;line-height:2;">
      <tr><td style="color:rgba(248,240,255,.4);padding-right:16px;">Name</td><td>${esc(playerName)}</td></tr>
      <tr><td style="color:rgba(248,240,255,.4);padding-right:16px;">Email</td><td><a href="mailto:${esc(email)}" style="color:#C724B1;">${esc(email)}</a></td></tr>
      <tr><td style="color:rgba(248,240,255,.4);padding-right:16px;">Company</td><td>${esc(company || brandName)}</td></tr>
      <tr><td style="color:rgba(248,240,255,.4);padding-right:16px;">Quadrant</td><td>${esc(quadrant || '')}</td></tr>
      ${archetype ? `<tr><td style="color:rgba(248,240,255,.4);padding-right:16px;">Archetype</td><td>${esc(archetype.name)}</td></tr>` : ''}
      ${sourceArchetypes && sourceArchetypes.length ? `<tr><td style="color:rgba(248,240,255,.4);padding-right:16px;">Sources</td><td>${sourceArchetypes.map(n => esc(n)).join(' + ')}</td></tr>` : ''}
    </table>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

// HTML escape helper
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════════════════════════════
// NOTION — Persist completion to Game Completions database
// ═══════════════════════════════════════════════════════════════

// Notion rich-text + block builders (kept small + boring on purpose)
function nText(content) {
  return [{ type: 'text', text: { content: String(content || '').slice(0, 2000) } }];
}
function nParagraph(text) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: nText(text) } };
}
function nHeading(level, text) {
  const type = `heading_${level}`;
  return { object: 'block', type, [type]: { rich_text: nText(text) } };
}
function nQuote(text) {
  return { object: 'block', type: 'quote', quote: { rich_text: nText(text) } };
}
function nCallout(text, emoji, color) {
  return {
    object: 'block', type: 'callout',
    callout: {
      rich_text: nText(text),
      icon: emoji ? { type: 'emoji', emoji } : undefined,
      color: color || 'default'
    }
  };
}
function nBullet(text) {
  return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: nText(text) } };
}
function nDivider() {
  return { object: 'block', type: 'divider', divider: {} };
}

function buildBrandWorldBlocks({ bw, archetype, sourceArchetypes, vals, man, brandWords }) {
  const blocks = [];

  // Story opening
  if (bw.story_opening) {
    blocks.push(nHeading(2, 'Brand World'));
    blocks.push(nParagraph(bw.story_opening));
    blocks.push(nDivider());
  }

  // Archetype
  if (archetype && archetype.name) {
    blocks.push(nHeading(2, `Archetype: ${archetype.name}`));
    if (archetype.territory) blocks.push(nParagraph(archetype.territory));
    if (archetype.desc) blocks.push(nParagraph(archetype.desc));
    if (archetype.shadow) blocks.push(nCallout(`Shadow — ${archetype.shadow}`, '🌑', 'gray_background'));
    if (sourceArchetypes && sourceArchetypes.length) {
      blocks.push(nParagraph(`Forged from ${sourceArchetypes.join(' + ')}`));
    }
    blocks.push(nDivider());
  }

  // Positioning
  if (bw.positioning) {
    blocks.push(nHeading(2, 'Brand Positioning'));
    blocks.push(nQuote(bw.positioning));
    blocks.push(nDivider());
  }

  // Know → Believe → Act
  if (bw.know || bw.believe || bw.act) {
    blocks.push(nHeading(2, 'Know → Believe → Act'));
    if (bw.know) blocks.push(nCallout(`KNOW — ${bw.know}`, '🧠', 'purple_background'));
    if (bw.believe) blocks.push(nCallout(`BELIEVE — ${bw.believe}`, '💜', 'pink_background'));
    if (bw.act) blocks.push(nCallout(`ACT — ${bw.act}`, '⚡', 'red_background'));
    blocks.push(nDivider());
  }

  // Core Manifesto
  const why = bw.manifesto_why || man.why;
  const how = bw.manifesto_how || man.how;
  const what = bw.manifesto_what || man.what;
  if (why || how || what) {
    blocks.push(nHeading(2, 'Core Manifesto'));
    if (why) { blocks.push(nHeading(3, 'Why')); blocks.push(nParagraph(why)); }
    if (how) { blocks.push(nHeading(3, 'How')); blocks.push(nParagraph(how)); }
    if (what) { blocks.push(nHeading(3, 'What')); blocks.push(nParagraph(what)); }
    blocks.push(nDivider());
  }

  // Values + Personality
  const allValues = [...(vals.foundation || []), ...(vals.current || []), ...(vals.constellation || [])];
  if (allValues.length || bw.personality || (brandWords && brandWords.length)) {
    blocks.push(nHeading(2, 'Values & Personality'));
    if (allValues.length) blocks.push(nParagraph(`Values: ${allValues.join(' · ')}`));
    if (bw.personality) blocks.push(nParagraph(`Personality: ${bw.personality}`));
    if (brandWords && brandWords.length) blocks.push(nParagraph(`Brand words: ${brandWords.join(' · ')}`));
    blocks.push(nDivider());
  }

  // Visual Brand World
  if (bw.visual_shapes || bw.visual_imagery || bw.visual_motion || bw.visual_texture || bw.visual_experience) {
    blocks.push(nHeading(2, 'Visual Brand World'));
    if (bw.visual_shapes) blocks.push(nBullet(`SHAPES — ${bw.visual_shapes}`));
    if (bw.visual_imagery) blocks.push(nBullet(`IMAGERY — ${bw.visual_imagery}`));
    if (bw.visual_motion) blocks.push(nBullet(`MOTION — ${bw.visual_motion}`));
    if (bw.visual_texture) blocks.push(nBullet(`TEXTURE — ${bw.visual_texture}`));
    if (bw.visual_experience) blocks.push(nCallout(`EXPERIENCE — ${bw.visual_experience}`, '✨', 'pink_background'));
    blocks.push(nDivider());
  }

  // Brand Associations
  if (bw.associations && bw.associations.length) {
    blocks.push(nHeading(2, 'Brand Associations'));
    blocks.push(nParagraph(bw.associations.join(' · ')));
    blocks.push(nDivider());
  }

  // Benchmark Brands
  if (bw.benchmark_1_name) {
    blocks.push(nHeading(2, 'Kindred Spirits'));
    blocks.push(nHeading(3, bw.benchmark_1_name));
    if (bw.benchmark_1_why) blocks.push(nParagraph(bw.benchmark_1_why));
    (bw.benchmark_1_examples || []).forEach(ex => blocks.push(nBullet(ex)));
    if (bw.benchmark_2_name) {
      blocks.push(nHeading(3, bw.benchmark_2_name));
      if (bw.benchmark_2_why) blocks.push(nParagraph(bw.benchmark_2_why));
      (bw.benchmark_2_examples || []).forEach(ex => blocks.push(nBullet(ex)));
    }
  }

  return blocks;
}

// Known multi-select values in the Notion DB. Filter incoming values to these
// so Notion doesn't reject the whole page over a mismatched archetype name.
const KNOWN_SOURCE_ARCHETYPES = new Set([
  'The Forgemaster', 'The Weaver', 'The Catalyst', 'The Alchemist',
  'The Sage', 'The Guardian', 'The Explorer', 'The Sovereign',
  'The Trickster', 'The Maverick'
]);
const KNOWN_QUADRANTS = new Set(['Power', 'Passion', 'Progress', 'Protection']);

async function saveCompletionToNotion(data) {
  if (!notion || !NOTION_DB_ID) return; // Notion not configured — skip silently

  const {
    email, playerName, brandName, company, brandWorld,
    archetype, sourceArchetypes, quadrant, values, manifesto, brandWords
  } = data;
  const bw = brandWorld || {};
  const vals = values || {};
  const man = manifesto || {};

  const cleanSources = (sourceArchetypes || [])
    .filter(s => KNOWN_SOURCE_ARCHETYPES.has(s))
    .map(name => ({ name }));

  const properties = {
    'Player Name': { title: [{ text: { content: playerName || 'Unknown' } }] },
    'Brand Name': { rich_text: [{ text: { content: brandName || '' } }] },
    'Company': { rich_text: [{ text: { content: company || brandName || '' } }] },
    'Archetype': { rich_text: [{ text: { content: archetype?.name || '' } }] },
    'Source Archetypes': { multi_select: cleanSources },
    'Status': { select: { name: 'New' } },
  };

  if (email) properties['Email'] = { email };
  if (quadrant && KNOWN_QUADRANTS.has(quadrant)) {
    properties['Quadrant'] = { select: { name: quadrant } };
  }

  try {
    await notion.pages.create({
      parent: { database_id: NOTION_DB_ID },
      properties,
      children: buildBrandWorldBlocks({ bw, archetype, sourceArchetypes, vals, man, brandWords }),
    });
  } catch (err) {
    console.error('Notion save failed:', err?.message || err);
  }
}

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasKey: !!API_KEY });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`\n  ✦ Start your Story is running at http://localhost:${PORT}`);
  console.log(`  ${API_KEY ? '✓ API key loaded' : '✗ No API key — set ANTHROPIC_API_KEY in .env'}`);
  console.log(`  ${RESEND_KEY ? '✓ Email configured' : '✗ No email key — set RESEND_API_KEY in .env'}`);
  console.log(`  ${notion && NOTION_DB_ID ? '✓ Notion configured (Game Completions)' : '✗ Notion not configured — set NOTION_API_KEY and NOTION_GAME_COMPLETIONS_DB_ID'}\n`);
});
