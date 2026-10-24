/**
 * Every dataset route: the page.js files under src/app/datasets. Dynamic
 * segments are filled from SAMPLE (or skipped when there is no sample).
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const BASE = join(ROOT, 'src/app/datasets');
const SAMPLE = {
  '[hub]': 'capitol',
  '[slug]': null, // contractor dossiers: no stable public slug to sample
};

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (e === 'page.js' || e === 'page.jsx') acc.push(full);
  }
  return acc;
}

export function datasetRoutes() {
  const out = [];
  for (const f of walk(BASE)) {
    const segs = relative(join(ROOT, 'src/app'), f).split(sep).slice(0, -1);
    let skip = null;
    const path = segs
      .filter((s) => !/^\(.*\)$/.test(s))
      .map((s) => {
        if (!s.startsWith('[')) return s;
        if (SAMPLE[s] == null) skip = `no sample for ${s}`;
        return SAMPLE[s] || s;
      })
      .join('/');
    out.push({ route: `/${path}`, file: relative(ROOT, f), skip });
  }
  return out.sort((a, b) => a.route.localeCompare(b.route));
}
