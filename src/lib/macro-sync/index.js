import { bcb } from './sources/bcb.js';
import { bis } from './sources/bis.js';
import { cepal } from './sources/cepal.js';
import { afdb } from './sources/afdb.js';
import { imf } from './sources/imf.js';
import { worldbankExt } from './sources/worldbank-ext.js';
import { ilostat, oecdTiva } from './sources/ilo-oecd.js';
import { gpr, epu, wui, pinksheet } from './sources/risk-indices.js';
import { gdelt, ucdp } from './sources/events.js';
import { eia, ember, jodiOil, jodiGas, fewsnet, faostat } from './sources/energy-food.js';
import { eurostat, ecb, ons, boe, insee, istat } from './sources/europe.js';
import { ibge, bcra, argSeries, bcrp, banrep } from './sources/latam.js';
import { sarb, cbn, boj, singstat, mospi } from './sources/africa-asia.js';
import { cbrt } from './sources/evds.js';

/* These four keep their own cron routes (/api/cron/macro-{bcb,bis,cepal,afdb}); the hourly
   rotator (/api/cron/macro-sync) runs everything else. */
export const DEDICATED_CRON = new Set(['bcb', 'bis', 'cepal', 'afdb']);

const ALL = [
  bcb,
  bis,
  cepal,
  afdb,
  // Global
  imf,
  worldbankExt,
  ilostat,
  oecdTiva,
  // Risk and uncertainty indices
  gpr,
  epu,
  wui,
  pinksheet,
  // Events and conflict
  gdelt,
  ucdp,
  // Energy and food
  eia,
  ember,
  jodiOil,
  jodiGas,
  fewsnet,
  faostat,
  // Europe
  eurostat,
  ecb,
  ons,
  boe,
  insee,
  istat,
  // Turkey (optional: needs EVDS_API_KEY)
  cbrt,
  // Latin America
  ibge,
  bcra,
  argSeries,
  bcrp,
  banrep,
  // Africa and Asia
  sarb,
  cbn,
  boj,
  singstat,
  mospi,
];

/** source id -> adapter. Keys are the adapter's `source` string (e.g. 'worldbank-ext'). */
export const ADAPTERS = Object.fromEntries(
  ALL.map((a) => [a.source, DEDICATED_CRON.has(a.source) ? { ...a, dedicatedCron: true } : a]),
);

export { runSync } from './engine.js';
export { runDue, adapterStatus } from './rotate.js';
