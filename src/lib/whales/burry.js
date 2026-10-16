/**
 * Burry Watcher read layer: SERVER ONLY, cached under the `burry` tag.
 *
 *   holdings: Scion Asset Management's latest (and, since its SEC adviser
 *     registration ended in Nov 2025, final) 13F-HR from SEC EDGAR, parsed and
 *     aggregated by issuer and position type. Cached 24 hours.
 *   echo: published Ezana Echo articles that mention Burry. Cached 1 hour.
 *   news: Michael Burry coverage from major outlets, last ~90 days. Cached 6 hours.
 *
 * Each leg throws inside its cache wrapper on failure (so a failure is never
 * cached) and getBurryWatcher() turns that into an honest `unavailable`
 * status. Nothing is invented: a missing figure stays null.
 */
import { unstable_cache } from 'next/cache';
import {
  getSubmissions,
  getFilingIndexJson,
  find13FInfoTableUrl,
  secFetchText,
  edgarUrls,
} from '@/lib/sec-edgar';
import { parseInfoTable } from '@/lib/sec-13f-parse';
import { fetchCityNews } from '@/lib/marketaux/client';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import {
  SCION_CIK,
  pickLatest13F,
  amendmentTypeFromCover,
  aggregatePositions,
  mapNewsArticles,
  mapEchoRows,
  daysAgoIso,
} from './burry-model';

const TAGS = ['burry'];
const FILER_URL = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${SCION_CIK}&type=13F-HR`;

/* ── Holdings ─────────────────────────────────────────────────────────── */

/** CUSIP -> ticker from the existing OpenFIGI-filled map; best effort. */
async function tickersFor(cusips) {
  const out = new Map();
  if (!isServerSupabaseConfigured() || !cusips.length) return out;
  try {
    const { data } = await getAdminClient()
      .from('sec_cusip_map')
      .select('cusip, ticker')
      .eq('status', 'mapped')
      .in('cusip', [...new Set(cusips.map((c) => String(c).trim().toUpperCase()))].slice(0, 500));
    for (const r of data || []) if (r.ticker) out.set(r.cusip, r.ticker);
  } catch (e) {
    console.error('[burry] cusip map lookup failed:', e?.message);
  }
  return out;
}

/** Choose the filing to read: an amendment that only adds holdings is partial. */
async function resolveFiling(pick) {
  const { chosen, samePeriod } = pick;
  if (!chosen.isAmendment) return chosen;
  const original = samePeriod.find((f) => !f.isAmendment);
  if (!original || !chosen.primaryDocument) return chosen;
  try {
    const { base } = edgarUrls({ accessionNo: chosen.accessionNumber, cik: SCION_CIK });
    const doc = String(chosen.primaryDocument).replace(/^.*\//, '');
    const cover = await secFetchText(`${base}/${doc}`);
    return amendmentTypeFromCover(cover) === 'NEW HOLDINGS' ? original : chosen;
  } catch {
    return chosen;
  }
}

async function loadHoldings() {
  const submissions = await getSubmissions(SCION_CIK);
  const pick = pickLatest13F(submissions);
  if (!pick) return { status: 'empty', filerUrl: FILER_URL };
  const filing = await resolveFiling(pick);
  const ids = { cik: SCION_CIK, accessionNo: filing.accessionNumber };
  const indexJson = await getFilingIndexJson(ids);
  const tableUrl = find13FInfoTableUrl(indexJson, ids);
  if (!tableUrl) throw new Error('13F information table not found');
  const rows = parseInfoTable(await secFetchText(tableUrl));
  const { positions, totalValueUsd } = aggregatePositions(rows, {
    periodOfReport: filing.reportDate,
    filedAt: filing.filingDate,
  });
  const tickers = await tickersFor(positions.flatMap((p) => p.cusips));
  return {
    status: positions.length ? 'ok' : 'empty',
    filer: submissions?.name || 'Scion Asset Management, LLC',
    form: filing.form,
    accessionNo: filing.accessionNumber,
    periodOfReport: filing.reportDate,
    filingDate: filing.filingDate,
    indexUrl: edgarUrls(ids).indexUrl,
    filerUrl: FILER_URL,
    totalValueUsd,
    positions: positions.map((p) => ({
      issuer: p.issuer,
      kind: p.kind,
      titleOfClass: p.titleOfClass,
      cusip: p.cusip,
      ticker: p.cusips.map((c) => tickers.get(String(c).toUpperCase())).find(Boolean) || null,
      valueUsd: p.valueUsd,
      shares: p.shares || null,
      pctOfReported: p.pctOfReported,
    })),
  };
}

const cachedHoldings = unstable_cache(loadHoldings, ['burry-holdings-v1'], {
  revalidate: 86400,
  tags: TAGS,
});

/* ── Ezana Echo ───────────────────────────────────────────────────────── */

async function loadEcho() {
  if (!isServerSupabaseConfigured()) throw new Error('echo store not configured');
  const { data, error } = await getAdminClient()
    .from('echo_articles')
    .select('article_slug, article_title, article_excerpt, published_at')
    .eq('article_status', 'published')
    .or('article_title.ilike.%Burry%,article_body.ilike.%Burry%')
    .order('published_at', { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  const items = mapEchoRows(data);
  return { status: items.length ? 'ok' : 'empty', items };
}

const cachedEcho = unstable_cache(loadEcho, ['burry-echo-v1'], { revalidate: 3600, tags: TAGS });

/* ── News ─────────────────────────────────────────────────────────────── */

async function loadNews() {
  const { articles, error } = await fetchCityNews({
    search: '"Michael Burry"',
    limit: 30,
    publishedAfter: daysAgoIso(90),
  });
  if (error) throw new Error(`news: ${error}`);
  const items = mapNewsArticles(articles);
  return { status: items.length ? 'ok' : 'empty', items };
}

const cachedNews = unstable_cache(loadNews, ['burry-news-v1'], { revalidate: 21600, tags: TAGS });

/* ── Entry point ──────────────────────────────────────────────────────── */

function settle(result, label, fallback) {
  if (result.status === 'fulfilled' && result.value) return result.value;
  console.error(`[burry] ${label} unavailable:`, result.reason?.message || result.reason);
  return { status: 'unavailable', ...fallback };
}

/** All three legs in parallel; never throws. */
export async function getBurryWatcher() {
  const [h, e, n] = await Promise.allSettled([cachedHoldings(), cachedEcho(), cachedNews()]);
  return {
    holdings: settle(h, 'holdings', { filerUrl: FILER_URL, positions: [] }),
    echo: settle(e, 'echo', { items: [] }),
    news: settle(n, 'news', { items: [] }),
  };
}
