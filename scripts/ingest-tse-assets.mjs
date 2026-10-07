/**
 * Brazil: officeholders' declared assets from the Superior Electoral Court
 * (TSE) open data, into br_candidates and br_candidate_assets. The same CDN
 * files the electionsBR R package (personal_finances(), candidate()) reads,
 * done in Node so it runs anywhere the app does.
 *
 *   npm run ingest:tse                          2022 and 2018
 *   npm run ingest:tse -- --years=2022,2018
 *   npm run ingest:tse -- --years=2022 --dry    parse and count, write nothing
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (loaded from
 * .env.local when present). Years run newest first: each year keeps the
 * elected President, Governors, Senators and deputies, and every older year
 * also keeps the filings of people elected in a newer one, so the tracker can
 * show how their declared assets changed. No CPF or birth date is stored;
 * person_key is a SHA-256 of the normalised name and birth date.
 *
 * Each year is a full reload: that year's rows are deleted, then inserted.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { unzipSync } from 'fflate';
import Papa from 'papaparse';
import {
  BR_OFFICES,
  TSE_CDN,
  isElected,
  normName,
  tseDate,
  tseNumber,
  tseText,
} from '../src/lib/politicians/brazil.js';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local' });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const DRY = Boolean(args.dry);
const YEARS = String(args.years || '2022,2018')
  .split(',')
  .map((y) => Number(y.trim()))
  .filter((y) => Number.isInteger(y) && y >= 2006 && y % 2 === 0)
  .sort((a, b) => b - a);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!DRY && (!url || !key)) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const db = DRY
  ? null
  : createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const CHUNK = 500;
/* TSE_CDN_BASE points the script at a mirror (or a local fixture server). */
const BASE = process.env.TSE_CDN_BASE || TSE_CDN;
const latin1 = new TextDecoder('latin1');

async function download(path) {
  const href = `${BASE}/${path}`;
  process.stdout.write(`  downloading ${href} `);
  const res = await fetch(href, { headers: { 'user-agent': 'Mozilla/5.0 (Ezana data ingest)' } });
  if (!res.ok) throw new Error(`${href}: HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  console.log(`${(buf.length / 1e6).toFixed(1)} MB`);
  return buf;
}

/**
 * The CSV rows in a TSE zip. The national file (…_BRASIL.csv) has every
 * state when present; otherwise every per-state file plus the …_BR.csv one
 * (President). Rows are objects keyed by header.
 */
function csvRows(zip) {
  const files = unzipSync(zip, { filter: (f) => /\.csv$/i.test(f.name) });
  const names = Object.keys(files);
  const national = names.filter((n) => /_BRASIL\.csv$/i.test(n));
  const pick = national.length ? national : names;
  const rows = [];
  for (const n of pick) {
    const text = latin1.decode(files[n]);
    const parsed = Papa.parse(text, { delimiter: ';', header: true, skipEmptyLines: true });
    rows.push(...parsed.data);
  }
  return { rows, files: pick };
}

const personKey = (name, birth, sq) =>
  createHash('sha256')
    .update(birth ? `${normName(name)}|${birth}` : `${normName(name)}|sq:${sq}`)
    .digest('hex');

async function insertChunks(table, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await db.from(table).insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(`${table} insert at ${i}: ${error.message}`);
  }
}

async function loadYear(year, keepPeople) {
  console.log(`\n${year}`);
  const cand = csvRows(await download(`consulta_cand/consulta_cand_${year}.zip`));
  console.log(`  candidate files: ${cand.files.length}, rows: ${cand.rows.length}`);

  /* One row per candidate: the last round (NR_TURNO) wins. */
  const bySq = new Map();
  for (const r of cand.rows) {
    const cargo = normName(r.DS_CARGO);
    if (!BR_OFFICES[cargo]) continue;
    const sq = tseText(r.SQ_CANDIDATO);
    if (!sq) continue;
    const turno = Number(r.NR_TURNO) || 1;
    const prev = bySq.get(sq);
    if (prev && prev.turno >= turno) continue;
    const name = tseText(r.NM_CANDIDATO) || '';
    const birth = tseDate(r.DT_NASCIMENTO);
    bySq.set(sq, {
      ano_eleicao: year,
      sq_candidato: sq,
      cd_eleicao: tseText(r.CD_ELEICAO),
      turno,
      person_key: personKey(name, birth, sq),
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
  }
  const keep = [...bySq.values()].filter((c) => c.elected || keepPeople.has(c.person_key));
  const keepSq = new Set(keep.map((c) => c.sq_candidato));
  console.log(`  kept ${keep.length} candidates (${keep.filter((c) => c.elected).length} elected)`);

  const bens = csvRows(await download(`bem_candidato/bem_candidato_${year}.zip`));
  console.log(`  asset files: ${bens.files.length}, rows: ${bens.rows.length}`);
  const seen = new Set();
  const counters = new Map();
  const assets = [];
  for (const r of bens.rows) {
    const sq = tseText(r.SQ_CANDIDATO);
    if (!sq || !keepSq.has(sq)) continue;
    let ordem = Number(tseText(r.NR_ORDEM_BEM_CANDIDATO) ?? tseText(r.NR_ORDEM_CANDIDATO));
    if (!Number.isInteger(ordem) || ordem <= 0) {
      ordem = (counters.get(sq) || 0) + 1;
    }
    counters.set(sq, Math.max(counters.get(sq) || 0, ordem));
    const k = `${sq}|${ordem}`;
    if (seen.has(k)) continue; // national and state files can repeat a row
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
  }
  console.log(`  kept ${assets.length} declared assets`);

  if (!DRY) {
    const { error: delErr } = await db.from('br_candidates').delete().eq('ano_eleicao', year);
    if (delErr) throw new Error(`delete ${year}: ${delErr.message}`);
    await insertChunks('br_candidates', keep);
    await insertChunks('br_candidate_assets', assets);
    const { data: n, error } = await db.rpc('br_refresh_totals', { p_year: year });
    if (error) throw new Error(`totals ${year}: ${error.message}`);
    console.log(`  totals refreshed for ${n} candidates`);
  }
  return keep.filter((c) => c.elected).map((c) => c.person_key);
}

const keepPeople = new Set();
for (const year of YEARS) {
  // eslint-disable-next-line no-await-in-loop
  const elected = await loadYear(year, keepPeople);
  for (const k of elected) keepPeople.add(k);
}
console.log(DRY ? '\nDry run: nothing written.' : '\nDone.');
