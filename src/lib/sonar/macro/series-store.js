/**
 * Sonar macro readers (Nov 2026). SERVER ONLY.
 *
 * Every read goes to public.macro_series_latest (one row per series: latest observed value
 * and the value a year earlier; see supabase/migrations/20261108120000_*), bounded by a
 * timeout so a quick ping never waits on it. History for ranges and charts reads
 * macro_series_values, capped. The catalogue (./catalog.js) picks, names and states the rows;
 * this module only fetches and assembles.
 *
 * Readers return evidence-ready items:
 *   { title, text, date, citation: { label, href }, meta: { family, source, series_key, ... } }
 * The citation label is the adapter's own attribution, verbatim (BOJ, UCDP, GDELT, EIA, ...).
 *
 * The database client is passed in (getAdminClient() from '@/lib/supabase' by default), so
 * tests run the readers against a stub.
 */
import 'server-only';
import { getAdminClient } from '@/lib/supabase';
import { withTimeout } from '@/lib/with-timeout';
import { ADAPTERS } from '@/lib/macro-sync/index.js';
import { iso3Name } from '@/lib/macro-sync/formats.js';
import {
  FAMILY_BY_ID,
  DEFAULT_FAMILIES,
  EURO_AREA,
  EURO_AREA_KEYS,
  REGIONS,
  MAJORS,
  COMMODITY_PINK,
  THEME_FAMILIES,
  WEAK_THEMES,
  aggregateFews,
  pickBest,
  rowToItem,
  rowIso3,
  presentRow,
  fmtNum,
  periodLabel,
  monthsBetween,
  isEuroAreaRow,
} from './catalog.js';

const TABLE = 'macro_series_latest';
const COLS =
  'source, series_key, country_iso3, period, value, series_name, unit, frequency, dataset, year_ago_period, year_ago_value';
const DEFAULT_TIMEOUT_MS = 1500;
const HISTORY_CAP = 600;

/** The adapter's attribution, verbatim; the source id when an adapter has none. */
export function attributionOf(source) {
  return ADAPTERS[source]?.attribution || source;
}

