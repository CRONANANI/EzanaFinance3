/**
 * Committee reads for the /api/committees routes: SERVER ONLY.
 *
 * Tables: congress_committees, congress_committee_members (synced daily by
 * /api/cron/ingest-committees), congress_trades and congress_members.
 * Party and names come from the vendored legislators file when the members
 * table lacks them. Nothing here guesses: a ticker the sector map cannot place
 * is counted as unmapped, never assigned a sector.
 */
import { memberByBioguide } from '@/lib/politicians/member-directory';
import { resolveHeadshot } from '@/lib/politicians/headshots';
import { SECTORS, sectorsForTicker } from './policy-sector-map';
import { sectorsForCommittee, sectorLabel } from './committee-sectors';
import { committeeLeaders } from './committees';

const PAGE = 1000;

/** Read every row of a query, 1,000 at a time (PostgREST caps a response). */
async function selectAll(build) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < PAGE) return out;
  }
}

const SEAT_COLS = 'committee_thomas_id, bioguide_id, member_name, side, rank, title, synced_at';
const COMMITTEE_COLS =
  'thomas_id, parent_thomas_id, chamber, name, url, jurisdiction, is_subcommittee, synced_at';

const partyOf = (bioguideId) => memberByBioguide(bioguideId)?.party || null;

function person(seat) {
  if (!seat) return null;
  const dir = memberByBioguide(seat.bioguide_id);
  return {
    bioguideId: seat.bioguide_id,
    name: dir?.fullName || seat.member_name || null,
    party: dir?.party || null,
    title: seat.title || null,
  };
}

/* "House Committee on Armed Services" -> "Armed Services". */
export function shortCommitteeName(name = '') {
  return String(name)
    .replace(
      /^(United States )?(House|Senate)( Permanent| Special)?( Select)? Committee on (the )?/i,
      '',
    )
    .replace(/^(Joint Committee on|Joint Committee of Congress on the) /i, '')
    .trim();
}

const sectorList = (keys) => keys.map((key) => ({ key, label: sectorLabel(key) }));

function bySeatOrder(a, b) {
  if (a.side !== b.side) return a.side === 'majority' ? -1 : 1;
  return (a.rank ?? 999) - (b.rank ?? 999);
}

function summarize(c, seats) {
  const { chair, ranking } = committeeLeaders(seats);
  return {
    thomasId: c.thomas_id,
    parentThomasId: c.parent_thomas_id,
    chamber: c.chamber,
    name: c.name,
    shortName: shortCommitteeName(c.name),
    url: c.url,
    jurisdiction: c.jurisdiction,
    seats: seats.length,
    majority: seats.filter((s) => s.side === 'majority').length,
    minority: seats.filter((s) => s.side === 'minority').length,
    chair: person(chair),
    ranking: person(ranking),
    sectors: sectorList(sectorsForCommittee(c.thomas_id, c.parent_thomas_id)),
  };
}

/** Load every committee and seat once. */
async function loadAll(admin) {
  const [committees, seats] = await Promise.all([
    selectAll(() => admin.from('congress_committees').select(COMMITTEE_COLS).order('thomas_id')),
    selectAll(() =>
      admin
        .from('congress_committee_members')
        .select(SEAT_COLS)
        .order('committee_thomas_id')
        .order('bioguide_id'),
    ),
  ]);
  const seatsBy = new Map();
  for (const s of seats) {
    if (!seatsBy.has(s.committee_thomas_id)) seatsBy.set(s.committee_thomas_id, []);
    seatsBy.get(s.committee_thomas_id).push(s);
  }
  return { committees, seats, seatsBy };
}

/* ── overseen-sector trades ─────────────────────────────────────────── */

/**
 * Match one member's trades against the sectors their committees oversee.
 * @param trades rows from congress_trades
 * @param oversight Map sectorKey -> [{ thomasId, name, shortName }]
 */
export function matchOverseenTrades(trades, oversight) {
  let unmapped = 0;
  let outside = 0;
  const matched = [];
  for (const t of trades) {
    const sectors = sectorsForTicker(t.ticker);
    if (!sectors.length) {
      unmapped += 1;
      continue;
    }
    const hit = sectors.find((k) => oversight.has(k));
    if (!hit) {
      outside += 1;
      continue;
    }
    const committee = oversight.get(hit)[0];
    matched.push({
      transaction_date: t.transaction_date,
      ticker: t.ticker,
      type: t.type,
      amount_min: t.amount_min,
      amount_max: t.amount_max,
      source_url: t.source_url,
      committee,
      sector: { key: hit, label: sectorLabel(hit) },
    });
  }
  return { matched, unmapped, outside };
}

