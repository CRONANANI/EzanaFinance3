/**
 * Ezana Sonar — macro indicators core source.
 *
 * Until this source, nothing in Sonar read public.macro_series_values, so the IMF, World Bank,
 * central-bank, risk-index and conflict series the macro sync writes never reached an answer.
 * For each country in the ping (max 3) it reads the latest observation of a short list of
 * headline series and returns them as cited findings: growth, inflation, unemployment, debt,
 * current account, governance, external debt, remittances, policy rate, FX, geopolitical risk,
 * policy uncertainty, conflict deaths and news tone.
 *
 * Forecast years (IMF WEO publishes five years ahead) are never presented as observed: the
 * latest period up to the current year is the value, and the next projected year, when there
 * is one, is labelled "IMF projection" in the summary.
 *
 * The citation carries the source's own attribution (several sources require it: BOJ, UCDP,
 * GDELT, CBN). Findings only, never advice.
 */
import { getAdminClient } from '@/lib/supabase';
import { toIso3, iso3Name } from '@/lib/macro-sync/formats.js';

const SLUG = 'macro-indicators';

/** Headline series: matched on series_key, in display priority order. */
export const HEADLINES = [
  { id: 'gdp', re: /NGDP_RPCH/, label: 'Real GDP growth', unit: '%', page: 'world-bank' },
  { id: 'cpi', re: /PCPIPCH/, label: 'Inflation (CPI, annual)', unit: '%', page: 'world-bank' },
  {
    id: 'unemp',
    re: /(^|\W)LUR(\W|$)|UNE_DEAP/,
    label: 'Unemployment rate',
    unit: '%',
    page: 'world-bank',
  },
  {
    id: 'debt',
    re: /GGXWDG_NGDP/,
    label: 'General government gross debt',
    unit: '% of GDP',
    page: 'world-bank',
  },
  {
    id: 'deficit',
    re: /GGXCNL_NGDP/,
    label: 'Government net lending/borrowing',
    unit: '% of GDP',
    page: 'world-bank',
  },
  {
    id: 'ca',
    re: /BCA_NGDPD/,
    label: 'Current account balance',
    unit: '% of GDP',
    page: 'world-bank',
  },
  {
    id: 'extdebt',
    re: /DT\.DOD\.DECT\.GN\.ZS/,
    label: 'External debt stocks',
    unit: '% of GNI',
    page: 'world-bank',
  },
  {
    id: 'remit',
    re: /BX\.TRF\.PWKR\.DT\.GD\.ZS/,
    label: 'Personal remittances received',
    unit: '% of GDP',
    page: 'world-bank',
  },
  {
    id: 'rule',
    re: /GOV_WGI_RL\.EST/,
    label: 'Rule of law (WGI, -2.5 to 2.5)',
    unit: 'score',
    page: 'world-bank',
  },
  {
    id: 'stab',
    re: /GOV_WGI_PV\.EST/,
    label: 'Political stability (WGI, -2.5 to 2.5)',
    unit: 'score',
    page: 'world-bank',
  },
  {
    id: 'policy',
    re: /^SARB:MMRD002A$|^ECB\.FM:.*MRR|^BOE:IUDBEDR$|^BCRA:6$/,
    label: 'Policy rate',
    unit: '%',
    page: 'world-bank',
  },
  {
    id: 'gpr',
    re: /^GPR(C)?[.:]/,
    label: 'Geopolitical risk index',
    unit: 'index',
    page: 'geopolitical-risk',
  },
  {
    id: 'epu',
    re: /^EPU[.:]/,
    label: 'Economic policy uncertainty',
    unit: 'index',
    page: 'geopolitical-risk',
  },
  {
    id: 'wui',
    re: /^WUI[.:]/,
    label: 'World uncertainty index',
    unit: 'index',
    page: 'geopolitical-risk',
  },
  {
    id: 'conflict',
    re: /^UCDP\.deaths\.all:/,
    label: 'Organized-violence fatalities (month)',
    unit: 'deaths',
    page: 'geopolitical-risk',
  },
  {
    id: 'tone',
    re: /^GDELT\.timelinetone:/,
    label: 'News coverage tone (GDELT)',
    unit: 'avg tone',
    page: 'geopolitical-risk',
  },
];

/** source id -> label used in citations. Mirrors each adapter's attribution. */
export const SOURCE_LABELS = {
  imf: 'IMF',
  'worldbank-ext': 'World Bank',
  ilostat: 'ILO',
  'oecd-tiva': 'OECD',
  gpr: 'Caldara & Iacoviello GPR',
  epu: 'Economic Policy Uncertainty',
  wui: 'World Uncertainty Index',
  ucdp: 'UCDP (CC BY 4.0)',
  gdelt: 'The GDELT Project',
  ecb: 'European Central Bank',
  eurostat: 'Eurostat',
  boe: 'Bank of England',
  ons: 'ONS',
  sarb: 'South African Reserve Bank',
  bcra: 'BCRA',
  boj: 'Bank of Japan Time-Series Data Search',
  cbn: 'Central Bank of Nigeria',
  bis: 'BIS',
  bcb: 'Banco Central do Brasil',
  cepal: 'CEPALSTAT',
  afdb: 'AfDB',
};

