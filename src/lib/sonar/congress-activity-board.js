/**
 * The congressional activity research board (Nov 7): pure view model for
 * CongressActivityBoard.jsx, the deep and standard research layout of "How has
 * disclosed congressional trading activity changed over the last three
 * years?" (founder mock-up, Nov 7). No I/O and no React.
 *
 * Input is the congress_activity panel (the dossier the engine source emits,
 * built by landing-congress-activity.js), so every number on the board comes
 * from sonar_congress_activity and quant.js, never from the model. The model's
 * findings, team and methodology still render below, cited to the evidence.
 *
 *   activityHeadline(d)    answer-first headline (one sentence, no figures)
 *   activitySummary(d)     the paragraph under it (the ping's brief, less its limits sentence)
 *   activitySnapshot(d)    first comparable window to latest, House, plus chamber shares
 *   activityTakeaways(d)   up to five { label, text }
 *   activityKpis(d)        four tiles { id, icon, label, value, sub, delta, tone }
 *   activityFindings(d)    numbered findings, each a full sentence with its figures
 *   activityLimits(d)      { id, icon, label, text }
 *   windowBars(d, chamber) stacked purchases and sales per window
 *   chamberSplit(d, i)     House vs Senate for one window
 *   sideIndex(d, chamber)  purchases and sales indexed to the first comparable window = 100
 *
 * Copy rules: sentence case, no em dashes, findings only, never advice.
 */
import { congressActivityBrief, activityFormat } from './landing-congress-activity.js';

const { n0, share1, updown, fmtDate } = activityFormat;
const pct = (a, b) => (a && b != null ? (b / a - 1) * 100 : null);
const okIdx = (c) => c.rows.map((r, i) => (r && !c.gaps[i] ? i : null)).filter((i) => i != null);
const lowerFirst = (t) => (t ? `${t[0].toLowerCase()}${t.slice(1)}` : '');
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five'];
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const sentences = (t) => String(t || '').split(/(?<=[.!?])\s+(?=[A-Z])/);

export const isActivityPanel = (p) => Boolean(p && p.kind === 'congress_activity' && p.analysis);

/* ── Executive answer ─────────────────────────────────────────────────── */

export function activityHeadline(d) {
  const a = d.analysis;
  const h = a.house;
  if (!h.latestOk || !h.prior)
    return 'Ezana cannot measure a change in disclosed House trading over this period.';
  const idx = okIdx(h);
  const first = h.rows[idx[0]];
  const peaked = h.peak && h.peak.k !== h.latest.k;
  const ratio = h.peak && first ? h.peak.trades / first.trades : null;
  const move = peaked
    ? ratio >= 2
      ? 'more than doubled, then eased'
      : 'rose, then eased'
    : h.changeVsPrior >= 0
      ? 'rose'
      : 'fell';
  const t = h.sideTest;
  const sides =
    t?.value == null
      ? null
      : t.pValue < 0.05
        ? t.p2 < 0.5
          ? 'House sales now outnumber purchases'
          : 'House purchases now outnumber sales'
        : 'purchases and sales stayed close to even';
  const chambers = a.shared
    ? Math.abs(a.shared.housePerMember / a.shared.senatePerMember - 1) < 0.15
      ? "the House files most trades but matches the Senate's pace per member"
      : 'the House files most trades'
    : null;
  const lead = `Over the last ${WORDS[d.years] || d.years} years, disclosed House trading ${move}.`;
  const rest = [sides, chambers].filter(Boolean);
  if (!rest.length) return lead;
  const tail = rest.join(', and ');
  return `${lead} ${tail[0].toUpperCase()}${tail.slice(1)}.`.replace(/’/g, "'");
}

export function activitySummary(d) {
  const brief = congressActivityBrief(d) || '';
  const s = sentences(brief);
  /* The last sentence is the limits line; the limits card carries it. */
  return s.length > 1 ? s.slice(0, -1).join(' ') : brief;
}

