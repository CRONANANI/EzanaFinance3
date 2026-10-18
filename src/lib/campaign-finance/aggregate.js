/**
 * Campaign finance aggregation (pure, no I/O, unit-tested in
 * scripts/check-campaign-finance.mjs).
 *
 * Input: the cached per-member rows for one cycle (totals + outside spending,
 * keyed by bioguide_id) and the member directory. Output: the compact payload
 * the Campaign Finance Intelligence page renders. Large aggregates (party,
 * chamber, medians, size and purpose roll-ups, outside-group network) are all
 * computed here on the server, never in the browser.
 *
 * Honesty rules baked in:
 *   - A member without a figure is left out of that figure (never counted as
 *     zero). Every roll-up carries the number of members it covers.
 *   - Contribution-size COUNTS exist only for the itemized buckets ($200 and
 *     up); the under-$200 bucket is reported as a total with no count, so the
 *     count view leaves it out rather than showing 0.
 *   - Receipts that are neither itemized individual nor PAC money are reported
 *     as one "all other receipts" remainder, because the finer split
 *     (unitemized, party, transfers, other) is not stored yet.
 */

export const SIZE_BUCKETS = [
  { size: 0, key: 'u200', label: 'Under $200' },
  { size: 200, key: 'b200', label: '$200 to $499' },
  { size: 500, key: 'b500', label: '$500 to $999' },
  { size: 1000, key: 'b1000', label: '$1,000 to $1,999' },
  { size: 2000, key: 'b2000', label: '$2,000 and above' },
];

const num = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

const sum = (values) => values.reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0);

/** 'D' | 'R' | 'I' | null from any party spelling. */
export function partyCode(p) {
  const s = String(p || '').toLowerCase();
  if (!s) return null;
  if (s.startsWith('d')) return 'D';
  if (s.startsWith('r')) return 'R';
  if (s.startsWith('i')) return 'I';
  return null;
}

/** 'H' | 'S' | null from an office code or a chamber word. */
export function chamberCode(office, chamber) {
  const o = String(office || '').toUpperCase();
  if (o === 'H' || o === 'S') return o;
  const c = String(chamber || '').toLowerCase();
  if (c.startsWith('sen')) return 'S';
  if (c.startsWith('house') || c.startsWith('rep')) return 'H';
  return null;
}

/** Size buckets in a fixed order: dollars and counts, or null when absent. */
export function normalizeSizes(raw) {
  if (!Array.isArray(raw) || !raw.length) return null;
  const by = new Map(raw.map((b) => [Number(b?.size), b]));
  const dollars = SIZE_BUCKETS.map((b) => num(by.get(b.size)?.total) ?? 0);
  const counts = SIZE_BUCKETS.map((b, i) => (i === 0 ? null : (num(by.get(b.size)?.count) ?? 0)));
  if (sum(dollars) <= 0) return null;
  return { dollars, counts };
}

function measures(list) {
  const pick = (k) => list.map((m) => m[k]).filter((x) => x != null);
  const out = { n: list.length };
  for (const k of ['raised', 'spent', 'cash', 'debt']) {
    const v = pick(k);
    out[k] = {
      total: v.length ? sum(v) : null,
      median: median(v),
      average: v.length ? sum(v) / v.length : null,
      n: v.length,
    };
  }
  return out;
}

function sizeRollup(list) {
  const withSizes = list.filter((m) => m.sizes);
  if (!withSizes.length) return { n: 0, dollars: null, counts: null };
  const dollars = SIZE_BUCKETS.map((_, i) => sum(withSizes.map((m) => m.sizes.dollars[i])));
  const counts = SIZE_BUCKETS.map((_, i) =>
    i === 0 ? null : sum(withSizes.map((m) => m.sizes.counts[i])),
  );
  return { n: withSizes.length, dollars, counts };
}

