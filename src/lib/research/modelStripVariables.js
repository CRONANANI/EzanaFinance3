/**
 * Per-model “transparency” variables for ModelVariableStrip (AI analysis path).
 * Values use live market data when available; otherwise placeholders.
 *
 * @param {string} modelId
 * @param {{ marketData?: { price?: number, changesPercentage?: number }, marketDataFromAny?: any }} [ctx]
 * @returns {import('@/components/research/models/ModelVariableStrip.jsx').ModelVariable[]}
 */
export function getModelStripVariables(modelId, ctx = {}) {
  const md = ctx.marketData || ctx.analysis?.marketData;
  const price = md?.price != null && Number.isFinite(Number(md.price)) ? Number(md.price) : null;
  const chg = md?.changesPercentage != null && Number.isFinite(Number(md.changesPercentage))
    ? Number(md.changesPercentage)
    : null;

  const c = (label, v, format) => ({
    label,
    value: v === undefined || v === null ? '—' : v,
    format,
  });

  switch (modelId) {
    case 'grpv':
      return [
        c('GRPV score', '—', 'number'),
        c('Growth', '—', 'number'),
        c('Risk', '—', 'number'),
        c('Price / Value', '—', 'number'),
        c('vs sector P/E', '—', 'multiple'),
        c('Moat', '—', undefined),
      ];
    case 'risk':
      return [
        c('Volatility (ann.)', '—', 'percent'),
        c('Beta (vs SPY)', '—', 'number'),
        c('Sharpe', '—', 'number'),
        c('Max drawdown', '—', 'percent'),
        c('VaR (95%)', '—', 'percent'),
        c('Sortino', '—', 'number'),
      ];
    case 'earnings':
      return [
        c('EPS (TTM)', '—', 'number'),
        c('YoY EPS growth', '—', 'percent'),
        c('Forward P/E', '—', 'multiple'),
        c('PEG ratio', '—', 'multiple'),
        c('Surprise %', '—', 'percent'),
        c('Guidance', '—', undefined),
      ];
    case 'comps':
      return [
        c('Peer median P/E', '—', 'multiple'),
        c('EV / EBITDA', '—', 'multiple'),
        c('EV / Rev', '—', 'multiple'),
        c('FCF yield', '—', 'percent'),
        c('vs peer band', '—', undefined),
        c('Implied fair range', '—', undefined),
      ];
    case 'threestatement':
      return [
        c('Rev. growth Y1–5', '—', 'percent'),
        c('EBITDA margin', '—', 'percent'),
        c('FCF margin', '—', 'percent'),
        c('Capex / rev', '—', 'percent'),
        c('Net debt / EBITDA', '—', 'multiple'),
        c('Balance check', '—', undefined),
      ];
    case 'lbo':
      return [
        c('Entry EV/EBITDA', '—', 'multiple'),
        c('Net leverage', '—', 'multiple'),
        c('IRR (base)', '—', 'percent'),
        c('MOIC', '—', 'multiple'),
        c('Exit year', 'Y5', undefined),
        c('Debt paydown', '—', undefined),
      ];
    case 'ma':
      return [
        c('Offer premium', '—', 'percent'),
        c('Cash / stock / debt', '—', undefined),
        c('Y1 EPS impact', '—', 'percent'),
        c('Accretive?', '—', undefined),
        c('Synergies', '—', undefined),
        c('Breakeven yr', '—', undefined),
      ];
    case 'montecarlo':
      return [
        c('Paths', '10,000', 'number'),
        c('P5 / P50 / P95', '—', undefined),
        c('P(profit)', '—', 'percent'),
        c('E[value]', '—', 'currency'),
        c('Vol input', '—', 'percent'),
        c('Horizon', '1Y', undefined),
      ];
    default:
      return [
        c('Last price', price, price != null ? 'currency' : undefined),
        c(
          'Day %',
          chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : '—',
          undefined,
        ),
        c('Model', String(modelId || '—'), undefined),
        c('—', '—', undefined),
        c('—', '—', undefined),
        c('—', '—', undefined),
      ];
  }
}
