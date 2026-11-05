/**
 * Sonar 13F flows (Nov 4): "What are hedge funds selling right now?",
 * "What are institutions buying in tech?", "biggest 13F sells this quarter".
 *
 * Before this the ping had no subject to resolve (no company, member,
 * country or industry), retrieval kept nothing, and the visitor got a
 * general briefing explaining what a 13F is while Ezana's own 13F flows sat
 * unread. A flows ping now reads the flow-leaders snapshot that
 * refresh_titans_flows() stores each hour (titans_snapshots,
 * key 'flows:<quarter>'): one primary-key read, no aggregation on the ping.
 *
 *   detectFlowsPing(text)      { side, sector, sectorLabel } or null
 *   buildFlowsDossier(opts)    the dossier the stack renders (kind 'flows')
 *   flowsEvidence(dossier)     the snippets the brief reads and cites
 *   FLOWS_ADDENDUM             the brief's instructions for this ping
 *
 * Honesty rules, all enforced here rather than left to the model:
 *   - Every figure is from the snapshot. Nothing is estimated or filled.
 *   - 13F filers are institutional managers above $100M (hedge funds among
 *     them); Ezana does not classify which filers are hedge funds, so the
 *     copy says "13F filers" and never labels a filer a hedge fund.
 *   - Coverage is stated: how many filers and how much reported value the
 *     quarter-over-quarter comparison saw, out of the quarter's total.
 *   - 13F reports long US equity positions at quarter end, filed up to 45
 *     days later. Short positions are not disclosed. "Right now" means the
 *     latest filed quarter, and the copy says which.
 */
import { latestCompleteQuarter, currentReportQuarter, quarterLabelLong } from '@/lib/sec/quarters';

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

