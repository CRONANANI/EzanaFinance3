/**
 * Probe the USAspending spending_by_award endpoint for CHIPS Incentives
 * awards (Assistance Listing 11.037) and print the field names that come
 * back, so the importer's field list can be checked against the live API.
 *   node scripts/probe-usaspending.mjs
 * Paste the output into docs/industry-data/plan.md.
 */
const URL_ = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';
const FIELDS = [
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

for (const codes of [
  ['02', '03', '04', '05'],
  ['07', '08'],
]) {
  const body = {
    subawards: false,
    limit: 3,
    page: 1,
    sort: 'Award Amount',
    order: 'desc',
    filters: {
      program_numbers: ['11.037'],
      award_type_codes: codes,
      time_period: [{ start_date: '2022-08-09', end_date: new Date().toISOString().slice(0, 10) }],
    },
    fields: FIELDS,
  };
  const res = await fetch(URL_, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'EzanaFinance-IndustryIngest/1.0',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  console.log(`\n== award_type_codes ${codes.join(',')}: HTTP ${res.status}`);
  if (!json) continue;
  if (json.detail || json.messages) console.log('messages:', json.detail || json.messages);
  console.log('page_metadata:', JSON.stringify(json.page_metadata));
  const first = json.results?.[0];
  console.log('returned keys:', first ? Object.keys(first).join(' | ') : '(no results)');
  const missing = FIELDS.filter((f) => first && !(f in first));
  if (missing.length) console.log('requested but not returned:', missing.join(' | '));
  for (const r of json.results || []) {
    console.log(
      ' -',
      r['Recipient Name'],
      r['Award Amount'],
      r['Place of Performance State Code'],
      r.generated_internal_id,
    );
  }
}