/* A bounded read: rows, or [] on timeout or error (never throws into a ping). */
async function read(build, { timeoutMs = DEFAULT_TIMEOUT_MS, label = 'macro' } = {}) {
  const r = await withTimeout(Promise.resolve().then(build), timeoutMs, label);
  if (!r.ok) {
    console.warn(`[sonar-macro] ${label}:`, r.timedOut ? 'timed out' : r.error?.message || r.error);
    return [];
  }
  const { data, error } = r.value || {};
  if (error) {
    console.warn(`[sonar-macro] ${label}:`, error.message || error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

const opts = (o = {}) => ({ attributionOf, now: o.now });

/* ------------------------------------------------------------------ country */

/**
 * The best series per family for one country, plus euro-area rows for members.
 *   families: the routed families (strict: only these), else the headline set.
 * Ordered by the families' order (theme relevance), then catalogue priority.
 */
export async function countryBrief(admin, iso3, o = {}) {
  const db = admin || getAdminClient();
  const { families = [], themes = [], limit = 8, timeoutMs } = o;
  if (!iso3) return [];
  /* 'EUR' is the country table's Eurozone entry: the euro-area series are its own. */
  const eurozone = iso3 === 'EUR';
  const member = eurozone || EURO_AREA.has(iso3);
  const [rows, euro] = await Promise.all([
    eurozone
      ? Promise.resolve([])
      : read(() => db.from(TABLE).select(COLS).eq('country_iso3', iso3).limit(5000), {
          timeoutMs,
          label: `country ${iso3}`,
        }),
    member
      ? read(
          () =>
            db
              .from(TABLE)
              .select(COLS)
              .in('source', ['ecb', 'bis'])
              .in(
                'series_key',
                EURO_AREA_KEYS.map((k) => k.series_key),
              ),
          { timeoutMs, label: 'euro area' },
        )
      : Promise.resolve([]),
  ]);
  return briefFromRows(iso3, rows, { families, themes, limit, euro, now: o.now });
}

/** Pure core of countryBrief (tests feed rows directly). */
export function briefFromRows(
  iso3,
  rows,
  { families = [], themes = [], limit = 8, euro = [], now } = {},
) {
  const fews = (rows || []).filter((r) => r.source === 'fewsnet');
  const own = [...(rows || []).filter((r) => r.source !== 'fewsnet'), ...aggregateFews(fews)];
  const order = (families.length ? families : DEFAULT_FAMILIES).filter((id) => FAMILY_BY_ID[id]);
  const items = [];
  const have = new Set();
  for (const id of order) {
    const fam = FAMILY_BY_ID[id];
    if (fam.scope === 'global') continue; // world prices belong to the theme brief
    for (const { r } of pickBest(own, fam, { now })) {
      const item = rowToItem(r, { family: fam, iso3, ...opts({ now }) });
      if (item) {
        items.push(item);
        have.add(id);
      }
    }
  }
  /* Euro-area members: the ECB policy rate always, euro-area inflation and EUR/USD when the
     question is about prices, rates or the currency (or no theme was asked). */
  if (euro.length) {
    const wantPrices =
      !families.length ||
      ['inflation_monthly', 'inflation_annual', 'fx_usd'].some((f) => order.includes(f)) ||
      themes.some((t) => ['inflation', 'rates', 'currency', 'food'].includes(t));
    const euroFamilies = ['policy_rate', ...(wantPrices ? ['inflation_monthly', 'fx_usd'] : [])];
    for (const id of euroFamilies) {
      const fam = FAMILY_BY_ID[id];
      const best = pickBest(euro.filter(isEuroAreaRow), fam, { now, max: 1 });
      for (const { r } of best) {
        const item = rowToItem(r, { family: fam, ...opts({ now }), scope: 'euro_area' });
        if (item) items.push(item);
      }
    }
  }
  return items.slice(0, limit + (euro.length ? 2 : 0));
}

/* ------------------------------------------------------------------ ranking */

/**
 * Rank countries on one family using each country's latest observation, from the one source
 * the family ranks on. Reports the period mix and leaves out rows more than 18 months older
 * than the most recent. Returns [summaryItem] whose meta.ranking holds the full list.
 */
export async function rankCountries(admin, familyId, o = {}) {
  const fam = FAMILY_BY_ID[familyId];
  if (!fam?.rank) return [];
  const db = admin || getAdminClient();
  const rows = await read(
    () =>
      db
        .from(TABLE)
        .select(COLS)
        .eq('source', fam.rank.source)
        .like('series_key', fam.rank.like)
        .limit(5000),
    { timeoutMs: o.timeoutMs, label: `rank ${familyId}` },
  );
  return rankFromRows(familyId, rows, o);
}

/** Pure core of rankCountries. */
export function rankFromRows(
  familyId,
  rows,
  { order = 'desc', limit = 10, region = null, members = null, now } = {},
) {
  const fam = FAMILY_BY_ID[familyId];
  if (!fam?.rank) return [];
  const allowed = members || (region && REGIONS[region]?.members) || null;
  const stated = [];
  for (const r of rows || []) {
    if (!fam.rank.filter(r)) continue;
    const iso3 = rowIso3(r);
    if (!iso3) continue; // aggregates never rank
    if (allowed && !allowed.includes(iso3)) continue;
    const s = presentRow(r, fam, { now });
    if (!s) continue;
    stated.push({ iso3, name: iso3Name(iso3) || iso3, row: r, s });
  }
  if (!stated.length) return [];
  const leader = stated.reduce((m, x) => (String(x.s.period) > m ? String(x.s.period) : m), '');
  const kept = stated.filter((x) => (monthsBetween(x.s.period, leader) ?? 99) <= 18);
  const dropped = stated.length - kept.length;
  const atLeader = kept.filter((x) => String(x.s.period) === leader).length;
  const older = kept.length - atLeader;
  const oldest = kept.reduce((m, x) => (String(x.s.period) < m ? String(x.s.period) : m), leader);
  kept.sort((a, b) => (order === 'asc' ? a.s.value - b.s.value : b.s.value - a.s.value));
  const top = kept.slice(0, limit);
  const unit = top[0].s.unit;
  const attribution = attributionOf(fam.rank.source);
  const where = region && REGIONS[region] ? ` in ${REGIONS[region].label}` : '';
  const mix =
    `latest data: ${periodLabel(leader)} for ${atLeader} ${atLeader === 1 ? 'country' : 'countries'}` +
    (older ? `, older for ${older} (back to ${periodLabel(oldest)})` : '') +
    (dropped ? `; ${dropped} left out with data more than 18 months older` : '');
  /* Compact, so the fast profile's 360-character snippet keeps the list: the unit once in
     the heading, a country's period only where it differs from the leader's. */
  const entry = (x, i) =>
    `${i + 1}. ${x.name} ${fmtNum(x.s.value, { money: x.s.money })}` +
    (String(x.s.period) === leader ? '' : ` (${periodLabel(x.s.period)})`);
  const label = fam.rank.label || fam.label;
  const head = `${order === 'asc' ? 'Lowest' : 'Highest'} ${label.toLowerCase()}${where}`;
  const unitNote = unit ? ` (${unit.startsWith('%') ? unit.replace(/^%/, 'percent') : unit})` : '';
  const rowsMeta = top.map((x, i) => ({
    rank: i + 1,
    iso3: x.iso3,
    name: x.name,
    value: x.s.value,
    unit: x.s.unit,
    period: x.s.period,
    series_key: x.row.series_key,
  }));
  const first = top.slice(0, 5).map(entry);
  const rest = top.slice(5).map((x, i) => entry(x, i + 5));
  const items = [
    {
      title: head,
      text:
        `${head}${unitNote}, ${periodLabel(leader)} unless noted: ${first.join('; ')}. ` +
        `Each country's latest observation (${mix}). Source: ${attribution}.`,
      date: leader,
      citation: { label: attribution, href: '/datasets/world-bank' },
      meta: {
        family: familyId,
        name: head,
        attribution,
        source: fam.rank.source,
        series_key: null,
        scope: 'ranking',
        period: leader,
        unit,
        ranking: {
          order,
          region,
          unit,
          mix,
          periodMix: { leader, atLeader, older, oldest, dropped },
          rows: rowsMeta,
        },
      },
    },
  ];
  if (rest.length) {
    items.push({
      title: `${head}, ranks 6 to ${top.length}`,
      text: `${head}${unitNote}, continued, ${periodLabel(leader)} unless noted: ${rest.join('; ')}. Source: ${attribution}.`,
      date: leader,
      citation: { label: attribution, href: '/datasets/world-bank' },
      meta: {
        family: familyId,
        source: fam.rank.source,
        series_key: null,
        scope: 'ranking',
        period: leader,
      },
    });
  }
  return items;
}

/* ------------------------------------------------------------------ history */

/** Raw history of one series for charts and ranges, oldest first, capped at 600 points. */
export async function seriesHistory(admin, source, seriesKey, o = {}) {
  const db = admin || getAdminClient();
  const rows = await read(
    () => {
      let q = db
        .from('macro_series_values')
        .select('period, value')
        .eq('source', source)
        .eq('series_key', seriesKey);
      if (o.since) q = q.gte('period', o.since);
      return q.order('period', { ascending: false }).limit(HISTORY_CAP);
    },
    { timeoutMs: o.timeoutMs, label: `history ${seriesKey}` },
  );
  return rows
    .filter((r) => r.value != null)
    .map((r) => ({ period: String(r.period), value: Number(r.value) }))
    .reverse();
}

/** Five-year range and where the latest value sits in it (percentile, 0 to 100). */
export function rangeOf(points, latest) {
  const vals = (points || []).map((p) => p.value).filter(Number.isFinite);
  if (vals.length < 12 || !Number.isFinite(latest)) return null;
  let lo = points[0];
  let hi = points[0];
  for (const p of points) {
    if (p.value < lo.value) lo = p;
    if (p.value > hi.value) hi = p;
  }
  const below = vals.filter((v) => v <= latest).length;
  return {
    low: lo,
    high: hi,
    percentile: Math.round((below / vals.length) * 100),
    from: points[0].period,
    to: points[points.length - 1].period,
    n: vals.length,
  };
}

/* ------------------------------------------------------------------ themes */

/* Global series per theme, Pink Sheet names or exact keys. */
const THEME_GLOBAL = {
  geopolitics: {
    keys: [
      ['gpr', 'GPR.GPR:WLD'],
      ['gpr', 'GPR.GPRT:WLD'],
      ['gpr', 'GPR.GPRA:WLD'],
    ],
    rank: 'geopolitical_risk',
  },
  risk: {
    keys: [
      ['gpr', 'GPR.GPR:WLD'],
      ['epu', 'EPU.GEPU_current:WLD'],
    ],
    rank: 'uncertainty',
  },
  conflict: { keys: [['gpr', 'GPR.GPRA:WLD']], rank: 'conflict' },
  oil: {
    pink: ['Crude oil, Brent', 'Crude oil, WTI'],
    keys: [['eia', 'EIA.1.57.TBPD:WORL']],
    rank: 'oil_production',
  },
  energy: {
    pink: ['Crude oil, Brent', 'Natural gas, Europe', 'Coal, Australian'],
    keys: [['eia', 'EIA.1.57.TBPD:WORL']],
    rank: 'oil_production',
  },
  gas: {
    pink: ['Natural gas, Europe', 'Natural gas, US', 'Liquefied natural gas, Japan'],
    rank: 'gas_production',
  },
  food: { pink: ['Wheat, US HRW', 'Maize', 'Rice, Thai 5%', 'Soybeans'] },
  commodity: { pink: ['Copper', 'Aluminum', 'Gold', 'Iron ore, cfr spot', 'Crude oil, Brent'] },
};

/**
 * A theme or commodity with no country. For a commodity: its Pink Sheet price (latest, change
 * on a year earlier, five-year range) and, for energy, the production leaders. For a theme:
 * global series first, then the largest economies (or the named region) on the theme's lead
 * family.
 */
export async function themeBrief(admin, o = {}) {
  const db = admin || getAdminClient();
  const {
    theme = null,
    themes = theme ? [theme] : [],
    commodity = null,
    region = null,
    limit = 8,
    timeoutMs,
    now,
  } = o;
  const items = [];

  if (commodity && COMMODITY_PINK[commodity]) {
    const c = COMMODITY_PINK[commodity];
    const keys = c.pink.map((n) => `PINK:${n}`).slice(0, 2);
    const since = `${new Date().getUTCFullYear() - 5}-01`;
    /* One round trip: the latest rows, both histories and the production ranking at once. */
    const [rows, hist, leaders] = await Promise.all([
      keys.length
        ? read(() => db.from(TABLE).select(COLS).eq('source', 'pinksheet').in('series_key', keys), {
            timeoutMs,
            label: `pink ${commodity}`,
          })
        : Promise.resolve([]),
      Promise.all(keys.map((k) => seriesHistory(db, 'pinksheet', k, { since, timeoutMs }))),
      c.production
        ? rankCountries(db, c.production, { limit: 5, timeoutMs, now })
        : Promise.resolve([]),
    ]);
    keys.forEach((k, i) => {
      const r = rows.find((x) => x.series_key === k);
      if (!r) return;
      const item = rowToItem(r, {
        family: FAMILY_BY_ID.commodity_price,
        ...opts({ now }),
        scope: 'global',
      });
      if (!item) return;
      const rg = rangeOf(hist[i].slice(-60), Number(r.value)); // the last five years, monthly
      if (rg) {
        item.text = item.text.replace(
          / Source: /,
          ` Five-year range (${periodLabel(rg.from)} to ${periodLabel(rg.to)}): low ${fmtNum(rg.low.value)} in ${periodLabel(rg.low.period)}, high ${fmtNum(rg.high.value)} in ${periodLabel(rg.high.period)}; the latest price is at the ${rg.percentile}th percentile of that range. Source: `,
        );
        item.meta.range = rg;
      }
      item.meta.history = hist[i];
      items.push(item);
    });
    items.push(...leaders);
    return items.slice(0, limit);
  }

  const lead =
    themes.find((t) => THEME_GLOBAL[t]) || themes.find((t) => !WEAK_THEMES.has(t)) || themes[0];
  const g = THEME_GLOBAL[lead];
  if (g) {
    const pinkKeys = (g.pink || []).map((n) => ['pinksheet', `PINK:${n}`]);
    const pairs = [...pinkKeys, ...(g.keys || [])];
    if (pairs.length) {
      const rows = await read(
        () =>
          db
            .from(TABLE)
            .select(COLS)
            .in('source', [...new Set(pairs.map((p) => p[0]))])
            .in(
              'series_key',
              pairs.map((p) => p[1]),
            ),
        { timeoutMs, label: `theme ${lead}` },
      );
      for (const [, key] of pairs) {
        const r = rows.find((x) => x.series_key === key);
        if (!r) continue;
        const item = rowToItem(r, { ...opts({ now }), scope: 'global' });
        if (item) items.push(item);
      }
    }
    if (g.rank)
      items.push(...(await rankCountries(db, g.rank, { limit: 5, region, timeoutMs, now })));
    return items.slice(0, limit);
  }

  /* No global series: the theme's lead family across the largest economies or the region. */
  const famId = (THEME_FAMILIES[lead] || []).find((id) => FAMILY_BY_ID[id]?.rank);
  if (famId) {
    const members = (region && REGIONS[region]?.members) || MAJORS;
    items.push(
      ...(await rankCountries(db, famId, { limit: members.length, members, timeoutMs, now })),
    );
  }
  return items.slice(0, limit);
}

/* ------------------------------------------------------------------ dispatch */

/**
 * Everything the macro data has for a routed question (route from ./route.js routeMacro):
 * a ranking, country briefs (max `maxCountries`), or a theme / commodity brief.
 */
export async function macroBrief(admin, route, o = {}) {
  if (!route) return [];
  const db = admin || getAdminClient();
  const { limit = 12, maxCountries = 2, perCountry = 6 } = o;
  if (route.ranking) {
    const items = await rankCountries(db, route.ranking.family, {
      order: route.ranking.order,
      region: route.ranking.region,
      limit: 10,
      timeoutMs: o.timeoutMs,
      now: o.now,
    });
    return items.slice(0, limit);
  }
  if (route.countries?.length) {
    const isos = route.countries.slice(0, maxCountries);
    const per = await Promise.all(
      isos.map((iso3, i) =>
        countryBrief(db, iso3, {
          families: i === 0 ? route.families : route.families.slice(0, 3),
          themes: route.themes,
          limit: i === 0 ? perCountry : Math.max(2, Math.floor(perCountry / 2)),
          timeoutMs: o.timeoutMs,
          now: o.now,
        }),
      ),
    );
    const items = per.flat();
    if (route.commodity)
      items.push(
        ...(await themeBrief(db, {
          commodity: route.commodity,
          limit: 2,
          timeoutMs: o.timeoutMs,
          now: o.now,
        })),
      );
    return items.slice(0, limit);
  }
  if (route.commodity || route.themes?.length) {
    return themeBrief(db, {
      commodity: route.commodity,
      themes: route.themes,
      region: route.region,
      limit,
      timeoutMs: o.timeoutMs,
      now: o.now,
    });
  }
  return [];
}
