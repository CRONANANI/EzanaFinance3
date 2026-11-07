/**
 * Sonar research engine: evidence source runners (engine v3, Section 4).
 *
 * One runner per source in domains.js SOURCES. A runner takes the planner's
 * params and returns raw evidence items ({ title, text, url, date, period,
 * data, entities, similarity, kind }) that evidence.js normalises, plus an
 * optional `layout` payload a dossier panel can render.
 *
 * Runners reuse what Sonar already has (the RAG orchestrator, the politician,
 * country, industry and sector builders, market and analyst evidence, the
 * sanctions summary, the news cache, the IPO source) and add only what the
 * research questions need and the data supports: lobbying leaders by issue
 * bucket, company lobbying by ticker, contract history, 13F holders across a
 * universe, revenue by region, and commodity price history.
 *
 * SERVER ONLY. Every runner is bounded by the executor and fails soft (a
 * throw costs that task, never the run). No vendor name in any text.
 */
import { currencyInsights } from '@/lib/sonar/insight/derived';
import { orchestrate } from '@/lib/research-copilot/orchestrate';
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { getFmpKey } from '@/lib/fmp/upcoming-events';
import { marketSnapshot, matchEcho } from '@/lib/sonar/landing-sources';
import { analystEvidence } from '@/lib/sonar/analyst-evidence';
import { buildPoliticianDossier, politicianEvidence } from '@/lib/sonar/landing-politician';
import {
  buildCongressActivityDossier,
  congressActivityEvidence,
  detectCongressActivityPing,
  activityMetricRows,
  activityFormat,
} from '@/lib/sonar/landing-congress-activity';
import { buildCountryDossier, countryEvidence } from '@/lib/sonar/landing-country';
import { industryEvidence } from '@/lib/sonar/landing-industry';
import { summarizeCongress, summarizeContracts, rankPerformance } from '@/lib/sonar/sector-screen';
import { newsEvidence, sanctionsContext } from '@/lib/sonar/landing-research';
import { getCommoditySeries } from '@/lib/sonar/commodity-series';
import ipoEvents from '@/lib/sonar/sources/ipo-events';
import { macroBrief, seriesHistory, countryBrief } from '@/lib/sonar/macro/series-store';
import { buildCountryIntel } from '@/lib/sonar/macro/intel';
import { assessmentRows } from '@/lib/sonar/macro/intel-brief';
import { cacheGet, cacheSet } from './cache';
import { LOBBYING_TOPICS, topicCovered } from '@/lib/lobbying/topics';
import { MEMO_RUNNERS } from './sources-memo';
import { POSITIONING_RUNNERS } from './sources-positioning';
import { FUND_RUNNERS } from './sources-fund';

const FMP_STABLE = 'https://financialmodelingprep.com/stable';

