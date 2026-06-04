// ══════════════════════════════════════════════════════════════
// Start Your Story v3 — API routes (Phase 2.1)
// Registers /api/v3/* on the Express app. Imports the CANONICAL
// prompts from eval/prompts.js so the eval harness and the game
// can never drift apart. Scoring stays server-side (tags are
// never sent to the client, so the test can't be gamed).
// ══════════════════════════════════════════════════════════════

const C = require('./v3-content');
const E = require('./v3-engine');
const P = require('../eval/prompts');

const V3_MODEL = process.env.V3_MODEL || 'claude-sonnet-4-6';

// maxTokens per step — the values validated in the eval harness
// (prompt1 at 2500 after the truncation fix).
const STEP_BUDGET = { prompt0: 1600, prompt1: 2500, prompt2: 1800, prompt3: 800, prompt4: 1000, prompt5: 500 };
const STEPS = { prompt0: P.prompt0, prompt1: P.prompt1, prompt2: P.prompt2, prompt3: P.prompt3, prompt4: P.prompt4, prompt5: P.prompt5 };

// Contrast quest per primary — the foil for contrastive specificity.
const CONTRAST = {
  Pioneer: 'Healer', Healer: 'Pioneer', Architect: 'Muse', Muse: 'Architect',
  Captain: 'Oracle', Oracle: 'Captain', Rebel: 'Peacekeeper', Peacekeeper: 'Rebel',
  Detective: 'Magician', Magician: 'Detective', Witness: 'Jester', Jester: 'Witness',
  Defender: 'Alchemist', Alchemist: 'Defender', Professor: 'Muse',
};

// Next Tuesday at least 5 days out, formatted en-GB — date maths in
// code, never asked of the model (per the prompts review).
function publishByDate(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + 5);
  while (d.getDay() !== 2) d.setDate(d.getDate() + 1); // 2 = Tuesday
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function parseJSON(text) {
  if (!text) return null;
  try { return JSON.parse(text.replace(/```json?/g, '').replace(/```/g, '').trim()); }
  catch { return null; }
}

// Client-safe views (no Quest tags — scoring is server-side)
const PUBLIC_QUESTIONS = C.SCENARIO_QUESTIONS.map(q => ({
  id: q.id, starred: q.starred, theme: q.theme, prompt: q.prompt,
  options: q.options.map(o => ({ key: o.key, text: o.text })),
}));
const PUBLIC_ACTIVATIONS = C.ACTIVATIONS.map(a => ({ id: a.id, bucket: a.bucket, title: a.title, text: a.text }));

function registerV3Routes(app, { apiKey, rateCheck }) {

  // ── Static content for the front-end (single source of truth) ──
  app.get('/api/v3/content', (req, res) => {
    res.json({
      questions: PUBLIC_QUESTIONS,
      vocations: C.VOCATIONS,
      baselines: C.ONLINE_BASELINES,
      platforms: C.PLATFORMS,
      hooks: C.QUEST_HOOKS,
      picks: C.ACTIVATION_PICKS,
    });
  });

  // ── Score scenario answers → blend (no AI) ──
  app.post('/api/v3/score', (req, res) => {
    const { answers, mode } = req.body || {};
    if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'Missing answers.' });
    const qs = mode === 'quick' ? C.SCENARIO_QUESTIONS.filter(q => q.starred) : C.SCENARIO_QUESTIONS;
    const ranked = E.scoreAnswers(answers, qs);
    const blend = E.blendFromScores(ranked);
    res.json({ blend: { primary: blend.primary, secondary: blend.secondary, tertiary: blend.tertiary },
               closeCall: blend.closeCall, revealLine: blend.revealLine,
               hooks: { [blend.primary]: C.QUEST_HOOKS[blend.primary], [blend.secondary]: C.QUEST_HOOKS[blend.secondary], [blend.tertiary]: C.QUEST_HOOKS[blend.tertiary] } });
  });

  // ── Surface 8–12 activations for the blend (Chapter 6) ──
  app.post('/api/v3/activations', (req, res) => {
    const { primary, secondary, tertiary } = req.body || {};
    if (!primary) return res.status(400).json({ error: 'Missing blend.' });
    const surfaced = E.surfaceActivations({ primary, secondary, tertiary })
      .map(a => ({ id: a.id, bucket: a.bucket, title: a.title, text: a.text }));
    const weekly = [primary, secondary, tertiary].filter(Boolean)
      .map(q => ({ quest: q, options: C.WEEKLY_PRACTICES[q] || [] }));
    res.json({ daily: surfaced, weekly, picks: C.ACTIVATION_PICKS });
  });

  // ── Reconcile scenario + picks → final blend (Chapter 7 entry) ──
  app.post('/api/v3/reconcile', (req, res) => {
    const { answers, chosenIds, weeklyCount, mode } = req.body || {};
    if (!answers || !Array.isArray(chosenIds)) return res.status(400).json({ error: 'Missing answers or chosenIds.' });
    const valid = E.validatePicks(chosenIds, weeklyCount || 1);
    if (!valid.ok) return res.status(400).json({ error: valid.errors.join(' ') });
    const qs = mode === 'quick' ? C.SCENARIO_QUESTIONS.filter(q => q.starred) : C.SCENARIO_QUESTIONS;
    const ranked = E.scoreAnswers(answers, qs);
    const rec = E.reconcile(ranked, chosenIds);
    res.json({ primary: rec.primary, secondary: rec.secondary, tertiary: rec.tertiary,
               tension: rec.tension, tensionLine: rec.tensionLine });
  });

  // ── AI generation — the validated prompt suite ──
  app.post('/api/v3/generate', async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (!rateCheck(ip)) return res.status(429).json({ error: 'Too many requests — please slow down.' });
    if (!apiKey()) return res.status(500).json({ error: 'Server API key not configured.' });

    const { step, player } = req.body || {};
    const fn = STEPS[step];
    if (!fn || !player || !player.playerName || !player.archetypeBlend) {
      return res.status(400).json({ error: 'Missing or invalid step/player.' });
    }

    // Server-side enrichment — never trust the client for these
    const enriched = {
      ...player,
      contrastQuest: CONTRAST[player.archetypeBlend.primary.quest] || 'Peacekeeper',
      publishByDate: publishByDate(),
      database: step === 'prompt4'
        ? C.ROLE_MODELS.map(r => ({ name: r.name, quest: r.quest, category: r.category, why: r.why }))
        : undefined,
    };

    try {
      const built = step === 'prompt5' ? fn(enriched, enriched.activation || {}) : fn(enriched);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey(), 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: V3_MODEL,
          max_tokens: STEP_BUDGET[step],
          system: built.system,
          messages: [{ role: 'user', content: built.user }],
        }),
      });
      const data = await response.json();
      if (data.error) return res.status(502).json({ error: data.error.message });
      const text = data.content?.[0]?.text || '';
      const parsed = parseJSON(text);
      if (!parsed) return res.status(502).json({ error: 'Generation returned invalid JSON.', raw: text.slice(0, 400) });
      res.json({ step, data: parsed });
    } catch (err) {
      res.status(502).json({ error: 'Failed to reach Claude API.' });
    }
  });
}

module.exports = { registerV3Routes, publishByDate, CONTRAST };
