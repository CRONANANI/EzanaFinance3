/**
 * Sonar congressional activity (Nov 7): "How has disclosed congressional
 * trading activity changed over the last three years? Compare transaction
 * counts, purchases versus sales, and House versus Senate activity."
 *
 * Before this the ping had no member, company, country or industry to
 * resolve, retrieval kept nothing, and the visitor got a general briefing
 * that said Sonar lacked the data, while the Politician Tracker held every
 * STOCK Act disclosure since 2014. The ping now reads one RPC,
 * sonar_congress_activity(p_years, p_asof), and every number on screen is
 * computed here or in quant.js. No model writes a figure.
 *
 *   detectCongressActivityPing(text)   { years, focus } or null
 *   buildCongressActivityDossier(opts) the dossier the board renders (kind 'congress_activity')
 *   analyzeCongressActivity(payload)   the pure analysis (tested without a database)
 *   congressActivityEvidence(dossier)  the snippets the brief reads and cites
 *   congressActivityBrief(dossier)     the answer-first paragraph
 *   CONGRESS_ACTIVITY_ADDENDUM         the brief's instructions if a model ever writes it
 *
 * Method (congressional-trading-analysis skill, "Activity change over time"):
 *   1. Windows are 12 months long and end 45 days before today (the PTR
 *      deadline), so the latest window is not cut short by trades that are
 *      not yet due. The 45 days after the cutoff are shown, never compared.
 *   2. Third-party feed rows that repeat an official filing are dropped in SQL.
 *   3. A window is comparable only when the chamber's coverage is stable:
 *      at least 50 trades, at least 60% of the chamber's best member count,
 *      and a median filing lag under 180 days (a higher one means old
 *      filings were back-loaded, not that trading happened).
 *   4. The latest window still misses late filers. Its count is scaled up by
 *      the prior window's filing-lag tail, month by month, and labelled an
 *      estimate beside the observed count.
 *   5. Change in trades = change in members trading x change in trades per
 *      member (log decomposition), so the brief says which one moved.
 *   6. The purchase share is compared with a two-proportion z test, and the
 *      member-level split (net buyers vs net sellers) is shown because
 *      trades cluster by member.
 *   7. House vs Senate is compared per member, never on raw totals, and
 *      only on the window both chambers cover.
 * Findings only: no motive, no misconduct, no advice.
 */
import { pctChange, twoProportionZ, logChangeDecomposition } from '@/lib/sonar/analysts/quant';

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const int = (v) => num(v) ?? 0;

/* ── Detection ──────────────────────────────────────────────────────── */

const WHO_RE =
  /\b(congress(?:ional)?|members?\s+of\s+congress|lawmakers?|legislators?|politicians?|senators?|the\s+senate|the\s+house|house\s+(?:and|vs\.?|versus)\s+senate|senate\s+(?:and|vs\.?|versus)\s+house|representatives|stock\s+act|capitol\s+hill)\b/i;
const WHAT_RE =
  /\b(trad(?:e|es|ing|ed)|transactions?|disclos(?:ed|ures?)|stock\s+(?:trades?|trading|purchases?|sales?)|purchases?|buys?|sales?|sells?|ptrs?)\b/i;
/* The ping asks for an aggregate or a change, not one member's trades. */
const AGG_RE =
  /\b(chang(?:e|ed|es|ing)|trend(?:s|ed|ing)?|over\s+(?:the\s+)?(?:last|past)|years?|year[\s-]over[\s-]year|compar(?:e|ed|ing|ison)|activity|volume|how\s+(?:many|much|active|often)|counts?|total|overall|increas\w*|decreas\w*|ris(?:e|en|ing)|fall(?:en|ing)?|grow\w*|declin\w*|by\s+chamber|house\s+(?:vs\.?|versus|and)\s+senate|senate\s+(?:vs\.?|versus|and)\s+house)\b/i;

const WORD_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5 };

function yearsAsked(t) {
  const m = t.match(/\b(?:last|past|previous)\s+(\d|one|two|three|four|five)\s+years?\b/i);
  if (!m) return /\b(?:last|past)\s+year\b/i.test(t) ? 2 : 3;
  const n = WORD_NUM[m[1].toLowerCase()] ?? Number(m[1]);
  /* "the last year" compares two windows; never fewer than two. */
  return Math.max(2, Math.min(5, n || 3));
}