function oversightFor(memberSeats, committeeById) {
  const map = new Map();
  for (const s of memberSeats) {
    const c = committeeById.get(s.committee_thomas_id);
    if (!c) continue;
    const parent = c.parent_thomas_id ? committeeById.get(c.parent_thomas_id) : c;
    for (const key of sectorsForCommittee(c.thomas_id, c.parent_thomas_id)) {
      if (!map.has(key)) map.set(key, []);
      const ref = {
        thomasId: parent.thomas_id,
        chamber: parent.chamber,
        name: parent.name,
        shortName: shortCommitteeName(parent.name),
      };
      if (!map.get(key).some((r) => r.thomasId === ref.thomasId)) map.get(key).push(ref);
    }
  }
  return map;
}

const monthsAgo = (n) => {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString().slice(0, 10);
};

const TRADE_COLS =
  'bioguide_id, transaction_date, ticker, type, amount_min, amount_max, source_url';
const MAPPED_TICKERS = [...new Set(Object.values(SECTORS).flatMap((s) => s.tickers))];

/* ── public readers ─────────────────────────────────────────────────── */

/** All committees with subcommittees, counts, leaders, sectors, belt items. */
export async function getCommitteeIndex(admin) {
  const { committees, seats, seatsBy } = await loadAll(admin);
  const committeeById = new Map(committees.map((c) => [c.thomas_id, c]));

  const parents = committees
    .filter((c) => !c.is_subcommittee)
    .map((c) => ({
      ...summarize(c, seatsBy.get(c.thomas_id) || []),
      subcommittees: committees
        .filter((s) => s.parent_thomas_id === c.thomas_id)
        .map((s) => summarize(s, seatsBy.get(s.thomas_id) || []))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  /* Ticker belt: recent trades in mapped tickers by members who sit on a
     committee overseeing that ticker's sector. */
  const seatsByMember = new Map();
  for (const s of seats) {
    if (!seatsByMember.has(s.bioguide_id)) seatsByMember.set(s.bioguide_id, []);
    seatsByMember.get(s.bioguide_id).push(s);
  }
  let belt = [];
  if (seats.length) {
    const { data: recent } = await admin
      .from('congress_trades')
      .select(TRADE_COLS)
      .in('ticker', MAPPED_TICKERS)
      .gte('transaction_date', monthsAgo(3))
      .order('transaction_date', { ascending: false })
      .limit(400);
    for (const t of recent || []) {
      if (belt.length >= 20) break;
      const mine = seatsByMember.get(t.bioguide_id);
      if (!mine) continue;
      const { matched } = matchOverseenTrades([t], oversightFor(mine, committeeById));
      if (!matched.length) continue;
      const dir = memberByBioguide(t.bioguide_id);
      belt.push({ ...matched[0], bioguideId: t.bioguide_id, member: dir?.fullName || null });
    }
  }

  /* Everyone holding a seat, for the page's member search. */
  const members = [...seatsByMember.entries()]
    .map(([bioguideId, list]) => {
      const dir = memberByBioguide(bioguideId);
      return {
        bioguideId,
        name: dir?.fullName || list[0]?.member_name || bioguideId,
        party: dir?.party || null,
        chamber: dir?.chamber || null,
        state: dir?.state || null,
        district: dir?.district ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const syncedAt = committees.reduce(
    (max, c) => (c.synced_at && c.synced_at > max ? c.synced_at : max),
    '',
  );
  return {
    committees: parents,
    counts: {
      committees: parents.length,
      subcommittees: committees.length - parents.length,
      seats: seats.length,
    },
    syncedAt: syncedAt || null,
    belt,
    members,
  };
}

/** One committee (parent or subcommittee) with its members and subcommittees. */
export async function getCommittee(admin, thomasId) {
  const { data: c } = await admin
    .from('congress_committees')
    .select(COMMITTEE_COLS)
    .eq('thomas_id', thomasId)
    .maybeSingle();
  if (!c) return null;

  const [{ data: seats }, { data: subs }, parentRes] = await Promise.all([
    admin.from('congress_committee_members').select(SEAT_COLS).eq('committee_thomas_id', thomasId),
    admin.from('congress_committees').select(COMMITTEE_COLS).eq('parent_thomas_id', thomasId),
    c.parent_thomas_id
      ? admin
          .from('congress_committees')
          .select(COMMITTEE_COLS)
          .eq('thomas_id', c.parent_thomas_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const list = (seats || []).slice().sort(bySeatOrder);

  const ids = list.map((s) => s.bioguide_id);
  const { data: rows } = ids.length
    ? await admin
        .from('congress_members')
        .select('bioguide_id, full_name, party, photo_url')
        .in('bioguide_id', ids)
    : { data: [] };
  const dbMembers = new Map((rows || []).map((r) => [r.bioguide_id, r]));

  const subSeats = new Map();
  if (subs?.length) {
    const { data: ss } = await admin
      .from('congress_committee_members')
      .select(SEAT_COLS)
      .in(
        'committee_thomas_id',
        subs.map((s) => s.thomas_id),
      );
    for (const s of ss || []) {
      if (!subSeats.has(s.committee_thomas_id)) subSeats.set(s.committee_thomas_id, []);
      subSeats.get(s.committee_thomas_id).push(s);
    }
  }

  return {
    ...summarize(c, list),
    parent: parentRes.data
      ? { thomasId: parentRes.data.thomas_id, name: parentRes.data.name }
      : null,
    members: list.map((s) => {
      const db = dbMembers.get(s.bioguide_id);
      const dir = memberByBioguide(s.bioguide_id);
      const name = dir?.fullName || db?.full_name || s.member_name || null;
      return {
        bioguideId: s.bioguide_id,
        name,
        party: dir?.party || (db?.party ? String(db.party).charAt(0).toUpperCase() : null),
        side: s.side,
        rank: s.rank,
        title: s.title,
        headshot:
          db?.photo_url || resolveHeadshot({ name, bioguideId: s.bioguide_id })?.src || null,
      };
    }),
    subcommittees: (subs || [])
      .map((s) => summarize(s, subSeats.get(s.thomas_id) || []))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/**
 * A member's committees plus their trades in sectors those committees oversee.
 * `lite` skips the trades (the tracker panel only draws the committee chips);
 * otherwise the trades read starts alongside the committee reads.
 */
export async function getMemberCommittees(admin, bioguideId, { lite = false } = {}) {
  const tradesP = lite
    ? null
    : admin
        .from('congress_trades')
        .select(TRADE_COLS)
        .eq('bioguide_id', bioguideId)
        .gte('transaction_date', monthsAgo(24))
        .order('transaction_date', { ascending: false })
        .limit(2000)
        .then((r) => r);
  const { data: seats, error } = await admin
    .from('congress_committee_members')
    .select(SEAT_COLS)
    .eq('bioguide_id', bioguideId);
  if (error) throw new Error(error.message);
  const dir = memberByBioguide(bioguideId);
  const member = {
    bioguideId,
    name: dir?.fullName || seats?.[0]?.member_name || null,
    party: partyOf(bioguideId),
    chamber: dir?.chamber || null,
    state: dir?.state || null,
    district: dir?.district ?? null,
  };
  if (!seats?.length) {
    return {
      member,
      committees: [],
      trades: [],
      counts: { trades: 0, overseen: 0, unmapped: 0, outside: 0 },
    };
  }

  const ids = [...new Set(seats.map((s) => s.committee_thomas_id))];
  const { data: own } = await admin
    .from('congress_committees')
    .select(COMMITTEE_COLS)
    .in('thomas_id', ids);
  const parentIds = [
    ...new Set((own || []).map((c) => c.parent_thomas_id).filter((p) => p && !ids.includes(p))),
  ];
  const { data: parentsOnly } = parentIds.length
    ? await admin.from('congress_committees').select(COMMITTEE_COLS).in('thomas_id', parentIds)
    : { data: [] };
  const committeeById = new Map(
    [...(own || []), ...(parentsOnly || [])].map((c) => [c.thomas_id, c]),
  );

  const seatBy = new Map(seats.map((s) => [s.committee_thomas_id, s]));
  const parents = new Map();
  for (const c of own || []) {
    const parentId = c.parent_thomas_id || c.thomas_id;
    const p = committeeById.get(parentId);
    if (!p) continue;
    if (!parents.has(parentId)) {
      const seat = seatBy.get(parentId) || null;
      parents.set(parentId, {
        thomasId: p.thomas_id,
        chamber: p.chamber,
        name: p.name,
        shortName: shortCommitteeName(p.name),
        onCommittee: !!seat,
        side: seat?.side || null,
        rank: seat?.rank ?? null,
        title: seat?.title || null,
        sectors: sectorList(sectorsForCommittee(p.thomas_id)),
        subcommittees: [],
      });
    }
    if (c.parent_thomas_id) {
      const seat = seatBy.get(c.thomas_id);
      parents.get(parentId).subcommittees.push({
        thomasId: c.thomas_id,
        name: c.name,
        side: seat?.side || null,
        rank: seat?.rank ?? null,
        title: seat?.title || null,
      });
    }
  }

  const committees = [...parents.values()].sort((a, b) => a.name.localeCompare(b.name));
  if (lite) {
    return { member, committees, trades: [], counts: null, lite: true };
  }
  const { data: trades } = await tradesP;
  const withTicker = (trades || []).filter((t) => t.ticker);
  const { matched, unmapped, outside } = matchOverseenTrades(
    withTicker,
    oversightFor(seats, committeeById),
  );

  return {
    member,
    committees,
    trades: matched,
    counts: {
      trades: withTicker.length,
      overseen: matched.length,
      unmapped,
      outside,
      noTicker: (trades || []).length - withTicker.length,
    },
  };
}
