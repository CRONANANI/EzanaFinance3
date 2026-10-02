/**
 * Senate eFD ingest: Periodic Transaction Reports from the Senate Office of
 * Public Records (efdsearch.senate.gov) into public.senate_disclosure_filings
 * and public.senate_trades. The daily congress ingest then lands those rows in
 * public.congress_trades with source 'senate_efd', the same way House Clerk
 * rows land.
 *
 * Why this exists: Senate trades used to come only from FMP's senate-latest,
 * which answers 402 (paid plan required) on the current key, so no Senate
 * trade ever reached the tracker. eFD is the primary source and is free.
 *
 * eFD is a Django site behind a terms-of-use gate:
 *   1. GET  /search/home/                   csrftoken cookie + form token
 *   2. POST /search/home/                   prohibition_agreement=1 (sessionid)
 *   3. POST /search/report/data/            DataTables JSON of filings
 *   4. GET  /search/view/ptr/<uuid>/        the electronic PTR, an HTML table
 * Paper filings (/search/view/paper/<uuid>/) are scanned images: recorded as
 * filings, never parsed, never counted as trades.
 *
 * Pure parsing helpers are exported for scripts/check-senate-efd.mjs.
 */

export const EFD_BASE = 'https://efdsearch.senate.gov';
const UA = 'EzanaFinance/1.0 (+https://ezana.world; datasets@ezana.world)';
const LIST_PAGE = 100;
const PTR_REPORT_TYPE = 11;

/* ── pure helpers ──────────────────────────────────────────────────────── */