/**
 * A congressional activity ping names Congress (or a chamber), trading, and
 * an aggregate or change. The caller still lets a named member, a ticker, a
 * company or a sector win, so "What has Nancy Pelosi been buying?" and
 * "Which defense stocks are members of Congress trading?" never come here.
 */
export function detectCongressActivityPing(text) {
  const t = String(text || '');
  if (!WHO_RE.test(t) || !WHAT_RE.test(t) || !AGG_RE.test(t)) return null;
  const focus = {
    chambers: /\b(house|senate|chamber)\b/i.test(t),
    sides: /\b(purchas\w*|buy\w*|sale|sales|sell\w*)\b/i.test(t),
    limits: /\b(limit\w*|gaps?|reporting|late|lag|caveat\w*)\b/i.test(t),
  };
  return { years: yearsAsked(t), focus };
}

/* ── Payload mapping ────────────────────────────────────────────────── */

const LAG_POINTS = [45, 60, 90, 120, 180, 270, 365];

function mapRow(r) {
  const withLag = int(r.with_lag);
  const tail = r.lag_tail || {};
  return {
    k: int(r.k),
    trades: int(r.trades),
    purchases: int(r.purchases),
    sales: int(r.sales),
    other: int(r.other),
    members: int(r.members),
    tpmMedian: num(r.tpm_median),
    top5Share: num(r.top5_share),
    netBuyers: int(r.members_net_buyers),
    netSellers: int(r.members_net_sellers),
    topMembers: (r.top_members || []).map((m) => ({
      bioguideId: m.bioguide_id,
      name: m.name || m.bioguide_id,
      party: m.party || null,
      trades: int(m.trades),
    })),
    withLag,
    lagP50: num(r.lag_p50),
    lagP90: num(r.lag_p90),
    late: int(r.late),
    /* Share of trades filed more than t days after the transaction. */
    lagTail: LAG_POINTS.map((t) => ({
      days: t,
      share: withLag > 0 ? int(tail[String(t)]) / withLag : 0,
    })),
    amount: {
      low: num(r.amt_low),
      mid: num(r.amt_mid),
      highBounded: num(r.amt_high_bounded),
      openBrackets: int(r.open_brackets),
      purchaseMid: num(r.purchase_mid),
      saleMid: num(r.sale_mid),
    },
    owners: {
      self: int(r.owner_self),
      spouse: int(r.owner_spouse),
      joint: int(r.owner_joint),
      dependent: int(r.owner_dependent),
      unstated: int(r.owner_unstated),
    },
    vendorRows: int(r.vendor_rows),
    sources: Array.isArray(r.sources) ? r.sources : [],
  };
}

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

/** Map the RPC payload (snake_case, as returned) to the analysis input. */
export function mapActivityPayload(p) {
  if (!p || !Array.isArray(p.stats)) return null;
  const windows = (p.windows || [])
    .map((w) => ({
      k: int(w.k),
      from: String(w.from).slice(0, 10),
      to: String(w.to).slice(0, 10),
    }))
    .sort((a, b) => a.k - b.k);
  const labelled = windows.map((w) => ({
    ...w,
    label: w.k === 0 ? `Since ${fmtDate(w.from)}` : `Year to ${fmtDate(w.to)}`,
    short: w.k === 0 ? 'Not yet due' : `To ${fmtDate(w.to)}`,
  }));
  const chamber = (c) => {
    const rows = p.stats.filter((r) => r.chamber === c).map(mapRow);
    return {
      windows: labelled.filter((w) => w.k > 0).map((w) => rows.find((r) => r.k === w.k) || null),
      tail: rows.find((r) => r.k === 0) || null,
    };
  };
  const months = new Map();
  for (const m of p.monthly || []) {
    const row = months.get(m.month) || {
      month: m.month,
      house: { trades: 0, purchases: 0, sales: 0, members: 0 },
      senate: { trades: 0, purchases: 0, sales: 0, members: 0 },
    };
    if (row[m.chamber]) {
      row[m.chamber] = {
        trades: int(m.trades),
        purchases: int(m.purchases),
        sales: int(m.sales),
        members: int(m.members),
      };
    }
    months.set(m.month, row);
  }
  return {
    asof: String(p.asof).slice(0, 10),
    cutoff: String(p.cutoff).slice(0, 10),
    years: int(p.years),
    computedAt: p.computed_at || null,
    windows: labelled.filter((w) => w.k > 0),
    tailWindow: labelled.find((w) => w.k === 0) || null,
    house: chamber('house'),
    senate: chamber('senate'),
    monthly: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    duplicatesRemoved: {
      house: int(p.duplicates_removed?.house),
      senate: int(p.duplicates_removed?.senate),
    },
  };
}