export const usdShort = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'n/a';
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}K`;
  return `${s}$${Math.round(a)}`;
};

/* ── Detection ──────────────────────────────────────────────────────── */

/* Who: the managers 13F covers, however the visitor names them. */
const ACTOR_RE =
  /\b(hedge[\s-]?funds?|institutions?|institutional(?:\s+(?:investors?|money|managers?))?|13[\s-]?f(?:s|\s+filers?)?|asset\s+managers?|money\s+managers?|fund\s+managers?|big\s+money|smart\s+money|whales?|the\s+big\s+funds|large\s+funds|wall\s+street\s+funds)\b/i;
/* What they did. */
const SELL_RE =
  /\b(sell\w*|sold|dump\w*|unload\w*|exit\w*|trim\w*|cut(?:ting)?|reduc\w*|offload\w*|liquidat\w*|bail\w*|ditch\w*|shed\w*|get(?:ting)?\s+out\s+of|rotat\w*\s+out)\b/i;
const BUY_RE =
  /\b(buy\w*|bought|accumulat\w*|add(?:ed|ing)?|load\w*\s+up|pil\w*\s+in(?:to)?|initiat\w*|new\s+positions?|rotat\w*\s+in(?:to)?|scoop\w*)\b/i;
const BOTH_RE = /\b(flows?|positioning|moving|rotation|rotating|trading|doing\s+with)\b/i;

/* GICS sectors exactly as ticker_sectors stores them. */
const SECTORS = [
  [
    'Information Technology',
    /\b(tech|technology|information technology|software|semis?|semiconductors?|chips?)\b/i,
  ],
  ['Health Care', /\b(health\s*care|healthcare|biotech\w*|pharma\w*|medical)\b/i],
  ['Financials', /\b(financials?|banks?|banking|insurers?|insurance)\b/i],
  ['Consumer Discretionary', /\b(consumer\s+discretionary|retail(?:ers)?|autos?|automakers?)\b/i],
  ['Consumer Staples', /\b(consumer\s+staples|staples)\b/i],
  ['Communication Services', /\b(communication\s+services|telecom\w*|media)\b/i],
  ['Industrials', /\b(industrials?|aerospace|defen[cs]e|airlines?|railroads?)\b/i],
  ['Energy', /\b(energy|oil|gas|oil\s+and\s+gas)\b/i],
  ['Utilities', /\butilit(?:y|ies)\b/i],
  ['Materials', /\b(materials|mining|miners|chemicals?|metals?)\b/i],
  ['Real Estate', /\b(real\s+estate|reits?)\b/i],
];

/**
 * A flows ping names the managers AND what they did, and is not about one
 * company (the caller still lets a resolved ticker win). Returns null for
 * anything else, so ordinary pings never change path.
 */
export function detectFlowsPing(text) {
  const t = String(text || '');
  if (!ACTOR_RE.test(t)) return null;
  const sell = SELL_RE.test(t);
  const buy = BUY_RE.test(t);
  if (!sell && !buy && !BOTH_RE.test(t)) return null;
  const side = sell && !buy ? 'sell' : buy && !sell ? 'buy' : 'both';
  const hit = SECTORS.find(([, re]) => re.test(t));
  return { side, sector: hit ? hit[0] : null };
}

/* ── Snapshot read ──────────────────────────────────────────────────── */

/* Some filers wrap names in CDATA or leave XML entities in them
   ("<![CDATA[HONEYWELL INTERNATIONAL INC]]>", "AT&amp;T"). The parser now
   decodes them; this cleans snapshots built from rows parsed before that. */
export function cleanName(v) {
  if (v == null) return null;
  const t = String(v)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return t || null;
}

const secRow = (r) => ({
  cusip: r.cusip || null,
  ticker: r.ticker || null,
  issuer: cleanName(r.issuer),
  label: r.ticker || cleanName(r.issuer) || r.cusip || 'Unmapped security',
  sector: r.sector || null,
  soldUsd: num(r.sold_usd) || 0,
  boughtUsd: num(r.bought_usd) || 0,
  netUsd: num(r.net_usd) || 0,
  sellers: num(r.sellers) || 0,
  buyers: num(r.buyers) || 0,
  exits: num(r.exits) || 0,
  newHolders: num(r.new_holders) || 0,
  holdersNow: num(r.holders_now) || 0,
  holdersPrior: num(r.holders_prior) || 0,
  valueNow: num(r.value_now) || 0,
  valuePrior: num(r.value_prior) || 0,
});

/** Map one flows payload (snake_case, as stored) to the dossier's shape. */
export function mapFlowsPayload(p) {
  if (!p || !p.period) return null;
  const cov = p.coverage || {};
  const bookCompared = num(cov.book_compared) || 0;
  const bookTotal = num(cov.book_total) || 0;
  return {
    quarter: String(p.period).slice(0, 10),
    quarterLabel: quarterLabelLong(String(p.period).slice(0, 10)),
    priorQuarter: String(p.prior_period || '').slice(0, 10) || null,
    priorLabel: p.prior_period ? quarterLabelLong(String(p.prior_period).slice(0, 10)) : null,
    computedAt: p.computed_at || null,
    coverage: {
      filersCompared: num(cov.filers_compared) || 0,
      filersTotal: num(cov.filers_total) || 0,
      filersPriorTotal: num(cov.filers_prior_total) || 0,
      bookCompared,
      bookTotal,
      share: bookTotal > 0 ? bookCompared / bookTotal : 0,
    },
    totals: {
      soldUsd: num(p.totals?.sold_usd) || 0,
      boughtUsd: num(p.totals?.bought_usd) || 0,
      exits: num(p.totals?.exits) || 0,
      newPositions: num(p.totals?.new_positions) || 0,
    },
    mostSold: (p.most_sold || []).map(secRow),
    netSold: (p.net_sold || []).map(secRow),
    mostBought: (p.most_bought || []).map(secRow),
    netBought: (p.net_bought || []).map(secRow),
    breadthSold: (p.breadth_sold || []).map(secRow),
    sellers: (p.sellers || []).map((r) => ({
      cik: r.cik,
      filer: cleanName(r.filer_name) || 'Unnamed filer',
      soldUsd: num(r.sold_usd) || 0,
      boughtUsd: num(r.bought_usd) || 0,
      cut: num(r.cut) || 0,
      exits: num(r.exits) || 0,
      bookPrior: num(r.book_prior) || 0,
      topSold: Array.isArray(r.top_sold) ? r.top_sold.filter(Boolean) : [],
    })),
    exits: (p.exits || []).map((r) => ({
      cik: r.cik,
      filer: cleanName(r.filer_name) || 'Unnamed filer',
      ticker: r.ticker || null,
      issuer: cleanName(r.issuer),
      label: r.ticker || cleanName(r.issuer) || r.cusip,
      valuePrior: num(r.value_prior) || 0,
      pctOfPriorBook: num(r.pct_of_prior_book),
    })),
    sectors: (p.sectors || [])
      .map((r) => ({
        sector: r.sector || 'Unclassified',
        soldUsd: num(r.sold_usd) || 0,
        boughtUsd: num(r.bought_usd) || 0,
        netUsd: num(r.net_usd) || 0,
        namesNetSold: num(r.names_net_sold) || 0,
      }))
      .filter((s) => s.sector !== 'Unclassified' && (s.soldUsd || s.boughtUsd)),
  };
}

async function readSnapshot(admin, quarter) {
  const { data, error } = await admin
    .from('titans_snapshots')
    .select('payload, computed_at')
    .eq('key', `flows:${quarter}`)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.payload ? mapFlowsPayload({ ...data.payload, computed_at: data.computed_at }) : null;
}

/* An open quarter is worth a card once enough of its filers have a prior. */
const OPEN_MIN_FILERS = 25;

/**
 * The dossier for a flows ping. The latest complete quarter is the answer;
 * the quarter still being filed is shown as early filings when enough of it
 * is in. Falls back to the newest flows snapshot on file when the complete
 * quarter has not been computed yet. Null when no snapshot exists at all.
 */
export async function buildFlowsDossier({ admin, side = 'both', sector = null, now = new Date() }) {
  if (!admin) return null;
  const completeQ = latestCompleteQuarter(now);
  const runningQ = currentReportQuarter(now);
  const [complete, open] = await Promise.all([
    readSnapshot(admin, completeQ).catch(() => null),
    runningQ !== completeQ ? readSnapshot(admin, runningQ).catch(() => null) : null,
  ]);
  let main = complete;
  if (!main) {
    const { data } = await admin
      .from('titans_snapshots')
      .select('payload, computed_at')
      .like('key', 'flows:%')
      .order('key', { ascending: false })
      .limit(1);
    const row = data?.[0];
    main = row?.payload ? mapFlowsPayload({ ...row.payload, computed_at: row.computed_at }) : null;
  }
  if (!main) return null;

  const inSector = (r) => !sector || r.sector === sector;
  const pick = (rows, n = 10) => rows.filter(inSector).slice(0, n);
  const sold = pick(main.mostSold);
  const bought = pick(main.mostBought);
  const earlyOpen =
    open && open.quarter !== main.quarter && open.coverage.filersCompared >= OPEN_MIN_FILERS
      ? {
          quarter: open.quarter,
          quarterLabel: open.quarterLabel,
          coverage: open.coverage,
          mostSold: pick(open.mostSold, 5),
          mostBought: pick(open.mostBought, 5),
        }
      : null;

  return {
    kind: 'flows',
    name: sector ? `13F flows in ${sector}` : '13F institutional flows',
    ticker: null,
    side,
    sector,
    quarter: main.quarter,
    quarterLabel: main.quarterLabel,
    priorQuarter: main.priorQuarter,
    priorLabel: main.priorLabel,
    computedAt: main.computedAt,
    coverage: main.coverage,
    totals: main.totals,
    mostSold: sold,
    netSold: pick(main.netSold),
    mostBought: bought,
    netBought: pick(main.netBought),
    breadthSold: pick(main.breadthSold, 8),
    sellers: sector ? [] : main.sellers.slice(0, 8),
    exits: (sector
      ? main.exits.filter((e) => sold.some((s) => s.label === e.label))
      : main.exits
    ).slice(0, 8),
    sectors: main.sectors,
    open: earlyOpen,
    /* The Sourced matches rows. */
    matches: {
      flowSells: (side === 'buy' ? bought : sold).slice(0, 4),
      flowExits: main.exits.slice(0, 3),
    },
    /* The company layout's fields, empty, so a consumer that has not
       learned about kind still renders without throwing. */
    fundamentals: null,
    spark: [],
    news: [],
    echo: [],
  };
}

/* ── Evidence for the brief ─────────────────────────────────────────── */

const rowLine = (r, mode) =>
  mode === 'sell'
    ? `${r.label}${r.issuer && r.ticker ? ` (${r.issuer})` : ''} ${usdShort(r.soldUsd)} sold by ${r.sellers} filers against ${r.buyers} buyers${r.exits ? `, ${r.exits} full exits` : ''}, net ${usdShort(r.netUsd)}`
    : `${r.label}${r.issuer && r.ticker ? ` (${r.issuer})` : ''} ${usdShort(r.boughtUsd)} bought by ${r.buyers} filers against ${r.sellers} sellers${r.newHolders ? `, ${r.newHolders} new holders` : ''}, net ${usdShort(r.netUsd)}`;

export function coverageLine(d) {
  const c = d.coverage;
  const pct = c.share > 0 ? (c.share * 100).toFixed(c.share < 0.1 ? 1 : 0) : '0';
  return `Compared ${c.filersCompared.toLocaleString('en-US')} 13F filers that reported both the quarter ending ${d.priorLabel} and the quarter ending ${d.quarterLabel}, holding ${usdShort(c.bookCompared)} of the ${usdShort(c.bookTotal)} reported by all ${c.filersTotal.toLocaleString('en-US')} filers that quarter (${pct}%).`;
}

export function flowsEvidence(d) {
  if (!d || d.kind !== 'flows') return [];
  const q = `quarter ending ${d.quarterLabel}`;
  const scope = d.sector ? ` in ${d.sector}` : '';
  const out = [];
  const push = (title, snippet) =>
    out.push({
      corpus: '13f',
      title,
      snippet,
      date: d.quarter,
      meta: { source: 'SEC Form 13F', period: d.quarter },
    });
  const sellFirst = d.side !== 'buy';
  const sells = () => {
    if (d.mostSold.length)
      push(
        `Most sold by 13F filers${scope}, ${q}`,
        `Largest dollar sales by 13F filers${scope} in the ${q}, versus the prior quarter: ${d.mostSold
          .slice(0, 8)
          .map((r) => rowLine(r, 'sell'))
          .join('; ')}. Dollar flow is the share change at the quarter-end price.`,
      );
    if (d.breadthSold.length)
      push(
        `Most widely sold${scope}, ${q}`,
        `Names with the most sellers over buyers${scope} among 13F filers in the ${q}: ${d.breadthSold
          .slice(0, 6)
          .map(
            (r) =>
              `${r.label} ${r.sellers} sellers, ${r.buyers} buyers, holders ${r.holdersPrior} to ${r.holdersNow}`,
          )
          .join('; ')}.`,
      );
    if (d.sellers.length)
      push(
        `Largest sellers among 13F filers, ${q}`,
        `13F filers that sold the most in the ${q}: ${d.sellers
          .slice(0, 5)
          .map(
            (s) =>
              `${s.filer} ${usdShort(s.soldUsd)} sold across ${s.cut} positions cut (${s.exits} exited), largest sales ${s.topSold.join(', ') || 'unmapped securities'}`,
          )
          .join('; ')}.`,
      );
    if (d.exits.length)
      push(
        `Largest complete exits, ${q}`,
        `Largest positions 13F filers sold entirely in the ${q}: ${d.exits
          .slice(0, 5)
          .map(
            (e) =>
              `${e.filer} exited ${e.label} (${usdShort(e.valuePrior)}${e.pctOfPriorBook != null ? `, ${(e.pctOfPriorBook * 100).toFixed(1)}% of its prior book` : ''})`,
          )
          .join('; ')}.`,
      );
  };
  const buys = () => {
    if (d.mostBought.length)
      push(
        `Most bought by 13F filers${scope}, ${q}`,
        `Largest dollar purchases by 13F filers${scope} in the ${q}: ${d.mostBought
          .slice(0, 6)
          .map((r) => rowLine(r, 'buy'))
          .join('; ')}.`,
      );
  };
  if (sellFirst) {
    sells();
    buys();
  } else {
    buys();
    sells();
  }
  if (!d.sector && d.sectors.length) {
    const bySell = [...d.sectors].sort((a, b) => a.netUsd - b.netUsd);
    push(
      `Sector flows among 13F filers, ${q}`,
      `Net dollar flow by sector among the compared 13F filers in the ${q}, most sold first: ${bySell
        .slice(0, 6)
        .map(
          (s) =>
            `${s.sector} net ${usdShort(s.netUsd)} (${usdShort(s.soldUsd)} sold, ${usdShort(s.boughtUsd)} bought)`,
        )
        .join('; ')}.`,
    );
  }
  if (d.open?.mostSold?.length)
    push(
      `Early filings for the quarter ending ${d.open.quarterLabel}`,
      `${d.open.coverage.filersCompared} filers have already filed for the quarter ending ${d.open.quarterLabel}. Their largest sales so far: ${d.open.mostSold
        .slice(0, 4)
        .map((r) => `${r.label} ${usdShort(r.soldUsd)} by ${r.sellers} filers`)
        .join('; ')}. The filing window is still open, so this is partial.`,
    );
  push(
    `Coverage of this comparison`,
    `${coverageLine(d)} Form 13F reports long US equity positions held at quarter end and is filed up to 45 days after it; short positions are not reported.`,
  );
  return out;
}

/* ── The brief ──────────────────────────────────────────────────────── */

/* Same rounding as the cards beside the brief ($691M, $13.9B). */
const money = (v) => {
  const a = Math.abs(Number(v) || 0);
  if (a >= 1e12) return `$${(a / 1e12).toFixed(1)}T`;
  if (a >= 1e9) return `$${(a / 1e9).toFixed(a >= 1e10 ? 0 : 1)}B`;
  if (a >= 1e6) return `$${Math.round(a / 1e6)}M`;
  return `$${Math.round(a / 1e3)}K`;
};
const pctOf = (share) => {
  const v = share * 100;
  return `${v < 10 ? v.toFixed(1) : Math.round(v)}%`;
};
const list = (parts) =>
  parts.length < 2
    ? parts.join('')
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

/**
 * Nov 4 (v2): the flows ping's brief is ONE short paragraph (about 70 to 100
 * words) that reads the charts and tables beside it, built from the same
 * snapshot: instant, never times out, and it cannot state a figure the cards
 * do not show. The cards carry the detail; the brief says what they add up
 * to, in card order: the quarter and totals (stat tiles), the top three
 * names and whether the move was broad or concentrated (chart and table),
 * the heaviest seller (Who sold the most), the sectors with the largest
 * outflow, or inflow on a buy ping (Sector flows), early filings when shown,
 * and one coverage and lag caveat.
 */
export function flowsBrief(d) {
  if (!d || d.kind !== 'flows') return null;
  const buying = d.side === 'buy';
  const rows = (buying ? d.mostBought : d.mostSold).slice(0, 3);
  const scope = d.sector ? ` ${d.sector}` : '';
  const c = d.coverage;
  const parts = [];

  parts.push(
    `In the quarter ending ${d.quarterLabel}, the latest filed, ${c.filersCompared.toLocaleString('en-US')} comparable 13F filers sold ${money(d.totals.soldUsd)} and bought ${money(d.totals.boughtUsd)} of US stocks.`,
  );

  if (rows.length) {
    const names = rows.map((r) => `${r.label} (${money(buying ? r.boughtUsd : r.soldUsd)})`);
    const against = rows.filter((r) => (buying ? r.sellers > r.buyers : r.buyers > r.sellers));
    let shape;
    if (against.length === rows.length) {
      shape = buying
        ? 'but more filers cut each than added, so a few large buyers drove the dollars'
        : 'but more filers added to each than cut, so a few large sellers drove the dollars';
    } else if (against.length === 0) {
      shape = buying
        ? 'with most filers adding, a broad move in'
        : 'with most filers cutting, a broad move out';
    } else {
      shape = 'with filers split between selling and buying';
    }
    parts.push(
      `${buying ? 'Most bought' : 'Most sold'}${scope ? ` in${scope}` : ''}: ${list(names)}, ${shape}.`,
    );
  } else {
    parts.push(`No${scope} name had two or more filers ${buying ? 'buying' : 'selling'} it.`);
  }

  const top = d.sellers?.[0];
  const sectors = [...(d.sectors || [])]
    .filter((x) => (buying ? x.netUsd > 0 : x.netUsd < 0))
    .sort((a, b) => (buying ? b.netUsd - a.netUsd : a.netUsd - b.netUsd))
    .slice(0, 3);
  const sectorText = sectors.length
    ? `${list(sectors.map((x) => x.sector))} saw the largest net ${buying ? 'inflow' : 'outflow'}`
    : '';
  if (!buying && top) {
    parts.push(
      `${top.filer} sold the most (${money(top.soldUsd)}, ${top.exits} full exits)${
        !d.sector && sectorText ? `; ${sectorText}` : ''
      }.`,
    );
  } else if (!d.sector && sectorText) {
    parts.push(`${sectorText}.`);
  }

  const early = buying ? d.open?.mostBought?.[0] : d.open?.mostSold?.[0];
  if (early) {
    parts.push(
      `Early ${d.open.quarterLabel} filings show ${early.label} ${buying ? 'bought' : 'sold'} most so far.`,
    );
  }

  parts.push(
    c.share < 0.5
      ? `These filers hold ${pctOf(c.share)} of reported 13F value, and 13F is filed up to 45 days after quarter end, so treat this as partial and lagged.`
      : `13F is filed up to 45 days after quarter end and omits short positions.`,
  );
  return parts.join(' ');
}

export const FLOWS_ADDENDUM = `
This ping asks what institutional managers (hedge funds among them) are selling or buying. The (13f) snippets are SEC Form 13F filings compared quarter over quarter, and the same figures are shown beside the brief as charts and tables. Write ONE paragraph of 80 to 110 words that summarizes what those charts and tables show: the quarter and totals, the top three names and whether the move was broad or concentrated, the largest seller, the sectors with the heaviest net outflow, and one sentence on coverage and the 45-day lag. Do not list more names than that; the tables carry the detail. Call them "13F filers"; never call a named filer a hedge fund. Never state a figure the snippets do not give, and never tell the reader to sell, buy or copy a trade.`;
