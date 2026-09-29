/**
 * Vendors a trimmed copy of the public-domain unitedstates/congress-legislators
 * "current" dataset into src/lib/politicians/legislators-current.json.
 * Run manually when membership changes: node scripts/vendor-legislators.mjs
 * LEGISLATORS_SRC overrides the source URL (the same file is mirrored on the
 * repo's gh-pages branch at raw.githubusercontent.com).
 */
import { writeFileSync } from 'node:fs';

const SRC =
  process.env.LEGISLATORS_SRC ||
  'https://unitedstates.github.io/congress-legislators/legislators-current.json';
const res = await fetch(SRC);
if (!res.ok) throw new Error(`legislators fetch failed: HTTP ${res.status}`);
const all = await res.json();

const out = all.map((p) => {
  const t = p.terms[p.terms.length - 1];
  return {
    bioguide: p.id.bioguide,
    first: p.name.first,
    last: p.name.last,
    nick: p.name.nickname || null,
    full: p.name.official_full || `${p.name.first} ${p.name.last}`,
    party: t.party ? t.party[0] : null,
    chamber: t.type === 'sen' ? 'Senate' : 'House',
    state: t.state,
    district: t.district ?? null,
    fecIds: p.id.fec || [],
  };
});

writeFileSync('src/lib/politicians/legislators-current.json', `${JSON.stringify(out)}\n`);
console.log(`vendored ${out.length} legislators`);
