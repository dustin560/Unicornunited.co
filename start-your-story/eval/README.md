# Start Your Story — v3 Runtime Prompts Eval Harness

The swap-test eval harness Opus recommended in the runtime prompts critique. Converts *"full discrimination is the bar"* from a slogan into a per-prompt **genericness score** that gates v3 prompt edits before code lands.

## What it does

For each of 20 synthetic players spanning the 15 Quests:

1. Runs the full 6-prompt suite — Prompt 0 (Quadrant Synthesis) feeds Prompts 1–5
2. Mechanically swaps names / Quest tokens between cross-Quest pairs (A's primary ≠ B's primary)
3. Sends the swapped output to a grader model with prompt: *"Here's a coaching/content roadmap addressed to B. On 1–5, does it actually fit B's blend, vocation and answers — judging substance, not name-matching?"*
4. Reports mean **genericness score** per prompt:
   - **1–2** = strong discrimination (A's output genuinely doesn't fit B)
   - **3** = generic (could fit either)
   - **4–5** = horoscope (A's output fits B fine once names are swapped)

## Gates

- **Ship gate:** Mean genericness across all prompts ≤ 2.0.
- **Per-prompt:** No single prompt > 2.5.

## Run

```bash
cd unicornunited.co/start-your-story/eval
export ANTHROPIC_API_KEY=sk-ant-...
node run.js                                    # default: 20 players, 30 pairs
node run.js --players=8 --pairs=10             # quick mode (~5 min)
node run.js --players=20 --pairs=60 --out=baseline.json    # full baseline
```

### Useful flags

| Flag | Default | Effect |
|---|---|---|
| `--players=N` | 20 | How many synthetic players to use (max 20) |
| `--pairs=N` | 30 | Cap on cross-Quest pair tests |
| `--out=path.json` | `results-YYYY-MM-DD.json` | Where to write detailed results |

## Estimated cost & runtime

Using `claude-sonnet-4-5`:

- **Quick (8 players, 10 pairs):** ~5 minutes, ~$1–2 in API spend
- **Default (20 players, 30 pairs):** ~15 minutes, ~$4–6
- **Full baseline (20 players, 60 pairs):** ~30 minutes, ~$8–12

To use a cheaper model for the grader specifically, set `GRADER_MODEL=claude-haiku-4-5-20251001`.

## What the output looks like

```
══════════════════════════════════════════════════════════════════════
GENERICNESS SCORES (1 = strong discrimination, 5 = horoscope)
══════════════════════════════════════════════════════════════════════
✓  prompt1     mean=1.84  n=30        ← Coaching Lens
·  prompt2     mean=2.31  n=30        ← Content Lens (above ship gate)
✓  prompt3     mean=1.62  n=30        ← Archetype Naming
⚠  prompt4     mean=2.67  n=30        ← Role-Model Selection (over threshold)
✓  prompt5     mean=1.43  n=30        ← Activation Personalisation
──────────────────────────────────────────────────────────────────────
OVERALL mean=1.97  n=150

GATES
Ship gate    (mean ≤ 2.0):       ✓ PASS
Per-prompt   (no prompt > 2.5):  ✗ FAIL — check warnings above
══════════════════════════════════════════════════════════════════════
```

A run that fails the per-prompt gate (Prompt 4 above) tells you *which* prompt to tune before Phase 2 code build. The `detail` array in the JSON output explains every grader decision with reasoning.

## How to tune a failing prompt

1. Inspect the `detail` entries for the failing prompt in the JSON output.
2. Look for the *reasoning* field — it tells you what the grader sees as generic.
3. Edit `prompts.js` for that prompt (sharpen system prompt, tighten contrastive-specificity clause, add a near-miss instruction).
4. Re-run with `--players=8 --pairs=10` to validate the edit fast.
5. Once that prompt's mean drops, run the full baseline again.

## Architecture

```
eval/
├── players.js   — 20 synthetic player objects covering all 15 Quests
├── prompts.js   — the 6 prompt template functions (canonical implementation)
├── grader.js    — Anthropic API client + grader call
├── run.js       — orchestrator (generate → swap → grade → report)
├── package.json
└── README.md
```

`prompts.js` is intended to be the canonical implementation for Phase 2 game code too — the server will import the same prompt functions, so eval and production stay in sync.

## Regression gate (Phase 2)

When prompts are edited as part of the game build, re-run the eval. Any prompt edit that raises its individual genericness score fails CI.

## Why this exists

Per Opus's critique 2 of the runtime prompts:

> *"You call discrimination the bar but provide no measurement. Five prompts shipping to real users need an automated genericness metric you can regression-test as you tune."*

This eval is that metric. It tells you whether the contrastive-specificity, quadrant-emphasis, near-miss, and evidence-grounding edits actually worked, before any code touches the personal-mode branch.

— Built as Phase 1.8, immediately before Phase 2 code build.