/* ── Analysis (pure) ────────────────────────────────────────────────── */

export const COMPARABLE = Object.freeze({
  minTrades: 50,
  minMemberShare: 0.6,
  maxMedianLag: 180,
});

/** Why a window is not comparable, or null when it is. */
export function coverageGap(row, maxMembers) {
  if (!row) return 'no disclosures on file for this window';
  if (row.trades < COMPARABLE.minTrades)
    return `${row.trades} disclosed trades, too few to compare`;
  if (maxMembers > 0 && row.members < COMPARABLE.minMemberShare * maxMembers)
    return `${row.members} member${row.members === 1 ? '' : 's'} in Ezana's records against ${maxMembers} in the best-covered window, a coverage gap rather than a change in trading`;
  if (row.lagP50 != null && row.lagP50 > COMPARABLE.maxMedianLag)
    return `median filing lag of ${Math.round(row.lagP50)} days, so these rows are older filings loaded later, not trading in the window`;
  return null;
}

/* Share of trades still unfiled at a given age, read off the reference
   window's lag tail (linear between the measured points, 0 past 365 days
   only when the tail is zero there). */
function unfiledShare(tail, ageDays) {
  if (!tail?.length) return 0;
  if (ageDays <= tail[0].days) return tail[0].share;
  for (let i = 1; i < tail.length; i += 1) {
    const a = tail[i - 1];
    const b = tail[i];
    if (ageDays <= b.days) {
      const w = (ageDays - a.days) / (b.days - a.days);
      return a.share + w * (b.share - a.share);
    }
  }
  return tail[tail.length - 1].share;
}

const dayMs = 86_400_000;

/**
 * Completeness estimate for the latest window: each month's observed trades
 * divided by the share of trades the reference window had filed by the same
 * age. Returns { observed, estimate, missingShare, refLabel } or null.
 */
export function completenessEstimate({ latest, reference, monthly, chamber, window, asof }) {
  if (!latest || !reference || !window) return null;
  const from = Date.parse(`${window.from}T00:00:00Z`);
  const to = Date.parse(`${window.to}T00:00:00Z`);
  const now = Date.parse(`${asof}T00:00:00Z`);
  let obs = 0;
  let est = 0;
  for (const m of monthly) {
    const start = Date.parse(`${m.month}-01T00:00:00Z`);
    const mid = start + 15 * dayMs;
    if (mid <= from || mid > to + 15 * dayMs) continue;
    const n = m[chamber]?.trades || 0;
    if (!n) continue;
    const age = Math.max(45, (now - Math.min(mid, to)) / dayMs);
    const s = Math.min(0.9, unfiledShare(reference.lagTail, age));
    obs += n;
    est += n / (1 - s);
  }
  if (!obs) return null;
  const missingShare = est / obs - 1;
  return {
    observed: latest.trades,
    estimate: Math.round(latest.trades * (1 + missingShare)),
    missingShare,
  };
}

const buyShare = (r) =>
  r && r.purchases + r.sales > 0 ? r.purchases / (r.purchases + r.sales) : null;

