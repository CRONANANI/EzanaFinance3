export function computeBeginnerScore({
  experienceLevel = 'Beginner',
  totalXp = 0,
  checklistPct = 0,
  accountAgeDays = 0,
  lessonsCompleted = 0,
  analysesRun = 0,
  hasWatchlist = false,
  hasPosted = false,
}) {
  const expBase =
    { Beginner: 100, Intermediate: 55, Advanced: 25, Expert: 0 }[experienceLevel] ?? 100;

  const xpDecay = Math.min(35, totalXp / 40);
  const checklistDecay = checklistPct * 20;
  const tenureDecay = Math.min(10, accountAgeDays * 0.5);

  const competenceDecay =
    Math.min(12, lessonsCompleted * 2) +
    Math.min(10, analysesRun * 2.5) +
    (hasWatchlist ? 4 : 0) +
    (hasPosted ? 4 : 0);

  const raw = expBase - xpDecay - checklistDecay - tenureDecay - competenceDecay;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export const BEGINNER_BANDS = {
  isBeginner: (s) => s >= 60,
  isLearning: (s) => s >= 30 && s < 60,
  isSeasoned: (s) => s < 30,
};

export function scoreToBand(score) {
  if (BEGINNER_BANDS.isBeginner(score)) return 'beginner';
  if (BEGINNER_BANDS.isLearning(score)) return 'learning';
  return 'seasoned';
}
