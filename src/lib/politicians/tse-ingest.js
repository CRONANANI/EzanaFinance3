/**
 * Brazil: one general election's officeholder asset declarations from the
 * Superior Electoral Court (TSE) open data into br_candidates and
 * br_candidate_assets. SERVER ONLY. Shared by the cron route
 * (/api/cron/ingest-tse-assets) and the CLI (scripts/ingest-tse-assets.mjs).
 *
 * The same CDN files the electionsBR R package reads:
 *   consulta_cand/consulta_cand_<year>.zip   one row per candidate
 *   bem_candidato/bem_candidato_<year>.zip   one row per declared asset
 * Latin-1, semicolon-separated CSVs, a national file (…_BRASIL.csv) in recent
 * years, else one per state. Only the files needed are decompressed, and rows
 * are filtered as they are parsed, so a serverless function never holds every
 * row of the national asset file at once.
 *
 * Kept: elected President, Governors, Senators and deputies; for an older
 * year also the filings of people elected in a newer year already loaded, so
 * the tracker can show the change. No CPF or birth date is stored: person_key
 * is a SHA-256 of the normalised name and birth date. A year is a full
 * reload: its rows are deleted, then inserted.
 */
import { createHash } from 'node:crypto';
import { unzipSync } from 'fflate';
import Papa from 'papaparse';
import { BR_OFFICES, TSE_CDN, isElected, normName, tseDate, tseNumber, tseText } from './brazil.js';

const CHUNK = 500;
const latin1 = new TextDecoder('latin1');

async function download(base, path, log) {
  const href = `${base}/${path}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120000);
  try {
    const res = await fetch(href, {
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (Ezana data ingest)' },
    });
    if (!res.ok) throw new Error(`${href}: HTTP ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    log(`downloaded ${path} (${(buf.length / 1e6).toFixed(1)} MB)`);
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Walk the rows of a TSE zip, decompressing only what is used: the national
 * file when there is one, else every per-state file (plus …_BR.csv for
 * President). `onRow` sees each row as an object keyed by header; nothing is
 * accumulated here. Returns the file names read and the row count.
 */
function eachCsvRow(zip, onRow) {
  const names = [];
  unzipSync(zip, {
    filter: (f) => {
      if (/\.csv$/i.test(f.name)) names.push(f.name);
      return false; // list only
    },
  });
  const national = names.filter((n) => /_BRASIL\.csv$/i.test(n));
  const pick = national.length ? national : names;
  let rows = 0;
  for (const n of pick) {
    /* One file at a time, so only one decompressed CSV is in memory. */
    const file = unzipSync(zip, { filter: (f) => f.name === n })[n];
    Papa.parse(latin1.decode(file), {
      delimiter: ';',
      header: true,
      skipEmptyLines: true,
      step: ({ data }) => {
        rows += 1;
        onRow(data);
      },
    });
  }
  return { files: pick, rows };
}

const personKey = (name, birth, sq) =>
  createHash('sha256')
    .update(birth ? `${normName(name)}|${birth}` : `${normName(name)}|sq:${sq}`)
    .digest('hex');

async function insertChunks(db, table, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await db.from(table).insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(`${table} insert at ${i}: ${error.message}`);
  }
}

/** person_keys of people elected in any year newer than `year` already loaded. */
async function laterElected(db, year) {
  const keys = new Set();
  if (!db) return keys;
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await db
      .from('br_candidates')
      .select('person_key')
      .gt('ano_eleicao', year)
      .eq('elected', true)
      .order('person_key')
      .range(from, from + 999);
    if (error) throw new Error(`later elected: ${error.message}`);
    for (const r of data || []) keys.add(r.person_key);
    if (!data || data.length < 1000) break;
  }
  return keys;
}

/**
 * Load one year. `db` is a service-role Supabase client (null with dry).
 * `keepPeople` adds person_keys to keep beyond the elected (the CLI passes
 * the ones it just loaded; otherwise they are read from the table).
 * Returns counts and the elected person_keys.
 */