function analyzeChamber(name, ch, d) {
  const rows = ch.windows;
  const maxMembers = Math.max(0, ...rows.filter(Boolean).map((r) => r.members));
  const gaps = rows.map((r) => coverageGap(r, maxMembers));
  const idx = rows.map((_, i) => i).filter((i) => !gaps[i]);
  const latestI = rows.length - 1;
  const latest = rows[latestI] || null;
  const latestOk = !gaps[latestI];
  const priorI = latestI - 1;
  const prior = priorI >= 0 && !gaps[priorI] ? rows[priorI] : null;
  const firstI = idx.length ? idx[0] : null;
  const first = firstI != null && firstI !== latestI ? rows[firstI] : null;

  const completeness =
    latestOk && prior
      ? completenessEstimate({
          latest,
          reference: prior,
          monthly: d.monthly,
          chamber: name,
          window: d.windows[latestI],
          asof: d.asof,
        })
      : null;

  const change = (a, b) =>
    a && b
      ? pctChange(
          { value: a.trades, period: a.k },
          { value: b.trades, period: b.k },
          { id: `${name}_trades_change` },
        ).value
      : null;

  const decomposition =
    prior && latestOk
      ? logChangeDecomposition(
          { total: prior.trades, units: prior.members },
          { total: latest.trades, units: latest.members },
          { id: `${name}_activity_decomposition` },
        )
      : null;
  const peakI = idx.reduce(
    (best, i) => (best == null || rows[i].trades > rows[best].trades ? i : best),
    null,
  );
  const sideTest =
    prior && latestOk
      ? twoProportionZ(
          { x: prior.purchases, n: prior.purchases + prior.sales },
          { x: latest.purchases, n: latest.purchases + latest.sales },
          { id: `${name}_purchase_share_test` },
        )
      : null;

  /* The most active member's share of the latest window, so a single heavy
     filer is never read as a chamber-wide trend. */
  const topOne = latest?.topMembers?.[0] || null;
  const topOneShare = topOne && latest.trades ? topOne.trades / latest.trades : null;

  return {
    rows,
    gaps,
    maxMembers,
    comparableCount: idx.length,
    latest,
    latestOk,
    prior,
    first,
    peak: peakI != null ? { ...rows[peakI], window: d.windows[peakI] } : null,
    changeVsPrior: change(prior, latestOk ? latest : null),
    changeVsFirst: change(first, latestOk ? latest : null),
    changeFirstToPrior: first && prior && first !== prior ? change(first, prior) : null,
    completeness,
    changeVsPriorAdjusted:
      completeness && prior ? (completeness.estimate / prior.trades - 1) * 100 : null,
    decomposition,
    buyShares: rows.map(buyShare),
    sideTest,
    lateShares: rows.map((r) => (r && r.withLag ? r.late / r.withLag : null)),
    perMember: rows.map((r) => (r && r.members ? r.trades / r.members : null)),
    topOne,
    topOneShare,
    tail: ch.tail,
  };
}

/** The whole analysis: per chamber, then House vs Senate on the shared window. */
export function analyzeCongressActivity(d) {
  if (!d) return null;
  const house = analyzeChamber('house', d.house, d);
  const senate = analyzeChamber('senate', d.senate, d);
  const both = house.latestOk && senate.latestOk;
  const total = both ? house.latest.trades + senate.latest.trades : null;
  return {
    house,
    senate,
    shared: both
      ? {
          window: d.windows[d.windows.length - 1],
          houseShare: house.latest.trades / total,
          housePerMember: house.latest.trades / Math.max(1, house.latest.members),
          senatePerMember: senate.latest.trades / Math.max(1, senate.latest.members),
          houseMedian: house.latest.tpmMedian,
          senateMedian: senate.latest.tpmMedian,
          senateExTop:
            senate.topOne && senate.latest.trades
              ? (senate.latest.trades - senate.topOne.trades) /
                Math.max(1, senate.latest.members - 1)
              : null,
        }
      : null,
  };
}

/* ── Dossier ────────────────────────────────────────────────────────── */

export async function buildCongressActivityDossier({ admin, years = 3, now = new Date() }) {
  if (!admin) return null;
  const asof = now.toISOString().slice(0, 10);
  const { data, error } = await admin.rpc('sonar_congress_activity', {
    p_years: years,
    p_asof: asof,
  });
  if (error) throw new Error(error.message);
  const d = mapActivityPayload(data);
  if (!d || !d.windows.length) return null;
  const analysis = analyzeCongressActivity(d);
  return {
    kind: 'congress_activity',
    name: 'Disclosed congressional trading',
    ticker: null,
    ...d,
    analysis,
    /* The Sourced matches rows: one per window, both chambers. */
    matches: {
      congressActivity: d.windows.map((w, i) => ({
        key: w.k,
        label: w.label,
        house: d.house.windows[i]?.trades ?? null,
        senate: d.senate.windows[i]?.trades ?? null,
        houseOk: !analysis.house.gaps[i],
        senateOk: !analysis.senate.gaps[i],
      })),
    },
    fundamentals: null,
    spark: [],
    news: [],
    echo: [],
  };
}

/* ── Formatting ─────────────────────────────────────────────────────── */

