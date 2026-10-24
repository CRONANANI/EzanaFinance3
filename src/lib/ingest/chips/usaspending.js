/**
 * CHIPS Incentives awards from USAspending (Assistance Listing 11.037),
 * weekly. POST /api/v2/search/spending_by_award/ with program_numbers, one
 * request family per award-type group (grants and cooperative agreements,
 * then loans), paged until page_metadata.hasNext is false.
 *
 * Field names follow the spending_by_award contract the repo's contract
 * ingest already uses ('Award ID', 'Recipient Name', 'Award Amount',
 * 'Start Date', generated_internal_id) plus the assistance-only fields
 * documented for that endpoint. scripts/probe-usaspending.mjs prints a live
 * response so they can be re-checked; this sandbox cannot reach the API.
 */
import { awardTypeFromCode, normalizeRecipient } from '@/lib/ingest/chips/normalize';

export const USASPENDING_URL = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';
export const CHIPS_ACT_SIGNED = '2022-08-09';
export const PROGRAM_NUMBER = '11.037';
export const USER_AGENT =
  'EzanaFinance-IndustryIngest/1.0 (+https://ezana.world; data@ezana.world)';

/* Assistance award-type codes: 02-05 grants and cooperative agreements,
   07 direct loans, 08 guaranteed/insured loans. */
export const AWARD_TYPE_GROUPS = [
  { id: 'grants', codes: ['02', '03', '04', '05'] },
  { id: 'loans', codes: ['07', '08'] },
];

export const FIELDS = [
  'Award ID',
  'Recipient Name',
  'Recipient UEI',
  'recipient_id',
  'Award Amount',
  'Total Outlays',
  'Description',
  'Start Date',
  'End Date',
  'Award Type',
  'Awarding Agency',
  'Place of Performance City Code',
  'Place of Performance State Code',
  'Place of Performance Country Code',
  'CFDA Number',
  'generated_internal_id',
];

const PAGE_LIMIT = 100;
const PAGE_DELAY_MS = 300;
const MAX_RETRIES = 5;

export function buildBody({ codes, page, startDate = CHIPS_ACT_SIGNED, endDate }) {
  return {
    subawards: false,
    limit: PAGE_LIMIT,
    page,
    order: 'desc',
    sort: 'Award Amount',
    filters: {
      program_numbers: [PROGRAM_NUMBER],
      award_type_codes: codes,
      time_period: [{ start_date: startDate, end_date: endDate }],
    },
    fields: FIELDS,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** POST with retry on 429/5xx and exponential backoff (max 5). */
export async function postWithRetry(body, { fetchImpl = fetch, baseDelayMs = 500 } = {}) {
  let lastStatus = 0;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt) await sleep(baseDelayMs * 2 ** (attempt - 1));
    let res;
    try {
      res = await fetchImpl(USASPENDING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: JSON.stringify(body),
      });
    } catch {
      lastStatus = 0;
      continue;
    }
    lastStatus = res.status;
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) break;
  }
  throw new Error(`usaspending http ${lastStatus}`);
}

/** Every page of every award-type group. */
export async function fetchAllChipsAwards({
  fetchImpl = fetch,
  endDate,
  delayMs = PAGE_DELAY_MS,
  baseDelayMs,
} = {}) {
  const end = endDate || new Date().toISOString().slice(0, 10);
  const rows = [];
  for (const group of AWARD_TYPE_GROUPS) {
    for (let page = 1; page <= 100; page += 1) {
      if (page > 1) await sleep(delayMs);
      const json = await postWithRetry(buildBody({ codes: group.codes, page, endDate: end }), {
        fetchImpl,
        baseDelayMs,
      });
      const results = Array.isArray(json?.results) ? json.results : [];
      for (const r of results) rows.push({ ...r, _group: group.id });
      if (json?.page_metadata?.hasNext !== true) break;
    }
  }
  return rows;
}

const ymd = (v) => (v && /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(0, 10) : null);

/** One USAspending result -> a chips_awards row. */
export function toAwardRow(r) {
  const internal = r.generated_internal_id || r.internal_id;
  const amount = r['Award Amount'];
  const code = r['Award Type'] && /^\d{2}$/.test(String(r['Award Type'])) ? r['Award Type'] : null;
  return {
    source: 'usaspending',
    source_record_id: String(internal || r['Award ID'] || ''),
    recipient_name: String(r['Recipient Name'] || '').trim(),
    recipient_uei: r['Recipient UEI'] || null,
    parent_recipient_name: r['Parent Recipient Name'] || null,
    award_type: code ? awardTypeFromCode(code) : r._group === 'loans' ? 'loan' : 'grant',
    status: 'obligated',
    amount_usd: amount == null || !Number.isFinite(Number(amount)) ? null : Number(amount),
    amount_text: null,
    is_split_award: false,
    city: r['Place of Performance City Code'] || null,
    state_code: r['Place of Performance State Code'] || null,
    country:
      r['Place of Performance Country Code'] === 'USA'
        ? 'US'
        : r['Place of Performance Country Code'] || 'US',
    start_date: ymd(r['Start Date']),
    end_date: ymd(r['End Date']),
    action_date: ymd(r['Start Date']),
    description: r.Description || null,
    source_url: internal
      ? `https://www.usaspending.gov/award/${encodeURIComponent(internal)}`
      : 'https://www.usaspending.gov/search',
    raw: r,
    _alias: normalizeRecipient(r['Recipient Name']),
  };
}
