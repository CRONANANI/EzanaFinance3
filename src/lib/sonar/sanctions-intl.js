/**
 * International sanctions lists in Sonar (Nov 2026). SERVER (the readers take a client).
 *
 * public.sanctions_intl_entries holds the EU Financial Sanctions Files, the UK Sanctions List
 * (FCDO) and the UN Security Council Consolidated List (src/lib/sanctions-intl syncs them);
 * public.sanctions_entries holds the US Treasury OFAC SDN list. Sonar reads active rows only
 * (removed_on is null) for three kinds of question:
 *
 *   country      listings per list for that country, the top regimes per list and recent
 *                additions (designated, or first seen after the list's first sync, in the
 *                last 90 days; the first sync stamped every row with the same date)
 *   entity       a name or alias across all four lists: "listed by OFAC and the UK; not on
 *                the EU or UN lists", with the matched names and identifiers
 *   comparative  "which countries have the most UN sanctions listings": counts by country
 *
 * Rules: each list is cited by name, and a name match is never presented as an identity:
 * the text shows the matched names and says a name match is not a confirmed identity.
 * Per-country regimes and country counts come from two SQL functions
 * (supabase/migrations/20261108130000_sanctions_intl_summary.sql); until they exist the
 * readers fall back to exact per-list counts without regimes.
 */
import { iso3Name } from '@/lib/macro-sync/formats.js';

export const LIST_NAMES = {
  ofac: 'US Treasury OFAC SDN list',
  eu: 'EU Financial Sanctions Files',
  uk: 'UK Sanctions List (FCDO)',
  un: 'UN Security Council Consolidated List',
};
const SHORT = { ofac: 'OFAC', eu: 'the EU', uk: 'the UK', un: 'the UN' };
export const INTL_LISTS = ['eu', 'uk', 'un'];
const ALL_LISTS = ['ofac', 'eu', 'uk', 'un'];
const RECENT_DAYS = 90;

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

/* ------------------------------------------------------------------ names */

/* Legal-form words that lead a registered name ("PJSC Rosneft Oil Company"). */
const LEGAL_PREFIX =
  /^(?:(?:public|open|closed|private)\s+)?(?:joint[- ]stock\s+company|joint[- ]stock\s+commercial\s+bank|limited\s+liability\s+company|pjsc|ojsc|cjsc|jsc|pao|oao|zao|ooo|ao|llc|ltd|plc|the)\s+/i;