const n0 = (v) => (v == null ? 'n/a' : Math.round(v).toLocaleString('en-US'));
const pct0 = (v) => (v == null ? 'n/a' : `${Math.round(v)}%`);
const share1 = (v) => (v == null ? 'n/a' : `${(v * 100).toFixed(1)}%`);
const usdM = (v) => {
  if (v == null) return 'n/a';
  const a = Math.abs(v);
  if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  return `$${(v / 1e6).toFixed(0)}M`;
};
const updown = (v) => (v == null ? '' : v >= 0 ? `up ${pct0(v)}` : `down ${pct0(-v)}`);
export const activityFormat = { n0, pct0, share1, usdM, updown, fmtDate };

/* ── Engine metrics ─────────────────────────────────────────────────── */

/**
 * The computed figures as research-engine metrics ({ id, label, value, unit, method }), so a
 * deep run's findings can cite [M:id] and the auditor can trace every number the analysts
 * restate. Only comparable windows contribute; null values drop out.
 */
export function activityMetricRows(d) {
  if (!d?.analysis) return [];
  const a = d.analysis;
  const h = a.house;
  const s = a.senate;
  const latest = d.windows[d.windows.length - 1]?.label || 'latest window';
  const rows = [
    [
      'congress_house_trades_latest',
      `House disclosed trades, ${latest}`,
      h.latest?.trades,
      'count',
      'count of disclosed House transactions by transaction date',
    ],
    [
      'congress_senate_trades_latest',
      `Senate disclosed trades, ${latest}`,
      s.latest?.trades,
      'count',
      'count of disclosed Senate transactions by transaction date',
    ],
    [
      'congress_house_trades_change',
      'House trades, latest vs prior window',
      h.changeVsPrior,
      'percent',
      'latest window trades / prior window trades - 1',
    ],
    [
      'congress_house_trades_change_first',
      'House trades, latest vs first comparable window',
      h.changeVsFirst,
      'percent',
      'latest window trades / first comparable window trades - 1',
    ],
    [
      'congress_house_trades_estimate',
      'House trades in the latest window once late filings arrive (estimate)',
      h.completeness?.estimate,
      'count',
      "observed trades scaled month by month by the prior window's share of trades filed after the same age",
    ],
    [
      'congress_house_purchase_share',
      `House purchases as a share of purchases and sales, ${latest}`,
      h.sideTest?.p2,
      'ratio',
      'purchases / (purchases + sales)',
    ],
    [
      'congress_house_purchase_share_prior',
      'House purchases as a share of purchases and sales, prior window',
      h.sideTest?.p1,
      'ratio',
      'purchases / (purchases + sales)',
    ],
    [
      'congress_purchase_share_z',
      'Two-proportion z, House purchase share, latest vs prior window',
      h.sideTest?.value,
      'z',
      'two-proportion z test with pooled p',
    ],
    [
      'congress_house_share_latest',
      `House share of disclosed trades, ${latest}`,
      a.shared?.houseShare,
      'ratio',
      'House trades / (House + Senate trades)',
    ],
    [
      'congress_house_trades_per_member',
      `House trades per member trading, ${latest}`,
      a.shared?.housePerMember,
      'count',
      'House trades / House members with a trade',
    ],
    [
      'congress_senate_trades_per_member',
      `Senate trades per member trading, ${latest}`,
      a.shared?.senatePerMember,
      'count',
      'Senate trades / Senate members with a trade',
    ],
    [
      'congress_intensity_share',
      'Share of the House change explained by trades per member',
      h.decomposition?.intensityShare,
      'ratio',
      'log decomposition: ln(trades per member ratio) / ln(trades ratio)',
    ],
  ];
  return rows
    .filter(([, , v]) => typeof v === 'number' && Number.isFinite(v))
    .map(([id, label, value, unit, method]) => ({ id, label, value, unit, method }));
}

/* ── Evidence for the brief ─────────────────────────────────────────── */

const SOURCE = 'STOCK Act Periodic Transaction Reports (House Clerk, Senate eFD)';

