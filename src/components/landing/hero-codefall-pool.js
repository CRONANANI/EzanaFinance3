/* Hero codefall: fragments of Ezana's data plane. Decorative, aria-hidden.
   Kinds drive the syntax colouring: k = key/value, q = EzanaQL, e = event,
   n = number-led, s = system. Values are illustrative, never live.

   Size: the nine lanes swap about one fragment a second between them, and the
   swaps draw from one shared rotation (HeroDeviceShowcase), so a fragment
   comes back roughly every POOL.length seconds. 66 fragments keeps any repeat
   about a minute apart; add more to stretch it. Keep each one 44 chars or
   fewer, and public data only (politicians, public filers, agencies). */
export const CODEFALL_POOL = [
  { k: 'k', t: '"signal": "consumer_spending"' },
  { k: 'k', t: '"ticker": "PLTR", "award": "$27M"' },
  { k: 'n', t: '"Δ30d": +6.2%' },
  { k: 'k', t: '"filer": "13F-HR", "positions": 214' },
  { k: 'q', t: 'ezq> top contractors where agency=DoD' },
  { k: 'e', t: 'PTR filed · Sen. · NVDA · $15K–50K' },
  { k: 'k', t: '"lobbying": { "q": "2026Q3", "$": 4.1M }' },
  { k: 'n', t: '+1,000 t gold · central banks · 3rd yr' },
  { k: 's', t: 'ping → 9 datasets swept · 412ms' },
  { k: 'k', t: '"cusip": "037833100", "Δshares": -2.1%' },
  { k: 'e', t: 'OFAC SDN +14 entries · RU · vessels' },
  { k: 'q', t: 'ezq> insider buys > $1M last 30d' },
  { k: 'k', t: '"patents": 1_284, "cpc": "H01L"' },
  { k: 'n', t: 'GPR index 142.6 ▲ 9.4' },
  { k: 'k', t: '"port": "Rotterdam", "calls": 1_902' },
  { k: 'e', t: 'Form 4 · CEO · BUY · 25,000 sh' },
  { k: 'k', t: '"cpi_yoy": 3.6, "proj": true' },
  { k: 's', t: 'ledger.append({ rating: +24 })' },
  { k: 'k', t: '"committee": "SASC", "seat": "R"' },
  { k: 'n', t: 'p(cut) 0.62 · polymarket' },
  { k: 'q', t: 'ezq> etf holders of SMH' },
  { k: 'k', t: '"night_lights": +3.8%, "region": "IN"' },
  { k: 'e', t: '8-K · Item 2.02 · results' },
  { k: 'k', t: '"exec_comp": "$31.2M", "ratio": 312' },
  { k: 'n', t: '10y 4.21% ▼ 6bp' },
  { k: 's', t: 'sonar.cite([S1, S3, S7])' },
  { k: 'k', t: '"award_id": "W58RGZ-26-C-0041"' },
  { k: 'e', t: 'House PTR · AAPL · sale · $50K–100K' },
  { k: 'k', t: '"sector": "semis", "breadth": 0.71' },
  { k: 'q', t: 'ezq> trades near award date ±14d' },
  { k: 'n', t: 'Δ13F whales +$2.4B · energy' },
  { k: 'k', t: '"chokepoint": "Hormuz", "transits": 87' },
  { k: 'e', t: 'SC 13D · 7.2% stake · activist' },
  { k: 'k', t: '"gdp_growth": 6.6, "rank": "1/49"' },
  { k: 's', t: 'snapshot.refresh("lobbying")' },
  { k: 'n', t: 'ELO 2500 · Strategist' },
  { k: 'k', t: '"bill": "HR 4521", "stage": "passed"' },
  { k: 'q', t: 'ezq> sanctions by country since 2024' },
  { k: 'e', t: 'Contract mod · +$118M · Navy' },
  { k: 'k', t: '"crowd": 0.38, "market": "Fed Dec"' },
  { k: 'n', t: 'consumer whispers ▲ 12.0%' },
  { k: 's', t: 'stream.subscribe("capitol")' },
  { k: 'k', t: '"agency": "DOE", "obligated": "$412M"' },
  { k: 'e', t: '13F-HR · Q3 · new stake · AVGO' },
  { k: 'q', t: 'ezq> lobbying spend by issue, 2026' },
  { k: 'n', t: 'Brent $84.10 ▲ 1.8%' },
  { k: 'k', t: '"sanctions": "EU", "package": 19' },
  { k: 's', t: 'cache.hit("contracts") · 38ms' },
  { k: 'k', t: '"vessel": "VLCC", "flag": "PA"' },
  { k: 'e', t: 'Senate vote · S. 2296 · 51 to 49' },
  { k: 'n', t: 'DXY 103.4 ▼ 0.3' },
  { k: 'k', t: '"insider": "CFO", "shares": 12_000' },
  { k: 'q', t: 'ezq> whales adding energy this qtr' },
  { k: 'k', t: '"pac": "leadership", "cycle": 2026' },
  { k: 'e', t: 'Form 4 · Director · SELL · 8,400 sh' },
  { k: 'n', t: 'p(recession) 0.27 · kalshi' },
  { k: 's', t: 'ingest.usaspending() · 2,114 rows' },
  { k: 'k', t: '"metal": "copper", "Δ90d": +11.4%' },
  { k: 'k', t: '"hearing": "HFSC", "topic": "stablecoins"' },
  { k: 'n', t: 'HY spread 312bp ▼ 9' },
  { k: 'e', t: 'S-1 filed · fintech · NYSE' },
  { k: 'q', t: 'ezq> politicians trading SMH' },
  { k: 'k', t: '"freight": "SHA-LAX", "usd_feu": 2_840' },
  { k: 's', t: 'empire.score("CN") · 18 dims' },
  { k: 'n', t: 'GPR Taiwan ▲ 22.0' },
  { k: 'k', t: '"rd_spend": "$8.9B", "ratio": 0.21' },
];

