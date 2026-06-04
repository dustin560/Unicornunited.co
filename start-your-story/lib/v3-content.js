// ══════════════════════════════════════════════════════════════
// Start Your Story — Personal Mode v3
// Content data module (Phase 2.1)
// Source of truth: Start-Your-Story-v3-Design-Content.md (v3.1,
// approved 4 June 2026). Do not edit content here without
// updating the design doc — this file is a transcription.
// ══════════════════════════════════════════════════════════════

const QUESTS = [
  'Pioneer','Defender','Magician','Architect','Alchemist','Rebel','Jester',
  'Professor','Oracle','Witness','Muse','Detective','Captain','Healer','Peacekeeper'
];

// ── Part 1: Scenario questions ──
// type: 'behavioural' (weight 1.0) | 'aspiration' (weight 0.5)
// starred: true = runs in Quick mode (Q1, Q2, Q4, Q9 — behavioural set)
const SCENARIO_QUESTIONS = [
  {
    id: 'Q1', starred: true, type: 'behavioural', theme: 'Action mode',
    prompt: "You're given a problem nobody has solved before. Your first instinct is to…",
    options: [
      { key: 'A', text: 'Sketch the structure. Plan the steps. Design how it all fits together.', tags: ['Architect','Captain'] },
      { key: 'B', text: "Find one person who's done something close. Learn fast.", tags: ['Professor','Detective'] },
      { key: 'C', text: 'Change the question, not just the answer.', tags: ['Magician','Alchemist'] },
      { key: 'D', text: 'Just start. Make something — anything. See what happens.', tags: ['Pioneer','Rebel'] },
    ],
  },
  {
    id: 'Q2', starred: true, type: 'behavioural', theme: 'Taste',
    prompt: 'You scroll past a piece of media that makes you stop. What was it?',
    options: [
      { key: 'A', text: 'An idea that reframed something you thought you understood.', tags: ['Alchemist','Oracle'] },
      { key: 'B', text: "A story that named something you'd been quietly feeling.", tags: ['Healer','Witness'] },
      { key: 'C', text: 'A joke that landed harder than it had any right to.', tags: ['Jester','Muse'] },
      { key: 'D', text: 'Evidence of someone doing something genuinely new.', tags: ['Pioneer','Detective'] },
    ],
  },
  {
    id: 'Q3', starred: false, type: 'behavioural', theme: 'Orientation toward people',
    prompt: 'At a dinner party, the conversation shifts. Which shift do you welcome most?',
    options: [
      { key: 'A', text: "To the personal thing nobody's daring to talk about.", tags: ['Healer','Muse'] },
      { key: 'B', text: "To the systemic thing nobody's questioning.", tags: ['Witness','Detective'] },
      { key: 'C', text: 'To the audacious idea nobody else will defend.', tags: ['Rebel','Pioneer'] },
      { key: 'D', text: 'To the move that pulls everyone in the room back into the conversation.', tags: ['Peacekeeper','Captain'] },
    ],
  },
  {
    id: 'Q4', starred: true, type: 'behavioural', theme: 'Response to wrong',
    prompt: "You see something that isn't right. The fastest response that feels true to you is…",
    options: [
      { key: 'A', text: 'Say it out loud, in the room, even if it costs you.', tags: ['Rebel','Witness'] },
      { key: 'B', text: 'Step between it and the people it would harm.', tags: ['Defender','Peacekeeper'] },
      { key: 'C', text: 'Investigate quietly until you have the full picture.', tags: ['Detective','Oracle'] },
      { key: 'D', text: 'Build the alternative that makes the broken thing obvious.', tags: ['Pioneer','Architect'] },
    ],
  },
  {
    id: 'Q5', starred: false, type: 'aspiration', theme: 'Service direction',
    prompt: "A year from now, you'd most want to be known for shifting things for…",
    options: [
      { key: 'A', text: 'People at the start of their journey who need a map.', tags: ['Captain','Professor'] },
      { key: 'B', text: 'People in pain who need to be properly seen.', tags: ['Healer','Muse'] },
      { key: 'C', text: 'People with power who need to be held to account.', tags: ['Witness','Defender'] },
      { key: 'D', text: 'People with vision who need a thinking partner.', tags: ['Magician','Oracle'] },
    ],
  },
  {
    id: 'Q6', starred: false, type: 'behavioural', theme: 'Authority style',
    prompt: 'People defer to you most when you…',
    options: [
      { key: 'A', text: 'Take responsibility — visibly, without flinching.', tags: ['Captain','Defender'] },
      { key: 'B', text: "Tell a truth they'd been edging toward.", tags: ['Witness','Oracle'] },
      { key: 'C', text: 'Reframe the situation entirely.', tags: ['Magician','Alchemist'] },
      { key: 'D', text: 'Show your working — make the complex obvious.', tags: ['Architect','Professor'] },
    ],
  },
  {
    id: 'Q7', starred: false, type: 'behavioural', theme: 'Energy source',
    prompt: "You're alone with no obligations for a day. What do you actually do?",
    options: [
      { key: 'A', text: 'Build something. A project, a model, a system.', tags: ['Architect','Pioneer'] },
      { key: 'B', text: 'Wander. Read, walk, follow curiosity wherever it leads.', tags: ['Professor','Oracle'] },
      { key: 'C', text: 'Connect. Call old friends. Host a long lunch.', tags: ['Peacekeeper','Healer'] },
      { key: 'D', text: 'Make something just for the joy of it. Write. Sing. Paint. Cook.', tags: ['Muse','Jester'] },
    ],
  },
  {
    id: 'Q8', starred: false, type: 'aspiration', theme: 'Future-self pull',
    prompt: "In five years, the thing you'd most want said about you is…",
    options: [
      { key: 'A', text: '"They changed how I think."', tags: ['Magician','Alchemist'] },
      { key: 'B', text: '"They saw me — and I felt it."', tags: ['Healer','Muse'] },
      { key: 'C', text: '"They made the brave call when nobody else would."', tags: ['Witness','Defender'] },
      { key: 'D', text: '"They led us somewhere none of us could have got alone."', tags: ['Captain','Pioneer'] },
    ],
  },
  {
    id: 'Q9', starred: true, type: 'behavioural', theme: 'Problem-solving identity',
    prompt: 'Three things are broken. You can fix one. Which do you choose?',
    options: [
      { key: 'A', text: 'The thing nobody else realises is broken.', tags: ['Detective','Pioneer'] },
      { key: 'B', text: "The thing that's hurting people right now.", tags: ['Healer','Defender'] },
      { key: 'C', text: 'The thing that, if fixed, makes the other two easier.', tags: ['Architect','Peacekeeper'] },
      { key: 'D', text: 'The thing nobody believes is fixable.', tags: ['Rebel','Magician'] },
    ],
  },
  {
    id: 'Q10', starred: false, type: 'behavioural', theme: 'Self under pressure',
    prompt: "When you've been under real pressure, the version of you that emerged was…",
    options: [
      { key: 'A', text: 'Calmer than you knew you could be.', tags: ['Peacekeeper','Oracle'] },
      { key: 'B', text: 'Sharper. Things got clearer.', tags: ['Detective','Captain'] },
      { key: 'C', text: 'Funnier. Defiantly.', tags: ['Jester','Rebel'] },
      { key: 'D', text: 'Quieter. More precise.', tags: ['Architect','Witness'] },
    ],
  },
];

