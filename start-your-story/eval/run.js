// ══════════════════════════════════════════════════════════════
// Swap-test eval harness — Personal Mode v3 runtime prompts
// ══════════════════════════════════════════════════════════════
// Generates the full 6-prompt suite for each synthetic player,
// then mechanically swaps names across cross-Quest pairs and
// asks a grader model how well the swapped output fits the
// wrong player. Lower scores = better discrimination.
//
// Run:  ANTHROPIC_API_KEY=sk-... node run.js
//       [--pairs=10]   limit cross-quest pairs per run (default 30)
//       [--players=20] limit players (default 20, max 20)
//       [--out=results.json]  save results to file
// ══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { PLAYERS } = require('./players');
const { prompt0, prompt1, prompt2, prompt3, prompt4, prompt5 } = require('./prompts');
const { gradeFit, callAnthropic } = require('./grader');

// ── CLI args ──
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [];
}));
const PAIRS_LIMIT = parseInt(args.pairs || '30', 10);
const PLAYERS_LIMIT = Math.min(parseInt(args.players || '20', 10), PLAYERS.length);
const OUT_PATH = args.out || path.join(__dirname, `results-${new Date().toISOString().split('T')[0]}.json`);
const MODEL = process.env.MODEL || 'claude-sonnet-4-5';

const players = PLAYERS.slice(0, PLAYERS_LIMIT);

console.log('═'.repeat(70));
console.log('Personal Mode v3 — Swap-Test Eval Harness');
console.log('═'.repeat(70));
console.log(`Players:     ${players.length}`);
console.log(`Model:       ${MODEL}`);
console.log(`Pairs limit: ${PAIRS_LIMIT}`);
console.log(`Output:      ${OUT_PATH}`);
console.log('═'.repeat(70));

