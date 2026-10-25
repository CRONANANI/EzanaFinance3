/**
 * Inter-university competition standings (QA ORG-15).
 *
 * The org-fund-snapshot cron calls refreshCompetitionStandings after it has
 * computed every org's fund value, so competition_org_entries.current_value,
 * return_pct and rank stay live for OPEN competitions (competitions.status =
 * 'active', is_inter_org) instead of freezing at entry time.
 *
 * Return basis: the org's fund value now vs its fund value at the start of
 * its participation (the latest org_fund_snapshots row on or before
 * max(competition.starts_at, entry.created_at); else the earliest one after).
 * No baseline snapshot -> return_pct null and no rank (never invented).
 */

const r4 = (n) => Math.round(n * 1e4) / 1e4;

/**
 * Pure: compute value / return / rank for one competition's entries.
 * @param {Array<{id: string, org_id: string}>} entries active entries of ONE competition
 * @param {Map<string, number>} valueByOrg current fund value per org
 * @param {Map<string, number>} baselineByEntry starting fund value per entry id
 * @returns {Array<{id: string, current_value: number|null, return_pct: number|null, rank: number|null}>}
 */
export function computeStandings(entries, valueByOrg, baselineByEntry) {
  const rows = (entries || []).map((e) => {
    const v = valueByOrg.get(e.org_id);
    const current = Number.isFinite(v) ? v : null;
    const base = baselineByEntry.get(e.id);
    const ret =
      current != null && Number.isFinite(base) && base > 0
        ? r4(((current - base) / base) * 100)
        : null;
    return { id: e.id, current_value: current, return_pct: ret, rank: null };
  });
  const ranked = rows
    .filter((r) => r.return_pct != null)
    .sort((a, b) => b.return_pct - a.return_pct || a.id.localeCompare(b.id));
  // Competition ranking: ties share a rank ("1, 1, 3").
  ranked.forEach((r, i) => {
    const prev = ranked[i - 1];
    r.rank = prev && prev.return_pct === r.return_pct ? prev.rank : i + 1;
  });
  return rows;
}

async function baselineValue(admin, orgId, sinceIso) {
  const day = String(sinceIso || '').slice(0, 10);
  if (!day) return null;
  const { data: before } = await admin
    .from('org_fund_snapshots')
    .select('total_value')
    .eq('org_id', orgId)
    .lte('snapshot_date', day)
    .order('snapshot_date', { ascending: false })
    .limit(1);
  if (before?.[0]) return Number(before[0].total_value);
  const { data: after } = await admin
    .from('org_fund_snapshots')
    .select('total_value')
    .eq('org_id', orgId)
    .gte('snapshot_date', day)
    .order('snapshot_date', { ascending: true })
    .limit(1);
  return after?.[0] ? Number(after[0].total_value) : null;
}

/**
 * Refresh standings for every open inter-org competition. Service-role client
 * (cron only). Returns counts plus per-entry failures; never throws.
 *
 * @param admin service-role Supabase client
 * @param {Map<string, number>} valueByOrg fund value per org computed by the cron
 */
export async function refreshCompetitionStandings(admin, valueByOrg) {
  const out = { competitions: 0, entries: 0, failures: [] };
  const { data: comps, error } = await admin
    .from('competitions')
    .select('id, starts_at')
    .eq('is_inter_org', true)
    .eq('status', 'active');
  if (error) {
    out.failures.push({ error: `read competitions: ${error.message}` });
    return out;
  }

  for (const comp of comps || []) {
    const { data: entries, error: eErr } = await admin
      .from('competition_org_entries')
      .select('id, org_id, created_at')
      .eq('competition_id', comp.id)
      .eq('status', 'active');
    if (eErr) {
      out.failures.push({ competitionId: comp.id, error: eErr.message });
      continue;
    }
    if (!entries?.length) continue;
    out.competitions += 1;

    const baselineByEntry = new Map();
    for (const e of entries) {
      const since =
        Date.parse(e.created_at || 0) > Date.parse(comp.starts_at || 0)
          ? e.created_at
          : comp.starts_at;
      const base = await baselineValue(admin, e.org_id, since);
      if (Number.isFinite(base)) baselineByEntry.set(e.id, base);
    }

    for (const row of computeStandings(entries, valueByOrg, baselineByEntry)) {
      const { id, ...patch } = row;
      const { error: uErr } = await admin
        .from('competition_org_entries')
        .update(patch)
        .eq('id', id);
      if (uErr) out.failures.push({ entryId: id, error: uErr.message });
      else out.entries += 1;
    }
  }
  return out;
}
