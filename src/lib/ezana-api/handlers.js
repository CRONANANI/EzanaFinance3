/**
 * Handlers for the live /v1 endpoints (server only, admin client). Keyed by
 * the registry entry `id`. Each returns { data, page?, meta? } and throws
 * ApiError for not-found. Field selection is fixed per endpoint: no column
 * passthrough, money in USD as numbers, dates ISO 8601, tickers upper-case.
 *
 * Every list uses keyset (cursor) pagination over a unique descending sort;
 * delayed endpoints hide rows newer than the key's cutoff.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { ApiError, keysetOr, pageOf, encodeCursor } from './query';

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const day = (v) => (v ? String(v).slice(0, 10) : null);
const endOfDay = (d) => `${d}T23:59:59.999Z`;
/* Text for ilike: drop PostgREST and LIKE metacharacters. */
const like = (s) =>
  `%${String(s)
    .replace(/[%_*,()"\\]/g, ' ')
    .trim()}%`;

const TRADE_SOURCE = { house_clerk: 'House Clerk', senate_efd: 'Senate Office of Public Records' };

async function readPage(table, select, { keys, notNull = [], limit, cursor, dir = 'desc' }, apply) {
  const admin = getAdminClient();
  let qb = admin.from(table).select(select);
  for (const k of notNull) qb = qb.not(k, 'is', null);
  if (apply) qb = apply(qb);
  if (cursor) qb = qb.or(keysetOr(keys, cursor, dir));
  for (const k of keys) qb = qb.order(k, { ascending: dir === 'asc' });
  const { data, error } = await qb.limit(limit + 1);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data || [];
}

/* ── congress ───────────────────────────────────────────────────────── */

const TRADE_SELECT =
  'id, bioguide_id, member_name, chamber, party, state, transaction_date, disclosure_date, ticker, asset_name, type, amount_min, amount_max, owner, source';

function tradeOut(t) {
  const lag =
    t.transaction_date && t.disclosure_date
      ? Math.round((Date.parse(t.disclosure_date) - Date.parse(t.transaction_date)) / 86400000)
      : null;
  return {
    id: t.id,
    member: {
      bioguide_id: t.bioguide_id,
      name: t.member_name,
      party: t.party,
      chamber: t.chamber,
      state: t.state,
    },
    ticker: t.ticker ? String(t.ticker).toUpperCase() : null,
    asset: t.asset_name,
    transaction: t.type,
    amount_min: num(t.amount_min),
    amount_max: num(t.amount_max),
    owner: t.owner,
    traded_at: day(t.transaction_date),
    disclosed_at: day(t.disclosure_date),
    disclosure_lag_days: lag,
    source: TRADE_SOURCE[t.source] || null,
  };
}

function tradeFilters(params, cutoff, extra) {
  return (qb) => {
    let x = qb;
    if (params.ticker) x = x.in('ticker', params.ticker);
    if (params.member) x = x.eq('bioguide_id', params.member.toUpperCase());
    if (params.party) x = x.eq('party', params.party);
    if (params.chamber) x = x.eq('chamber', params.chamber);
    if (params.from) x = x.gte('transaction_date', params.from);
    if (params.to) x = x.lte('transaction_date', params.to);
    if (params.min_amount != null) x = x.gte('amount_min', params.min_amount);
    if (cutoff) x = x.lte('disclosure_date', cutoff);
    return extra ? extra(x) : x;
  };
}

const tradeKey = (t) => [t.transaction_date, t.id];