// ── Run an AI call with retry on transient errors ──
async function runPrompt({ system, user, maxTokens = 2000 }) {
  for (let i = 0; i < 3; i++) {
    try {
      return await callAnthropic({ system, user, maxTokens });
    } catch (e) {
      if (i === 2) throw e;
      const delay = (i + 1) * 2000;
      console.warn(`  retry ${i + 1} in ${delay}ms — ${e.message.slice(0, 80)}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function tryParseJSON(text) {
  if (!text) return null;
  const clean = text.replace(/```json?/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

// ── Phase 1: Generate the 6-prompt suite per player ──
async function generateSuite(player) {
  console.log(`\n▶ ${player.playerName} (${player.archetypeBlend.primary.quest})`);

  // Prompt 0 — Quadrant Synthesis (source of truth)
  console.log('  · Prompt 0 (Quadrant Synthesis)…');
  const p0 = prompt0(player);
  const out0Text = await runPrompt({ system: p0.system, user: p0.user, maxTokens: 1600 });
  const out0 = tryParseJSON(out0Text);
  if (!out0) {
    console.warn('  ⚠ Prompt 0 failed to parse JSON, output:', out0Text.slice(0, 200));
  }
  // Hydrate the player with quadrant outputs for downstream prompts
  const hydrated = {
    ...player,
    lightExpression: out0?.lightExpression || '',
    shadowIntegration: out0?.shadowIntegration || '',
    darkReflection: out0?.darkReflection || '',
    sourceSymbol: out0?.sourceSymbol || '',
  };

  // Prompts 1-4 run in parallel (no inter-dependencies once hydrated)
  console.log('  · Prompts 1-4 (parallel)…');
  const [out1Text, out2Text, out3Text, out4Text] = await Promise.all([
    runPrompt({ ...prompt1(hydrated), maxTokens: 1800 }),
    runPrompt({ ...prompt2(hydrated), maxTokens: 1800 }),
    runPrompt({ ...prompt3(hydrated), maxTokens: 800 }),
    runPrompt({ ...prompt4(hydrated), maxTokens: 1000 }),
  ]);
  const out1 = tryParseJSON(out1Text);
  const out2 = tryParseJSON(out2Text);
  const out3 = tryParseJSON(out3Text);
  const out4 = tryParseJSON(out4Text);

  // Prompt 5 — once per chosen activation (parallel)
  console.log(`  · Prompt 5 × ${hydrated.chosenActivations.length} activations…`);
  const out5Texts = await Promise.all(hydrated.chosenActivations.map(act => {
    const enriched = { ...act, description: `Library practice tagged to ${act.questTag}.`, taggedQuests: [act.questTag] };
    return runPrompt({ ...prompt5(hydrated, enriched), maxTokens: 500 });
  }));
  const out5 = out5Texts.map(t => tryParseJSON(t)).filter(Boolean);

  return {
    player: hydrated,
    outputs: {
      prompt0: out0,
      prompt1: out1,
      prompt2: out2,
      prompt3: out3,
      prompt4: out4,
      prompt5: out5,
    },
  };
}

// ── Token-substitution for the swap test ──
// Replaces A's identifying tokens with B's so the grader sees the output addressed to B.
function swapTokens(text, fromPlayer, toPlayer) {
  if (!text) return text;
  let s = typeof text === 'string' ? text : JSON.stringify(text);
  const fromName = fromPlayer.playerName;
  const fromFirst = fromName.split(' ')[0];
  const toName = toPlayer.playerName;
  const toFirst = toName.split(' ')[0];
  s = s.split(fromName).join(toName);
  s = s.split(fromFirst).join(toFirst);
  if (fromPlayer.coinedName) s = s.split(fromPlayer.coinedName).join(toPlayer.coinedName || 'The Leader');
  // Quest names
  ['primary', 'secondary', 'tertiary'].forEach(rank => {
    const fromQ = fromPlayer.archetypeBlend[rank].quest;
    const toQ = toPlayer.archetypeBlend[rank].quest;
    s = s.split(fromQ).join(toQ);
  });
  return s;
}

// ── Phase 2: Run pairwise swap tests + grade ──
async function runSwapTests(suites) {
  const pairs = [];
  // Generate all cross-quest pairs (A != B, A.primary != B.primary)
  for (let i = 0; i < suites.length; i++) {
    for (let j = 0; j < suites.length; j++) {
      if (i === j) continue;
      const A = suites[i], B = suites[j];
      if (A.player.archetypeBlend.primary.quest === B.player.archetypeBlend.primary.quest) continue;
      pairs.push({ A, B });
    }
  }
  console.log(`\nTotal cross-Quest pairs available: ${pairs.length}`);

  // Sample if limit set
  const sampled = pairs.length > PAIRS_LIMIT
    ? pairs.sort(() => Math.random() - 0.5).slice(0, PAIRS_LIMIT)
    : pairs;
  console.log(`Grading ${sampled.length} pairs across 5 prompts (Prompt 0 outputs feed into others; not graded separately)…\n`);

  const promptNames = ['prompt1', 'prompt2', 'prompt3', 'prompt4'];  // Prompt 5 handled separately
  const scores = { prompt1: [], prompt2: [], prompt3: [], prompt4: [], prompt5: [] };
  const detail = [];

  let pairIdx = 0;
  for (const { A, B } of sampled) {
    pairIdx++;
    process.stdout.write(`Pair ${pairIdx}/${sampled.length}: ${A.player.playerName} (${A.player.archetypeBlend.primary.quest}) → ${B.player.playerName} (${B.player.archetypeBlend.primary.quest})  `);

    for (const pName of promptNames) {
      const aOutput = A.outputs[pName];
      if (!aOutput) continue;
      const swappedText = swapTokens(JSON.stringify(aOutput), A.player, B.player);
      try {
        const swappedObj = JSON.parse(swappedText);
        const { score, reasoning } = await gradeFit({ promptName: pName, swappedOutput: swappedObj, targetPlayer: B.player });
        scores[pName].push(score);
        detail.push({ pair: `${A.player.playerName}→${B.player.playerName}`, prompt: pName, score, reasoning });
        process.stdout.write(`${pName}:${score} `);
      } catch (e) {
        // Defensive
      }
    }

    // Prompt 5 — sample one activation from A's set, score it against B
    if (A.outputs.prompt5 && A.outputs.prompt5.length) {
      const sample = A.outputs.prompt5[Math.floor(Math.random() * A.outputs.prompt5.length)];
      const swappedText = swapTokens(JSON.stringify(sample), A.player, B.player);
      try {
        const swappedObj = JSON.parse(swappedText);
        const { score, reasoning } = await gradeFit({ promptName: 'prompt5', swappedOutput: swappedObj, targetPlayer: B.player });
        scores.prompt5.push(score);
        detail.push({ pair: `${A.player.playerName}→${B.player.playerName}`, prompt: 'prompt5', score, reasoning });
        process.stdout.write(`p5:${score}`);
      } catch (e) { /* ignore */ }
    }
    process.stdout.write('\n');
  }

  return { scores, detail };
}

// ── Phase 3: Report ──
function report(scores) {
  const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  console.log('\n' + '═'.repeat(70));
  console.log('GENERICNESS SCORES (1 = strong discrimination, 5 = horoscope)');
  console.log('═'.repeat(70));

  const summary = {};
  let allScores = [];
  for (const [key, arr] of Object.entries(scores)) {
    const m = mean(arr);
    const status = m <= 2 ? '✓' : m <= 2.5 ? '·' : '⚠';
    console.log(`${status}  ${key.padEnd(10)}  mean=${m.toFixed(2)}  n=${arr.length}`);
    summary[key] = { mean: m, n: arr.length, scores: arr };
    if (key !== 'prompt5') allScores = allScores.concat(arr);  // prompt5 ungated: universal micro-habit, discrimination is the wrong metric
  }
  const overall = mean(allScores);
  console.log('-'.repeat(70));
  console.log(`OVERALL mean=${overall.toFixed(2)}  n=${allScores.length}`);

  console.log('\nGATES');
  console.log(`Ship gate    (mean ≤ 2.0):       ${overall <= 2.0 ? '✓ PASS' : '✗ FAIL'}`);
  const gated = Object.entries(summary).filter(([k]) => k !== 'prompt5').map(([,v]) => v);
  console.log(`Per-prompt   (no prompt > 2.5):  ${gated.every(s => s.mean <= 2.5) ? '✓ PASS' : '✗ FAIL — check warnings above'}`);
  console.log(`Note: prompt5 (Activation Personalisation) is ungated — QA'd on anchor/rep/reinforce quality, not swap-test discrimination.`);
  console.log('═'.repeat(70));

  return { overall, summary };
}

// ── Main ──
(async () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\n✗ ANTHROPIC_API_KEY not set.\n  Export it before running:  export ANTHROPIC_API_KEY=sk-ant-...\n');
    process.exit(1);
  }

  const t0 = Date.now();

  // Phase 1: generate suites for each player
  const suites = [];
  for (const player of players) {
    try {
      const suite = await generateSuite(player);
      suites.push(suite);
    } catch (e) {
      console.error(`  ✗ ${player.playerName} failed: ${e.message}`);
    }
  }

  console.log(`\nGenerated ${suites.length}/${players.length} suites in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // Phase 2: pairwise swap tests
  const { scores, detail } = await runSwapTests(suites);

  // Phase 3: report
  const { overall, summary } = report(scores);

  // Save results to disk
  const out = {
    timestamp: new Date().toISOString(),
    model: MODEL,
    players: players.map(p => p.playerName),
    pairsTested: detail.length / 5,
    overall,
    summary,
    detail,
    suites: suites.map(s => ({ player: s.player.playerName, outputs: s.outputs })),
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\nResults written to ${OUT_PATH}`);
  console.log(`Total runtime: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})().catch(e => {
  console.error('\nFATAL:', e.message);
  process.exit(1);
});
