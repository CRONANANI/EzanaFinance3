/**
 * The default pitch-competition rubric a new competition is seeded with, so hosts
 * start from something real instead of a blank slate. Aligned to the
 * EzanaRatingScorecard category shape ({ label, weight, max_score }) so Phase 3's
 * judge scoring can reuse the same weighted-composite model. Weights are relative
 * (normalized at scoring time), not required to sum to any total.
 */
export const DEFAULT_RUBRIC = [
  {
    label: 'Thesis & catalyst',
    description: 'Clarity of the investment thesis and the catalyst that closes the gap to fair value.',
    weight: 1.25,
    max_score: 10,
    sort_order: 0,
  },
  {
    label: 'Valuation rigor',
    description: 'Quality of the valuation work and the defensibility of the assumptions behind it.',
    weight: 1.25,
    max_score: 10,
    sort_order: 1,
  },
  {
    label: 'Risk & downside',
    description: 'Identification of the key risks and an honest, quantified downside case.',
    weight: 1,
    max_score: 10,
    sort_order: 2,
  },
  {
    label: 'Presentation',
    description: 'Structure, clarity, and delivery of the pitch within the time limit.',
    weight: 0.75,
    max_score: 10,
    sort_order: 3,
  },
  {
    label: 'Q&A',
    description: 'Command of the material and composure under questioning from the judges.',
    weight: 0.75,
    max_score: 10,
    sort_order: 4,
  },
];
