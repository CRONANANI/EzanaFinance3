import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { runEzanaQL } from '@/lib/ezanaql';
import { parse } from '@/lib/ezanaql/parser';
import { fromEzanaQL, signature } from '@/lib/sonar/cluster';
import { runSonarCluster } from '@/lib/sonar/pipeline';
import { composeClusterBrief } from '@/lib/sonar/composer';
import { suggestAstFollowups } from '@/lib/sonar/ezanaql-followups';
import { getExemplars } from '@/lib/sonar/exemplars';

/**
 * POST /api/sonar/ping — any EzanaQL result cluster, pinged into Sonar
 * (sonar-ezanaql-coverage-prompt.md Step 8). Body: { query } where query is
 * EzanaQL text (the "Ping in Sonar" button sends the console's query).
 *
 * The query re-runs through the real EzanaQL pipeline (parser, validator,
 * RLS-injected executor), so tier and dataset access are enforced exactly as
 * in the console; the result normalises to a Cluster, and the generic
 * pipeline (adapters, link ratios, chart chooser, news, composed-or-
 * deterministic brief) renders it. Follow-up chips are validated EzanaQL
 * mutations, guaranteed executable. Cached 15 minutes per query hash with
 * per-dataset tags.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DISCLAIMER =
  'Sonar synthesizes sourced research from Ezana datasets. Findings only, never financial advice.';

async function runPing(query) {
  const admin = getAdminClient();
  const ast = parse(query);
  const execd = await runEzanaQL({ query, admin, userId: null });
  if (!execd.ok) return { error: execd.error };
  const cluster = fromEzanaQL({ ast, result: execd.result, query });
  if (!cluster.datasets.length) return { error: 'The query matched no dataset.' };
  const sig = signature(cluster);
  const exemplars = await getExemplars(admin, `sig:${sig}`).catch(() => []);
  const out = await runSonarCluster(cluster, {
    compose: (args) => composeClusterBrief({ ...args, exemplars }),
    exemplars,
  });
  return {
    ...out,
    followups: [...suggestAstFollowups(cluster), ...(out.followups || [])].slice(0, 4),
    entities: cluster.entities.map((e) => ({ kind: e.kind, labels: e.labels.slice(0, 6) })),
  };
}

const cachedPing = unstable_cache(async (query) => runPing(query), ['sonar-ping-v1'], {
  revalidate: 900,
  tags: ['sonar-ping'],
});

export const POST = withApiGuard(
  async (request) => {
    const body = await request.json().catch(() => ({}));
    const query = String(body?.query || '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .trim()
      .slice(0, 600);
    if (query.length < 6 || !/^from\s/i.test(query)) {
      return NextResponse.json(
        { error: 'Send an EzanaQL query (FROM dataset …).' },
        { status: 400 },
      );
    }
    try {
      /* unstable_cache keys on its argument, so the query text is the key. */
      const out = await cachedPing(query);
      if (out?.error) return NextResponse.json({ error: out.error }, { status: 400 });
      return NextResponse.json({
        ...out,
        templateLabel: 'EzanaQL cluster',
        breadcrumb: [query],
        disclaimer: DISCLAIMER,
      });
    } catch (e) {
      console.error('[sonar] ping:', e?.message || e);
      return NextResponse.json(
        { error: 'That ping did not land. Try again in a moment.' },
        { status: 500 },
      );
    }
  },
  { strict: true },
);