export const usdShort = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'n/a';
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
};
const pct = (v) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`;
const iso = (d) => new Date(d).toISOString().slice(0, 10);

async function fmpJson(path, params, ms) {
  const key = getFmpKey();
  if (!key) return null;
  const qs = new URLSearchParams({ ...params, apikey: key }).toString();
  const cacheKey = `fmp:${path}:${JSON.stringify(params)}`;
  const hit = await cacheGet(cacheKey);
  if (hit !== undefined) return hit;
  try {
    const res = await fetchWithTimeout(`${FMP_STABLE}/${path}?${qs}`, { cache: 'no-store' }, ms);
    if (!res.ok) return null;
    const data = await res.json();
    await cacheSet(cacheKey, data, 15 * 60);
    return data;
  } catch {
    return null;
  }
}

/* Bounded concurrency so a 30-ticker universe never fires 30 calls at once. */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const k = i;
      i += 1;
      out[k] = await fn(items[k]).catch(() => null);
    }
  });
  await Promise.all(workers);
  return out;
}

/* ── lobbying ──────────────────────────────────────────────────────── */

/* Whether a topic's ingest has walked every phrase for every year asked:
   only then is a ranking of its specific-issue matches complete. Cached for
   ten minutes; any error reads as not covered. */
async function topicReady(admin, key, years) {
  if (!key) return false;
  const ck = `lobbying-topic-ready:${key}:${years.from}-${years.to}`;
  const hit = await cacheGet(ck);
  if (hit !== undefined) return hit;
  const { data, error } = await admin
    .from('lobbying_topic_ingest')
    .select('topic, year, query, complete')
    .eq('topic', key)
    .gte('year', years.from)
    .lte('year', years.to);
  const ready = !error && topicCovered(data || [], key, years);
  await cacheSet(ck, ready, 600);
  return ready;
}

async function lobbyingLeaders(
  { issueBuckets = [], text = null, topic: topicKey = null, years },
  { admin, maxItems },
) {
  const call = (pText) =>
    admin.rpc('sonar_lobbying_leaders', {
      p_buckets: issueBuckets.length ? issueBuckets : null,
      p_from: years.from,
      p_to: years.to,
      p_limit: Math.max(10, maxItems * 2),
      p_text: pText,
    });
  /* The topic's own words, but only once its ingest is complete for the
     years asked: a partial text match would rank whoever happened to load
     first. Until then, the broader issue area, labelled as such. */
  const topic = topicKey ? LOBBYING_TOPICS[topicKey] : null;
  const ready = Boolean(text && topic) && (await topicReady(admin, topicKey, years));
  let { data, error } = ready ? await call(text) : { data: null, error: null };
  const textMatched = Boolean(ready && !error && data?.length);
  if (!textMatched) ({ data, error } = await call(null));
  if (error || !data?.length) return { items: [] };
  const label = topic?.label || null;
  const scope = textMatched
    ? `filings whose specific issue descriptions mention ${label}`
    : issueBuckets.length
      ? `filings tagged with the ${issueBuckets.join(', ')} issue area${issueBuckets.length > 1 ? 's' : ''}${
          label ? ` (broader than ${label}; topic-level filings are still being loaded)` : ''
        }`
      : 'all filings';
  const period = {
    from: `${years.from}-01-01`,
    to: `${years.to}-12-31`,
    label: `${years.from} to ${years.to}`,
  };
  const rows = data.map((r) => ({
    client: r.client_name,
    ticker: r.ticker || null,
    total: Number(r.total_amount) || 0,
    filings: Number(r.filings) || 0,
    registrants: Number(r.registrants) || 0,
    byYear: r.by_year || {},
    selfFiled: Boolean(r.self_filed),
  }));
  const items = [
    {
      kind: 'aggregate',
      title: `Lobbying leaders, ${scope}, ${period.label}`,
      text: `Clients ranked by disclosed lobbying spend on ${scope}, ${period.label}: ${rows
        .slice(0, 8)
        .map(
          (r, i) =>
            `${i + 1}. ${r.client}${r.ticker ? ` (${r.ticker})` : ''} ${usdShort(r.total)} across ${r.filings} filings`,
        )
        .join(
          '; ',
        )}. Spend is each client's total reported on those filings (self-filed expenses where the client files itself, otherwise outside firms' reported income), not spend on any single issue.`,
      period,
      data: { metric: 'lobbying_spend', scope, rows, textMatched, topic: label },
      entities: rows.slice(0, 8).flatMap((r) => [r.client, r.ticker].filter(Boolean)),
    },
    ...rows.slice(0, maxItems).map((r) => ({
      kind: 'record',
      title: `${r.client} lobbying, ${period.label}`,
      text: `${r.client}${r.ticker ? ` (${r.ticker})` : ''} reported ${usdShort(r.total)} in lobbying across ${r.filings} filings by ${r.registrants} registrant${r.registrants === 1 ? '' : 's'} on ${scope}, ${period.label}. By year: ${Object.entries(
        r.byYear,
      )
        .sort()
        .map(([y, v]) => `${y} ${usdShort(v)}`)
        .join(', ')}.`,
      period,
      data: { metric: 'lobbying_spend', row: r },
      entities: [r.client, r.ticker].filter(Boolean),
    })),
  ];
  return { items };
}

async function lobbyingCompany({ tickers, years, names }, { admin }) {
  const { data, error } = await admin.rpc('sonar_lobbying_by_tickers', {
    p_tickers: tickers,
    p_from: years.from,
    p_to: years.to,
  });
  if (error || !data?.length) return { items: [] };
  const period = {
    from: `${years.from}-01-01`,
    to: `${years.to}-12-31`,
    label: `${years.from} to ${years.to}`,
  };
  return {
    items: data.map((r) => ({
      kind: 'record',
      title: `${names?.[r.ticker] || r.ticker} lobbying disclosures`,
      text: `${names?.[r.ticker] || r.ticker} (${r.ticker}) reported ${usdShort(r.total_amount)} in lobbying across ${r.filings} filings, ${period.label}. Most frequent issue codes: ${(r.top_issues || []).slice(0, 5).join(', ') || 'n/a'}.`,
      period,
      data: { metric: 'lobbying_spend', row: r },
      entities: [r.ticker, names?.[r.ticker]].filter(Boolean),
    })),
  };
}

/* ── congress ──────────────────────────────────────────────────────── */

async function congressTrades({ tickers, names, universeLabel }, { admin, now, maxItems }) {
  const since = iso(now.getTime() - 365 * 864e5);
  const { data, error } = await admin
    .from('congress_trades')
    .select('bioguide_id, ticker, type, transaction_date, amount_min, amount_max')
    .in('ticker', tickers)
    .gte('transaction_date', since)
    .order('transaction_date', { ascending: false })
    .limit(3000);
  if (error || !data?.length) return { items: [] };
  const ids = [...new Set(data.map((r) => r.bioguide_id).filter(Boolean))];
  const { data: rows } = await admin
    .from('congress_members')
    .select('bioguide_id, full_name, party, chamber, state')
    .in('bioguide_id', ids);
  const members = new Map((rows || []).map((m) => [m.bioguide_id, m]));
  const c = summarizeCongress(data, members, { names: new Map(Object.entries(names || {})), now });
  const label = universeLabel || 'these companies';
  const period = { from: since, to: iso(now), label: 'last 12 months' };
  const band = (t) => (t.range ? ` (${t.range.replace('–', ' to ')})` : '');
  return {
    layout: { congress: c },
    items: [
      {
        kind: 'aggregate',
        title: `Congressional trading in ${label}, last 12 months`,
        text: `Members of Congress disclosed ${c.total} trades in ${label} over the last 12 months: ${c.buys} purchases and ${c.sells} sales by ${c.memberCount} members. Most traded: ${c.byTicker
          .slice(0, 6)
          .map(
            (t) =>
              `${t.ticker} ${t.trades} trades by ${t.members} members (${t.buys} buys, ${t.sells} sales)`,
          )
          .join('; ')}.`,
        period,
        data: { metric: 'trade_count', summary: c },
        entities: c.byTicker.slice(0, 6).map((t) => t.ticker),
      },
      {
        kind: 'aggregate',
        title: `Most active members of Congress in ${label}`,
        text: `Most active members in ${label}, last 12 months: ${c.byMember
          .slice(0, maxItems)
          .map(
            (m) =>
              `${m.name} (${[m.party, m.state].filter(Boolean).join('-')}) ${m.trades} trades, ${m.buys} purchases, ${m.sells} sales in ${m.tickers.slice(0, 4).join(', ')}`,
          )
          .join('; ')}. Disclosures report amount ranges, not exact amounts.`,
        period,
        data: { metric: 'trade_count', members: c.byMember },
        entities: c.byMember.slice(0, maxItems).map((m) => m.name),
      },
      ...c.latest.slice(0, maxItems).map((t) => ({
        kind: 'record',
        title: `${t.member} ${t.type} ${t.ticker}`,
        text: `${t.date}: ${t.member}${t.party ? ` (${t.party})` : ''} disclosed a ${t.type} of ${t.ticker}${band(t)}.`,
        date: t.date,
        entities: [t.member, t.ticker],
      })),
    ],
  };
}

async function politicianDossierSource({ politician }, { admin }) {
  const d = await buildPoliticianDossier(politician, admin, { matchEcho });
  return {
    layout: { politician: d },
    items: politicianEvidence(d).map((e) => ({
      kind: 'aggregate',
      title: e.title,
      text: e.snippet,
      date: e.date || null,
      entities: [d.name, ...(d.holdings || []).slice(0, 5).map((h) => h.ticker)],
    })),
  };
}

/* Nov 7: chamber-wide disclosed trading by 12-month window (the same RPC and
   evidence as the quick ping), for "how has congressional trading changed"
   deep research. A member or ticker question keeps its own sources. */
async function congressActivitySource({ rawQuery }, { admin, now }) {
  const ask = detectCongressActivityPing(rawQuery || '');
  if (!ask) return { items: [] };
  const d = await buildCongressActivityDossier({ admin, years: ask.years, now });
  if (!d) return { items: [] };
  const period = {
    from: d.windows[0]?.from,
    to: d.cutoff,
    label: `${d.years} 12-month windows to ${activityFormat.fmtDate(d.cutoff)}`,
  };
  const activity = activityMetricRows(d);
  return {
    layout: { congressActivity: d },
    items: congressActivityEvidence(d).map((e, i) => ({
      kind: 'aggregate',
      title: e.title,
      text: e.snippet,
      date: e.date || null,
      period,
      /* The first record carries the computed metrics (analysis.js turns them into [M:id]). */
      data: i === 0 ? { metric: 'trade_count', activity } : { metric: 'trade_count' },
      entities: ['House', 'Senate'],
    })),
  };
}

/* ── contracts, holders, filings ───────────────────────────────────── */

async function contractsHistory({ tickers, names, universeLabel }, { admin, now }) {
  const fy = now.getUTCMonth() >= 9 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  const { data, error } = await admin
    .from('company_contract_history')
    .select('ticker, fiscal_year, award_count, total_amount, awarding_agency')
    .in('ticker', tickers)
    .gte('fiscal_year', fy - 3)
    .limit(5000);
  if (error || !data?.length) return { items: [] };
  const k = summarizeContracts(data, { names: new Map(Object.entries(names || {})), now });
  if (!k) return { items: [] };
  const agencies = new Map();
  for (const r of data.filter((x) => Number(x.fiscal_year) === k.priorFy)) {
    const a = agencies.get(r.ticker) || new Map();
    a.set(r.awarding_agency, (a.get(r.awarding_agency) || 0) + Number(r.total_amount || 0));
    agencies.set(r.ticker, a);
  }
  const topAgency = (t) => {
    const a = [...(agencies.get(t) || new Map()).entries()].sort((x, y) => y[1] - x[1])[0];
    return a ? `${a[0]} ${usdShort(a[1])}` : null;
  };
  const rankFy = k.rankBy === 'latest' ? k.latestFy : k.priorFy;
  return {
    layout: { contracts: k },
    items: [
      {
        kind: 'aggregate',
        title: `Federal contract obligations to ${universeLabel || 'these companies'}`,
        text: `Federal contract obligations, ranked by FY${rankFy}: ${k.rows
          .slice(0, 8)
          .map(
            (r) =>
              `${r.ticker}${r.name ? ` (${r.name})` : ''} ${usdShort(r.prior)} in FY${k.priorFy}, ${usdShort(r.latest)} in FY${k.latestFy}${k.latestComplete ? '' : ' to date'}`,
          )
          .join(
            '; ',
          )}.${k.latestComplete ? '' : ` FY${k.latestFy} reflects obligations synced so far.`}`,
        period: {
          from: `${k.priorFy - 1}-10-01`,
          to: `${k.latestFy}-09-30`,
          label: `FY${k.priorFy} to FY${k.latestFy}`,
        },
        data: { metric: 'contract_obligations', contracts: k },
        entities: k.rows.slice(0, 8).map((r) => r.ticker),
      },
      ...k.rows.slice(0, 5).map((r) => ({
        kind: 'record',
        title: `${r.name || r.ticker} federal contracts`,
        text: `${r.name || r.ticker} (${r.ticker}) received ${usdShort(r.prior)} in federal contract obligations in FY${k.priorFy}${topAgency(r.ticker) ? `, largest agency ${topAgency(r.ticker)}` : ''}.`,
        period: {
          from: `${k.priorFy - 1}-10-01`,
          to: `${k.priorFy}-09-30`,
          label: `FY${k.priorFy}`,
        },
        entities: [r.ticker, r.name].filter(Boolean),
      })),
    ],
  };
}

async function institutional13f({ tickers, names, universeLabel }, { admin, maxItems }) {
  const per = await mapLimit(tickers.slice(0, 10), 4, async (t) => {
    const { data } = await admin.rpc('sonar_top_13f', { p_ticker: t, p_limit: 5 });
    return data ? { ticker: t, ...data } : null;
  });
  const got = per.filter((x) => x?.top?.length);
  if (!got.length) return { items: [] };
  const merged = new Map();
  for (const p of got) {
    for (const h of p.top) {
      const m = merged.get(h.filer_name) || { filer: h.filer_name, value: 0, tickers: [] };
      m.value += Number(h.value_usd) || 0;
      m.tickers.push(p.ticker);
      merged.set(h.filer_name, m);
    }
  }
  const leaders = [...merged.values()].sort((a, b) => b.value - a.value);
  const period = got[0].period;
  return {
    layout: { holders: { leaders, perTicker: got, period } },
    items: [
      {
        kind: 'aggregate',
        title: `Largest institutional holders across ${universeLabel || 'these companies'}`,
        text: `Largest 13F holders across ${got.length} ${universeLabel || 'companies'} (quarter ending ${period}), summed over each company's top five holders: ${leaders
          .slice(0, 6)
          .map((l) => `${l.filer} ${usdShort(l.value)} in ${l.tickers.join(', ')}`)
          .join('; ')}.`,
        date: period,
        period: { to: period, label: `quarter ending ${period}` },
        data: { metric: 'holdings_value', leaders },
        entities: leaders.slice(0, 6).map((l) => l.filer),
      },
      ...got.slice(0, maxItems).map((p) => ({
        kind: 'record',
        title: `Top holders of ${names?.[p.ticker] || p.ticker}`,
        text: `Top 13F holders of ${p.ticker} (quarter ending ${p.period}, ${p.holders} holders, ${usdShort(p.totalValue)} reported): ${p.top
          .slice(0, 3)
          .map(
            (h) =>
              `${h.filer_name} ${usdShort(h.value_usd)}${h.change_type ? ` (${h.change_type})` : ''}`,
          )
          .join('; ')}.`,
        date: p.period,
        entities: [p.ticker, ...p.top.slice(0, 3).map((h) => h.filer_name)],
      })),
    ],
  };
}

async function secFilings({ tickers }, { admin, now, maxItems }) {
  const { data } = await admin
    .from('sec_filings')
    .select('form_type, filer_name, ticker, filed_at, primary_doc_url, index_url')
    .in('ticker', tickers.slice(0, 10))
    .gte('filed_at', iso(now.getTime() - 180 * 864e5))
    .order('filed_at', { ascending: false })
    .limit(maxItems * 3);
  return {
    items: (data || []).slice(0, maxItems).map((f) => ({
      kind: 'record',
      title: `${f.form_type} filed for ${f.ticker}`,
      text: `${f.filer_name} filed a ${f.form_type} for ${f.ticker} on ${String(f.filed_at).slice(0, 10)}.`,
      url: f.primary_doc_url || f.index_url || null,
      date: f.filed_at,
      entities: [f.ticker, f.filer_name],
    })),
  };
}

/* ── market data ───────────────────────────────────────────────────── */

async function marketSnapshotSource({ ticker }, { ms }) {
  const s = await marketSnapshot(ticker, ms);
  return s
    ? {
        items: [
          {
            kind: 'record',
            title: s.title,
            text: s.snippet,
            date: s.date || null,
            entities: [ticker],
          },
        ],
      }
    : { items: [] };
}

async function analystsSource({ ticker }, { ms }) {
  const rows = await analystEvidence(ticker, { ms });
  return {
    items: rows.map((r) => ({
      kind: 'record',
      title: r.title,
      text: r.snippet,
      date: r.date,
      entities: [ticker],
    })),
  };
}

/** Revenue by region for one ticker, latest fiscal year. */
async function revenueByRegion(ticker, ms) {
  const d = await fmpJson(
    'revenue-geographic-segmentation',
    { symbol: ticker, period: 'annual' },
    ms,
  );
  const row = Array.isArray(d)
    ? [...d].sort((a, b) => String(b?.date).localeCompare(String(a?.date)))[0]
    : null;
  const parts = Object.entries(row?.data || {})
    .map(([region, v]) => [region, Number(v)])
    .filter(([, v]) => Number.isFinite(v) && v > 0);
  const total = parts.reduce((s, [, v]) => s + v, 0);
  if (!parts.length || !total) return null;
  return {
    ticker,
    fiscalYear: row.fiscalYear || String(row.date).slice(0, 4),
    date: String(row.date).slice(0, 10),
    total,
    regions: parts
      .sort((a, b) => b[1] - a[1])
      .map(([region, value]) => ({ region, value, share: value / total })),
  };
}

const CHINA_TAIWAN = /\b(china|chinese|taiwan|hong kong|prc|greater china)\b/i;

async function revenueGeo({ tickers, names }, { ms }) {
  const rows = (await mapLimit(tickers.slice(0, 10), 5, (t) => revenueByRegion(t, ms))).filter(
    Boolean,
  );
  if (!rows.length) return { items: [] };
  const exposure = rows
    .map((r) => {
      const hit = r.regions.filter((x) => CHINA_TAIWAN.test(x.region));
      return {
        ...r,
        chinaTaiwanShare: hit.reduce((s, x) => s + x.share, 0),
        chinaTaiwanRegions: hit.map((x) => x.region),
      };
    })
    .sort((a, b) => b.chinaTaiwanShare - a.chinaTaiwanShare);
  return {
    layout: { revenueGeo: exposure },
    items: [
      {
        kind: 'aggregate',
        title: 'Disclosed revenue from China, Taiwan and Hong Kong segments',
        text: `Share of latest fiscal-year revenue reported in segments named for China, Taiwan or Hong Kong: ${exposure
          .map(
            (r) =>
              `${r.ticker} ${(r.chinaTaiwanShare * 100).toFixed(0)}% (FY${r.fiscalYear}${r.chinaTaiwanRegions.length ? `: ${r.chinaTaiwanRegions.join(', ')}` : ', no such segment reported'})`,
          )
          .join(
            '; ',
          )}. Segments are as each company reports them; billing location is not the same as end demand or supply-chain dependence.`,
        data: { metric: 'revenue_by_region', exposure },
        entities: exposure.map((r) => r.ticker),
      },
      ...exposure.slice(0, 6).map((r) => ({
        kind: 'record',
        title: `${names?.[r.ticker] || r.ticker} revenue by region, FY${r.fiscalYear}`,
        text: `${names?.[r.ticker] || r.ticker} (${r.ticker}) revenue by region, fiscal ${r.fiscalYear}: ${r.regions
          .slice(0, 6)
          .map((x) => `${x.region} ${usdShort(x.value)} (${(x.share * 100).toFixed(0)}%)`)
          .join(', ')}.`,
        date: r.date,
        entities: [r.ticker],
      })),
    ],
  };
}

async function pricePerformance({ tickers, names, universeLabel }, { ms, now }) {
  const rows = await mapLimit(tickers.slice(0, 20), 6, async (t) => {
    const d = await fmpJson('stock-price-change', { symbol: t }, ms);
    const r = (Array.isArray(d) ? d[0] : d) || null;
    if (!r) return null;
    const n = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v));
    return {
      ticker: t,
      name: names?.[t] || null,
      m1: n(r['1M']),
      m3: n(r['3M']),
      ytd: n(r.ytd ?? r.YTD),
      y1: n(r['1Y']),
    };
  });
  const ranked = rankPerformance(rows.filter(Boolean));
  if (!ranked.length) return { items: [] };
  const asOf = iso(now);
  const line = (r) =>
    `${r.ticker} YTD ${r.ytd != null ? pct(r.ytd) : 'n/a'}, 1Y ${r.y1 != null ? pct(r.y1) : 'n/a'}`;
  return {
    layout: { performance: { asOf, rows: ranked, count: ranked.length } },
    items: [
      {
        kind: 'aggregate',
        title: `Share price performance, ${universeLabel || 'these companies'}`,
        text: `Share price change as of ${asOf} across ${ranked.length} ${universeLabel || 'companies'}, best first: ${ranked
          .slice(0, 6)
          .map(line)
          .join('; ')}. Weakest: ${ranked.slice(-2).map(line).join('; ')}.`,
        date: asOf,
        data: { metric: 'price_change', rows: ranked },
        entities: ranked.slice(0, 6).map((r) => r.ticker),
      },
    ],
  };
}

async function commoditySeriesSource({ commodity, horizon }, { now }) {
  const from = iso(now.getTime() - 3 * 365 * 864e5);
  const s = await getCommoditySeries(commodity.id, from);
  if (!s?.points?.length) return { items: [] };
  const vals = s.points.map((p) => p.v);
  const lastYear = s.points.filter((p) => p.d >= iso(now.getTime() - 365 * 864e5));
  const y = lastYear.map((p) => p.v);
  const change = (a, b) => ((b - a) / a) * 100;
  const yr = y.length > 1 ? change(y[0], y[y.length - 1]) : null;
  return {
    layout: { commodity: s },
    items: [
      {
        kind: 'aggregate',
        title: `${s.label} price history`,
        text: `${s.label} (${s.proxy || 'front-month'} proxy) closed at ${Number.isFinite(Number(s.last?.v ?? s.last)) ? Number(s.last?.v ?? s.last).toFixed(2) : 'n/a'} on ${s.to}. Change since ${s.from}: ${pct(s.changePct)}.${yr != null ? ` Last 12 months: ${pct(yr)}, range ${Math.min(...y).toFixed(2)} to ${Math.max(...y).toFixed(2)}.` : ''} Three-year range ${Math.min(...vals).toFixed(2)} to ${Math.max(...vals).toFixed(2)}.`,
        date: s.to,
        period: { from: s.from, to: s.to, label: `${s.from} to ${s.to}` },
        data: { metric: 'price_change', series: s.points, label: s.label, horizon },
        entities: [s.label],
      },
    ],
  };
}

/* ── context sources ───────────────────────────────────────────────── */

async function sanctionsSource({ countries, query }) {
  const focus = countries?.[0]?.iso3 ? countries[0] : null;
  const s = await sanctionsContext({ focus, query });
  if (!s) return { items: [] };
  return {
    layout: { sanctions: s.panel },
    items: (s.evidence || []).map((e) => ({
      kind: 'aggregate',
      title: e.title,
      text: e.snippet,
      date: e.date || null,
      entities: [],
    })),
  };
}

async function macroCountry({ country }, { admin, ms = 2500 }) {
  /* The dossier (OECD, Empire, news) plus the country's headline series from the macro
     catalogue, in parallel. */
  const [d, brief] = await Promise.all([
    buildCountryDossier(country, admin, { matchEcho }),
    countryBrief(admin, country.iso3, { limit: 8, timeoutMs: Math.max(600, ms - 400) }).catch(
      () => [],
    ),
  ]);
  return {
    layout: { country: d },
    items: [
      ...countryEvidence(d).map((e) => ({
        kind: 'aggregate',
        title: e.title,
        text: e.snippet,
        date: e.date || null,
        entities: [country.name],
      })),
      ...brief.map((it) => macroItemToEvidence(it)),
    ],
  };
}

/* ── macro catalogue ───────────────────────────────────────────────── */

/** The families a company memo reads for the countries it reports revenue from. */
export const MEMO_MACRO_FAMILIES = [
  'geopolitical_risk',
  'policy_rate',
  'fx_usd',
  'inflation_monthly',
];
export const MEMO_MACRO_LABEL = 'Context for the countries the company reports revenue from';

/** A macro catalogue item -> a raw evidence item (kind 'series', structured data). */
export function macroItemToEvidence(it, { history = null, contextLabel = null } = {}) {
  const m = it.meta || {};
  return {
    kind: 'series',
    category: 'historical',
    title: contextLabel ? `${contextLabel}: ${it.title}` : it.title,
    text: contextLabel ? `${contextLabel} (not company exposure). ${it.text}` : it.text,
    date: it.date || null,
    period: m.period ? { label: String(m.period), to: String(m.period) } : null,
    data: {
      metric: 'macro_series',
      family: m.family,
      name: m.name || it.title,
      place: m.place || null,
      iso3: m.iso3 || null,
      scope: m.scope || null,
      source: m.source,
      series_key: m.series_key || null,
      value: m.value ?? null,
      unit: m.unit || null,
      period: m.period || null,
      change: m.change ?? null,
      changeKind: m.changeKind || null,
      yearAgoPeriod: m.yearAgoPeriod || null,
      attribution: m.attribution || it.citation?.label || m.source,
      derived: m.mode === 'yoy_from_index',
      history: history || null,
      ranking: m.ranking
        ? { rows: m.ranking.rows, order: m.ranking.order, mix: m.ranking.mix }
        : null,
      projection: m.projection || null,
      context: contextLabel || null,
    },
    entities: [m.place, m.iso3].filter(Boolean),
  };
}

/**
 * macro_series: the macro catalogue for the spec's countries (max 4), themes, commodity or
 * ranking. Items carry structured data (analysis.js computes latest, change, five-year
 * percentile and rank) and, for up to two lead series, their history for a line chart.
 * `contextLabel` marks a company memo's country context (never the company's exposure).
 */
async function macroSeriesSource(params, { admin, ms = 2500, maxItems = 6, now }) {
  const route = {
    countries: params.countries || [],
    themes: params.themes || [],
    families: params.families || [],
    commodity: params.commodity || null,
    ranking: params.ranking || null,
    region: params.region || null,
  };
  const timeoutMs = Math.max(600, Math.min(ms - 300, 3000));
  /* Nov 6: a currency question in deep research reads the currency framework's families
     as required evidence (more per country), plus the computed currency picture with its
     historical stress episodes, the same charts as the ping, and what Ezana does not hold. */
  const currencyAsk =
    !params.contextLabel &&
    (params.frameworks || []).includes('currency') &&
    route.countries.length > 0;
  const [items, intel] = await Promise.all([
    macroBrief(admin, route, {
      limit: Math.max(maxItems, currencyAsk ? 10 : 6),
      maxCountries: 4,
      perCountry: params.contextLabel ? 4 : currencyAsk ? 10 : 6,
      timeoutMs,
      now,
    }),
    currencyAsk
      ? buildCountryIntel(admin, {
          iso3: route.countries[0],
          route: { ...route, currency: params.currency || null },
          timeoutMs,
          now: now || new Date(),
          historyYears: 20,
          withEpisodes: true,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);
  /* History for the two lead series with a key (rankings chart from their own rows). */
  const since = `${(now || new Date()).getUTCFullYear() - 6}`;
  const lead = items.filter((it) => it.meta?.series_key && it.meta.scope !== 'ranking').slice(0, 2);
  const hist = await Promise.all(
    lead.map((it) =>
      it.meta.history
        ? Promise.resolve(it.meta.history)
        : seriesHistory(admin, it.meta.source, it.meta.series_key, { since, timeoutMs }).catch(
            () => [],
          ),
    ),
  );
  const byKey = new Map(lead.map((it, i) => [it, hist[i]]));
  const pic = intel?.picture || null;
  /* The computed measures as evidence (each cites the series it came from), then what the
     required families lack: a data gap is stated, never filled. */
  const intelItems = pic
    ? [
        ...pic.statements.map((text, i) => ({
          kind: 'aggregate',
          category: 'historical',
          title: `${intel.place}: computed currency measures ${i + 1}`,
          text,
          entities: [intel.place, intel.iso3].filter(Boolean),
        })),
        ...(pic.missing?.length
          ? [
              {
                kind: 'aggregate',
                category: 'historical',
                title: `${intel.place}: data not available`,
                text: `Not in Ezana's data for ${intel.place}: ${pic.missing.join(', ')}.`,
                entities: [intel.place],
              },
            ]
          : []),
      ]
    : [];
  return {
    layout: {
      macro: {
        context: params.contextLabel || null,
        items: items.map((it) => ({
          title: it.title,
          citation: it.citation,
          meta: { ...it.meta, history: undefined },
        })),
        countryIntel: pic
          ? {
              iso3: intel.iso3,
              place: intel.place,
              currency: intel.currency || null,
              focus: 'FX risk',
              overall: pic.assessment?.overall || null,
              assessmentLabel: intel.assessmentLabel || null,
              kpis: pic.kpis || [],
              rows: pic.assessment?.overall ? assessmentRows(pic, null) : [],
              missing: pic.missing || [],
              charts: intel.charts || {},
              transmission: intel.transmission || null,
              episodes: intel.episodes || [],
              sources: intel.sources || [],
              /* Nov 2026: deterministic currency findings (insight/derived.js); the insight
                 step validates them against the computed-measures records. */
              insights: currencyInsights(pic, {
                place: intel.place,
                currency: intel.currency,
                reerBasis: intel.reerBasis ?? null,
              }),
            }
          : null,
      },
    },
    items: [
      ...intelItems,
      ...items.map((it) =>
        macroItemToEvidence(it, {
          history: byKey.get(it) || null,
          contextLabel: params.contextLabel || null,
        }),
      ),
    ],
  };
}