export function congressActivityEvidence(d) {
  if (!d || d.kind !== 'congress_activity') return [];
  const a = d.analysis;
  const out = [];
  const push = (title, snippet) =>
    out.push({
      corpus: 'congress',
      title,
      snippet,
      date: d.cutoff,
      meta: { source: SOURCE, period: `${d.windows[0]?.from} to ${d.cutoff}` },
    });
  for (const [name, label] of [
    ['house', 'House'],
    ['senate', 'Senate'],
  ]) {
    const c = a[name];
    const lines = d.windows.map((w, i) => {
      const r = c.rows[i];
      if (!r) return `${w.label}: no disclosures on file`;
      return `${w.label}: ${n0(r.trades)} trades (${n0(r.purchases)} purchases, ${n0(r.sales)} sales) by ${r.members} member${r.members === 1 ? '' : 's'}, median ${r.tpmMedian ?? 'n/a'} per member${c.gaps[i] ? ` [not comparable: ${c.gaps[i]}]` : ''}`;
    });
    push(
      `${label} disclosed trades by 12-month window`,
      `${lines.join('; ')}. Windows end ${fmtDate(d.cutoff)}, 45 days before ${fmtDate(d.asof)}, so every trade in them was due by now.`,
    );
  }
  const h = a.house;
  if (h.completeness)
    push(
      'Filings still to come (estimate)',
      `In the prior window ${share1(h.prior.late / Math.max(1, h.prior.withLag))} of House trades were filed more than 45 days after the trade. Applying that lag profile month by month, the latest House window's ${n0(h.completeness.observed)} observed trades would reach about ${n0(h.completeness.estimate)} once late filings arrive (an estimate).`,
    );
  if (h.sideTest?.value != null)
    push(
      'House purchases versus sales',
      `Purchase share of House purchases and sales: ${d.windows.map((w, i) => `${w.label} ${share1(h.buyShares[i])}`).join(', ')}. Two-proportion z = ${h.sideTest.value.toFixed(1)} between the last two windows (p ${h.sideTest.pValue < 0.001 ? '< 0.001' : `= ${h.sideTest.pValue.toFixed(3)}`}); ${h.latest.netSellers} House members were net sellers and ${h.latest.netBuyers} net buyers in the latest window.`,
    );
  if (a.shared)
    push(
      'House versus Senate, latest window',
      `${a.shared.window.label}: House ${n0(h.latest.trades)} trades by ${h.latest.members} members (${a.shared.housePerMember.toFixed(1)} per member, median ${h.latest.tpmMedian}); Senate ${n0(a.senate.latest.trades)} by ${a.senate.latest.members} (${a.shared.senatePerMember.toFixed(1)} per member, median ${a.senate.latest.tpmMedian}). ${a.senate.topOne ? `${a.senate.topOne.name} filed ${n0(a.senate.topOne.trades)} of the Senate's trades.` : ''}`,
    );
  push(
    'Reporting limits applied',
    `Amounts are filed ranges; midpoints are estimates. ${d.duplicatesRemoved.house + d.duplicatesRemoved.senate} third-party rows that repeated an official filing were removed (${d.duplicatesRemoved.senate} Senate, ${d.duplicatesRemoved.house} House). Trades after ${fmtDate(d.cutoff)} are not yet due and are shown separately. Owner is blank on many House filings, and notification dates for spouse or managed accounts can legitimately extend the 45-day clock.`,
  );
  return out;
}

/* ── The brief ──────────────────────────────────────────────────────── */

/**
 * Answer first, one paragraph (about 130 to 160 words) ending in one
 * sentence of limits. Built from the same numbers as the cards beside it, so
 * it can never state a figure they do not show, and it never times out.
 */
