/**
 * USPTO PatentSearch API (search.patentsview.org, the PatentsView API that
 * replaced the legacy one on 2025-05-01). Granted patents by grant date with
 * the first assignee and CPC section. Needs PATENTSVIEW_API_KEY (free, from
 * the USPTO API key request on patentsview.org). Limit: 45 requests a minute,
 * 1,000 records a request, paged with the `after` cursor on the sort field.
 * SERVER ONLY; the CLI (scripts/ingest-eyes.mjs) uses the same code.
 *
 * Field paths follow the PatentSearch endpoint dictionary. The assignee is
 * read from the patent record, not the separate assignee index (which the
 * docs flag as unreliable after 2025-03-31). If a run reports zero assignees,
 * call the endpoint once with f=["assignees","cpc_current","application"] and
 * adjust `pick` below.
 */
const API = 'https://search.patentsview.org/api/v1/patent/';
const SIZE = 1000;
const MIN_GAP_MS = 1400; // 45 requests a minute

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pick(p) {
  const a = Array.isArray(p.assignees) ? p.assignees : [];
  const org = a.find((x) => x?.assignee_organization)?.assignee_organization || null;
  const cpc = Array.isArray(p.cpc_current) ? p.cpc_current[0] : null;
  const app = Array.isArray(p.application) ? p.application[0] : p.application;
  return {
    patent_id: String(p.patent_id),
    patent_date: p.patent_date,
    title: p.patent_title || null,
    assignee: org,
    cpc_section: cpc?.cpc_section_id || cpc?.cpc_section || null,
    filing_date: app?.filing_date || null,
  };
}

/**
 * Every patent granted in [from, to] (inclusive, YYYY-MM-DD), page by page.
 * `onPage(rows)` receives each mapped page so callers can write as they go.
 */
export async function patentsGranted(from, to, onPage, { log = () => {} } = {}) {
  const key = process.env.PATENTSVIEW_API_KEY;
  if (!key) throw new Error('PATENTSVIEW_API_KEY is not set');
  let after = null;
  let total = 0;
  for (let page = 0; page < 10000; page += 1) {
    const body = {
      q: { _and: [{ _gte: { patent_date: from } }, { _lte: { patent_date: to } }] },
      f: [
        'patent_id',
        'patent_title',
        'patent_date',
        'assignees.assignee_organization',
        'cpc_current.cpc_section_id',
        'application.filing_date',
      ],
      s: [{ patent_id: 'asc' }],
      o: after ? { size: SIZE, after } : { size: SIZE },
    };
    let res;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      res = await fetch(API, {
        method: 'POST',
        headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      });
      if (res.status !== 429) break;
      const wait = Number(res.headers.get('retry-after')) * 1000 || 30000;
      log(`rate limited, waiting ${wait / 1000}s`);
      // eslint-disable-next-line no-await-in-loop
      await sleep(wait);
    }
    // eslint-disable-next-line no-await-in-loop
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error)
      throw new Error(`PatentSearch: HTTP ${res.status} ${json.message || ''}`);
    const rows = (json.patents || []).map(pick);
    total += rows.length;
    // eslint-disable-next-line no-await-in-loop
    if (rows.length) await onPage(rows);
    if (rows.length < SIZE) break;
    after = rows[rows.length - 1].patent_id;
    // eslint-disable-next-line no-await-in-loop
    await sleep(MIN_GAP_MS);
  }
  return total;
}
