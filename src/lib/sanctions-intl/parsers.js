/**
 * Parsers for the three non-US consolidated sanctions lists. Each returns rows shaped for
 * public.sanctions_intl_entries:
 *   { list_source, source_id, name, entry_type, regimes[], countries[], aliases[], listed_on }
 * Pure functions (text in, rows out) so scripts/check-global-data-sync.mjs can test them.
 *
 * EU  Financial Sanctions Files (FSF) XML 1.1, European Commission. Public token in the URL.
 *     <export><sanctionEntity logicalId euReferenceNumber> <regulation programme publicationDate/>
 *     <subjectType code="person|enterprise"/> <nameAlias wholeName strong/> <citizenship
 *     countryIso2Code/> <address countryIso2Code/></sanctionEntity>
 * UN  Security Council Consolidated List XML. <INDIVIDUALS><INDIVIDUAL> and <ENTITIES><ENTITY>
 *     with DATAID, FIRST_NAME..FOURTH_NAME, UN_LIST_TYPE, REFERENCE_NUMBER, LISTED_ON,
 *     NATIONALITY/VALUE, *_ALIAS/ALIAS_NAME, *_ADDRESS/COUNTRY.
 * UK  FCDO UK Sanctions List CSV (replaced the OFSI Consolidated List on 28 Jan 2026). One row
 *     per name; rows sharing a Unique ID are one designation. A title line may precede the
 *     header row, and column names are matched loosely: confirm them against a live download
 *     (see the prompt) and adjust UK_COLS if FCDO renames a column.
 */
import Papa from 'papaparse';
import { XMLParser } from 'fast-xml-parser';
import { toIso3, nameToIso3 } from '../macro-sync/formats.js';

const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const txt = (v) => {
  if (v == null) return '';
  if (typeof v === 'object') return String(v['#text'] ?? '').trim();
  return String(v).trim();
};
const uniq = (xs) => [...new Set(xs.filter(Boolean))];
const isoDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '').trim());
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(s || '').trim());
  return d ? `${d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}` : null;
};
const countryOf = (v) => {
  const s = String(v || '').trim();
  if (!s) return null;
  return /^[A-Z]{2,3}$/.test(s) ? toIso3(s) : nameToIso3(s);
};

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  trimValues: true,
});

/* ------------------------------------------------------------------ EU */

export function parseEuXml(text) {
  const doc = xml.parse(text);
  const root = doc.export || doc;
  return arr(root.sanctionEntity)
    .map((e) => {
      const names = arr(e.nameAlias)
        .map((n) => String(n['@_wholeName'] || '').trim())
        .filter(Boolean);
      const strong = arr(e.nameAlias).find((n) => n['@_strong'] === 'true' && n['@_wholeName']);
      const name = String(strong?.['@_wholeName'] || names[0] || '').trim();
      const id = String(e['@_logicalId'] || e['@_euReferenceNumber'] || '').trim();
      if (!id || !name) return null;
      const code = String(arr(e.subjectType)[0]?.['@_code'] || '').toLowerCase();
      const regs = arr(e.regulation);
      const dates = regs
        .map((r) => isoDate(r['@_publicationDate'] || r['@_entryIntoForceDate']))
        .filter(Boolean)
        .sort();
      return {
        list_source: 'eu',
        source_id: id,
        name,
        entry_type:
          code === 'person' ? 'individual' : code === 'enterprise' ? 'entity' : code || 'entity',
        regimes: uniq(regs.map((r) => String(r['@_programme'] || '').trim())),
        countries: uniq(
          [...arr(e.citizenship), ...arr(e.address), ...arr(e.birthdate)].map((c) =>
            countryOf(c['@_countryIso2Code'] || c['@_countryDescription']),
          ),
        ),
        aliases: uniq(names.filter((n) => n !== name)).slice(0, 40),
        listed_on: dates[0] || null,
      };
    })
    .filter(Boolean);
}

/* ------------------------------------------------------------------ UN */