export function activitySnapshot(d) {
  const a = d.analysis;
  const h = a.house;
  const idx = okIdx(h);
  if (idx.length < 2) return null;
  const f = h.rows[idx[0]];
  const l = h.rows[idx[idx.length - 1]];
  const rows = [
    { label: 'House trades', from: f.trades, to: l.trades, change: pct(f.trades, l.trades) },
    {
      label: 'Purchases',
      from: f.purchases,
      to: l.purchases,
      change: pct(f.purchases, l.purchases),
    },
    { label: 'Sales', from: f.sales, to: l.sales, change: pct(f.sales, l.sales) },
    { label: 'Members trading', from: f.members, to: l.members, change: pct(f.members, l.members) },
  ].map((r) => ({ ...r, display: `${n0(r.from)} to ${n0(r.to)}` }));
  const shares = a.shared
    ? [
        { label: 'House share, latest year', value: share1(a.shared.houseShare) },
        { label: 'Senate share, latest year', value: share1(1 - a.shared.houseShare) },
      ]
    : [];
  return {
    title: `${WORDS[idx.length] ? `${WORDS[idx.length][0].toUpperCase()}${WORDS[idx.length].slice(1)}` : idx.length}-year snapshot, House`,
    sub: `${d.windows[idx[0]].label} vs ${lowerFirst(d.windows[idx[idx.length - 1]].label)}`,
    fromLabel: d.windows[idx[0]].short,
    toLabel: d.windows[idx[idx.length - 1]].short,
    rows,
    shares,
  };
}

export function activityTakeaways(d) {
  const a = d.analysis;
  const h = a.house;
  const s = a.senate;
  const out = [];
  if (h.latestOk && h.prior) {
    const idx = okIdx(h);
    const f = h.rows[idx[0]];
    out.push({
      label: h.latest.trades >= f.trades ? 'Activity is up' : 'Activity is down',
      text: `House trades went from ${n0(f.trades)} to ${n0(h.latest.trades)} (${updown(pct(f.trades, h.latest.trades))})${
        h.peak && h.peak.k !== h.latest.k
          ? `, after peaking at ${n0(h.peak.trades)} in the ${lowerFirst(h.peak.window.label)}`
          : ''
      }.`,
    });
    if (h.decomposition?.intensityShare != null)
      out.push(
        h.decomposition.intensityShare >= 0.6
          ? {
              label: 'Same traders, different pace',
              text: `Members trading held at ${Math.min(...idx.map((i) => h.rows[i].members))} to ${Math.max(...idx.map((i) => h.rows[i].members))}; trades per member drove the change.`,
            }
          : {
              label: 'More members trading',
              text: `Most of the change came from the number of members trading.`,
            },
      );
    if (h.sideTest?.value != null)
      out.push({
        label: h.sideTest.pValue < 0.05 ? 'The balance shifted' : 'Buying and selling near even',
        text: `Purchases were ${share1(h.sideTest.p2)} of House purchases and sales in the latest year, from ${share1(h.sideTest.p1)}${
          h.sideTest.pValue < 0.05 ? ', a shift unlikely to be chance' : ', within normal variation'
        }.`,
      });
  }
  if (a.shared)
    out.push({
      label: 'House leads on volume',
      text: `${share1(a.shared.houseShare)} of trades in the latest year, at ${a.shared.housePerMember.toFixed(0)} per member against the Senate's ${a.shared.senatePerMember.toFixed(0)}.`,
    });
  const senateGaps = s.rows.filter((r, i) => s.gaps[i] && r).map((r) => r.members);
  out.push({
    label: 'Not the full picture',
    text: `${h.completeness && h.completeness.estimate > h.completeness.observed ? `About ${n0(h.completeness.estimate - h.completeness.observed)} late House filings are still expected for the latest year. ` : ''}${
      senateGaps.length
        ? `Earlier Senate years cover too few senators (${senateGaps.join(' and ')}) to show a trend.`
        : 'Disclosures are ranges, filed up to 45 days late.'
    }`,
  });
  return out.slice(0, 5);
}

