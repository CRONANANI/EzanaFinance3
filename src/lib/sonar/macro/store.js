/**
 * Macro rankings for Sonar (server only). A ping reads ONE row: the
 * 'macro:rankings' dataset snapshot. When that row does not exist yet (the
 * migrations or the weekly import have not run), the same payload is built
 * from the tables and cached for an hour under the 'macro' tag; before
 * macro_indicators holds rows, the World Bank series already stored in
 * lighthouse_observations (GDP per capita and real growth only) are used,
 * and the payload says which source it came from.
 */
import 'server-only';
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { readSnapshot } from '@/lib/datasets/snapshot';
import { buildRankingsPayload, METRICS, TERRITORIES } from '@/lib/sonar/macro/rank';

const PAGE = 1000;
const FROM_YEAR = 1990;

async function pageAll(build) {
  const out = [];
  for (let from = 0; from < 200000; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function fromMacroTables(admin) {
  const [countries, rows] = await Promise.all([
    pageAll(() => admin.from('macro_countries').select('iso3, name, is_aggregate, is_territory')),
    pageAll(() =>
      admin
        .from('macro_indicators')
        .select('iso3, indicator, year, value, measure_type')
        .in(
          'indicator',
          Object.values(METRICS).map((m) => m.indicator),
        )
        .gte('year', FROM_YEAR)
        .order('iso3')
        .order('indicator')
        .order('year'),
    ),
  ]);
  if (!rows.length) return null;
  const meta = new Map(countries.map((c) => [c.iso3, c]));
  return rows.map((r) => {
    const c = meta.get(r.iso3) || {};
    return {
      ...r,
      year: Number(r.year),
      value: r.value == null ? null : Number(r.value),
      name: c.name || r.iso3,
      is_aggregate: Boolean(c.is_aggregate),
      is_territory: c.is_territory ?? TERRITORIES.has(r.iso3),
    };
  });
}

/* lighthouse_observations already drops aggregates (ingest-worldbank). */
async function fromLighthouse(admin) {
  const inds = [METRICS.gdp_per_capita_usd.indicator, METRICS.gdp_growth_real.indicator];
  const rows = await pageAll(() =>
    admin
      .from('lighthouse_observations')
      .select('indicator, ref_area, ref_area_name, period, value')
      .eq('source', 'worldbank')
      .in('indicator', inds)
      .order('ref_area')
      .order('indicator')
      .order('period'),
  );
  return rows.map((r) => ({
    iso3: r.ref_area,
    name: r.ref_area_name || r.ref_area,
    indicator: r.indicator,
    year: Number(String(r.period).slice(0, 4)),
    value: r.value == null ? null : Number(r.value),
    is_aggregate: false,
    is_territory: TERRITORIES.has(r.ref_area),
  }));
}

/** Build the payload from whatever is stored (used by the snapshot builder). */
export async function buildMacroRankings(admin = getAdminClient()) {
  let rows = null;
  let source = 'world_bank';
  try {
    rows = await fromMacroTables(admin);
  } catch {
    rows = null;
  }
  if (!rows) {
    rows = await fromLighthouse(admin);
    source = 'world_bank_lighthouse';
  }
  const payload = buildRankingsPayload(rows, {
    historyFrom: source === 'world_bank' ? FROM_YEAR : 2000,
    source,
  });
  return { payload, sourceMaxUpdatedAt: null };
}

const liveRankings = unstable_cache(
  async () => (await buildMacroRankings()).payload,
  ['macro-rankings-live-v1'],
  { revalidate: 3600, tags: ['macro'] },
);

/** The rankings payload: the snapshot row, else a cached live build. */
export async function getMacroRankings() {
  const snap = await readSnapshot('macro:rankings', 'macro').catch(() => null);
  if (snap?.payload?.metrics) return { ...snap.payload, builtAt: snap.builtAt };
  try {
    return await liveRankings();
  } catch (e) {
    console.error('[sonar-macro] rankings unavailable:', e?.message || e);
    return null;
  }
}