const ASPIRATION_WEIGHT = 0.5;

// ── Part 13: Quest hooks ──
const QUEST_HOOKS = {
  Pioneer: 'You arrive somewhere first — and bring the language back.',
  Defender: 'You stand between something precious and the thing that would harm it.',
  Magician: 'You make the impossible feel inevitable, room by room.',
  Architect: 'You walk into chaos and leave behind a structure that holds.',
  Alchemist: 'You take two things nobody connected and show everyone the third.',
  Rebel: "You say the thing the room is thinking but won't say.",
  Jester: "You get serious things heard because you don't take yourself seriously.",
  Professor: 'You go deeper than the rest of the room — and give the depth away.',
  Oracle: 'You see patterns early. People come to you when the stakes are high.',
  Witness: 'You refuse to pretend not to see.',
  Muse: 'You leave rooms more creative than you found them.',
  Detective: 'You find what the rest of the room missed.',
  Captain: "You're chosen when something has to actually get done.",
  Healer: "You're who people come to when something is broken in them, not just around them.",
  Peacekeeper: 'You keep the room from breaking.',
};

// ── Part 2: Role models (v3.1 final — duplicates resolved, swaps applied) ──
// category: 'business' | 'creative' | 'activism_or_public_service'
const ROLE_MODELS = [
  // Pioneer
  { name: 'Sara Blakely', quest: 'Pioneer', category: 'business', why: 'Built Spanx from a $5,000 idea into a billion-dollar category nobody believed was a category.' },
  { name: 'Lin-Manuel Miranda', quest: 'Pioneer', category: 'creative', why: 'Rewrote what musical theatre could be by making Founding Fathers rap and refusing to wait for permission.' },
  { name: 'Greta Thunberg', quest: 'Pioneer', category: 'activism_or_public_service', why: 'At 15, sat outside Swedish Parliament with a sign and changed the global conversation on climate.' },
  // Defender
  { name: 'Yvon Chouinard', quest: 'Defender', category: 'business', why: 'Founder of Patagonia. Gave the company to a non-profit climate trust — protected the planet by giving up his fortune.' },
  { name: 'Tarana Burke', quest: 'Defender', category: 'activism_or_public_service', why: 'Coined #MeToo a decade before it went viral. Spent her life protecting survivors of sexual violence.' },
  { name: 'Marcus Rashford', quest: 'Defender', category: 'activism_or_public_service', why: "Forced a UK government U-turn on free school meals in 2020 — used his platform to protect hungry children when institutions wouldn't." },
  // Magician
  { name: 'Walt Disney', quest: 'Magician', category: 'creative', why: 'Spent his life making the imagined feel inevitable. Synonymous with belief-driven worldbuilding.' },
  { name: 'Es Devlin', quest: 'Magician', category: 'creative', why: 'Builds impossible worlds for stadium tours and opera — makes the imagined physical and inevitable, room by room.' },
  { name: 'Hayao Miyazaki', quest: 'Magician', category: 'creative', why: 'Built Studio Ghibli on the principle that animation should feel like a dream remembered, not a film watched.' },
  // Architect
  { name: 'Indra Nooyi', quest: 'Architect', category: 'business', why: 'Former PepsiCo CEO. Restructured the entire portfolio around "Performance with Purpose" — turned a chaotic business into a system.' },
  { name: 'Renzo Piano', quest: 'Architect', category: 'creative', why: 'The Shard, the Pompidou Centre. Buildings that make complicated cities legible.' },
  { name: 'Atul Gawande', quest: 'Architect', category: 'activism_or_public_service', why: 'The Checklist Manifesto. Brought aerospace-grade systems thinking to hospitals and saved tens of thousands of lives.' },
  // Alchemist
  { name: 'Jony Ive', quest: 'Alchemist', category: 'business', why: "Took Bauhaus minimalism, Apple's engineering and Steve Jobs's obsession with feeling and made the iPhone." },
  { name: 'Yuval Noah Harari', quest: 'Alchemist', category: 'creative', why: 'Combines biology, history, philosophy and economics into one continuous argument. Made his discipline up.' },
  { name: 'Brian Eno', quest: 'Alchemist', category: 'creative', why: 'Coined "ambient music" and brought generative systems-thinking into pop — joined disciplines nobody had thought to combine.' },
  // Rebel
  { name: 'Anita Roddick', quest: 'Rebel', category: 'business', why: 'The Body Shop. Built a global retail brand on activist principles when the industry insisted that was impossible.' },
  { name: 'James Baldwin', quest: 'Rebel', category: 'creative', why: "Wrote America's deepest critique of itself with a generosity that made it impossible to dismiss." },
  { name: 'Vivienne Westwood', quest: 'Rebel', category: 'creative', why: 'Turned punk into a global fashion house without ever going corporate — used the runway as four decades of protest.' },
  // Jester
  { name: 'Hannah Gadsby', quest: 'Jester', category: 'creative', why: 'Nanette broke the form of stand-up to deliver a truth no straight comedy set could have carried.' },
  { name: 'Trevor Noah', quest: 'Jester', category: 'creative', why: 'Used the Daily Show to do journalism through humour, especially on race and South African politics.' },
  { name: 'Armando Iannucci', quest: 'Jester', category: 'creative', why: "The Thick of It, Veep. Three decades of satire revealing how power actually talks when it thinks no one's listening." },
  // Professor
  { name: 'Adam Grant', quest: 'Professor', category: 'business', why: 'Wharton academic turned LinkedIn essayist. Made organisational psychology a mainstream literacy.' },
  { name: 'Mary Beard', quest: 'Professor', category: 'activism_or_public_service', why: "Made serious scholarship public and unintimidating — proved depth and accessibility aren't a trade-off." },
  { name: 'Malcolm Gladwell', quest: 'Professor', category: 'creative', why: 'Took academic research from corners of social science and made it bedside reading for a generation.' },
  // Oracle
  { name: 'Toni Morrison', quest: 'Oracle', category: 'creative', why: "Sentences that read like they've existed forever. Every novel a reckoning with American memory." },
  { name: 'Charlie Munger', quest: 'Oracle', category: 'business', why: 'Decades of speeches at Berkshire Hathaway annual meetings. Inverted, always inverted.' },
  { name: 'Wendell Berry', quest: 'Oracle', category: 'creative', why: 'Sage of small-scale farming and place. A whole movement formed around his sentences.' },
  // Witness
  { name: 'Bryan Stevenson', quest: 'Witness', category: 'activism_or_public_service', why: 'Founder of the Equal Justice Initiative. Just Mercy. Has stood beside death-row inmates for 35 years.' },
  { name: 'Darnella Frazier', quest: 'Witness', category: 'activism_or_public_service', why: "Filmed George Floyd's murder and refused to look away. A Pulitzer special citation for the purest act of witness of her generation." },
  { name: 'John Lewis', quest: 'Witness', category: 'activism_or_public_service', why: 'Bloody Sunday, the Edmund Pettus Bridge, six decades of "good trouble." A career of witness.' },
  // Muse
  { name: 'David Bowie', quest: 'Muse', category: 'creative', why: "Made it permissible for other artists to keep changing. Bowie's gift to culture was Bowie's permission." },
  { name: 'Beyoncé', quest: 'Muse', category: 'creative', why: 'Lemonade and Renaissance gave entire communities a vocabulary for selfhood.' },
  { name: 'Esther Perel', quest: 'Muse', category: 'business', why: 'Couples therapist who made talking about desire and infidelity a culture-wide conversation.' },
  // Detective
  { name: 'Eliot Higgins', quest: 'Detective', category: 'activism_or_public_service', why: 'Founder of Bellingcat. Built open-source investigation into a discipline — found the truth of MH17 and Salisbury from public data everyone else ignored.' },
  { name: 'Michael Lewis', quest: 'Detective', category: 'creative', why: 'Moneyball, The Big Short. Finds the people inside a story everyone else missed.' },
  { name: 'Carmen Reinhart', quest: 'Detective', category: 'business', why: 'Co-authored This Time Is Different. Spent decades surfacing the patterns in financial crises everyone else forgot.' },
  // Captain
  { name: 'Jacinda Ardern', quest: 'Captain', category: 'activism_or_public_service', why: 'Led New Zealand through the Christchurch attacks, the White Island eruption, and Covid with visible humanity.' },
  { name: 'Satya Nadella', quest: 'Captain', category: 'business', why: 'Inherited a Microsoft that was losing its way. Rebuilt the culture around growth mindset and turned it into a $3T company.' },
  { name: 'Mary Barra', quest: 'Captain', category: 'business', why: 'CEO of GM. Steered a 120-year-old company through the EV transition without losing the workforce.' },
  // Healer
  { name: 'Brené Brown', quest: 'Healer', category: 'business', why: 'Made vulnerability a leadership vocabulary through twenty years of research and the discipline to stay personal about it.' },
  { name: 'Glennon Doyle', quest: 'Healer', category: 'creative', why: 'Untamed. Took the territory of women\'s recovery and wrote it as a love letter to permission.' },
  { name: 'Bessel van der Kolk', quest: 'Healer', category: 'activism_or_public_service', why: 'The Body Keeps the Score. Changed how a generation understands their own pain.' },
  // Peacekeeper
  { name: 'Mary Robinson', quest: 'Peacekeeper', category: 'activism_or_public_service', why: 'Former Irish President and UN High Commissioner. Built bridges across the most stuck political terrain on earth.' },
  { name: 'Desmond Tutu', quest: 'Peacekeeper', category: 'activism_or_public_service', why: "Chaired South Africa's Truth and Reconciliation Commission. Held a country through its hardest reckoning." },
  { name: 'Christiana Figueres', quest: 'Peacekeeper', category: 'activism_or_public_service', why: 'Steered 195 countries to the Paris Agreement. Turned a decade of deadlocked talks into consensus through relentless optimism.' },
];

