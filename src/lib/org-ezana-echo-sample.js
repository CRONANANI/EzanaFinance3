/**
 * Sample content for the council band of Ezana Echo (/ezana-echo).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/ezana-echo/sample, so the band can be presented from a council
 * with little activity. Real councils never receive it, the page labels it
 * "Sample content" while it shows, and nothing done to it is saved (the band
 * has no write actions; its links open real Echo stories and the council's
 * own pages).
 *
 * It is the same sample council every rebuilt Team Hub page shows, assembled
 * from those bundles rather than typed in again (the book, teams, coverage
 * and member directory come from the US Equities sample, which the page
 * loads through the same fund loader):
 *   - the published documents and member directory from the Research
 *     Library sample,
 *   - the pitches from the Pitch Pipeline sample (so a pitch row lands on
 *     the same sample pitch there).
 * The Echo stories themselves are always the real published stories. Every
 * name is invented.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildResearchLibrarySample } from './org-research-library-sample.js';
import { buildPitchPipelineSample } from './org-pitch-pipeline-sample.js';

/**
 * @param {{ userId: string, memberId?: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, now?: number }} viewer
 */
export function buildEzanaEchoSample({
  userId,
  memberId,
  role,
  displayName,
  title,
  subRole,
  now = Date.now(),
}) {
  const library = buildResearchLibrarySample({
    userId,
    memberId,
    role,
    displayName,
    subRole,
    now,
  });
  const pipeline = buildPitchPipelineSample({
    userId,
    memberId,
    role,
    displayName,
    title,
    subRole,
    now,
  }).raw;

  /* One directory: the library's (it includes the alumni who wrote older
     work), plus anyone only the pipeline names. */
  const members = library.members.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    display_name: m.display_name,
    is_demo: true,
  }));
  const seen = new Set(members.map((m) => m.id));
  for (const m of pipeline.members || []) {
    if (seen.has(m.id)) continue;
    members.push({ id: m.id, user_id: m.user_id, display_name: m.display_name, is_demo: true });
    seen.add(m.id);
  }

  return {
    is_demo: true,
    now,
    viewer: { role, userId },
    members,
    /* Published documents only, as the live route reads. */
    notes: library.notes
      .filter((n) => n.status === 'published')
      .map((n) => ({
        id: n.id,
        title: n.title,
        doc_type: n.doc_type,
        status: n.status,
        ticker: n.ticker || null,
        sector: n.sector || null,
        author_id: n.author_id,
        is_exemplar: Boolean(n.is_exemplar),
        pinned: Boolean(n.pinned),
        created_at: n.created_at,
        published_at: n.published_at || null,
        is_demo: true,
      })),
    pitches: pipeline.pitches
      .filter((p) => !p.archived_at)
      .map((p) => ({
        id: p.id,
        ticker: p.ticker,
        company_name: p.company_name,
        stage: p.stage,
        status: p.status,
        decision: p.decision,
        analyst_member_id: p.analyst_member_id,
        created_at: p.created_at,
        archived_at: null,
        is_demo: true,
      })),
  };
}
