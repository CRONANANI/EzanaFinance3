/**
 * Platform chart theme. Every recharts chart reads its presentation props
 * from here so charts cannot drift. Colors are CSS custom property strings
 * (recharts passes them through to SVG, where var() resolves), so light and
 * dark mode keep working.
 */
export const CHART = {
  // Axis ticks are numbers, dates and tickers: IBM Plex Mono via the token.
  // Category axes that carry words (sector names, company names) should pass
  // { ...CHART.tick, fontFamily: 'var(--font-sans)' }.
  tick: { fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' },
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
