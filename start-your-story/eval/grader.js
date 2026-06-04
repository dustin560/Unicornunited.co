// Grader — calls Anthropic API to score how well a swapped output fits the WRONG player.
// Lower scores = better discrimination (the output genuinely didn't fit the wrong player).

const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.GRADER_MODEL || 'claude-sonnet-4-5';

async function callAnthropic({ system, user, maxTokens = 800, temperature = 0 }) {
  if (!API_KEY) throw new Error('ANTHROPIC_API_KEY not set. Set it in your env to run the eval.');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// Grade a single (swapped output, target player) pair.
// Returns { score: 1-5, reasoning: string }
async function gradeFit({ promptName, swappedOutput, targetPlayer }) {
  const system = `You are a strict grader for a personal-brand AI product. You evaluate whether an output addressed to a leader actually fits THAT leader's blend, vocation and answers — NOT whether the names match (we mechanically swap names before showing it to you).

You are looking for the discrimination property: does this output genuinely depend on who the person is, or is it generic high-performer advice that would land for almost anyone?

Score on a 1-5 scale:
1 = COMPLETELY MISFIT. Advice contradicts the target player's blend / vocation. Wrong recommendations.
2 = MOSTLY MISFIT. Few claims actually fit; would not be the right output for this person.
3 = GENERIC. Could fit this person but could equally fit many others. Token-level personalisation only.
4 = MOSTLY FITS. Real specific resonance with this player's situation, with some elements that don't quite land.
5 = PERFECTLY FITS. This output genuinely could have been generated specifically for this player.

Be strict. Generic high-performer advice ("build executive presence", "develop trust", "find your voice") with a name stapled on it = 3, not 4.

Output ONLY a JSON object: { "score": 1-5, "reasoning": "one sentence on why" }. No preamble.`;

  const user = `PROMPT TYPE BEING GRADED: ${promptName}

TARGET PLAYER PROFILE:
- Name: ${targetPlayer.playerName}
- Vocation: ${targetPlayer.vocation} — ${targetPlayer.vocationContext}
- Blend: ${targetPlayer.archetypeBlend.primary.quest} × ${targetPlayer.archetypeBlend.secondary.quest} × ${targetPlayer.archetypeBlend.tertiary.quest}
- Coined name: "${targetPlayer.coinedName}"
- Activations chosen: ${(targetPlayer.chosenActivations || []).map(a => a.title).join(', ')}
- Boss Monsters: ${JSON.stringify(targetPlayer.bossMonsters || [])}
- Online presence baseline: ${(targetPlayer.onlinePresence || {}).baseline}
- Exemplar they admire: ${(targetPlayer.onlinePresence || {}).exemplar}
- Recalibration: ${JSON.stringify(targetPlayer.recalibration || {})}

OUTPUT TO GRADE (names mechanically swapped to match target — judge SUBSTANCE only):
${typeof swappedOutput === 'string' ? swappedOutput : JSON.stringify(swappedOutput, null, 2)}

Score 1-5. Output JSON only.`;

  const text = await callAnthropic({ system, user, maxTokens: 400 });
  try {
    // Strip any code fences just in case
    const clean = text.replace(/```json?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    const score = Math.max(1, Math.min(5, Number(parsed.score) || 3));
    return { score, reasoning: String(parsed.reasoning || '') };
  } catch (e) {
    // Defensive: if grader returns non-JSON, default to neutral
    return { score: 3, reasoning: `grader parse error: ${text.slice(0, 200)}` };
  }
}

module.exports = { gradeFit, callAnthropic };