export function parseUnXml(text) {
  const doc = xml.parse(text);
  const root = doc.CONSOLIDATED_LIST || doc;
  const people = arr(root.INDIVIDUALS?.INDIVIDUAL).map((e) => ({
    e,
    type: 'individual',
    alias: 'INDIVIDUAL_ALIAS',
    addr: 'INDIVIDUAL_ADDRESS',
  }));
  const ents = arr(root.ENTITIES?.ENTITY).map((e) => ({
    e,
    type: 'entity',
    alias: 'ENTITY_ALIAS',
    addr: 'ENTITY_ADDRESS',
  }));
  return [...people, ...ents]
    .map(({ e, type, alias, addr }) => {
      const id = txt(e.DATAID) || txt(e.REFERENCE_NUMBER);
      const name = ['FIRST_NAME', 'SECOND_NAME', 'THIRD_NAME', 'FOURTH_NAME']
        .map((k) => txt(e[k]))
        .filter(Boolean)
        .join(' ');
      if (!id || !name) return null;
      const nationalities = arr(e.NATIONALITY)
        .flatMap((n) => arr(n?.VALUE))
        .map(txt);
      const addrCountries = arr(e[addr]).map((a) => txt(a?.COUNTRY));
      return {
        list_source: 'un',
        source_id: id,
        name,
        entry_type: type,
        regimes: uniq([txt(e.UN_LIST_TYPE)]),
        countries: uniq([...nationalities, ...addrCountries].map(countryOf)),
        aliases: uniq(arr(e[alias]).map((a) => txt(a?.ALIAS_NAME)))
          .filter((a) => a !== name)
          .slice(0, 40),
        listed_on: isoDate(txt(e.LISTED_ON)),
      };
    })
    .filter(Boolean);
}

/* ------------------------------------------------------------------ UK (FCDO) */

export const UK_COLS = {
  id: /^unique id$/i,
  nameType: /^name type$/i,
  fullName: /^name 6$|^full name$|^name$/i,
  nameParts: /^name [1-5]$/i,
  type: /designation type|^type$|entity type|^individual, entity, ship$/i,
  regime: /regime/i,
  date: /date designated/i,
  nationality: /nationalit/i,
  addressCountry: /address country|^country$/i,
};

export function parseUkCsv(text) {
  const all = Papa.parse(String(text).replace(/^﻿/, ''), { skipEmptyLines: true }).data;
  const h = all.findIndex((r) => r.some((c) => UK_COLS.id.test(String(c).trim())));
  if (h < 0)
    throw new Error('UK list: "Unique ID" header not found; check UK_COLS against the live CSV');
  const header = all[h].map((c) => String(c).trim());
  const col = (re) => header.findIndex((c) => re.test(c));
  const cols = (re) => header.map((c, i) => (re.test(c) ? i : -1)).filter((i) => i >= 0);
  const ix = {
    id: col(UK_COLS.id),
    nameType: col(UK_COLS.nameType),
    fullName: col(UK_COLS.fullName),
    parts: cols(UK_COLS.nameParts),
    type: col(UK_COLS.type),
    regime: col(UK_COLS.regime),
    date: col(UK_COLS.date),
    nationality: col(UK_COLS.nationality),
    addressCountry: col(UK_COLS.addressCountry),
  };
  const byId = new Map();
  for (const r of all.slice(h + 1)) {
    const id = String(r[ix.id] || '').trim();
    if (!id) continue;
    const full = ix.fullName >= 0 ? String(r[ix.fullName] || '').trim() : '';
    const name =
      full ||
      ix.parts
        .map((i) => String(r[i] || '').trim())
        .filter(Boolean)
        .join(' ');
    if (!name) continue;
    const cur = byId.get(id) || {
      list_source: 'uk',
      source_id: id,
      name: null,
      entry_type: 'entity',
      regimes: [],
      countries: [],
      aliases: [],
      listed_on: null,
    };
    const primary = ix.nameType < 0 || /primary/i.test(String(r[ix.nameType] || ''));
    if (primary && !cur.name) cur.name = name;
    else cur.aliases.push(name);
    const t = String(r[ix.type] || '').toLowerCase();
    if (t)
      cur.entry_type = t.includes('individual')
        ? 'individual'
        : t.includes('ship')
          ? 'vessel'
          : 'entity';
    if (ix.regime >= 0) cur.regimes.push(String(r[ix.regime] || '').trim());
    if (ix.date >= 0 && !cur.listed_on) cur.listed_on = isoDate(r[ix.date]);
    for (const i of [ix.nationality, ix.addressCountry]) {
      if (i < 0) continue;
      for (const c of String(r[i] || '').split(/[;,|]|\(\d+\)/))
        cur.countries.push(countryOf(c.replace(/^\s*\d+\.\s*/, '')));
    }
    byId.set(id, cur);
  }
  return [...byId.values()].map((e) => {
    const name = e.name || e.aliases[0];
    return {
      ...e,
      name,
      regimes: uniq(e.regimes),
      countries: uniq(e.countries),
      aliases: uniq(e.aliases)
        .filter((a) => a !== name)
        .slice(0, 40),
    };
  });
}
