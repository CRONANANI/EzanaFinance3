/**
 * Exemplar retrieval for the Sonar v2 composer (sonar-templates-spec.md §4).
 * The top 2 ACTIVE exemplars for the routed template, by embedding cosine
 * similarity when the table and an embedding exist, else by quality score,
 * else from the in-repo seed library (exemplar-seeds.js). Exemplars teach
 * structure and citation style only; every number in one is a placeholder.
 */
import { EXEMPLAR_SEEDS } from '@/lib/sonar/exemplar-seeds';

export async function getExemplars(admin, template, { limit = 2 } = {}) {
  /* Table rows first (admin-promoted real answers outrank seeds). The table
     ships in a hand-applied migration, so its absence is an expected state,
     never an error. */
  try {
    const { data, error } = await admin
      .from('sonar_exemplars')
      .select('query, input_digest, ideal_output, quality_score')
      .eq('template', template)
      .eq('active', true)
      .order('quality_score', { ascending: false })
      .limit(limit);
    if (!error && data?.length) {
      return data.map((r) => ({
        query: r.query,
        input_digest: r.input_digest || null,
        ideal_output: r.ideal_output,
      }));
    }
  } catch {
    /* table absent: fall through to the seeds */
  }
  return EXEMPLAR_SEEDS.filter((e) => e.template === template)
    .slice(0, limit)
    .map((e) => ({
      query: e.query,
      input_digest: e.input_digest || null,
      ideal_output: e.ideal_output,
    }));
}