/** '09/12/2026' → '2026-09-12'; anything else → null. */
export function usDate(v) {
  const m = String(v || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

/** '2026-09-12' → '09/12/2026 00:00:00', the format eFD's search takes. */
export function efdDate(iso) {
  const [y, mo, d] = String(iso).slice(0, 10).split('-');
  return `${mo}/${d}/${y} 00:00:00`;
}

const decode = (s) =>
  String(s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * One row of /search/report/data/ →
 * { docId, kind: 'ptr'|'paper', url, first, last, filingDate } or null.
 * Row shape: [first, last, office, '<a href="/search/view/ptr/<uuid>/">…</a>', 'MM/DD/YYYY'].
 */
export function parseListRow(row) {
  if (!Array.isArray(row) || row.length < 5) return null;
  const href = String(row[3] || '').match(/href="([^"]+)"/);
  if (!href) return null;
  const m = href[1].match(/\/search\/view\/(ptr|paper)\/([0-9a-f-]{8,})\/?/i);
  if (!m) return null;
  const linkText = decode(row[3]);
  /* Amendments read "Periodic Transaction Report for 09/12/2026 (Amendment 1)". */
  return {
    docId: m[2].toLowerCase(),
    kind: m[1].toLowerCase(),
    url: `${EFD_BASE}${href[1]}`,
    first: decode(row[0]),
    last: decode(row[1]),
    office: decode(row[2]),
    filingDate: usDate(row[4]),
    amendment: /amendment/i.test(linkText),
  };
}

/**
 * Transactions out of an electronic PTR page. Columns, in order:
 * #, Transaction Date, Owner, Ticker, Asset Name, Asset Type, Type, Amount, Comment.
 * The header row is read so a column reorder does not silently shift values.
 */
export function parsePtrHtml(html) {
  const table = String(html || '').match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!table) return [];
  const heads = [...table[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((h) =>
    decode(h[1]).toLowerCase(),
  );
  const col = (name, fallback) => {
    const i = heads.findIndex((h) => h.includes(name));
    return i >= 0 ? i : fallback;
  };
  const C = {
    date: col('transaction date', 1),
    owner: col('owner', 2),
    ticker: col('ticker', 3),
    asset: col('asset name', 4),
    assetType: col('asset type', 5),
    /* "Asset Type" also contains "type", so match the header that is exactly "type". */
    type: heads.lastIndexOf('type') >= 0 ? heads.lastIndexOf('type') : 6,
    amount: col('amount', 7),
  };

  const body = table[1].match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  const rows = [...(body ? body[1] : table[1]).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const out = [];
  for (const r of rows) {
    const cells = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => decode(c[1]));
    if (cells.length < 7) continue;
    const tickerRaw = cells[C.ticker] || '';
    const ticker = /^[A-Z][A-Z0-9.\-]{0,9}$/.test(tickerRaw) ? tickerRaw : null;
    const amountRaw = cells[C.amount] || '';
    const nums = (amountRaw.match(/[\d,]+/g) || [])
      .map((x) => Number(x.replace(/,/g, '')))
      .filter((n) => Number.isFinite(n) && n > 0);
    const openTop = /over|\+/i.test(amountRaw) && nums.length === 1;
    const low = nums[0] ?? null;
    const high = openTop ? null : (nums[1] ?? nums[0] ?? null);
    out.push({
      tx_date: usDate(cells[C.date]),
      owner: cells[C.owner] || null,
      ticker,
      asset_name: cells[C.asset] || tickerRaw || 'Unknown asset',
      asset_type: cells[C.assetType] || null,
      tx_type: cells[C.type] || null,
      amount_low: low,
      amount_high: high,
      amount_midpoint: low == null ? null : high == null ? low : (low + high) / 2,
      amount_bracket_label: amountRaw || null,
      raw_row: cells.join(' | ').slice(0, 2000),
    });
  }
  return out;
}

/* ── session ───────────────────────────────────────────────────────────── */

function cookieJar() {
  const jar = new Map();
  return {
    take(res) {
      const list =
        typeof res.headers.getSetCookie === 'function'
          ? res.headers.getSetCookie()
          : [res.headers.get('set-cookie')].filter(Boolean);
      for (const c of list) {
        const [pair] = String(c).split(';');
        const i = pair.indexOf('=');
        if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      }
    },
    get: (k) => jar.get(k) || '',
    header: () => [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
  };
}

/** Accept the eFD terms and return { jar, csrf } for the search API. */
export async function openEfdSession(fetchImpl = fetch) {
  const jar = cookieJar();
  const home = await fetchImpl(`${EFD_BASE}/search/home/`, {
    headers: { 'User-Agent': UA },
    cache: 'no-store',
  });
  jar.take(home);
  const html = await home.text();
  const token = html.match(/name="csrfmiddlewaretoken"\s+value="([^"]+)"/);
  if (!home.ok || !token) throw new Error(`eFD home ${home.status}: no csrf token`);

  const agree = await fetchImpl(`${EFD_BASE}/search/home/`, {
    method: 'POST',
    redirect: 'manual',
    cache: 'no-store',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: `${EFD_BASE}/search/home/`,
      Cookie: jar.header(),
    },
    body: new URLSearchParams({
      prohibition_agreement: '1',
      csrfmiddlewaretoken: token[1],
    }).toString(),
  });
  jar.take(agree);
  if (agree.status >= 400) throw new Error(`eFD agreement ${agree.status}`);
  if (!jar.get('sessionid')) throw new Error('eFD agreement: no session cookie');
  return { jar, csrf: jar.get('csrftoken') || token[1] };
}

/** Every PTR (electronic and paper) submitted on or after `sinceIso`. */
export async function listPtrs(session, { sinceIso, fetchImpl = fetch, maxPages = 60 }) {
  const out = [];
  let total = null;
  for (let page = 0; page < maxPages; page += 1) {
    const res = await fetchImpl(`${EFD_BASE}/search/report/data/`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': session.csrf,
        Referer: `${EFD_BASE}/search/`,
        Cookie: session.jar.header(),
      },
      body: new URLSearchParams({
        start: String(page * LIST_PAGE),
        length: String(LIST_PAGE),
        report_types: `[${PTR_REPORT_TYPE}]`,
        filer_types: '[]',
        submitted_start_date: efdDate(sinceIso),
        submitted_end_date: '',
        candidate_state: '',
        senator_state: '',
        office_id: '',
        first_name: '',
        last_name: '',
        csrfmiddlewaretoken: session.csrf,
      }).toString(),
    });
    if (!res.ok) throw new Error(`eFD search ${res.status}`);
    const json = await res.json().catch(() => null);
    if (!json || !Array.isArray(json.data)) throw new Error('eFD search: unexpected payload');
    total = Number(json.recordsFiltered ?? json.recordsTotal ?? 0);
    for (const row of json.data) {
      const f = parseListRow(row);
      if (f) out.push(f);
    }
    if (json.data.length < LIST_PAGE || out.length >= total) break;
  }
  return { filings: out, total };
}

/* ── orchestration ─────────────────────────────────────────────────────── */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastKey = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, ' ')
    .trim()
    .split(/\s+/)
    .pop() || '';

/**
 * List new PTR filings, then parse up to `max` unparsed electronic ones.
 * Idempotent: filings upsert on doc_id; a filing's trades are replaced
 * wholesale before trades_parsed flips to true.
 *
 * @param {object} o
 * @param {object} o.db           service-role Supabase client
 * @param {string} [o.sinceIso]   list from this submitted date (backfill)
 * @param {number} [o.max]        electronic PTRs to parse this run
 * @param {number} [o.throttleMs] pause between eFD requests
 */
