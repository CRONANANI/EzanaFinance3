/**
 * Sonar exemplary briefs (Nov 2026): hand-reviewed answers in the evidence-led
 * response format, served for the exact question they answer and stored so
 * retrieval can find them again.
 *
 * Two stores, one shape:
 *   - EXEMPLARY_BRIEFS, in this repo: the source of truth, reviewed in a diff.
 *   - public.sonar_exemplary_briefs: the same briefs with a gte-small
 *     embedding of the question and its variants, filled by
 *     /api/cron/index-sonar-exemplary. It ships in a hand-applied migration,
 *     so its absence is an expected state and never an error.
 *
 * A brief is withdrawn automatically once its event or review date passes (freshness.js);
 * the ping then runs as adaptive or standard research.
 *
 * findExemplaryBrief() serves on the lexical match alone (match.js). Only a
 * borderline ping, one that already names the brief's person and event, is
 * settled with an embedding comparison against the table, so an ordinary ping
 * never pays for an embedding call here.
 *
 * Not to be confused with exemplars.js / exemplar-seeds.js: those are
 * placeholder-only few-shot examples that teach the v2 composer structure.
 * An exemplary brief is a real, dated, sourced answer.
 */
import { NVIDIA_CEO_TRANSITION_2026 } from './briefs/nvidia-ceo-transition-2026';
import { bestBrief } from './match';
import { briefFreshness } from './freshness';

export const EXEMPLARY_BRIEFS = [NVIDIA_CEO_TRANSITION_2026];

/* Cosine similarity at which a borderline ping is treated as the same question. */
const SEMANTIC_SERVE_AT = 0.9;
const SEMANTIC_BUDGET_MS = 2500;

const INTERNAL = new Set(['variants', 'concepts', 'reviewAfter', 'expiresAt', 'expiryReason']);

/** The brief as the page receives it: matcher internals left out. */
export function publicBrief(brief) {
  return Object.fromEntries(Object.entries(brief).filter(([k]) => !INTERNAL.has(k)));
}

/** What is embedded for a brief: the question and every listed variant. */
export function embeddingText(brief) {
  return [brief.question, ...(brief.variants || [])].join('\n');
}

/**
 * The exemplary brief for a ping, or null.
 *
 * @param {string} query
 * @param {object} [deps]
 * @param {(text: string) => Promise<number[]|null>} [deps.embed] embedViaSupabase
 * @param {() => object} [deps.getAdmin] returns the service-role client; called only for
 *        the borderline check, so a lexical match never depends on the database
 * @param {number|Date} [deps.now] clock, for tests
 * @param {(info: object) => void} [deps.onStale] told when a matching brief was withdrawn
 * @returns {Promise<null | { brief: object, via: 'lexical'|'semantic', score: number }>}
 */
export async function findExemplaryBrief(
  query,
  { embed = null, getAdmin = null, now = Date.now(), onStale = null } = {},
) {
  const hit = bestBrief(query, EXEMPLARY_BRIEFS);
  if (!hit) return null;
  /* A withdrawn brief is not served by either path; the ping runs as live research. */
  const freshness = briefFreshness(hit.brief, { now });
  if (!freshness.fresh) {
    onStale?.({ slug: hit.brief.slug, reason: freshness.reason, expiresAt: freshness.expiresAt });
    return null;
  }
  if (hit.tier === 'serve') return { brief: hit.brief, via: 'lexical', score: hit.score };
  if (!embed || !getAdmin) return null;
  try {
    const admin = getAdmin();
    const semantic = await Promise.race([
      (async () => {
        const vector = await embed(query);
        if (!vector) return null;
        const { data, error } = await admin.rpc('match_sonar_exemplary_briefs', {
          query_embedding: vector,
          match_threshold: SEMANTIC_SERVE_AT,
          match_count: 1,
        });
        if (error || !data?.length) return null;
        return data[0];
      })(),
      new Promise((resolve) => setTimeout(() => resolve(null), SEMANTIC_BUDGET_MS)),
    ]);
    /* The table can only confirm the brief the concept gate already chose. */
    if (semantic && semantic.slug === hit.brief.slug) {
      return { brief: hit.brief, via: 'semantic', score: Number(semantic.similarity) || 0 };
    }
  } catch {
    /* table or function absent, or the embed call failed: not this brief */
  }
  return null;
}
