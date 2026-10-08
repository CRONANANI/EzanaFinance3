/**
 * Capitol Watch hub: shared server reads (admin client) behind the events,
 * the rule pool and the member drawer. SERVER ONLY. Each takes the admin
 * client and throws on a database error; the cached callers catch.
 */
import { sectorsForTicker } from '@/lib/congress/policy-sector-map';
import { sectorsForCommittee, sectorLabel } from '@/lib/congress/committee-sectors';
import { shortCommitteeName } from '@/lib/congress/committee-data';
import { count, readAll } from '@/lib/datasets/hub-data';

export const DAY = 86400000;
export const isoDaysAgo = (n, from = Date.now()) =>
  new Date(from - n * DAY).toISOString().slice(0, 10);
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const up = (s) => (s == null ? '' : String(s).trim().toUpperCase());
export const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/* Committees whose formal names run past a table cell. */
const SHORT = { HSZS: 'China Select Committee', SLIA: 'Indian Affairs' };

export function committeeName(thomasId, name) {
  return SHORT[thomasId] || shortCommitteeName(name || thomasId || '');
}

/**
 * For each member, the full committees they sit on (directly or through a
 * subcommittee) and the sector keys each oversees.
 * @returns {Map<string, { id, name, sectors: string[] }[]>}
 */
export async function memberOversight(admin, bioguideIds = null) {
  const ids = bioguideIds ? [...new Set(bioguideIds.map(up).filter(Boolean))] : null;
  if (ids && !ids.length) return new Map();
  const seatQuery = () => {
    let q = admin
      .from('ezq_committee_seats')
      .select('committee_thomas_id, bioguide_id')
      .order('committee_thomas_id')
      .order('bioguide_id');
    if (ids) q = q.in('bioguide_id', ids);
    return q;
  };
  const seatTotal = await count(() => {
    let q = admin.from('ezq_committee_seats').select('bioguide_id', { count: 'exact', head: true });
    if (ids) q = q.in('bioguide_id', ids);
    return q;
  });
  const [committees, seats] = await Promise.all([
    readAll(
      () =>
        admin
          .from('congress_committees')
          .select('thomas_id, parent_thomas_id, name')
          .order('thomas_id'),
      600,
    ),
    seatTotal ? readAll(seatQuery, seatTotal) : [],
  ]);
  const byId = new Map(committees.map((c) => [c.thomas_id, c]));
  const out = new Map();
  for (const s of seats) {
    const c = byId.get(s.committee_thomas_id);
    if (!c) continue;
    const parent = c.parent_thomas_id ? byId.get(c.parent_thomas_id) || c : c;
    const sectors = sectorsForCommittee(c.thomas_id, c.parent_thomas_id);
    const key = up(s.bioguide_id);
    if (!out.has(key)) out.set(key, []);
    const list = out.get(key);
    if (list.some((x) => x.id === parent.thomas_id)) continue;
    list.push({
      id: parent.thomas_id,
      name: committeeName(parent.thomas_id, parent.name),
      sectors,
    });
  }
  return out;
}

/** The first of a member's committees that oversees a ticker's sector. */
export function oversightFor(oversight, bioguideId, ticker) {
  const list = oversight.get(up(bioguideId)) || [];
  const keys = sectorsForTicker(up(ticker));
  for (const c of list) {
    const hit = keys.find((k) => c.sectors.includes(k));
    if (hit) return { committee: c.name, committeeId: c.id, sector: sectorLabel(hit) };
  }
  return null;
}

/**
 * Verified lobbying clients by ticker with this year's reported spend.
 * @returns {Map<string, { client, spend, year }>}
 */
export async function lobbyingByTicker(admin) {
  const year = new Date().getUTCFullYear();
  const { data: clients, error } = await admin
    .from('lobbying_client_tickers')
    .select('client_name, ticker')
    .eq('verified', true);
  if (error) throw new Error(error.message);
  if (!clients?.length) return new Map();
  const names = [...new Set(clients.map((c) => c.client_name))];
  const total = await count(() =>
    admin
      .from('lobbying_filings')
      .select('uuid', { count: 'exact', head: true })
      .eq('filing_year', year)
      .in('client_name', names),
  );
  const rows = total
    ? await readAll(
        () =>
          admin
            .from('lobbying_filings')
            .select('uuid, client_name, amount')
            .eq('filing_year', year)
            .in('client_name', names)
            .order('uuid'),
        total,
      )
    : [];
  const spend = new Map();
  for (const r of rows)
    spend.set(r.client_name, (spend.get(r.client_name) || 0) + (num(r.amount) || 0));
  const out = new Map();
  for (const c of clients) {
    if (!spend.has(c.client_name)) continue;
    const t = up(c.ticker);
    const cur = out.get(t);
    const s = spend.get(c.client_name);
    if (!cur || s > cur.spend) out.set(t, { client: c.client_name, spend: s, year });
  }
  return out;
}

/** Company names by ticker, from the contractor map. */
export async function companyNames(admin, tickers) {
  const list = [...new Set(tickers.map(up).filter(Boolean))];
  if (!list.length) return new Map();
  const { data, error } = await admin
    .from('contractor_tickers')
    .select('ticker, company')
    .in('ticker', list)
    .limit(2000);
  if (error) throw new Error(error.message);
  const out = new Map();
  for (const r of data || []) {
    const t = up(r.ticker);
    if (r.company && (!out.has(t) || r.company.length < out.get(t).length)) out.set(t, r.company);
  }
  return out;
}

/** The latest award per ticker since a date: Map(ticker -> { date, amount, agency }). */
export async function latestAwards(admin, tickers, since) {
  const list = [...new Set(tickers.map(up).filter(Boolean))];
  if (!list.length) return new Map();
  const { data, error } = await admin
    .from('contract_awards_resolved')
    .select('ticker, action_date, award_amount, awarding_agency')
    .in('ticker', list)
    .gte('action_date', since)
    .order('action_date', { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  const out = new Map();
  for (const r of data || []) {
    const t = up(r.ticker);
    if (!out.has(t))
      out.set(t, { date: r.action_date, amount: num(r.award_amount), agency: r.awarding_agency });
  }
  return out;
}

/**
 * Daily closes around a date: about 60 trading days, 45 calendar days either
 * side. Empty until the price sync has run for the ticker.
 */
export async function pricesAround(admin, ticker, center) {
  if (!ticker || !center) return [];
  const c = Date.parse(center);
  const from = new Date(c - 45 * DAY).toISOString().slice(0, 10);
  const to = new Date(c + 45 * DAY).toISOString().slice(0, 10);
  const { data, error } = await admin
    .from('price_data_cache')
    .select('date, close')
    .eq('ticker', up(ticker))
    .gte('date', from)
    .lte('date', to)
    .order('date');
  if (error) throw new Error(error.message);
  return (data || [])
    .filter((p) => num(p.close) != null)
    .map((p) => ({ date: String(p.date).slice(0, 10), close: num(p.close) }));
}