// ── Part 3: Activations (v3.1 — 48 practices, cadence-bucketed) ──
// bucket: 'A' = always-available internal rep (<2 min daily)
//         'B' = opportunistic act (when the moment arises)
//         'hygiene' = universal, honestly labelled (#40)
// (#22, #28, #29, #31 moved to WEEKLY_ALTERNATES below — Bucket C)
const ACTIVATIONS = [
  { id: 1,  bucket: 'A', title: 'Recognition', text: 'Send one piece of unsolicited praise to someone whose work moved you today.', tags: ['Healer','Muse','Captain','Peacekeeper'] },
  { id: 2,  bucket: 'A', title: 'Domain note', text: 'Write one sentence about your domain. Just one. About anything you saw, read or thought.', tags: ['Professor','Oracle','Detective','Witness'] },
  { id: 3,  bucket: 'A', title: 'Curious question', text: 'In one conversation today, ask a curious question instead of giving an expert answer.', tags: ['Professor','Healer','Detective','Peacekeeper'] },
  { id: 4,  bucket: 'A', title: 'Future-self voice note', text: 'Record one 60-second voice note to your future self. About anything.', tags: ['Oracle','Muse','Magician'] },
  { id: 5,  bucket: 'A', title: 'One challenging paragraph', text: 'Read one paragraph that pushes against your current thinking.', tags: ['Professor','Alchemist','Oracle'] },
  { id: 6,  bucket: 'B', title: 'Show your working', text: "Post one thing you're working on. Not finished. Working on.", tags: ['Pioneer','Rebel','Muse','Captain'] },
  { id: 7,  bucket: 'B', title: 'Reach back', text: "Reach out to one person from your past network you haven't spoken to in over a year.", tags: ['Peacekeeper','Healer','Captain'] },
  { id: 8,  bucket: 'B', title: 'Name the elephant', text: 'In one meeting today, name the thing the room is avoiding. Kindly.', tags: ['Witness','Rebel','Captain'] },
  { id: 9,  bucket: 'A', title: 'Permit not-knowing', text: 'Once today, say "I don\'t know" out loud, instead of speculating.', tags: ['Healer','Magician','Oracle'] },
  { id: 10, bucket: 'A', title: 'Notice beauty', text: "Stop for 30 seconds to notice one moment of pleasure or beauty. Don't post about it.", tags: ['Muse','Oracle','Peacekeeper'] },
  { id: 11, bucket: 'B', title: 'Fast decision', text: "Make one small decision in under 60 seconds that you'd usually deliberate over.", tags: ['Captain','Pioneer'] },
  { id: 12, bucket: 'A', title: 'One breath', text: 'Before responding to one hard message today, take one full breath.', tags: ['Peacekeeper','Oracle','Healer'] },
  { id: 13, bucket: 'A', title: 'Sketch the mess', text: "Spend two minutes sketching the structure of something messy you're dealing with.", tags: ['Architect','Detective'] },
  { id: 14, bucket: 'A', title: 'Translate', text: "Explain something complex in your domain in one sentence to someone who doesn't know it.", tags: ['Professor','Architect'] },
  { id: 15, bucket: 'B', title: 'Witness someone', text: 'Acknowledge, out loud, what someone close to you is going through.', tags: ['Healer','Witness','Peacekeeper'] },
  { id: 16, bucket: 'B', title: 'Kind disagreement', text: 'Say "I disagree" once today. Kindly. With reason.', tags: ['Rebel','Witness','Defender'] },
  { id: 17, bucket: 'B', title: 'Make something secret', text: "Make one thing today that you don't show anyone.", tags: ['Muse','Pioneer','Magician'] },
  { id: 18, bucket: 'B', title: 'Refuse one thing', text: "Say no to one thing today that doesn't serve your Quest.", tags: ['Captain','Pioneer','Defender'] },
  { id: 19, bucket: 'A', title: 'Future-self rehearsal', text: "Spend 60 seconds imagining your Future Self handling a situation you're avoiding.", tags: ['Magician','Oracle'] },
  { id: 20, bucket: 'A', title: 'Evidence note', text: 'Note one piece of evidence today for the gift others see in you.', tags: ['Detective','Witness'] },
  { id: 21, bucket: 'B', title: 'Make a bridge', text: 'Connect two people in your network who should know each other.', tags: ['Peacekeeper','Captain','Healer'] },
  { id: 23, bucket: 'B', title: 'Mild contrarian take', text: 'Post one mildly contrarian take. Tone: curious, not combative.', tags: ['Rebel','Jester','Witness'] },
  { id: 24, bucket: 'B', title: 'Play, no purpose', text: 'Do one thing today purely for play. With no outcome attached.', tags: ['Jester','Muse'] },
  { id: 25, bucket: 'A', title: 'Reframe the day', text: 'Tell yourself the story of today from a different angle than your default.', tags: ['Magician','Alchemist'] },
  { id: 26, bucket: 'A', title: '100-word observation', text: 'Write 100 words on something you noticed today.', tags: ['Professor','Muse','Witness'] },
  { id: 27, bucket: 'A', title: 'Listen across', text: 'Listen to one full opinion you disagree with, without arguing or rehearsing your reply.', tags: ['Healer','Peacekeeper','Oracle'] },
  { id: 30, bucket: 'A', title: 'Compass check', text: "Reread your locked Quest. Don't adjust. Just remember.", tags: [] },
  { id: 32, bucket: 'A', title: 'Bow to the loss', text: "Acknowledge something that didn't go to plan, without spinning it.", tags: ['Healer','Witness','Oracle'] },
  { id: 33, bucket: 'B', title: 'Strike a postponement', text: "Take one action you've been postponing that takes under five minutes.", tags: ['Captain','Pioneer'] },
  { id: 34, bucket: 'A', title: 'Translate up', text: 'Articulate something hard you understand, in plain words, for someone newer to it.', tags: ['Professor','Captain'] },
  { id: 35, bucket: 'A', title: 'Translate down', text: "Get something concrete from something abstract you've been reading.", tags: ['Detective','Architect'] },
  { id: 36, bucket: 'A', title: 'Praise specifically', text: 'Tell someone what they did well in one specific sentence. Not "great job."', tags: ['Captain','Healer'] },
  { id: 37, bucket: 'A', title: 'Sit with a feeling', text: 'Sit with one difficult feeling for 60 seconds before responding to it.', tags: ['Healer','Oracle'] },
  { id: 38, bucket: 'A', title: 'Re-read past you', text: 'Read one paragraph of something you wrote a year ago. Just to remember.', tags: ['Oracle','Professor','Muse'] },
  { id: 39, bucket: 'B', title: 'Brave send', text: "Send one piece of writing or work you've been sitting on.", tags: ['Rebel','Muse','Pioneer'] },
  { id: 40, bucket: 'hygiene', title: 'Movement break', text: 'Take a five-minute walk between two pieces of work. Phone in another room.', tags: [] },
  // Offline opportunistic set (v3.1)
  { id: 41, bucket: 'B', title: 'The walking ask', text: "Take a 1:1 you'd normally run at a desk and do it walking, with one real question and no agenda.", tags: ['Captain','Healer','Peacekeeper'] },
  { id: 42, bucket: 'B', title: 'Credit in the room', text: 'When an idea lands in a meeting, name out loud the person who actually had it.', tags: ['Captain','Witness','Healer'] },
  { id: 43, bucket: 'B', title: 'Hand it over', text: "Give away one task you'd normally keep, to someone it would stretch. Say why you chose them.", tags: ['Captain','Professor','Architect'] },
  { id: 44, bucket: 'B', title: 'The frontline question', text: "Ask the most junior person in the room what they'd change if it were their call. Then sit with the answer.", tags: ['Detective','Professor','Pioneer'] },
  { id: 45, bucket: 'B', title: 'The handwritten note', text: 'Write one physical note — recognition, thanks, or "I saw what you did" — and hand it over or post it.', tags: ['Healer','Muse','Defender'] },
  { id: 46, bucket: 'B', title: 'Name the standard, kindly', text: 'When something sub-par is about to pass unremarked, say the standard out loud in the room, without blame.', tags: ['Defender','Witness','Rebel'] },
  { id: 47, bucket: 'B', title: "The mentor's reframe", text: 'When someone brings you a stuck problem, resist solving it; reframe the question instead and hand it back.', tags: ['Magician','Oracle','Professor'] },
  { id: 48, bucket: 'B', title: 'Sit in the back', text: "Attend a meeting you'd normally chair and just observe. Say nothing. Notice what runs without you.", tags: ['Oracle','Peacekeeper','Architect'] },
];