/* ── KPI strip ────────────────────────────────────────────────────────── */

export function activityKpis(d) {
  const a = d.analysis;
  const h = a.house;
  const s = a.senate;
  const hl = h.latest;
  const sl = s.latest;
  if (!hl) return [];
  const both = (k) => (hl?.[k] || 0) + (sl?.[k] || 0);
  const vsPrior = (k) => (h.prior && h.latestOk ? pct(h.prior[k], hl[k]) : null);
  const delta = (v) =>
    v == null ? null : { text: `House ${updown(v)} vs prior year`, tone: v >= 0 ? 'up' : 'down' };
  const tiles = [
    {
      id: 'trades',
      icon: 'bi-layers',
      label: 'Disclosed trades, latest year',
      value: n0(both('trades')),
      sub: `House ${n0(hl.trades)} · Senate ${n0(sl?.trades || 0)}`,
      delta: delta(vsPrior('trades')),
    },
    {
      id: 'purchases',
      icon: 'bi-graph-up-arrow',
      label: 'Purchases, latest year',
      value: n0(both('purchases')),
      sub: `${share1(both('purchases') / Math.max(1, both('purchases') + both('sales')))} of purchases and sales`,
      delta: delta(vsPrior('purchases')),
    },
    {
      id: 'sales',
      icon: 'bi-graph-down-arrow',
      label: 'Sales, latest year',
      value: n0(both('sales')),
      sub: `${share1(both('sales') / Math.max(1, both('purchases') + both('sales')))} of purchases and sales`,
      delta: delta(vsPrior('sales')),
    },
  ];
  if (a.shared)
    tiles.push({
      id: 'house-share',
      icon: 'bi-people',
      label: 'House share of trades',
      value: share1(a.shared.houseShare),
      sub: `Senate ${share1(1 - a.shared.houseShare)}, ${lowerFirst(d.windows[d.windows.length - 1].label)}`,
      delta: null,
    });
  return tiles;
}

/* ── Key findings and limits ──────────────────────────────────────────── */

export function activityFindings(d) {
  const a = d.analysis;
  const h = a.house;
  const s = a.senate;
  const W = d.windows;
  const out = [];
  const idx = okIdx(h);
  if (idx.length >= 2) {
    const steps = idx.map((i) => `${n0(h.rows[i].trades)} (${W[i].short})`).join(', ');
    const chg = idx
      .slice(1)
      .map((i, j) => updown(pct(h.rows[idx[j]].trades, h.rows[i].trades)))
      .join(', then ');
    out.push(`House disclosed trades by 12-month window: ${steps}, ${chg}.`);
    out.push(
      `Members trading: ${idx.map((i) => h.rows[i].members).join(', ')}; median trades per member: ${idx
        .map((i) => h.rows[i].tpmMedian)
        .join(', ')}.`,
    );
  }
  if (h.sideTest?.value != null)
    out.push(
      `Purchases were ${share1(h.sideTest.p2)} of House purchases and sales in the latest year against ${share1(h.sideTest.p1)} the year before (z = ${h.sideTest.value.toFixed(1)}, p ${h.sideTest.pValue < 0.001 ? '< 0.001' : `= ${h.sideTest.pValue.toFixed(3)}`}); ${h.latest.netSellers} members were net sellers and ${h.latest.netBuyers} net buyers.`,
    );
  if (a.shared)
    out.push(
      `Latest year: House ${n0(h.latest.trades)} trades by ${h.latest.members} members (${a.shared.housePerMember.toFixed(1)} per member), Senate ${n0(s.latest.trades)} by ${s.latest.members} (${a.shared.senatePerMember.toFixed(1)} per member)${
        s.topOne && s.topOneShare > 0.3
          ? `; ${s.topOne.name} filed ${share1(s.topOneShare)} of Senate trades`
          : ''
      }.`,
    );
  if (h.completeness && h.completeness.estimate > h.completeness.observed)
    out.push(
      `Applying the prior year's filing-lag profile, the latest House year's ${n0(h.completeness.observed)} trades would reach about ${n0(h.completeness.estimate)} once late filings arrive (an estimate).`,
    );
  return out.slice(0, 5);
}