async function tradesList(params, cutoff, extra) {
  const rows = await readPage(
    'congress_trades_enriched',
    TRADE_SELECT,
    {
      keys: ['transaction_date', 'id'],
      notNull: ['transaction_date'],
      limit: params.limit,
      cursor: params.cursor,
    },
    tradeFilters(params, cutoff, extra),
  );
  const { rows: kept, page } = pageOf(rows, params.limit, tradeKey);
  return { data: kept.map(tradeOut), page };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BIOGUIDE = /^[A-Za-z][0-9]{6}$/;

export const HANDLERS = {
  'congress.trades': ({ params, cutoff }) => tradesList(params, cutoff),

  'congress.trade': async ({ path, cutoff }) => {
    if (!UUID.test(path.id)) throw new ApiError(404, 'not_found', 'No trade with that id.');
    let qb = getAdminClient()
      .from('congress_trades_enriched')
      .select(TRADE_SELECT)
      .eq('id', path.id);
    if (cutoff) qb = qb.lte('disclosure_date', cutoff);
    const { data, error } = await qb.maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new ApiError(404, 'not_found', 'No trade with that id.');
    return { data: tradeOut(data) };
  },

  'congress.members': async ({ params }) => {
    const rows = await readPage(
      'congress_members',
      'bioguide_id, first_name, last_name, full_name, chamber, party, state, district, in_office',
      { keys: ['bioguide_id'], limit: params.limit, cursor: params.cursor, dir: 'asc' },
      (qb) => {
        let x = qb;
        if (params.party) x = x.eq('party', params.party);
        if (params.chamber) x = x.eq('chamber', params.chamber);
        if (params.q) x = x.ilike('full_name', like(params.q));
        return x;
      },
    );
    const { rows: kept, page } = pageOf(rows, params.limit, (m) => [m.bioguide_id]);
    return {
      data: kept.map((m) => ({
        bioguide_id: m.bioguide_id,
        name: m.full_name,
        first_name: m.first_name,
        last_name: m.last_name,
        chamber: m.chamber,
        party: m.party,
        state: m.state,
        district: m.district,
        in_office: m.in_office,
      })),
      page,
    };
  },

  'congress.member_trades': async ({ params, path, cutoff }) => {
    if (!BIOGUIDE.test(path.id)) throw new ApiError(404, 'not_found', 'No member with that id.');
    return tradesList({ ...params, member: path.id }, cutoff);
  },

  'congress.committees': async ({ params }) => {
    const admin = getAdminClient();
    const rows = await readPage(
      'congress_committees',
      'thomas_id, parent_thomas_id, chamber, name, url, is_subcommittee',
      { keys: ['thomas_id'], limit: params.limit, cursor: params.cursor, dir: 'asc' },
      (qb) => (params.chamber ? qb.eq('chamber', params.chamber) : qb),
    );
    const { rows: kept, page } = pageOf(rows, params.limit, (c) => [c.thomas_id]);
    const seats = new Map();
    if (kept.length) {
      for (let from = 0; ; from += 1000) {
        // eslint-disable-next-line no-await-in-loop
        const { data, error } = await admin
          .from('congress_committee_members')
          .select('committee_thomas_id, bioguide_id')
          .in(
            'committee_thomas_id',
            kept.map((c) => c.thomas_id),
          )
          .order('committee_thomas_id')
          .order('bioguide_id')
          .range(from, from + 999);
        if (error) throw new Error(error.message);
        (data || []).forEach((s) =>
          seats.set(s.committee_thomas_id, (seats.get(s.committee_thomas_id) || 0) + 1),
        );
        if (!data || data.length < 1000) break;
      }
    }
    return {
      data: kept.map((c) => ({
        id: c.thomas_id,
        name: c.name,
        chamber: c.chamber,
        parent_id: c.parent_thomas_id,
        is_subcommittee: !!c.is_subcommittee,
        seats: seats.get(c.thomas_id) || 0,
        url: c.url,
      })),
      page,
    };
  },

  'congress.committee_activity': async ({ params, path, cutoff }) => {
    const admin = getAdminClient();
    const id = String(path.id).toUpperCase();
    if (!/^[A-Z0-9]{2,8}$/.test(id))
      throw new ApiError(404, 'not_found', 'No committee with that id.');
    const { data: committee } = await admin
      .from('congress_committees')
      .select('thomas_id, name, chamber, parent_thomas_id')
      .eq('thomas_id', id)
      .maybeSingle();
    if (!committee) throw new ApiError(404, 'not_found', 'No committee with that id.');
    const { data: seatRows, error } = await admin
      .from('congress_committee_members')
      .select('bioguide_id')
      .eq('committee_thomas_id', id)
      .limit(1000);
    if (error) throw new Error(error.message);
    const members = [...new Set((seatRows || []).map((s) => String(s.bioguide_id).toUpperCase()))];
    const meta = {
      committee: {
        id: committee.thomas_id,
        name: committee.name,
        chamber: committee.chamber,
        parent_id: committee.parent_thomas_id,
        members: members.length,
      },
      window_days: 365,
    };
    if (!members.length)
      return { data: [], page: { limit: params.limit, has_more: false, next: null }, meta };
    const since = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const out = await tradesList(params, cutoff, (qb) =>
      qb.in('bioguide_id', members).gte('transaction_date', since),
    );
    return { ...out, meta };
  },

  /* ── lobbying ─────────────────────────────────────────────────────── */

  'lobbying.filings': async ({ params, cutoff }) => {
    const rows = await readPage(
      'lobbying_filings',
      FILING_SELECT,
      {
        keys: ['dt_posted', 'uuid'],
        notNull: ['dt_posted'],
        limit: params.limit,
        cursor: params.cursor,
      },
      (qb) => {
        let x = qb;
        if (params.q) {
          const t = `"${like(params.q).replace(/%/g, '*')}"`;
          x = x.or(`client_name.ilike.${t},registrant_name.ilike.${t}`);
        }
        if (params.from) x = x.gte('dt_posted', params.from);
        if (params.to) x = x.lte('dt_posted', endOfDay(params.to));
        if (params.min_amount != null) x = x.gte('amount', params.min_amount);
        if (cutoff) x = x.lte('dt_posted', endOfDay(cutoff));
        return x;
      },
    );
    const { rows: kept, page } = pageOf(rows, params.limit, (f) => [f.dt_posted, f.uuid]);
    return { data: kept.map(filingOut), page };
  },

  'lobbying.filing': async ({ path, cutoff }) => {
    const id = String(path.uuid);
    if (!UUID.test(id)) throw new ApiError(404, 'not_found', 'No filing with that id.');
    let qb = getAdminClient().from('lobbying_filings').select(FILING_SELECT).eq('uuid', id);
    if (cutoff) qb = qb.lte('dt_posted', endOfDay(cutoff));
    const { data, error } = await qb.maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new ApiError(404, 'not_found', 'No filing with that id.');
    return { data: filingOut(data) };
  },

  'lobbying.top_spenders': async ({ params, cutoff }) => {
    const year = params.year || new Date().getUTCFullYear();
    const limit = params.limit || 50;
    const ranked = await topSpenders(year, cutoff || 'none');
    return {
      data: ranked.slice(0, limit),
      page: { limit, has_more: ranked.length > limit, next: null },
      meta: { year },
    };
  },

  /* ── FEC ──────────────────────────────────────────────────────────── */

  'fec.candidate_funding': async ({ path }) => {
    const id = String(path.id).toUpperCase();
    const col = BIOGUIDE.test(id)
      ? 'bioguide_id'
      : /^[HSP][0-9A-Z]{8}$/.test(id)
        ? 'candidate_id'
        : null;
    if (!col) throw new ApiError(404, 'not_found', 'No candidate with that id.');
    const { data, error } = await getAdminClient()
      .from('fec_candidate_totals')
      .select(
        'bioguide_id, candidate_id, name, party, office, state, cycle, receipts, disbursements, cash_on_hand_end_period, individual_itemized_contributions, other_political_committee_contributions, debts_owed_by_committee, coverage_start_date, coverage_end_date',
      )
      .eq(col, id)
      .order('cycle', { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    if (!data?.length) throw new ApiError(404, 'not_found', 'No candidate with that id.');
    return {
      data: data.map((r) => ({
        bioguide_id: r.bioguide_id,
        candidate_id: r.candidate_id,
        name: r.name,
        party: r.party,
        office: r.office,
        state: r.state,
        cycle: r.cycle,
        receipts: num(r.receipts),
        disbursements: num(r.disbursements),
        cash_on_hand: num(r.cash_on_hand_end_period),
        individual_contributions: num(r.individual_itemized_contributions),
        pac_contributions: num(r.other_political_committee_contributions),
        debts: num(r.debts_owed_by_committee),
        coverage_start: day(r.coverage_start_date),
        coverage_end: day(r.coverage_end_date),
      })),
    };
  },

  /* ── contracts ────────────────────────────────────────────────────── */

  'contracts.awards': async ({ params }) => awardsList(params),

  'contracts.recipient': async ({ params, path }) => {
    const id = String(path.id);
    if (!/^[0-9a-f-]{20,60}-[A-Z]$/i.test(id))
      throw new ApiError(404, 'not_found', 'No recipient with that id.');
    const out = await awardsList(params, (qb) => qb.eq('recipient_id', id));
    if (!out.data.length && !params.cursor)
      throw new ApiError(404, 'not_found', 'No awards for that recipient.');
    return out;
  },

  /* ── prediction markets ───────────────────────────────────────────── */

  'predictions.markets': async ({ params }) => {
    const rows = await readPage(
      'prediction_market_index',
      MARKET_SELECT,
      {
        keys: ['volume', 'market_id'],
        notNull: ['volume'],
        limit: params.limit,
        cursor: params.cursor,
      },
      (qb) => {
        let x = qb;
        if (params.q) x = x.ilike('question', like(params.q));
        if (params.status) x = x.eq('status', params.status);
        return x;
      },
    );
    const { rows: kept, page } = pageOf(rows, params.limit, (m) => [Number(m.volume), m.market_id]);
    return { data: kept.map(marketOut), page };
  },

  'predictions.market': async ({ path }) => {
    const id = String(path.id);
    if (!/^[A-Za-z0-9_:.-]{1,120}$/.test(id))
      throw new ApiError(404, 'not_found', 'No market with that id.');
    const { data, error } = await getAdminClient()
      .from('prediction_market_index')
      .select(MARKET_SELECT)
      .eq('market_id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new ApiError(404, 'not_found', 'No market with that id.');
    return { data: marketOut(data) };
  },

  /* ── institutional and insider ────────────────────────────────────── */

  'institutional.holdings': async ({ params, cutoff }) => {
    const admin = getAdminClient();
    let accessions = null;
    if (params.filer) {
      const cik = params.filer.padStart(10, '0');
      const { data } = await admin
        .from('sec_filings')
        .select('accession_no')
        .eq('cik', cik)
        .eq('form_family', 'institutional')
        .limit(200);
      accessions = (data || []).map((f) => f.accession_no);
      if (!accessions.length) {
        return { data: [], page: { limit: params.limit, has_more: false, next: null } };
      }
    }
    const rows = await readPage(
      'sec_13f_holdings',
      'id, accession_no, name_of_issuer, cusip, ticker, value_usd, shares, share_type, put_call',
      { keys: ['id'], limit: params.limit, cursor: params.cursor },
      (qb) => {
        let x = qb;
        if (params.ticker) x = x.in('ticker', params.ticker);
        if (accessions) x = x.in('accession_no', accessions);
        return x;
      },
    );
    /* The cursor follows the rows scanned, so a delay that drops some rows
       never skips or repeats one on the next page. */
    const has_more = rows.length > params.limit;
    const scanned = has_more ? rows.slice(0, params.limit) : rows;
    const accs = [...new Set(scanned.map((h) => h.accession_no))];
    const filings = new Map();
    if (accs.length) {
      const { data } = await admin
        .from('sec_filings')
        .select('accession_no, cik, filer_name, period_of_report, filed_at')
        .in('accession_no', accs);
      (data || []).forEach((f) => filings.set(f.accession_no, f));
    }
    const data = scanned
      .map((h) => ({ h, f: filings.get(h.accession_no) || {} }))
      .filter(({ f }) => !cutoff || (f.filed_at && day(f.filed_at) <= cutoff))
      .map(({ h, f }) => ({
        filer: { cik: f.cik || null, name: f.filer_name || null },
        period: day(f.period_of_report),
        filed_at: day(f.filed_at),
        issuer: h.name_of_issuer,
        cusip: h.cusip,
        ticker: h.ticker ? String(h.ticker).toUpperCase() : null,
        value: num(h.value_usd),
        shares: num(h.shares),
        share_type: h.share_type,
        put_call: h.put_call,
      }));
    return {
      data,
      page: {
        limit: params.limit,
        has_more,
        next: has_more ? encodeCursor([scanned[scanned.length - 1].id]) : null,
      },
    };
  },

  'institutional.activist_stakes': async ({ params, cutoff }) => {
    const rows = await readPage(
      'ezq_activist_stakes',
      'accession_no, filer_cik, filer_name, form_type, filed_at, event_date, subject_name, ticker, percent_of_class, shares, is_amendment',
      {
        keys: ['filed_at', 'accession_no'],
        notNull: ['filed_at'],
        limit: params.limit,
        cursor: params.cursor,
      },
      (qb) => {
        let x = qb;
        if (params.ticker) x = x.in('ticker', params.ticker);
        if (params.from) x = x.gte('filed_at', params.from);
        if (params.to) x = x.lte('filed_at', endOfDay(params.to));
        if (cutoff) x = x.lte('filed_at', endOfDay(cutoff));
        return x;
      },
    );
    const { rows: kept, page } = pageOf(rows, params.limit, (s) => [s.filed_at, s.accession_no]);
    return {
      data: kept.map((s) => ({
        accession_no: s.accession_no,
        filer: { cik: s.filer_cik, name: s.filer_name },
        form: s.form_type,
        filed_at: day(s.filed_at),
        event_date: day(s.event_date),
        company: s.subject_name,
        ticker: s.ticker ? String(s.ticker).toUpperCase() : null,
        percent_of_class: num(s.percent_of_class),
        shares: num(s.shares),
        is_amendment: !!s.is_amendment,
      })),
      page,
    };
  },

  'institutional.whale_moves': async ({ params, cutoff }) => {
    const rows = await readPage(
      'whale_moves',
      'id, filer_name, filer_cik, ticker, issuer, quarter, change_type, value_usd, conviction_pct, percent_of_class, whale_score, tier, form, filed_at',
      {
        keys: ['filed_at', 'id'],
        notNull: ['filed_at'],
        limit: params.limit,
        cursor: params.cursor,
      },
      (qb) => {
        let x = qb;
        if (params.ticker) x = x.in('ticker', params.ticker);
        if (params.quarter) x = x.eq('quarter', params.quarter);
        if (cutoff) x = x.lte('filed_at', endOfDay(cutoff));
        return x;
      },
    );
    const { rows: kept, page } = pageOf(rows, params.limit, (w) => [w.filed_at, w.id]);
    return {
      data: kept.map((w) => ({
        id: w.id,
        filer: { cik: w.filer_cik, name: w.filer_name },
        ticker: w.ticker ? String(w.ticker).toUpperCase() : null,
        issuer: w.issuer,
        quarter: w.quarter,
        change: w.change_type,
        value: num(w.value_usd),
        conviction_pct: num(w.conviction_pct),
        percent_of_class: num(w.percent_of_class),
        whale_score: num(w.whale_score),
        tier: w.tier,
        form: w.form,
        filed_at: day(w.filed_at),
      })),
      page,
    };
  },

  'insider.transactions': async ({ params, cutoff }) => {
    const keys = ['filed_at', 'accession_no', 'table_kind', 'line_no'];
    const rows = await readPage(
      'sec_insider_transactions',
      'accession_no, table_kind, line_no, filed_at, issuer_cik, issuer_name, issuer_ticker, reporter_cik, reporter_name, reporter_title, is_director, is_officer, is_ten_pct_owner, security_title, transaction_date, transaction_code, acquired_disposed, shares, price, value_usd, shares_owned_after, direct_indirect',
      { keys, notNull: ['filed_at'], limit: params.limit, cursor: params.cursor },
      (qb) => {
        let x = qb;
        if (params.ticker) x = x.in('issuer_ticker', params.ticker);
        if (params.code) x = x.eq('transaction_code', params.code);
        if (params.from) x = x.gte('transaction_date', params.from);
        if (params.to) x = x.lte('transaction_date', params.to);
        if (params.min_amount != null) x = x.gte('value_usd', params.min_amount);
        if (cutoff) x = x.lte('filed_at', cutoff);
        return x;
      },
    );
    const { rows: kept, page } = pageOf(rows, params.limit, (t) => keys.map((k) => t[k]));
    return {
      data: kept.map((t) => ({
        id: `${t.accession_no}:${t.table_kind}:${t.line_no}`,
        filed_at: day(t.filed_at),
        issuer: {
          cik: t.issuer_cik,
          name: t.issuer_name,
          ticker: t.issuer_ticker ? String(t.issuer_ticker).toUpperCase() : null,
        },
        insider: {
          cik: t.reporter_cik,
          name: t.reporter_name,
          title: t.reporter_title,
          is_director: !!t.is_director,
          is_officer: !!t.is_officer,
          is_ten_pct_owner: !!t.is_ten_pct_owner,
        },
        security: t.security_title,
        transaction_date: day(t.transaction_date),
        code: t.transaction_code,
        acquired_disposed: t.acquired_disposed,
        shares: num(t.shares),
        price: num(t.price),
        value: num(t.value_usd),
        shares_owned_after: num(t.shares_owned_after),
        ownership:
          t.direct_indirect === 'I' ? 'indirect' : t.direct_indirect === 'D' ? 'direct' : null,
      })),
      page,
    };
  },
};

/* ── shared pieces ──────────────────────────────────────────────────── */

const FILING_SELECT =
  'uuid, filing_year, filing_period, filing_type, registrant_id, registrant_name, client_id, client_name, client_description, amount, lobbyist_count, issue_buckets, dt_posted, document_url';

function filingOut(f) {
  return {
    uuid: f.uuid,
    filing_year: f.filing_year,
    period: f.filing_period,
    filing_type: f.filing_type,
    registrant: { id: f.registrant_id, name: f.registrant_name },
    client: { id: f.client_id, name: f.client_name, description: f.client_description },
    amount: num(f.amount),
    lobbyist_count: f.lobbyist_count,
    issue_areas: Array.isArray(f.issue_buckets) ? f.issue_buckets : [],
    posted_at: f.dt_posted,
    document_url: f.document_url,
  };
}

const MARKET_SELECT =
  'market_id, question, category, platform, probability, volume, liquidity, end_date, status, link';

function marketOut(m) {
  return {
    id: m.market_id,
    question: m.question,
    category: m.category,
    platform: m.platform === 'polymarket' ? 'Polymarket' : m.platform,
    probability: num(m.probability),
    volume: num(m.volume),
    liquidity: num(m.liquidity),
    ends_at: m.end_date,
    status: m.status,
    url: m.link,
  };
}

const AWARD_SELECT =
  'generated_award_id, award_id_piid, recipient_id, recipient_name, parent_name, ticker, is_public, award_amount, awarding_agency, awarding_sub_agency, action_date, award_type, fiscal_year';

async function awardsList(params, extra) {
  const rows = await readPage(
    'contract_awards_resolved',
    AWARD_SELECT,
    {
      keys: ['action_date', 'generated_award_id'],
      notNull: ['action_date'],
      limit: params.limit,
      cursor: params.cursor,
    },
    (qb) => {
      let x = qb;
      if (params.ticker) x = x.in('ticker', params.ticker);
      if (params.agency) x = x.ilike('awarding_agency', like(params.agency));
      if (params.q) x = x.ilike('recipient_name', like(params.q));
      if (params.from) x = x.gte('action_date', params.from);
      if (params.to) x = x.lte('action_date', params.to);
      if (params.min_amount != null) x = x.gte('award_amount', params.min_amount);
      return extra ? extra(x) : x;
    },
  );
  const { rows: kept, page } = pageOf(rows, params.limit, (a) => [
    a.action_date,
    a.generated_award_id,
  ]);
  return {
    data: kept.map((a) => ({
      id: a.generated_award_id,
      piid: a.award_id_piid,
      recipient: { id: a.recipient_id, name: a.recipient_name },
      parent: a.parent_name,
      ticker: a.ticker ? String(a.ticker).toUpperCase() : null,
      is_public: a.is_public,
      amount: num(a.award_amount),
      agency: a.awarding_agency,
      sub_agency: a.awarding_sub_agency,
      action_date: day(a.action_date),
      award_type: a.award_type,
      fiscal_year: a.fiscal_year,
    })),
    page,
  };
}

/* Lobbying spend by client for a year, cached for an hour per (year, delay). */
const topSpenders = unstable_cache(
  async (year, cutoff) => {
    const admin = getAdminClient();
    const totals = new Map();
    for (let from = 0; from < 200_000; from += 1000) {
      let qb = admin
        .from('lobbying_filings')
        .select('uuid, client_id, client_name, amount')
        .eq('filing_year', year);
      if (cutoff !== 'none') qb = qb.lte('dt_posted', endOfDay(cutoff));
      // eslint-disable-next-line no-await-in-loop
      const { data, error } = await qb.order('uuid').range(from, from + 999);
      if (error) throw new Error(error.message);
      for (const f of data || []) {
        const k = f.client_id ?? f.client_name;
        if (k == null) continue;
        const t = totals.get(k) || {
          client: f.client_name,
          client_id: f.client_id,
          filings: 0,
          amount: 0,
        };
        t.filings += 1;
        t.amount += num(f.amount) || 0;
        totals.set(k, t);
      }
      if (!data || data.length < 1000) break;
    }
    return [...totals.values()]
      .filter((t) => t.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 200);
  },
  ['ezana-api-top-spenders-v1'],
  { revalidate: 3600 },
);
