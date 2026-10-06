/**
 * Congressional committees and assignments: SERVER ONLY.
 *
 * Source: the public-domain unitedstates/congress-legislators project, the
 * same project the vendored legislators-current.json comes from, so members
 * join on the same bioguide IDs. JSON from the project site first; the YAML on
 * the main branch is the fallback (same content, published on every commit).
 *
 * Shapes (confirmed against the files, Oct 2026):
 *   committees: [{ type: 'house'|'senate'|'joint', name, url, thomas_id,
 *                  jurisdiction?, subcommittees?: [{ name, thomas_id }] }]
 *     A subcommittee's full ID is the parent's plus its own (HSAS + 28).
 *   membership: { [thomasId]: [{ name, party: 'majority'|'minority', rank,
 *                                title?, bioguide }] }
 *
 * Everything except fetchCommitteeSources is pure.
 */
import yaml from 'js-yaml';

const SITE = 'https://unitedstates.github.io/congress-legislators';
const RAW = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/main';
const TIMEOUT_MS = 20000;

async function fetchText(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOne(name) {
  try {
    return { data: JSON.parse(await fetchText(`${SITE}/${name}.json`)), via: 'json' };
  } catch {
    return { data: yaml.load(await fetchText(`${RAW}/${name}.yaml`)), via: 'yaml' };
  }
}

/** Fetch both source files. Throws when either cannot be read. */
export async function fetchCommitteeSources() {
  const [committees, membership] = await Promise.all([
    fetchOne('committees-current'),
    fetchOne('committee-membership-current'),
  ]);
  return {
    committees: Array.isArray(committees.data) ? committees.data : [],
    membership:
      membership.data && typeof membership.data === 'object' && !Array.isArray(membership.data)
        ? membership.data
        : {},
    via: { committees: committees.via, membership: membership.via },
  };
}

const CHAMBERS = new Set(['house', 'senate', 'joint']);
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim().replace(/\s+/g, ' ') : null);

/** Committees list -> congress_committees rows, parents first then subcommittees. */
export function toCommitteeRows(committees = []) {
  const parents = [];
  const subs = [];
  for (const c of Array.isArray(committees) ? committees : []) {
    const id = str(c?.thomas_id);
    const chamber = String(c?.type || '').toLowerCase();
    const name = str(c?.name);
    if (!id || !name || !CHAMBERS.has(chamber)) continue;
    parents.push({
      thomas_id: id,
      parent_thomas_id: null,
      chamber,
      name: name.slice(0, 300),
      url: str(c.url),
      jurisdiction: str(c.jurisdiction),
      is_subcommittee: false,
    });
    for (const s of Array.isArray(c.subcommittees) ? c.subcommittees : []) {
      const sid = str(String(s?.thomas_id ?? ''));
      const sname = str(s?.name);
      if (!sid || !sname) continue;
      subs.push({
        thomas_id: `${id}${sid}`,
        parent_thomas_id: id,
        chamber,
        name: sname.slice(0, 300),
        url: str(s.url),
        jurisdiction: null,
        is_subcommittee: true,
      });
    }
  }
  return { parents, subs };
}

/**
 * Membership object -> congress_committee_members rows. Entries without a
 * bioguide ID are dropped; a repeated person on one committee keeps the first.
 */
export function toMemberRows(membership = {}) {
  const out = [];
  const seen = new Set();
  for (const [committeeId, list] of Object.entries(membership || {})) {
    for (const m of Array.isArray(list) ? list : []) {
      const bioguide = str(m?.bioguide);
      if (!bioguide) continue;
      const key = `${committeeId}|${bioguide}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const rank = Number(m.rank);
      out.push({
        committee_thomas_id: committeeId,
        bioguide_id: bioguide,
        member_name: str(m.name),
        side: m.party === 'majority' || m.party === 'minority' ? m.party : null,
        rank: Number.isInteger(rank) && rank > 0 ? rank : null,
        title: str(m.title),
      });
    }
  }
  return out;
}

/* Chair and ranking-member titles as the source spells them. */
const CHAIR_RE = /^(chair|chairman|chairwoman|cochairman|co-chair)$/i;
const RANKING_RE = /^ranking member$/i;

/**
 * Leaders of one committee from its member rows: the titled chair and ranking
 * member, else rank 1 on the majority and minority side.
 */
export function committeeLeaders(rows = []) {
  const chair =
    rows.find((r) => CHAIR_RE.test(r.title || '')) ||
    rows.find((r) => r.side === 'majority' && r.rank === 1) ||
    null;
  const ranking =
    rows.find((r) => RANKING_RE.test(r.title || '')) ||
    rows.find((r) => r.side === 'minority' && r.rank === 1) ||
    null;
  return { chair, ranking };
}