export async function runSenateEfdIngest({
  db,
  fetchImpl = fetch,
  sinceIso = null,
  max = 40,
  throttleMs = 400,
  log = console.log,
}) {
  const summary = { listed: 0, newFilings: 0, parsed: 0, trades: 0, paper: 0, errors: [] };

  /* Default window: two weeks before the newest filing we hold, so late
     amendments are caught; 400 days on an empty table. */
  let since = sinceIso;
  if (!since) {
    const { data } = await db
      .from('senate_disclosure_filings')
      .select('filing_date')
      .order('filing_date', { ascending: false, nullsFirst: false })
      .limit(1);
    const newest = data?.[0]?.filing_date;
    const base = newest ? new Date(`${newest}T00:00:00Z`).getTime() - 14 * 86400000 : null;
    since = new Date(base ?? Date.now() - 400 * 86400000).toISOString().slice(0, 10);
  }
  summary.since = since;

  /* Senators' states, by last name, from the member directory. eFD's search
     rows carry no state; the congress ingest matches on last name + state. */
  const { data: senators } = await db
    .from('congress_members')
    .select('last_name, state')
    .eq('chamber', 'senate');
  const stateByLast = new Map();
  for (const s of senators || []) {
    const k = lastKey(s.last_name);
    stateByLast.set(k, stateByLast.has(k) ? null : s.state);
  }

  let session;
  try {
    session = await openEfdSession(fetchImpl);
  } catch (e) {
    summary.errors.push(String(e.message || e));
    await db.from('congress_ingest_issues').insert({
      kind: 'upstream_error',
      detail: { senate_efd: String(e.message || e) },
    });
    return summary;
  }

  /* 1. list */
  try {
    const { filings } = await listPtrs(session, { sinceIso: since, fetchImpl });
    summary.listed = filings.length;
    const rows = filings.map((f) => ({
      doc_id: f.docId,
      first_name: f.first || '',
      last_name: f.last || '',
      state: stateByLast.get(lastKey(f.last)) || null,
      filing_type: f.kind === 'paper' ? 'paper' : 'ptr',
      filing_type_label: f.amendment
        ? 'Periodic Transaction Report (Amendment)'
        : 'Periodic Transaction Report',
      filing_year: Number((f.filingDate || since).slice(0, 4)),
      filing_date: f.filingDate,
      report_url: f.url,
      is_ptr: true,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const { data, error } = await db
        .from('senate_disclosure_filings')
        .upsert(rows.slice(i, i + 500), { onConflict: 'doc_id', ignoreDuplicates: true })
        .select('doc_id');
      if (error) {
        summary.errors.push(`filings upsert: ${error.message}`);
        break;
      }
      summary.newFilings += data?.length || 0;
    }
    summary.paper = rows.filter((r) => r.filing_type === 'paper').length;
  } catch (e) {
    summary.errors.push(`list: ${e.message || e}`);
  }

  /* 2. parse a bounded batch of electronic PTRs, newest first */
  const { data: todo, error: todoErr } = await db
    .from('senate_disclosure_filings')
    .select('doc_id, first_name, last_name, state, filing_date, report_url')
    .eq('is_ptr', true)
    .eq('filing_type', 'ptr')
    .eq('trades_parsed', false)
    .order('filing_date', { ascending: false, nullsFirst: false })
    .limit(max);
  if (todoErr) {
    summary.errors.push(`todo: ${todoErr.message}`);
    return summary;
  }

  for (const f of todo || []) {
    await sleep(throttleMs);
    let html;
    try {
      const res = await fetchImpl(f.report_url, {
        cache: 'no-store',
        headers: {
          'User-Agent': UA,
          Referer: `${EFD_BASE}/search/`,
          Cookie: session.jar.header(),
        },
      });
      if (!res.ok) {
        summary.errors.push(`${f.doc_id}: ${res.status}`);
        continue;
      }
      html = await res.text();
    } catch (e) {
      summary.errors.push(`${f.doc_id}: ${e.message || e}`);
      continue;
    }
    /* A lapsed session bounces to the terms page: stop, retry next run. */
    if (/prohibition_agreement/.test(html)) {
      summary.errors.push('session lapsed; stopping this run');
      break;
    }
    const tx = parsePtrHtml(html);
    const insert = tx.map((t) => ({
      doc_id: f.doc_id,
      first_name: f.first_name,
      last_name: f.last_name,
      state: f.state,
      ticker: t.ticker,
      asset_name: t.asset_name,
      asset_type: t.asset_type,
      owner: t.owner,
      tx_type: t.tx_type,
      tx_date: t.tx_date,
      notification_date: f.filing_date,
      amount_low: t.amount_low,
      amount_high: t.amount_high,
      amount_midpoint: t.amount_midpoint,
      amount_bracket_label: t.amount_bracket_label,
      raw_row: t.raw_row,
    }));
    const del = await db.from('senate_trades').delete().eq('doc_id', f.doc_id);
    if (del.error) {
      summary.errors.push(`${f.doc_id} delete: ${del.error.message}`);
      continue;
    }
    if (insert.length) {
      const ins = await db.from('senate_trades').insert(insert);
      if (ins.error) {
        summary.errors.push(`${f.doc_id} insert: ${ins.error.message}`);
        continue;
      }
    }
    await db
      .from('senate_disclosure_filings')
      .update({ trades_parsed: true, synced_at: new Date().toISOString() })
      .eq('doc_id', f.doc_id);
    summary.parsed += 1;
    summary.trades += insert.length;
  }

  log(
    `[senate-efd] since ${since} · listed ${summary.listed} (${summary.newFilings} new, ` +
      `${summary.paper} paper) · parsed ${summary.parsed} · trades ${summary.trades}` +
      (summary.errors.length ? ` · errors ${summary.errors.length}` : ''),
  );
  return summary;
}
