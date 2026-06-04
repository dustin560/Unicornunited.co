// ══════════════════════════════════════════════════════════════
// Start Your Story v3 — scoring + reconciliation engine
// Implements the v3.1 rules from the signed-off design doc:
//  · scarcity-weighted scoring (tag worth 1/coverage)
//  · aspiration items (Q5/Q8) at 0.5 weight
//  · worded reveal (rank + strength, no percentages) + close-call flag
//  · activation tilt + 0.65/0.35 reconciliation with tension surfacing
//  · activation pick caps (4–6 daily, 1–2 weekly)
// ══════════════════════════════════════════════════════════════

const C = require('./v3-content');

// Coverage = number of QUESTIONS in which a Quest appears (not options).
function computeCoverage(questions = C.SCENARIO_QUESTIONS) {
  const cov = Object.fromEntries(C.QUESTS.map(q => [q, 0]));
  for (const q of questions) {
    const present = new Set();
    for (const opt of q.options) for (const t of opt.tags) present.add(t);
    for (const t of present) cov[t] += 1;
  }
  return cov;
}

const COVERAGE = computeCoverage();

/**
 * Score a set of answers.
 * @param answers — { Q1: 'A', Q2: 'D', ... } (subset allowed, e.g. Quick mode)
 * @returns ranked [{ quest, score }] (descending), all 15 quests
 */
function scoreAnswers(answers, questions = C.SCENARIO_QUESTIONS) {
  const scores = Object.fromEntries(C.QUESTS.map(q => [q, 0]));
  for (const q of questions) {
    const key = answers[q.id];
    if (!key) continue;
    const opt = q.options.find(o => o.key === key);
    if (!opt) continue;
    const itemWeight = q.type === 'aspiration' ? C.ASPIRATION_WEIGHT : 1.0;
    for (const tag of opt.tags) {
      const scarcity = COVERAGE[tag] > 0 ? 1 / COVERAGE[tag] : 0;
      scores[tag] += itemWeight * scarcity;
    }
  }
  return C.QUESTS.map(quest => ({ quest, score: scores[quest] }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Top-3 blend with worded strength (no percentages — v3.1).
 * closeCall = top two within one weighted tag of each other
 * (one weighted tag ≈ the scarcity value of the #1 quest's tag).
 */
function blendFromScores(ranked) {
  const [p, s, t] = ranked;
  const oneTag = COVERAGE[p.quest] > 0 ? 1 / COVERAGE[p.quest] : 0.2;
  const closeCall = (p.score - s.score) <= oneTag + 1e-9;
  const gap = s.score > 0 ? p.score / s.score : Infinity;
  const strengthWord = closeCall ? 'narrowly' : gap >= 1.5 ? 'strongly' : 'clearly';
  return {
    primary: p.quest, secondary: s.quest, tertiary: t.quest,
    scores: { [p.quest]: p.score, [s.quest]: s.score, [t.quest]: t.score },
    closeCall,
    revealLine: closeCall
      ? `${p.quest} and ${s.quest} are close — with ${t.quest} behind. Adjust if it feels off.`
      : `${strengthWord === 'strongly' ? 'Strongly' : 'Clearly'} ${p.quest} — with ${s.quest} and ${t.quest} close behind.`,
  };
}

/**
 * Share of each Quest across the player's chosen activations.
 * Activations are multi-tagged; each activation contributes 1/tags.length
 * to each of its tagged quests (untagged universals contribute nothing).
 */
function activationShare(chosenIds) {
  const all = [...C.ACTIVATIONS, ...C.WEEKLY_ALTERNATES];
  const share = Object.fromEntries(C.QUESTS.map(q => [q, 0]));
  let total = 0;
  for (const id of chosenIds) {
    const act = all.find(a => a.id === id);
    if (!act || !act.tags.length) continue;
    for (const t of act.tags) { share[t] += 1 / act.tags.length; total += 1 / act.tags.length; }
  }
  if (total > 0) for (const q of C.QUESTS) share[q] /= total; // normalise to 1
  return share;
}

/**
 * Reconciliation (v3.1): scenario is the spine (0.65), activations tilt (0.35).
 * Returns final ranked weights + whether the tilt changed the #1 quest
 * (tension → surface to the player, per Part 8).
 */
function reconcile(ranked, chosenIds) {
  const maxScore = ranked[0].score || 1;
  const scen = Object.fromEntries(ranked.map(r => [r.quest, r.score / maxScore])); // normalise 0-1
  const act = activationShare(chosenIds);
  const maxAct = Math.max(...Object.values(act), 1e-9);
  const final = C.QUESTS.map(quest => ({
    quest,
    weight: C.RECONCILIATION.scenarioWeight * (scen[quest] || 0)
          + C.RECONCILIATION.activationWeight * (act[quest] / maxAct),
  })).sort((a, b) => b.weight - a.weight);
  const scenarioPrimary = ranked[0].quest;
  const finalPrimary = final[0].quest;
  return {
    final,
    primary: finalPrimary, secondary: final[1].quest, tertiary: final[2].quest,
    tension: finalPrimary !== scenarioPrimary,
    tensionLine: finalPrimary !== scenarioPrimary
      ? `Interesting — you tested ${scenarioPrimary}-first, but the reps you chose lean ${finalPrimary}. Both are true. Which feels more like the leader you're becoming?`
      : null,
  };
}

/** Validate activation picks against the v3.1 caps. */
function validatePicks(dailyIds, weeklyCount) {
  const { minDaily, maxDaily, minWeekly, maxWeekly } = C.ACTIVATION_PICKS;
  const errors = [];
  if (dailyIds.length < minDaily) errors.push(`Pick at least ${minDaily} daily activations.`);
  if (dailyIds.length > maxDaily) errors.push(`Maximum ${maxDaily} daily activations — choosing has to mean excluding.`);
  if (weeklyCount < minWeekly) errors.push(`Pick at least ${minWeekly} weekly practice.`);
  if (weeklyCount > maxWeekly) errors.push(`Maximum ${maxWeekly} weekly practices.`);
  return { ok: errors.length === 0, errors };
}

/** Surface 8–12 candidate activations for a blend (Chapter 6). */
function surfaceActivations(blend, limit = 12) {
  const top3 = [blend.primary, blend.secondary, blend.tertiary];
  const rank = a => {
    let r = 0;
    a.tags.forEach(t => { const i = top3.indexOf(t); if (i >= 0) r += (3 - i); });
    return r;
  };
  return C.ACTIVATIONS
    .filter(a => a.tags.some(t => top3.includes(t)) || a.bucket === 'hygiene')
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, limit);
}

module.exports = {
  COVERAGE, computeCoverage, scoreAnswers, blendFromScores,
  activationShare, reconcile, validatePicks, surfaceActivations,
};