export async function ingestTseYear({
  db,
  year,
  dry = false,
  keepPeople = null,
  base = TSE_CDN,
  log = () => {},
}) {
  const keepers = keepPeople || (await laterElected(db, year));

  /* One row per candidate for the offices kept: the last round (NR_TURNO) wins. */
  const bySq = new Map();
  const cand = eachCsvRow(
    await download(base, `consulta_cand/consulta_cand_${year}.zip`, log),
    (r) => {
      const cargo = normName(r.DS_CARGO);
      if (!BR_OFFICES[cargo]) return;
      const sq = tseText(r.SQ_CANDIDATO);
      if (!sq) return;
      const turno = Number(r.NR_TURNO) || 1;
      const prev = bySq.get(sq);
      if (prev && prev.turno >= turno) return;
      const name = tseText(r.NM_CANDIDATO) || '';
      bySq.set(sq, {
        ano_eleicao: year,
        sq_candidato: sq,
        cd_eleicao: tseText(r.CD_ELEICAO),
        turno,
        person_key: personKey(name, tseDate(r.DT_NASCIMENTO), sq),
        nm_candidato: name,
        nm_urna: tseText(r.NM_URNA_CANDIDATO),
        nr_candidato: tseText(r.NR_CANDIDATO),
        cargo,
        sg_uf: tseText(r.SG_UF) || 'BR',
        nm_ue: tseText(r.NM_UE),
        sg_partido: tseText(r.SG_PARTIDO),
        nm_partido: tseText(r.NM_PARTIDO),
        situacao: tseText(r.DS_SIT_TOT_TURNO),
        elected: isElected(r.DS_SIT_TOT_TURNO),
      });
    },
  );
  log(`candidate files ${cand.files.length}, rows ${cand.rows}`);
  const keep = [...bySq.values()].filter((c) => c.elected || keepers.has(c.person_key));
  bySq.clear();
  const keepSq = new Set(keep.map((c) => c.sq_candidato));
  const elected = keep.filter((c) => c.elected);
  log(`kept ${keep.length} candidates (${elected.length} elected)`);

  const seen = new Set();
  const counters = new Map();
  const assets = [];
  const bens = eachCsvRow(
    await download(base, `bem_candidato/bem_candidato_${year}.zip`, log),
    (r) => {
      const sq = tseText(r.SQ_CANDIDATO);
      if (!sq || !keepSq.has(sq)) return;
      let ordem = Number(tseText(r.NR_ORDEM_BEM_CANDIDATO) ?? tseText(r.NR_ORDEM_CANDIDATO));
      if (!Number.isInteger(ordem) || ordem <= 0) ordem = (counters.get(sq) || 0) + 1;
      counters.set(sq, Math.max(counters.get(sq) || 0, ordem));
      const k = `${sq}|${ordem}`;
      if (seen.has(k)) return; // national and state files can repeat a row
      seen.add(k);
      assets.push({
        ano_eleicao: year,
        sq_candidato: sq,
        nr_ordem: ordem,
        cd_tipo: tseText(r.CD_TIPO_BEM_CANDIDATO),
        ds_tipo: tseText(r.DS_TIPO_BEM_CANDIDATO),
        ds_bem: tseText(r.DS_BEM_CANDIDATO),
        valor: tseNumber(r.VR_BEM_CANDIDATO),
        dt_atualizacao: tseDate(r.DT_ULTIMA_ATUALIZACAO),
      });
    },
  );
  log(`asset files ${bens.files.length}, rows ${bens.rows}`);
  log(`kept ${assets.length} declared assets`);

  let totals = null;
  if (!dry) {
    const { error: delErr } = await db.from('br_candidates').delete().eq('ano_eleicao', year);
    if (delErr) throw new Error(`delete ${year}: ${delErr.message}`);
    await insertChunks(db, 'br_candidates', keep);
    await insertChunks(db, 'br_candidate_assets', assets);
    const { data: n, error } = await db.rpc('br_refresh_totals', { p_year: year });
    if (error) throw new Error(`totals ${year}: ${error.message}`);
    totals = n;
    log(`totals refreshed for ${n} candidates`);
  }

  return {
    year,
    dry,
    candidates: keep.length,
    elected: elected.length,
    assets: assets.length,
    totals,
    electedKeys: elected.map((c) => c.person_key),
  };
}
