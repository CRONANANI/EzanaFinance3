/**
 * The charts on a Sonar answer that the composer's Build menu can add to the next question
 * (Nov 21 2026). Each is the chart's own data as plain text, so the research run reads the
 * same numbers the reader sees. Pure; nothing here invents a value.
 * -> [{ id, label, text }]
 */

const usd = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'N/A';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
};

export function answerCharts(live) {
  const d = live?.dossier;
  if (!d) return [];
  const out = [];
  if (d.kind === 'politician' && Array.isArray(d.series) && d.series.length >= 2) {
    const months = Array.isArray(d.seriesMonths) ? d.seriesMonths : [];
    const rows = d.series.map((v, i) => `${months[i] || `M${i + 1}`}: ${usd(v)}`);
    out.push({
      id: `pol-value-${d.bioguideId || d.name}`,
      label: `${d.name} estimated portfolio value`,
      text: [
        `${d.name} estimated open portfolio value by month (from disclosed STOCK Act ranges at their midpoints; no market prices applied).`,
        ...rows,
      ].join('\n'),
    });
  }
  if (d.kind === 'politician' && Array.isArray(d.holdings) && d.holdings.length) {
    out.push({
      id: `pol-positions-${d.bioguideId || d.name}`,
      label: `${d.name} open positions`,
      text: [
        `${d.name} largest estimated open positions (share of the estimated open book, by disclosed ranges).`,
        ...d.holdings.map(
          (h) =>
            `${h.ticker}${h.company ? ` (${h.company})` : ''}: ${
              typeof h.share === 'number' ? `${(h.share * 100).toFixed(1)}%` : 'N/A'
            }`,
        ),
      ].join('\n'),
    });
  }
  if (d.kind === 'company' && d.ticker && Array.isArray(d.spark) && d.spark.length >= 2) {
    const dates = Array.isArray(d.sparkDates) ? d.sparkDates : [];
    out.push({
      id: `price-${d.ticker}`,
      label: `${d.ticker} price chart`,
      text: [
        `${d.ticker} closing prices${d.sparkLabel ? ` (${d.sparkLabel})` : ''}.`,
        ...d.spark.map((v, i) => `${dates[i] || `P${i + 1}`}: ${Number(v).toFixed(2)}`),
      ].join('\n'),
    });
  }
  return out;
}
