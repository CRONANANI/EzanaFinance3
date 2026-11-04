/**
 * LDA filing -> lobbying_filings row, and the quality-gated loader. Shared by
 * the quarterly ingest (/api/cron/ingest-lobbying) and the topic ingest
 * (/api/cron/ingest-lobbying-topics) so both write identical rows.
 * SERVER ONLY.
 */
import { normalizeFiling, filingSpecificIssues } from '@/lib/lobbying/normalize';
import { normalizeQuarter } from '@/lib/lobbying/period';
import { validateBatch } from '@/lib/lobbying/quality';
import { bucketsForFiling, issueBucket } from '@/lib/lobbying/entities';

/** Normalized LDA filing → lobbying_filings row (incl. the quarter column). */
export function mapFilingRow(f) {
  const n = normalizeFiling(f);
  return {
    uuid: n.uuid,
    filing_year: n.year,
    filing_period: n.period,
    quarter: normalizeQuarter(n.period),
    dt_posted: n.posted,
    amount: n.amount,
    filing_type: n.type,
    filing_type_code: n.typeCode,
    // strict boolean, never null — a null here would be excluded by the
    // top-spenders `is_registration = false` predicate even for real reports
    is_registration: n.isRegistration === true,
    registrant_name: n.registrant,
    registrant_id: n.registrantId,
    client_name: n.client,
    client_id: n.clientId,
    client_description: n.clientDescription,
    issues: n.issues,
    entities: n.entities,
    entity_buckets: bucketsForFiling(n.entities),
    issue_buckets: [...new Set((n.issues || []).map((it) => issueBucket(it.display || it.code)))],
    /* Nov 2026: the activities' free text, for Sonar topic search
       (lobbying_filings.specific_issues, specific_tsv). */
    specific_issues: filingSpecificIssues(f),
    lobbyists: n.lobbyists,
    lobbyist_count: n.lobbyistCount,
    document_url: n.url,
    synced_at: new Date().toISOString(),
  };
}

/**
 * Data-quality gate before load: validate/repair the batch, then upsert only the
 * good rows. A structurally-broken batch is rejected (skip the load) so a
 * truncated/garbage pull never overwrites the previous good cache.
 * @returns {{ ok:boolean, loaded:number, reason:string|null, flags:object }}
 */
export async function loadFilings(admin, mappedRows) {
  const v = validateBatch(mappedRows);
  if (!v.ok) return { ok: false, loaded: 0, reason: v.reason, flags: v.flags };
  if (!v.load.length) return { ok: true, loaded: 0, reason: null, flags: v.flags };
  const { error } = await admin.from('lobbying_filings').upsert(v.load, { onConflict: 'uuid' });
  if (error) return { ok: false, loaded: 0, reason: error.message, flags: v.flags };
  return { ok: true, loaded: v.load.length, reason: null, flags: v.flags };
}