async function industryRegistry({ industry }) {
  const reg = industry.registry;
  const ev = industryEvidence({
    industry: { label: industry.label },
    registry: { stages: reg.stages || [], companies: reg.companies || [] },
  });
  return {
    layout: { industry: { id: industry.id, label: industry.label, registry: reg } },
    items: ev.map((e) => ({ kind: 'aggregate', title: e.title, text: e.snippet, entities: [] })),
  };
}

async function ragCorpus(corpus, { query, phrase }, { admin, maxItems, ms }) {
  const out = await orchestrate(phrase || query, {
    admin,
    allowCorpora: [corpus],
    rawQuery: query,
    topK: maxItems,
    perCorpusCap: maxItems,
    retrieverTimeoutMs: ms,
    embedTimeoutMs: Math.min(800, ms),
    rerankTimeoutMs: Math.min(900, ms),
  });
  return {
    items: (out.items || []).map((it) => ({
      kind: corpus === 'echo' ? 'article' : 'record',
      title: it.title,
      text: it.snippet || it.text,
      url: it.url || null,
      date: it.date || null,
      similarity: it.similarity ?? null,
      entities: Object.values(it.meta || {}).filter((v) => typeof v === 'string' && v.length < 60),
    })),
  };
}

async function newsSource({ tickers, phrase, phrases = null }, { admin, maxItems }) {
  /* Deep research reads one news search per research angle ("NVIDIA export
     controls", "NVIDIA competition"), merged and de-duplicated. */
  const list = phrases?.length ? phrases : [phrase];
  const per = Math.max(2, Math.ceil(maxItems / list.length));
  const batches = await Promise.all(
    list.map((ph, i) =>
      newsEvidence(admin, { tickers: i === 0 ? tickers : [], phrase: ph, limit: per }).catch(
        () => [],
      ),
    ),
  );
  const seen = new Set();
  const rows = batches
    .flat()
    .filter((a) => {
      const k = a.url || a.title;
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, maxItems);
  return {
    items: rows.map((a) => ({
      kind: 'article',
      title: a.title,
      text: `Reported by ${a.source}${a.publishedAt ? ` on ${String(a.publishedAt).slice(0, 10)}` : ''}: ${a.title}.`,
      url: a.url,
      date: a.publishedAt,
      entities: [],
    })),
  };
}

async function ipoSource({ ticker }, { ms }) {
  const rows = await ipoEvents.search({ intents: ['ipo'], tickers: [ticker] }, { timeoutMs: ms });
  return {
    items: (rows || []).map((f) => ({
      kind: 'record',
      title: f.title,
      text: f.summary,
      url: f.citation?.href || null,
      date: f.date || null,
      entities: [ticker],
    })),
  };
}

export const RUNNERS = {
  lobbying_leaders: lobbyingLeaders,
  lobbying_company: lobbyingCompany,
  congress_sector: congressTrades,
  congress_company: congressTrades,
  politician_dossier: politicianDossierSource,
  congress_activity: congressActivitySource,
  contracts_history: contractsHistory,
  institutional_13f: institutional13f,
  sec_filings: secFilings,
  market_snapshot: marketSnapshotSource,
  analysts: analystsSource,
  revenue_geo: revenueGeo,
  price_performance: pricePerformance,
  commodity_series: commoditySeriesSource,
  sanctions: sanctionsSource,
  macro_country: macroCountry,
  macro_series: macroSeriesSource,
  industry_registry: industryRegistry,
  prediction_markets: (p, ctx) => ragCorpus('markets', p, ctx),
  echo: (p, ctx) => ragCorpus('echo', p, ctx),
  news: newsSource,
  ipo_filings: ipoSource,
  ...MEMO_RUNNERS,
  ...POSITIONING_RUNNERS,
  /* Sonar for organizations: a fund fit run only (added by the engine). */
  ...FUND_RUNNERS,
};
