/**
 * Platform chart theme. Every recharts chart reads its presentation props
 * from here so charts cannot drift. Colors are CSS custom property strings
 * (recharts passes them through to SVG, where var() resolves), so light and
 * dark mode keep working.
 */
export const CHART = {
  tick: { fill: 'var(--text-muted)', fontSize: 11 },
  gridDash: '3 3',
  gridStroke: 'var(--border-secondary)',
  xAxisLine: { stroke: 'var(--border-primary)' },
  primaryStroke: 'var(--emerald)',
  primaryStrokeWidth: 2,
  secondaryStrokeWidth: 1.5,
  gradientFromOpacity: 0.25,
  gradientToOpacity: 0,
  animationDuration: 400,
  negativeStroke: 'var(--negative)',
  goldStroke: 'var(--gold-champagne)',
};