// ── Part 4: Weekly practices (3 per Quest) + Bucket C alternates ──
const WEEKLY_PRACTICES = {
  Pioneer: [
    { title: 'The frontier walk', text: 'Spend one hour reading or watching the very newest thing happening in your domain. Take one note about what nobody is yet saying about it.' },
    { title: 'The named experiment', text: "Run one small experiment this week with a named hypothesis and a date to review it. Even if it's a half-hour test." },
    { title: 'The map-back', text: "Write 200 words on what you've learned at the frontier that the people behind you should know." },
  ],
  Defender: [
    { title: 'The standard letter', text: "Write a short letter (post it or don't) to one person whose work upholds a standard you also hold. Tell them you see it." },
    { title: 'The audit', text: 'One hour this week auditing where your time, energy or attention is being leaked from the thing you\'re trying to protect.' },
    { title: 'The line', text: "Identify one new line you're drawing this week. Where you'll say no when it would be easier to say yes." },
  ],
  Magician: [
    { title: 'The reframe brief', text: "Write a one-page reframe of something everyone in your domain is treating as fixed. Don't share it — just write it." },
    { title: 'The new combination', text: "Try one combination of two things that don't normally go together (a method, a frame, a tool, an unlikely conversation)." },
    { title: 'The possibility note', text: 'Write down three "what if" statements about your domain that nobody would currently say out loud.' },
  ],
  Architect: [
    { title: 'The system audit', text: 'Pick one system in your work (process, team, document, product) and spend 45 minutes redesigning it on paper, even if nobody asked.' },
    { title: 'The pattern note', text: "Write 300 words on a structural pattern you've noticed twice this year. Just to capture it." },
    { title: 'The unblock', text: "Identify one structural blocker that's costing the people around you time. Spend an hour designing the fix, even if you don't deploy it yet." },
  ],
  Alchemist: [
    { title: 'The cross-pollination read', text: 'Read 30 minutes of something from a discipline adjacent to yours. Take one note about a connection.' },
    { title: 'The synthesis writeup', text: "Once a week, write 250 words synthesising two things you read or heard that don't obviously connect." },
    { title: 'The portfolio review', text: 'Look at the projects, skills and conversations you\'ve had this week. Name the unexpected combination that\'s emerging.' },
  ],
  Rebel: [
    { title: 'The contrarian post', text: "Publish one piece of writing this week that takes a position you'd normally soften. Don't soften it." },
    { title: 'The unsubscribe', text: "Cancel, decline, or step away from one thing this week that's pulling you toward consensus." },
    { title: 'The truth call', text: "Have one conversation this week where you say the thing you've been not saying. Tactically chosen, deliberately landed." },
  ],
  Jester: [
    { title: 'The form break', text: "Once a week, publish or share something in a format the people around you don't expect from you. Funny, weird, off-genre." },
    { title: 'The 1-hour play', text: 'Spend an hour this week doing something that has zero professional return. The play itself is the work.' },
    { title: 'The hard truth in soft wrapping', text: "Write 200 words about something important that lands because it's also funny." },
  ],
  Professor: [
    { title: 'The teaching hour', text: 'Spend one hour this week teaching someone something you know. Could be 1:1, a Loom, a podcast guest spot, a Substack post.' },
    { title: 'The deep read', text: "Read one academic paper, long-form article, or book chapter in your domain. Don't skim. Underline." },
    { title: 'The cited summary', text: "Write 400 words this week summarising an idea you've encountered. Cite sources. Build the muscle of intellectual rigor in public." },
  ],
  Oracle: [
    { title: 'The pattern dispatch', text: "Once a week, write 200 words about a pattern you're seeing across your conversations or your domain. Share it or don't." },
    { title: 'The slow read', text: "Read a single 30-page chapter of a book you'd normally skim. Take a note about what arrives only because you slowed down." },
    { title: 'The morning sit', text: 'Take 20 minutes one morning this week to sit and think without input. No phone, no podcast, no plan.' },
  ],
  Witness: [
    { title: 'The named-out-loud thing', text: "Once this week, name in a meeting or publicly what you've been quietly noticing about a power dynamic, a pattern, or an injustice." },
    { title: 'The receipts file', text: 'Spend 30 minutes adding to a private file of specific evidence — quotes, screenshots, decisions — about something you may need to speak to later.' },
    { title: 'The op-ed draft', text: 'Draft 500 words for an op-ed you may never publish. The writing is the practice.' },
  ],
  Muse: [
    { title: 'The output for its own sake', text: 'Spend an hour making something with no audience and no purpose. Drawing, music, writing, cooking. Just for the making.' },
    { title: 'The transmission post', text: 'Publish or share one thing this week designed to make someone braver, not smarter.' },
    { title: 'The collaboration ask', text: 'Invite one creative person you admire into something — a coffee, a podcast, a co-write. Without a pitch attached.' },
  ],
  Detective: [
    { title: 'The investigation hour', text: "Spend 60 minutes researching the thing you've been curious about but haven't followed up. Capture three notes." },
    { title: 'The interview', text: "Talk to one person who knows something you don't. Ask one good question. Listen." },
    { title: 'The pattern note', text: "Write 250 words this week about a hidden truth you're starting to see in your domain that others aren't yet naming." },
  ],
  Captain: [
    { title: 'The vision update', text: "Spend 30 minutes restating your team's or organisation's direction in your own words. Send it." },
    { title: 'The 1:1 deepening', text: 'Run one 1:1 this week with double the usual time. Just listening.' },
    { title: 'The decision-debrief', text: "Pick one decision you made this week. Write 200 words on why, what was hard, and what you'd do differently. Share it." },
  ],
  Healer: [
    { title: 'The reach-toward', text: "Reach out to one person who's going through something hard. Not with advice. With presence." },
    { title: 'The honest piece', text: 'Publish one piece of writing or content this week that names something hard about your own experience.' },
    { title: 'The boundary', text: "Identify one thing this week you're carrying that isn't yours. Set it down." },
  ],
  Peacekeeper: [
    { title: 'The bridge call', text: 'Have one conversation this week with two people who are at odds, or one person on the harder side of a dynamic you\'re holding.' },
    { title: 'The mediating writeup', text: 'Write 200 words this week reframing a conflict around a shared interest both sides could meet on.' },
    { title: 'The quiet centre', text: 'Spend one hour this week with no input, no obligations, no agenda. Restore the calm you offer others.' },
  ],
};

