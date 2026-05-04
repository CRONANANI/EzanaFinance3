/**
 * 12 legendary investors paired with Greek mythological divine animals.
 * Each animal is a "familiar" representing the investor's edge.
 */
export const ADVISORS = [
  { id: 'buffett', name: 'BuffettBot', persona: 'Warren Buffett', edge: 'Value · Compounding', animal: 'Owl', myth: 'Owl of Athena — wisdom, foresight, patience', glyph: '🦉', bio: 'Patient as the owl, BuffettBot waits for fat pitches. Surfaces durable moats, owner-operator quality, and compounding setups. Will not chase narrative.', stats: { conviction: '92%', coverage: 'Equities · Insurance', recency: '2d' } },
  { id: 'munger', name: 'MungerMind', persona: 'Charlie Munger', edge: 'Mental Models · Inversion', animal: 'Tortoise', myth: 'Tortoise of Hermes — slow, deliberate, structural', glyph: '🐢', bio: 'Inversion-first. Walks the tortoise\'s path: slow, structural reasoning across mental models. Flags lollapalooza setups and stupid mistakes.', stats: { conviction: '88%', coverage: 'Mental Models', recency: '5d' } },
  { id: 'dalio', name: 'DalioMind', persona: 'Ray Dalio', edge: 'Macro · Principles', animal: 'Bull', myth: 'Cretan Bull — raw cyclical force', glyph: '🐂', bio: 'Reads the cycle like the Cretan bull\'s stamping hooves. Maps debt, productivity, and political regimes. Best in regime-change moments.', stats: { conviction: '84%', coverage: 'Macro · Cycles', recency: '1d' } },
  { id: 'wood', name: 'ArkOracle', persona: 'Cathie Wood', edge: 'Disruption · Innovation', animal: 'Pegasus', myth: 'Winged horse — flight, leaps of innovation', glyph: '🐎', bio: 'Pegasus of the council — leaps where others can\'t reach. Tracks S-curves and platform inflections. High variance, high vision.', stats: { conviction: '76%', coverage: 'Innovation · Disruptive Tech', recency: '3h' } },
  { id: 'tudor', name: 'TudorSignal', persona: 'Paul Tudor Jones', edge: 'Trend · Tape Reading', animal: 'Hawk', myth: 'Hawk of Apollo — sharp sight, swift strike', glyph: '🦅', bio: 'Hawk of Apollo. Lives on the tape. Synthesizes price action, positioning, and sentiment with predator clarity.', stats: { conviction: '81%', coverage: 'Trend · Futures', recency: '1d' } },
  { id: 'lynch', name: 'LynchScout', persona: 'Peter Lynch', edge: 'Bottom-up · Local edge', animal: 'Stag', myth: 'Ceryneian Hind — keen, elusive ground truth', glyph: '🦌', bio: 'Stag of the chamber — keen ears to the ground. Local truth, store checks, channel signals. The "invest in what you know" familiar.', stats: { conviction: '85%', coverage: 'Bottom-up · Consumer', recency: '4d' } },
  { id: 'soros', name: 'SorosReflex', persona: 'George Soros', edge: 'Reflexivity · Macro bets', animal: 'Serpent', myth: 'Python of Delphi — coiled, oracular reversal', glyph: '🐍', bio: 'The Pythia coiled. Reflexivity made flesh: feedback loops between perception and price. Strikes at regime hinges.', stats: { conviction: '79%', coverage: 'Macro · FX', recency: '2d' } },
  { id: 'ackman', name: 'AckmanBlade', persona: 'Bill Ackman', edge: 'Activism · Concentration', animal: 'Lion', myth: 'Nemean Lion — direct, unyielding pressure', glyph: '🦁', bio: 'Nemean Lion. Concentrated, public, unyielding. Pressure-tests management, surfaces activist asymmetries.', stats: { conviction: '83%', coverage: 'Activism · Concentrated', recency: '1d' } },
  { id: 'burry', name: 'BurryShade', persona: 'Michael Burry', edge: 'Contrarian · Tail risk', animal: 'Raven', myth: 'Raven of Apollo — prophet of unwelcome truth', glyph: '🐦‍⬛', bio: 'Raven of unwelcome truths. Pattern-recognizes the rot others miss. Tail risk, fraud, structural shorts.', stats: { conviction: '71%', coverage: 'Tail risk · Shorts', recency: '6h' } },
  { id: 'marks', name: 'MarksMemo', persona: 'Howard Marks', edge: 'Cycles · Risk-aware', animal: 'Dolphin', myth: 'Dolphin of Poseidon — reads the tide', glyph: '🐬', bio: 'Dolphin reading the tide. Where are we in the cycle? What is the price of risk? Calibrates without forecasting.', stats: { conviction: '87%', coverage: 'Credit · Cycles', recency: '2d' } },
  { id: 'druck', name: 'DruckPulse', persona: 'Stanley Druckenmiller', edge: 'Liquidity · Position sizing', animal: 'Wolf', myth: 'Wolf of Apollo — pack timing, decisive kill', glyph: '🐺', bio: 'Wolf of the pack. Position sizing as art. Liquidity-driven, asymmetric. Will switch sides without ego.', stats: { conviction: '82%', coverage: 'Liquidity · Macro', recency: '12h' } },
  { id: 'graham', name: 'GrahamCore', persona: 'Benjamin Graham', edge: 'Margin of Safety · Defense', animal: 'Ram', myth: 'Golden Ram of Chrysomallos — fleece of safety', glyph: '🐏', bio: 'Golden Fleece — the original margin of safety. Quantitative defense. Sleeps well at night.', stats: { conviction: '94%', coverage: 'Defense · Value', recency: '3d' } },
];

/** Build the 12-seat horseshoe layout for the SVG chamber */
export function buildSeats() {
  const cx = 800;
  const seats = [];

  seats.push({ x: cx - 95, y: 530, scale: 0.62, z: 0, idx: 0, side: 'back' });
  seats.push({ x: cx + 95, y: 530, scale: 0.62, z: 1, idx: 1, side: 'back' });

  const leftArm = [
    { x: cx - 230, y: 555, scale: 0.7, z: 2 },
    { x: cx - 360, y: 600, scale: 0.8, z: 4 },
    { x: cx - 500, y: 660, scale: 0.92, z: 6 },
    { x: cx - 640, y: 740, scale: 1.05, z: 8 },
    { x: cx - 770, y: 840, scale: 1.18, z: 10 },
  ];
  leftArm.forEach((s, i) => seats.push({ ...s, idx: 2 + i, side: 'left' }));

  const rightArm = [
    { x: cx + 230, y: 555, scale: 0.7, z: 3 },
    { x: cx + 360, y: 600, scale: 0.8, z: 5 },
    { x: cx + 500, y: 660, scale: 0.92, z: 7 },
    { x: cx + 640, y: 740, scale: 1.05, z: 9 },
    { x: cx + 770, y: 840, scale: 1.18, z: 11 },
  ];
  rightArm.forEach((s, i) => seats.push({ ...s, idx: 7 + i, side: 'right' }));

  return seats;
}
