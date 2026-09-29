/**
 * Politician Tracker sample fixture. Served ONLY when the live feed is not
 * configured (the trades API answers 503), under the SAMPLE DATA chip.
 *
 * Names are placeholders on purpose: no real member is ever shown with
 * invented trades. Rows are generated deterministically from the table in
 * docs/design/tracker-handoff/04-SPEC.md section 10 (no Math.random), in the
 * canonical trade shape the page binds to, so the whole page runs through
 * the same model functions as live data.
 */

const ROWS = [
  ['House', 'D', 'CA', 12, 4_800_000, 42, 26, 16, '2026-09-24', ['NVDA', 'MSFT', 'AAPL']],
  ['Senate', 'R', 'TX', null, 3_100_000, 18, 5, 13, '2026-09-22', ['XOM', 'LMT']],
  ['House', 'R', 'FL', 19, 2_600_000, 27, 15, 12, '2026-09-19', ['AMZN', 'NVDA', 'TSLA']],
  ['House', 'D', 'NY', 14, 1_900_000, 11, 9, 2, '2026-09-18', ['LMT', 'RTX']],
  ['Senate', 'I', 'VT', null, 1_400_000, 9, 4, 5, '2026-09-15', ['VTI', 'AAPL']],
  ['House', 'D', 'IL', 7, 960_000, 14, 8, 6, '2026-09-12', ['AAPL', 'GOOGL']],
  ['Senate', 'D', 'WA', null, 820_000, 7, 3, 4, '2026-09-11', ['MSFT', 'AMZN', 'BA']],
  ['House', 'R', 'OH', 4, 610_000, 12, 7, 5, '2026-09-09', ['CAT', 'DE']],
  ['House', 'D', 'TX', 35, 540_000, 6, 6, 0, '2026-09-05', ['NVDA']],
  ['Senate', 'R', 'UT', null, 470_000, 8, 2, 6, '2026-09-02', ['JPM', 'GS', 'V']],
  ['House', 'R', 'GA', 14, 390_000, 5, 3, 2, '2026-08-30', ['TSLA', 'PLTR']],
  ['House', 'D', 'MA', 4, 330_000, 9, 4, 5, '2026-08-28', ['UNH', 'PFE']],
  ['Senate', 'D', 'CO', null, 290_000, 4, 2, 2, '2026-08-25', ['COST', 'HD']],
  ['House', 'R', 'NC', 8, 240_000, 7, 5, 2, '2026-08-21', ['META', 'AMZN']],
  ['House', 'D', 'AZ', 7, 190_000, 3, 3, 0, '2026-08-19', ['SPY']],
  ['Senate', 'R', 'MT', null, 160_000, 5, 1, 4, '2026-08-14', ['NEE', 'DUK']],
];

function daysBefore(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function buildFixtureTrades() {
  const out = [];
  ROWS.forEach(([chamber, party, state, district, volume, n, buys, sells, last, tickers], i) => {
    /* One placeholder per row; the index keeps the keys distinct. */
    const name = `[Member name]`;
    const key = `FIX${String(i + 1).padStart(3, '0')}`;
    const mid = Math.round(volume / n);
    for (let k = 0; k < n; k += 1) {
      const side = k < buys ? 'purchase' : k < buys + sells ? 'sale' : 'exchange';
      const tradedAt = daysBefore(last, k * 3);
      out.push({
        id: `${key}-${k}`,
        name,
        chamber,
        party,
        state,
        district,
        bioguideId: key,
        ticker: tickers[k % tickers.length],
        side,
        amountBand: { raw: `$${mid.toLocaleString('en-US')} (sample)`, min: mid, max: mid, mid },
        tradedAt,
        filedAt: daysBefore(tradedAt, -12),
        sourceUrl: null,
      });
    }
  });
  return out.sort((a, b) => b.filedAt.localeCompare(a.filedAt));
}