// Bucket C — weekly alternates absorbed from the daily library (v3.1)
const WEEKLY_ALTERNATES = [
  { id: 22, title: 'Defend the work', text: 'Protect 30 uninterrupted minutes today for your most important work.', tags: ['Defender','Architect'] },
  { id: 28, title: "Build, don't talk", text: 'Spend 20 minutes building, not discussing.', tags: ['Pioneer','Architect','Captain'] },
  { id: 29, title: 'Mentor moment', text: 'Give 10 minutes of attention to someone earlier in their journey than you.', tags: ['Professor','Captain','Healer'] },
  { id: 31, title: 'Cull one', text: "Delete one thing from your calendar this week that you've been dreading.", tags: ['Defender','Architect'] },
];

// ── Part 8: Flow constants ──
const ACTIVATION_PICKS = { minDaily: 4, maxDaily: 6, minWeekly: 1, maxWeekly: 2 };
const RECONCILIATION = { scenarioWeight: 0.65, activationWeight: 0.35 };

// ── Part 9: Mirror chapter options ──
const VOCATIONS = [
  'Founder / CEO of a company you started',
  'Senior executive in a larger organisation',
  'Independent consultant / coach / fractional exec',
  'Creative practitioner (artist, writer, designer, musician, filmmaker)',
  'Educator / academic / researcher',
  'Public servant / nonprofit leader / activist',
  'Specialist / individual contributor in your field',
  'In transition / exploring what\'s next',
];
const ONLINE_BASELINES = ['regularly', 'occasionally', 'trying_to_start', 'not_yet'];
const PLATFORMS = ['LinkedIn','X (Twitter)','Substack','Personal website','Podcast','YouTube','Instagram','TikTok','Medium','Newsletter (other)','Somewhere else'];

// ── Tiers (synthesis recommendation) ──
const TIERS = ['Leader Sprint', 'Fractional Brand Partner', 'Leadership Cohort', 'Game only'];

module.exports = {
  QUESTS, SCENARIO_QUESTIONS, ASPIRATION_WEIGHT, QUEST_HOOKS, ROLE_MODELS,
  ACTIVATIONS, WEEKLY_PRACTICES, WEEKLY_ALTERNATES,
  ACTIVATION_PICKS, RECONCILIATION, VOCATIONS, ONLINE_BASELINES, PLATFORMS, TIERS,
};
