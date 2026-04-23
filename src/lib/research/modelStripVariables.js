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
        c('Scenario', 'Base', undefined),
        c('Shock mag.', '—', 'percent'),
        c('Correlation', '—', undefined),
        c('Horizon', '12m', undefined),
        c('Liquidity', '—', undefined),
        c('Recovery', '—', undefined),
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
    case 'technical':
      return [
        c('RSI (14)', '—', 'number'),
        c('MACD', '—', undefined),
        c('50-day MA', '—', 'currency'),
        c('200-day MA', '—', 'currency'),
        c('Bollinger %b', '—', 'number'),
        c('Vol. vs avg', '—', undefined),
      ];
    case 'dividend':
      return [
        c('Dividend yield', '—', 'percent'),
        c('Payout ratio', '—', 'percent'),
        c('5Y growth', '—', 'percent'),
        c('Yrs increases', '—', 'number'),
        c('Forward yield', '—', 'percent'),
        c('Ex-div. date', '—', undefined),
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