export function activityLimits(d) {
  const a = d.analysis;
  const h = a.house;
  const s = a.senate;
  const out = [
    {
      id: 'lag',
      icon: 'bi-calendar-event',
      label: 'Reporting lag',
      text: `Trades are due within 45 days; in the prior year ${h.prior ? share1(h.prior.late / Math.max(1, h.prior.withLag)) : 'n/a'} of House trades were filed later. Windows end ${fmtDate(d.cutoff)}, and ${n0((h.tail?.trades || 0) + (s.tail?.trades || 0))} trades since then are not yet compared.`,
    },
  ];
  const gaps = s.gaps
    .map((g, i) =>
      g ? `${d.windows[i].label}: ${plural(s.rows[i]?.members ?? 0, 'senator')} on file` : null,
    )
    .filter(Boolean);
  if (gaps.length)
    out.push({
      id: 'coverage',
      icon: 'bi-layers-half',
      label: 'Coverage gaps',
      text: `${gaps.join('; ')}. A rise across those years would reflect coverage, not trading, so no Senate trend is stated.`,
    });
  out.push(
    {
      id: 'scope',
      icon: 'bi-exclamation-triangle',
      label: 'Disclosure scope',
      text: 'Only disclosed transactions: amounts are filed ranges, so dollar totals are estimates, and many House filings leave the owner blank.',
    },
    {
      id: 'quality',
      icon: 'bi-file-earmark-check',
      label: 'Data quality',
      text: `${n0(d.duplicatesRemoved.house + d.duplicatesRemoved.senate)} third-party rows that repeated an official filing were removed. Notification dates for spouse or managed accounts can legitimately extend the 45-day clock.`,
    },
  );
  return out;
}

/* ── Charts ───────────────────────────────────────────────────────────── */

export function windowBars(d, chamber = 'both') {
  const a = d.analysis;
  return d.windows.map((w, i) => {
    const pick = (c) => (chamber === 'both' || chamber === c ? a[c].rows[i] : null);
    const rows = [pick('house'), pick('senate')].filter(Boolean);
    const purchases = rows.reduce((t, r) => t + r.purchases, 0);
    const sales = rows.reduce((t, r) => t + r.sales, 0);
    const gap =
      (chamber !== 'house' && Boolean(a.senate.gaps[i])) ||
      (chamber !== 'senate' && Boolean(a.house.gaps[i]));
    return { key: w.k, label: w.short, purchases, sales, total: purchases + sales, gap };
  });
}

export function chamberSplit(d, i = d.windows.length - 1) {
  const a = d.analysis;
  const house = a.house.rows[i]?.trades || 0;
  const senate = a.senate.rows[i]?.trades || 0;
  const total = house + senate;
  return {
    window: d.windows[i],
    total,
    house,
    senate,
    houseShare: total ? house / total : 0,
    senateGap: Boolean(a.senate.gaps[i]),
  };
}

export function sideIndex(d, chamber = 'house') {
  const c = d.analysis[chamber];
  const idx = okIdx(c);
  if (idx.length < 2) return null;
  const base = c.rows[idx[0]];
  if (!base.purchases || !base.sales) return null;
  return idx.map((i) => ({
    label: d.windows[i].short,
    purchases: (c.rows[i].purchases / base.purchases) * 100,
    sales: (c.rows[i].sales / base.sales) * 100,
  }));
}