/** A name as compared: lower case, no quotes or punctuation, legal forms dropped. */
export function normEntity(name) {
  let s = String(name || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[“”"'‘’«»]/g, '')
    .replace(/[^\p{L}\p{N}&]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (let i = 0; i < 3 && LEGAL_PREFIX.test(s); i += 1) s = s.replace(LEGAL_PREFIX, '');
  return s;
}

/**
 * Whether a listed name matches the asked-for name: equal, or beginning with it as whole words
 * ("rosneft" matches "Rosneft Oil Company", not "Rosneftflot"). 'exact' | 'prefix' | null.
 */
export function nameMatch(query, candidate) {
  const q = normEntity(query);
  const c = normEntity(candidate);
  if (!q || !c || q.length < 3) return null;
  if (c === q) return 'exact';
  if (c.startsWith(`${q} `)) return 'prefix';
  return null;
}

/** The entity a sanctions question asks about ("Is Rosneft sanctioned by the EU and UK?"). */
export function sanctionsEntityName(text) {
  const t = String(text || '').trim();
  const pats = [
    /\b(?:is|are|was|were|has|have)\s+(.{2,60}?)\s+(?:been\s+)?(?:sanctioned|designated|blacklisted|listed|under sanctions|on (?:the|a|any) [\w\s()]*?(?:sanctions )?lists?)\b/i,
    /\bsanctions?\s+(?:on|against)\s+(.{2,60}?)(?:\?|$|\s+(?:by|from|in|under)\b)/i,
    /^(.{2,60}?)\s+sanctions?(?:\s+status)?\??$/i,
  ];
  for (const re of pats) {
    const m = re.exec(t);
    if (m) {
      const name = m[1].replace(/^(the|a)\s+/i, '').trim();
      if (name && !/^(it|they|he|she|this|that|which|what|who|any|anyone|russia|iran)$/i.test(name))
        return name;
    }
  }
  return null;
}

/** The lists a question names (OFAC, EU, UK, UN), in that order. */
export function listsNamed(text) {
  const t = String(text || '');
  const out = [];
  if (/\b(ofac|treasury|sdn|us|u\.s\.|american|united states)\b/i.test(t)) out.push('ofac');
  if (/\b(eu|european union|europe)\b/i.test(t)) out.push('eu');
  if (/\b(uk|u\.k\.|britain|british|united kingdom|fcdo|ofsi)\b/i.test(t)) out.push('uk');
  if (/\b(un|u\.n\.|united nations|security council)\b/i.test(t)) out.push('un');
  return out;
}

/** "Which countries are most sanctioned by the EU?" and the like. */
export function isComparativeSanctions(text) {
  const t = String(text || '');
  return (
    /sanction/i.test(t) &&
    /\b(which|what) (countr(y|ies)|nations?|jurisdictions?)\b|\bmost[- ]sanctioned\b|\bmost .*sanctions? listings\b|\bcountries with the most\b|\brank\w* .*sanction/i.test(
      t,
    )
  );
}

/* ------------------------------------------------------------------ statements (pure) */

/** "listed by OFAC and the UK; not on the EU or UN lists". */
export function presenceSentence(found, asked = ALL_LISTS) {
  const on = asked.filter((l) => found[l]?.length);
  const off = asked.filter((l) => !found[l]?.length);
  const join = (ls) =>
    ls.length <= 1
      ? ls.map((l) => SHORT[l]).join('')
      : `${ls
          .slice(0, -1)
          .map((l) => SHORT[l])
          .join(', ')} and ${SHORT[ls[ls.length - 1]]}`;
  const joinOr = (ls) =>
    ls.length <= 1
      ? ls.map((l) => SHORT[l].replace(/^the /, '')).join('')
      : `${ls
          .slice(0, -1)
          .map((l) => SHORT[l].replace(/^the /, ''))
          .join(', ')} or ${SHORT[ls[ls.length - 1]].replace(/^the /, '')}`;
  const a = on.length ? `listed by ${join(on)}` : 'no listing under this name';
  const b = off.length ? `; not on the ${joinOr(off)} list${off.length > 1 ? 's' : ''}` : '';
  return `${a}${b}`;
}

const NOT_IDENTITY =
  'A name match is not a confirmed identity: compare the identifiers (aliases, addresses, dates, registration numbers) before relying on it.';

/** Entity matches across lists -> one evidence item. Pure. */
export function entityItem(name, found, { asked = ALL_LISTS } = {}) {
  const lines = ALL_LISTS.filter((l) => found[l]?.length).map((l) => {
    const rows = found[l].slice(0, 3).map((r) => {
      const bits = [
        r.matchedAlias && r.matchedAlias !== r.name ? `alias ${r.matchedAlias}` : null,
        r.regimes?.length ? r.regimes.slice(0, 2).join(', ') : null,
        r.countries?.length ? r.countries.slice(0, 3).join(', ') : null,
        r.listedOn ? `listed ${r.listedOn}` : null,
      ].filter(Boolean);
      return `${r.name}${bits.length ? ` (${bits.join('; ')})` : ''}`;
    });
    return `${LIST_NAMES[l]}: ${rows.join('; ')}${found[l].length > 3 ? `; ${found[l].length - 3} more` : ''}`;
  });
  const lists = ALL_LISTS.filter((l) => found[l]?.length);
  return {
    title: `Sanctions lists, name match for "${name}"`,
    text: `Name match for "${name}" across the four sanctions lists Ezana holds: ${presenceSentence(found, asked)}.${
      lines.length ? ` Matched entries: ${lines.join('. ')}.` : ''
    } ${NOT_IDENTITY}`,
    citation: {
      label: lists.map((l) => LIST_NAMES[l]).join('; ') || 'Sanctions lists',
      href: `/datasets/sanctions?q=${encodeURIComponent(name)}`,
    },
    meta: {
      kind: 'intl_entity',
      name,
      lists,
      notOn: asked.filter((l) => !found[l]?.length),
      matches: Object.fromEntries(ALL_LISTS.map((l) => [l, (found[l] || []).length])),
    },
  };
}

/* EU Financial Sanctions File regime codes with a settled meaning; a code that is an ISO3
   country code reads as that country's regime. Others stay as the EU's own code. */
const EU_REGIMES = {
  UKR: 'actions against Ukraine',
  RUSDA: "Russia's destabilising activities",
  HR: 'global human rights regime',
  CHEM: 'chemical weapons',
  CYB: 'cyber-attacks',
};
export function regimeLabel(list, regime) {
  const r = String(regime || '');
  if (list !== 'eu') return r;
  if (EU_REGIMES[r]) return `${r} (${EU_REGIMES[r]})`;
  if (/^[A-Z]{3}$/.test(r) && iso3Name(r) && iso3Name(r) !== r)
    return `${r} (${iso3Name(r)} regime)`;
  return r;
}

/** Per-list country summary -> one evidence item. Pure. */
export function countryItem(iso3, summary) {
  const place = iso3Name(iso3) || iso3;
  const parts = INTL_LISTS.filter((l) => summary[l]).map((l) => {
    const s = summary[l];
    const regimes = (s.topRegimes || [])
      .slice(0, 3)
      .map((r) => `${regimeLabel(l, r.regime)} ${fmt(r.listings)}`);
    return `${LIST_NAMES[l]}: ${fmt(s.listings)} active listing${s.listings === 1 ? '' : 's'} naming ${place}${
      s.entities != null ? ` (${fmt(s.entities)} entities, ${fmt(s.individuals)} individuals)` : ''
    }${regimes.length ? `; top regimes: ${regimes.join('; ')}` : ''}${
      s.recent ? `; ${fmt(s.recent)} added in the last ${RECENT_DAYS} days` : ''
    }`;
  });
  if (!parts.length) return null;
  return {
    title: `International sanctions lists, ${place}`,
    text: `${parts.join('. ')}. Counts are listings whose country fields name ${place} (nationality, address or registration); a listing is not a finding about any company.`,
    citation: {
      label: INTL_LISTS.filter((l) => summary[l])
        .map((l) => LIST_NAMES[l])
        .join('; '),
      href: `/datasets/sanctions?country=${iso3}`,
    },
    meta: { kind: 'intl_country', iso3, summary },
  };
}

/** Country counts for one list (or all three) -> one evidence item. Pure. */
export function countsItem(list, rows, { checked = null } = {}) {
  if (!rows?.length) return null;
  const label = list ? LIST_NAMES[list] : 'the EU, UK and UN sanctions lists combined';
  const top = rows
    .slice(0, 10)
    .map((r, i) => `${i + 1}. ${iso3Name(r.country) || r.country} ${fmt(r.listings)}`)
    .join('; ');
  const scope = checked ? ` (among the ${checked} most-sanctioned jurisdictions checked)` : '';
  return {
    title: `Countries with the most listings, ${list ? LIST_NAMES[list] : 'EU, UK and UN lists'}`,
    text: `Countries named by the most active listings on ${label}${scope}: ${top}. A listing counts once for each country its record names.`,
    citation: {
      label: list ? LIST_NAMES[list] : INTL_LISTS.map((l) => LIST_NAMES[l]).join('; '),
      href: '/datasets/sanctions',
    },
    meta: { kind: 'intl_counts', list: list || null, rows: rows.slice(0, 25) },
  };
}

/* ------------------------------------------------------------------ readers */

const COLS = 'list_source, source_id, name, entry_type, regimes, countries, aliases, listed_on';
const sanitize = (s) =>
  String(s || '')
    .replace(/[,(){}"%*\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * A name across all four lists. `searchOfac(params)` is the OFAC page's own alias-aware
 * search (searchSanctions); EU, UK and UN rows come from sanctions_intl_entries.
 * Returns { ofac: [...], eu: [...], uk: [...], un: [...] } of matched rows.
 */
export async function intlEntityMatch(admin, name, { searchOfac = null } = {}) {
  const q = sanitize(name);
  const found = { ofac: [], eu: [], uk: [], un: [] };
  if (q.length < 3) return found;
  const core = normEntity(q);
  const [intl, ofac] = await Promise.all([
    admin
      .from('sanctions_intl_entries')
      .select(COLS)
      .is('removed_on', null)
      .or(`name.ilike.%${core}%,aliases.cs.{"${q}"},aliases.cs.{"${q.toUpperCase()}"}`)
      .limit(300)
      .then((r) => r.data || [])
      .catch(() => []),
    searchOfac
      ? Promise.resolve(searchOfac({ q, page: 1 }))
          .then((r) => r?.rows || [])
          .catch(() => [])
      : Promise.resolve([]),
  ]);
  for (const r of intl) {
    const byName = nameMatch(q, r.name);
    const alias = (r.aliases || []).find((a) => nameMatch(q, a));
    if (!byName && !alias) continue;
    if (!found[r.list_source]) continue;
    found[r.list_source].push({
      name: r.name,
      matchedAlias: !byName && alias ? alias : null,
      exact: byName === 'exact' || (alias && nameMatch(q, alias) === 'exact'),
      regimes: r.regimes || [],
      countries: (r.countries || []).map((c) => iso3Name(c) || c),
      listedOn: r.listed_on || null,
      type: r.entry_type || null,
    });
  }
  for (const r of ofac) {
    const byName = nameMatch(q, r.name);
    const alias = r.matchedAlias && nameMatch(q, r.matchedAlias);
    if (!byName && !alias) continue;
    found.ofac.push({
      name: r.name,
      matchedAlias: !byName && alias ? r.matchedAlias : null,
      exact: byName === 'exact' || alias === 'exact',
      regimes: r.programs || [],
      countries: r.countries || [],
      listedOn: r.listedOn || r.firstSeen || null,
      type: r.type || null,
    });
  }
  for (const l of ALL_LISTS) found[l].sort((a, b) => Number(b.exact) - Number(a.exact));
  return found;
}

/** Per-list summary for one country (ISO3): listings, types, top regimes, recent additions. */
export async function intlCountrySummary(admin, iso3) {
  const out = {};
  const rpc = await admin
    .rpc('sanctions_intl_country_summary', { p_iso3: iso3 })
    .then((r) => r)
    .catch((e) => ({ error: e }));
  if (!rpc.error && Array.isArray(rpc.data)) {
    for (const r of rpc.data) {
      out[r.list_source] = {
        listings: Number(r.listings) || 0,
        entities: Number(r.entities) || 0,
        individuals: Number(r.individuals) || 0,
        recent: Number(r.recent) || 0,
        topRegimes: Array.isArray(r.top_regimes) ? r.top_regimes : [],
      };
    }
    return out;
  }
  /* Fallback before the SQL function exists: exact counts per list, no regimes. */
  const since = new Date(Date.now() - RECENT_DAYS * 864e5).toISOString().slice(0, 10);
  await Promise.all(
    INTL_LISTS.map(async (l) => {
      const base = () =>
        admin
          .from('sanctions_intl_entries')
          .select('source_id', { count: 'exact', head: true })
          .eq('list_source', l)
          .is('removed_on', null)
          .contains('countries', [iso3]);
      const [all, recent] = await Promise.all([
        base()
          .then((r) => r.count ?? 0)
          .catch(() => 0),
        base()
          .gte('listed_on', since)
          .then((r) => r.count ?? 0)
          .catch(() => 0),
      ]);
      if (all)
        out[l] = { listings: all, entities: null, individuals: null, recent, topRegimes: [] };
    }),
  );
  return out;
}

/* Jurisdictions checked when the counts function is missing (largest programmes). */
const FALLBACK_COUNTRIES = [
  'RUS',
  'IRN',
  'PRK',
  'SYR',
  'BLR',
  'IRQ',
  'LBY',
  'AFG',
  'MMR',
  'VEN',
  'CUB',
  'YEM',
  'SOM',
  'SDN',
  'SSD',
  'COD',
  'CAF',
  'MLI',
  'LBN',
  'NIC',
  'UKR',
  'CHN',
  'PAK',
  'ARE',
  'TUR',
  'HKG',
];

/** Active listings by country for one list (or the three combined), most first. */
export async function intlCountryCounts(admin, list = null) {
  const rpc = await admin
    .rpc('sanctions_intl_country_counts', { p_list: list })
    .then((r) => r)
    .catch((e) => ({ error: e }));
  if (!rpc.error && Array.isArray(rpc.data)) {
    return {
      rows: rpc.data.map((r) => ({ country: r.country, listings: Number(r.listings) || 0 })),
      checked: null,
    };
  }
  const lists = list ? [list] : INTL_LISTS;
  const rows = await Promise.all(
    FALLBACK_COUNTRIES.map(async (c) => {
      let n = 0;
      for (const l of lists) {
        // eslint-disable-next-line no-await-in-loop
        const r = await Promise.resolve(
          admin
            .from('sanctions_intl_entries')
            .select('source_id', { count: 'exact', head: true })
            .eq('list_source', l)
            .is('removed_on', null)
            .contains('countries', [c]),
        ).catch(() => ({ count: 0 }));
        n += r.count ?? 0;
      }
      return { country: c, listings: n };
    }),
  );
  return {
    rows: rows
      .filter((r) => r.listings > 0)
      .sort((a, b) => b.listings - a.listings || a.country.localeCompare(b.country)),
    checked: FALLBACK_COUNTRIES.length,
  };
}

/**
 * Everything the international lists add to one sanctions question, as evidence items:
 * an entity match, a country summary, or country counts. `countries` are ISO3.
 */
export async function intlSanctionsEvidence(
  admin,
  { query = '', countries = [], names = [], searchOfac = null } = {},
) {
  const items = [];
  const asked = listsNamed(query);
  const askedLists = asked.length
    ? [...new Set(['ofac', ...asked])].filter((l) => ALL_LISTS.includes(l))
    : ALL_LISTS;
  const entity = names[0] || sanctionsEntityName(query);
  const jobs = [];
  if (entity) {
    jobs.push(
      intlEntityMatch(admin, entity, { searchOfac }).then((found) =>
        items.push(entityItem(entity, found, { asked: asked.length ? askedLists : ALL_LISTS })),
      ),
    );
  }
  if (isComparativeSanctions(query)) {
    const list = asked.filter((l) => INTL_LISTS.includes(l));
    jobs.push(
      intlCountryCounts(admin, list.length === 1 ? list[0] : null).then(({ rows, checked }) => {
        const it = countsItem(list.length === 1 ? list[0] : null, rows, { checked });
        if (it) items.push(it);
      }),
    );
  } else if (!entity) {
    for (const iso3 of countries.slice(0, 2)) {
      jobs.push(
        intlCountrySummary(admin, iso3).then((s) => {
          const it = countryItem(iso3, s);
          if (it) items.push(it);
        }),
      );
    }
  }
  await Promise.all(jobs.map((j) => j.catch(() => null)));
  return items;
}