/** Title case for an upper-case purpose code: "LOAN-REPAYMENTS" -> "Loan repayments". */
export function purposeLabel(code) {
  const s = String(code || '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Other';
}

export function normalizePurposes(raw) {
  if (!Array.isArray(raw) || !raw.length) return null;
  const rows = raw
    .map((p) => ({ code: String(p?.purpose || 'OTHER'), total: num(p?.total) ?? 0 }))
    .filter((p) => p.total > 0);
  return rows.length ? rows : null;
}

/**
 * @param {object} args
 * @param {number} args.cycle
 * @param {object[]} args.totals   fec_candidate_totals rows for the cycle
 * @param {object[]} args.outside  fec_candidate_outside rows for the cycle
 * @param {(id:string)=>object|null} args.directory  memberByBioguide
 * @param {number} [args.chamberSize] expected member count (538 by default)
 */
export function buildOverview({ cycle, totals = [], outside = [], directory, chamberSize = 538 }) {
  const outsideBy = new Map(outside.map((o) => [o.bioguide_id, o]));
  let synced = null;
  const periodEnds = new Map();

  const members = totals.map((t) => {
    const dir = (directory && directory(t.bioguide_id)) || {};
    const party = partyCode(t.party) || partyCode(dir.party);
    const chamber = chamberCode(t.office, dir.chamber);
    const o = outsideBy.get(t.bioguide_id);
    if (t.synced_at && (!synced || t.synced_at > synced)) synced = t.synced_at;
    if (o?.synced_at && (!synced || o.synced_at > synced)) synced = o.synced_at;
    if (t.coverage_end_date) {
      periodEnds.set(t.coverage_end_date, (periodEnds.get(t.coverage_end_date) || 0) + 1);
    }
    const raised = num(t.receipts);
    const itemized = num(t.individual_itemized_contributions);
    const pac = num(t.other_political_committee_contributions);
    const support = num(o?.support_total);
    const oppose = num(o?.oppose_total);
    return {
      id: t.bioguide_id,
      name: dir.fullName || t.name || null,
      party,
      chamber,
      state: t.state || dir.state || null,
      district: chamber === 'H' ? (dir.district ?? null) : null,
      raised,
      spent: num(t.disbursements),
      cash: num(t.cash_on_hand_end_period),
      debt: num(t.debts_owed_by_committee),
      itemized,
      pac,
      periodEnd: t.coverage_end_date || null,
      sizes: normalizeSizes(t.size_buckets),
      hasPurposes: Boolean(normalizePurposes(o?.spending_by_purpose)),
      hasStates: Array.isArray(t.top_states) && t.top_states.length > 0,
      support: support && support > 0 ? support : support === 0 ? 0 : null,
      oppose: oppose && oppose > 0 ? oppose : oppose === 0 ? 0 : null,
      _purposes: normalizePurposes(o?.spending_by_purpose),
      _groups: Array.isArray(o?.by_committee) ? o.by_committee : [],
    };
  });

  /* Latest reporting period: the most common coverage end date, so one late
     filer does not move the label. */
  let latestPeriodEnd = null;
  let best = 0;
  for (const [d, n] of periodEnds) {
    if (n > best || (n === best && d > latestPeriodEnd)) {
      latestPeriodEnd = d;
      best = n;
    }
  }

  const all = measures(members);
  const totalsBlock = {
    raised: all.raised.total,
    spent: all.spent.total,
    cash: all.cash.total,
    debt: all.debt.total,
    pac: sum(members.map((m) => m.pac)),
    itemized: sum(members.map((m) => m.itemized)),
    debtMembers: members.filter((m) => (m.debt || 0) > 0).length,
  };

  /* Funding composition: itemized individual, PAC, and the remainder. */
  const composition =
    totalsBlock.raised && totalsBlock.raised > 0
      ? [
          { key: 'itemized', amount: totalsBlock.itemized },
          { key: 'pac', amount: totalsBlock.pac },
          {
            key: 'other',
            amount: Math.max(0, totalsBlock.raised - totalsBlock.itemized - totalsBlock.pac),
          },
        ]
      : null;

  const byParty = {};
  for (const p of ['D', 'R', 'I']) byParty[p] = measures(members.filter((m) => m.party === p));
  const byChamber = {};
  for (const c of ['H', 'S']) byChamber[c] = measures(members.filter((m) => m.chamber === c));
  const byPartyChamber = {};
  for (const p of ['D', 'R', 'I']) {
    for (const c of ['H', 'S']) {
      const list = members.filter((m) => m.party === p && m.chamber === c);
      if (list.length) byPartyChamber[`${p}${c}`] = measures(list);
    }
  }

  const sizes = {
    all: sizeRollup(members),
    D: sizeRollup(members.filter((m) => m.party === 'D')),
    R: sizeRollup(members.filter((m) => m.party === 'R')),
    H: sizeRollup(members.filter((m) => m.chamber === 'H')),
    S: sizeRollup(members.filter((m) => m.chamber === 'S')),
  };

  /* Spending by purpose across Congress. */
  const purposeAcc = new Map();
  let purposeMembers = 0;
  for (const m of members) {
    if (!m._purposes) continue;
    purposeMembers += 1;
    for (const p of m._purposes) purposeAcc.set(p.code, (purposeAcc.get(p.code) || 0) + p.total);
  }
  const purposes = [...purposeAcc.entries()]
    .map(([code, total]) => ({ code, label: purposeLabel(code), total }))
    .sort((a, b) => b.total - a.total);

  /* Outside money network: groups and their links to members. */
  const groupAcc = new Map();
  const links = [];
  const memberIndex = new Map(members.map((m, i) => [m.id, i]));
  for (const m of members) {
    for (const g of m._groups) {
      const gid = g?.committeeId || g?.committeeName;
      const amount = num(g?.total);
      if (!gid || !amount || amount <= 0) continue;
      let rec = groupAcc.get(gid);
      if (!rec) {
        rec = { id: gid, name: g.committeeName || gid, total: 0, members: 0 };
        groupAcc.set(gid, rec);
      }
      rec.total += amount;
      rec.members += 1;
      links.push({
        m: memberIndex.get(m.id),
        g: gid,
        side: String(g.supportOpposeIndicator || '').toUpperCase() === 'O' ? 'O' : 'S',
        amount,
      });
    }
  }
  const groups = [...groupAcc.values()].sort((a, b) => b.total - a.total);
  const groupIndex = new Map(groups.map((g, i) => [g.id, i]));
  const compactLinks = links.map((l) => [l.m, groupIndex.get(l.g), l.side, Math.round(l.amount)]);

  const withOutside = members.filter((m) => (m.support || 0) + (m.oppose || 0) > 0);
  const outsideBlock = {
    support: sum(withOutside.map((m) => m.support)),
    oppose: sum(withOutside.map((m) => m.oppose)),
    members: withOutside.length,
  };

  const coverage = {
    members: members.length,
    expected: chamberSize,
    sizes: sizes.all.n,
    purposes: purposeMembers,
    outside: withOutside.length,
    groups: members.filter((m) => m._groups.length).length,
  };

  /* Ranks for the drawer header. */
  const rankBy = (k) => {
    const order = members
      .filter((m) => m[k] != null)
      .sort((a, b) => b[k] - a[k])
      .map((m) => m.id);
    return new Map(order.map((id, i) => [id, i + 1]));
  };
  const rankRaised = rankBy('raised');
  const rankCash = rankBy('cash');

  const publicMembers = members.map((m) => ({
    id: m.id,
    name: m.name,
    party: m.party,
    chamber: m.chamber,
    state: m.state,
    district: m.district,
    raised: m.raised,
    spent: m.spent,
    cash: m.cash,
    debt: m.debt,
    itemized: m.itemized,
    pac: m.pac,
    periodEnd: m.periodEnd,
    sizes: m.sizes,
    hasPurposes: m.hasPurposes,
    hasStates: m.hasStates,
    support: m.support,
    oppose: m.oppose,
    rankRaised: rankRaised.get(m.id) || null,
    rankCash: rankCash.get(m.id) || null,
  }));

  return {
    ok: true,
    cycle,
    ready: members.length > 0,
    synced,
    latestPeriodEnd,
    totals: totalsBlock,
    composition,
    byParty,
    byChamber,
    byPartyChamber,
    sizes,
    purposes,
    outside: outsideBlock,
    groups,
    links: compactLinks,
    coverage,
    members: publicMembers,
  };
}

/** Member detail for the drawer and the per-member card views. */
export function buildMemberDetail({ totals, outside }) {
  if (!totals) return null;
  const groups = (Array.isArray(outside?.by_committee) ? outside.by_committee : [])
    .map((g) => ({
      name: g?.committeeName || g?.committeeId || null,
      side: String(g?.supportOpposeIndicator || '').toUpperCase() === 'O' ? 'O' : 'S',
      amount: num(g?.total) ?? 0,
    }))
    .filter((g) => g.name && g.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const states = (Array.isArray(totals.top_states) ? totals.top_states : [])
    .map((s) => ({
      state: s?.state || null,
      name: s?.stateFull || s?.state,
      total: num(s?.total) ?? 0,
    }))
    .filter((s) => s.state && s.total > 0)
    .sort((a, b) => b.total - a.total);
  return {
    id: totals.bioguide_id,
    periodStart: totals.coverage_start_date || null,
    periodEnd: totals.coverage_end_date || null,
    sizes: normalizeSizes(totals.size_buckets),
    states,
    purposes: (normalizePurposes(outside?.spending_by_purpose) || [])
      .map((p) => ({ ...p, label: purposeLabel(p.code) }))
      .sort((a, b) => b.total - a.total),
    groups,
    support: num(outside?.support_total),
    oppose: num(outside?.oppose_total),
  };
}