export function congressActivityBrief(d) {
  if (!d || d.kind !== 'congress_activity') return null;
  const a = d.analysis;
  const h = a.house;
  const s = a.senate;
  const W = d.windows;
  const parts = [];
  const ok = (c) => c.rows.map((r, i) => (r && !c.gaps[i] ? i : null)).filter((i) => i != null);

  if (h.latestOk && h.prior) {
    const idx = ok(h);
    const first = h.rows[idx[0]];
    const ratio = h.peak && first ? h.peak.trades / first.trades : null;
    const shape =
      h.peak && h.peak.k !== h.latest.k
        ? ratio >= 2
          ? 'more than doubled, then eased'
          : 'rose, then eased'
        : h.changeVsPrior >= 0
          ? 'rose'
          : 'fell';
    const steps = idx.map((i, j) => {
      const r = h.rows[i];
      const prev = j ? h.rows[idx[j - 1]] : null;
      const chg = prev ? ` (${updown((r.trades / prev.trades - 1) * 100)})` : '';
      return j === 0
        ? `${n0(r.trades)} trades in the year to ${fmtDate(W[i].to)}`
        : j === idx.length - 1
          ? `${n0(r.trades)} in the year to ${fmtDate(W[i].to)}${chg}`
          : `${n0(r.trades)} the next year${chg}`;
    });
    const adj =
      h.completeness && h.completeness.estimate > h.completeness.observed
        ? `; about ${n0(Math.round(h.completeness.estimate / 100) * 100)}, ${updown(h.changeVsPriorAdjusted)}, once typical late filings arrive`
        : '';
    parts.push(`Disclosed House trading ${shape}: ${steps.join(', ')}${adj}.`);

    if (h.decomposition?.intensityShare != null) {
      const m = idx.map((i) => h.rows[i].members);
      const med = idx.map((i) => h.rows[i].tpmMedian);
      parts.push(
        h.decomposition.intensityShare >= 0.6
          ? `Members trading held at ${Math.min(...m)} to ${Math.max(...m)}, so the swing came from trades per member (median ${med.join(', ')}).`
          : `Most of the change came from more members trading (${m.join(', ')}), with median trades per member at ${med.join(', ')}.`,
      );
    }
    if (h.sideTest?.value != null) {
      const pb = h.sideTest.p1;
      const lb = h.sideTest.p2;
      const crossed =
        pb >= 0.5 && lb < 0.5
          ? 'Sales overtook purchases'
          : pb < 0.5 && lb >= 0.5
            ? 'Purchases overtook sales'
            : lb < 0.5
              ? 'Sales led purchases'
              : 'Purchases led sales';
      const sig = h.sideTest.pValue < 0.05;
      parts.push(
        `${crossed} in the latest year (${share1(lb)} purchases, from ${share1(pb)}; z = ${h.sideTest.value.toFixed(1)}, ${sig ? 'unlikely to be chance' : 'within normal variation'})${
          h.latest.netSellers + h.latest.netBuyers
            ? ` and ${h.latest.netSellers} of ${h.latest.members} members were net sellers`
            : ''
        }.`,
      );
    }
  } else {
    parts.push(
      `Ezana's House records do not cover the last ${d.years} years evenly enough to measure a change: ${h.gaps.filter(Boolean).join('; ')}.`,
    );
  }

  if (a.shared) {
    const sh = a.shared;
    const level = Math.abs(sh.housePerMember / sh.senatePerMember - 1) < 0.15;
    parts.push(
      `The House filed ${pct0(sh.houseShare * 100)} of trades in the latest year, but per member the chambers were ${level ? 'level' : 'apart'} (${sh.housePerMember.toFixed(0)} vs ${sh.senatePerMember.toFixed(0)} trades)${
        s.topOne && s.topOneShare > 0.3
          ? `; one senator, ${s.topOne.name}, filed ${pct0(s.topOneShare * 100)} of the Senate's ${n0(s.latest.trades)}`
          : ''
      }.`,
    );
  }
  const sg = s.rows.map((r, i) => (s.gaps[i] ? (r?.members ?? 0) : null)).filter((v) => v != null);
  if (sg.length) {
    const firstOk = ok(s)[0];
    parts.push(
      `Senate records ${firstOk != null ? `before ${fmtDate(W[firstOk].from)} ` : ''}cover too few senators (${sg.join(' and ')}) to show a trend.`,
    );
  }
  parts.push(
    `Counts use transaction dates and exclude ${n0((h.tail?.trades || 0) + (s.tail?.trades || 0))} trades not yet due and ${n0(d.duplicatesRemoved.house + d.duplicatesRemoved.senate)} duplicate rows; dollar amounts are estimates from filed ranges.`,
  );
  return parts.join(' ');
}

export const CONGRESS_ACTIVITY_ADDENDUM = `
This ping asks how disclosed congressional trading changed over time. The (congress) snippets are Ezana's own STOCK Act counts by 12-month window and chamber, computed in code and shown beside the brief as charts and tables. Answer first, in one paragraph of 110 to 150 words: the direction and size of the change in trade counts, whether members trading or trades per member drove it, the purchase share and whether its shift is significant, and House versus Senate per member on the shared window. Then one sentence of limits. Never state a trend for a window marked not comparable. Never state a figure the snippets do not give. Amounts are ranges; call any dollar figure an estimate. No motive, no misconduct, no advice.`;