/**
 * Split a fragment into coloured tokens: [{ c, t }], where c is
 *   'key'  a quoted key (followed by a colon) or the ezq> prompt, muted ink
 *   'str'  a quoted value, primary ink
 *   'up'   a number, a + delta or ▲, emerald
 *   'dn'   a - delta, ▼ and the figure after it, danger
 *   ''     punctuation and words, the lane's base ink
 * System lines (kind 's') are one plain token; CSS sets them italic, faint.
 * Pure, so the server render and the client swaps colour identically.
 */
const TOKEN =
  /("(?:[^"\\]|\\.)*")(\s*:)?|(ezq>)|([▲▼])|((?<![\p{L}\p{N}])(?:[+\-−]\$?|\$)?\d(?:[\d_]|[.,]\d)*(?:%|bp|[KMB])?(?![\p{L}\p{N}]))/gu;

export function tokenizeFragment(frag) {
  const { k, t } = frag;
  if (k === 's') return [{ c: '', t }];
  const out = [];
  let last = 0;
  let downNext = false;
  const push = (c, s) => {
    if (!s) return;
    const prev = out[out.length - 1];
    if (prev && prev.c === c) prev.t += s;
    else out.push({ c, t: s });
  };
  for (const m of t.matchAll(TOKEN)) {
    push('', t.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1]) {
      push(m[2] ? 'key' : 'str', m[1]);
      push('', m[2] || '');
      downNext = false;
    } else if (m[3]) {
      push('key', m[3]);
    } else if (m[4]) {
      downNext = m[4] === '▼';
      push(downNext ? 'dn' : 'up', m[4]);
    } else if (m[5]) {
      const neg = /^[-−]/.test(m[5]);
      push(neg || downNext ? 'dn' : 'up', m[5]);
      downNext = false;
    }
  }
  push('', t.slice(last));
  return out;
}