const MAX_COUNTRIES = 3;

/** Any named country: a country question of any kind (macro, conflict, a sector) benefits
    from its headline numbers, and the read is one indexed query per country. */
export function isRelevant(q) {
  return (q?.countries || []).length > 0;
}

const yearOf = (p) => Number(String(p).slice(0, 4));

/**
 * Rows for one country -> one finding per headline (latest observed value, plus the next
 * projection when the series has future periods). Pure, so tests can feed fixtures.
 */
export function rowsToFindings(rows, iso3, { now = new Date() } = {}) {
  const thisYear = now.getUTCFullYear();
  const bySeries = new Map();
  for (const r of rows || []) {
    if (r.value == null) continue;
    const list = bySeries.get(`${r.source}|${r.series_key}`) || [];
    list.push(r);
    bySeries.set(`${r.source}|${r.series_key}`, list);
  }
  const findings = [];
  for (const h of HEADLINES) {
    const candidates = [...bySeries.values()].filter((list) => h.re.test(list[0].series_key));
    if (!candidates.length) continue;
    // Prefer the series with the most recent observed period (IMF over WB on ties is fine).
    let best = null;
    for (const list of candidates) {
      const sorted = [...list].sort((a, b) => String(b.period).localeCompare(String(a.period)));
      const observed = sorted.find((r) => yearOf(r.period) <= thisYear);
      if (!observed) continue;
      const projection = sorted
        .filter(
          (r) => yearOf(r.period) > yearOf(observed.period) && /^\d{4}$/.test(String(r.period)),
        )
        .pop();
      if (!best || String(observed.period) > String(best.observed.period))
        best = { observed, projection };
    }
    if (!best) continue;
    const { observed, projection } = best;
    const src = SOURCE_LABELS[observed.source] || observed.source;
    const v = Number(observed.value);
    const fmt = (x) =>
      Math.abs(x) >= 100
        ? Math.round(x).toLocaleString('en-US')
        : Number(x).toFixed(Math.abs(x) < 10 ? 2 : 1);
    const proj =
      projection && observed.source === 'imf'
        ? ` IMF projection for ${projection.period}: ${fmt(Number(projection.value))}.`
        : '';
    findings.push({
      sourceSlug: SLUG,
      title: `${iso3Name(iso3) || iso3}: ${h.label} ${fmt(v)} ${h.unit} (${observed.period})`,
      summary: `${observed.series_name || h.label}, ${observed.period}: ${fmt(v)} ${observed.unit || h.unit}. Source: ${src}.${proj}`,
      date: String(observed.period),
      relevance: Number(
        (0.55 + 0.4 * Math.max(0, 1 - (thisYear - yearOf(observed.period)) / 4)).toFixed(3),
      ),
      citation: { label: src, href: `/datasets/${h.page}?country=${iso3}` },
      meta: {
        headline: h.id,
        iso3,
        source: observed.source,
        seriesKey: observed.series_key,
        period: observed.period,
        value: v,
        unit: observed.unit || h.unit,
      },
    });
  }
  return findings;
}

async function fetchCountryRows(db, iso3) {
  const since = `${new Date().getUTCFullYear() - 6}`;
  const { data, error } = await db
    .from('macro_series_values')
    .select('source, series_key, period, value, series_name, unit')
    .eq('country_iso3', iso3)
    .gte('period', since)
    .order('period', { ascending: false })
    .limit(4000);
  if (error) throw new Error(error.message);
  return data || [];
}

/** @type {import('./types').SonarSourceAdapter} */
const macroIndicators = {
  slug: SLUG,
  label: 'Macro indicators',
  dimension: 'Lighthouse',
  minTier: 'free',
  timeoutMs: 4000,
  isRelevant,
  async search(q, ctx = {}) {
    if (!isRelevant(q)) return [];
    const db = ctx.db || getAdminClient();
    const isos = [...new Set((q.countries || []).map((c) => toIso3(c)).filter(Boolean))].slice(
      0,
      MAX_COUNTRIES,
    );
    const per = await Promise.all(
      isos.map(async (iso3) => {
        try {
          return rowsToFindings(await fetchCountryRows(db, iso3), iso3);
        } catch (e) {
          console.warn('[sonar/macro-indicators]', iso3, e?.message || e);
          return [];
        }
      }),
    );
    const limit = ctx.limit || 12;
    return per
      .flat()
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  },
};

export default macroIndicators;
