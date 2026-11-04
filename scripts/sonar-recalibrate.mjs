/**
 * Sonar controlled recalibration (engine v3, Section 9.6).
 *
 *   --propose              build a candidate retrieval config from the last
 *                          30 days of runs and ACCEPTED feedback, run the
 *                          benchmark suite on the active and the candidate
 *                          configs, and store the gate result on the candidate
 *   --promote <version>    make an approved candidate active (the previous
 *                          active config is retired, so it can come back)
 *   --rollback <version>   re-activate a retired config
 *
 *   node --env-file=.env.local --import ./scripts/register-sonar-loader.mjs scripts/sonar-recalibrate.mjs --propose
 *
 * Nothing here runs on a request path, and nothing promotes automatically.
 */
const args = process.argv.slice(2);
const val = (k) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : null;
};

const { getAdminClient } = await import('@/lib/supabase');
const { DEFAULT_CONFIG } = await import('@/lib/sonar/engine/domains');
const { sourceUtility, proposeConfig, gate } = await import('@/lib/sonar/engine/recalibrate');
const { isValidConfig } = await import('@/lib/sonar/engine/config-store');
const { runSuite } = await import('@/lib/sonar/engine/eval/run-suite');
const admin = getAdminClient();
const by = process.env.USER || 'cli';

async function activeConfig() {
  const { data } = await admin
    .from('sonar_engine_configs')
    .select('version, config')
    .eq('kind', 'retrieval')
    .eq('status', 'active')
    .maybeSingle();
  return data ? { ...data.config, version: data.version } : DEFAULT_CONFIG;
}

if (args.includes('--propose')) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data: runs } = await admin
    .from('sonar_research_runs')
    .select('id, primary_domain, plan, evidence_decisions, report')
    .gte('created_at', since)
    .neq('status', 'failed')
    .limit(5000);
  const { data: feedback } = await admin
    .from('sonar_research_feedback')
    .select('run_id, kind, evidence_id')
    .eq('status', 'accepted')
    .gte('created_at', since);
  const current = await activeConfig();
  const utility = sourceUtility(runs || [], feedback || []);
  const { config, changes } = proposeConfig(current, utility);
  if (!changes.length) {
    console.log('No weight has enough data to move. Nothing proposed.');
    process.exit(0);
  }
  if (!isValidConfig(config)) throw new Error('candidate failed validation');
  console.log(`candidate ${config.version}: ${changes.length} changes`);
  console.table(changes);
  await admin.from('sonar_engine_configs').insert({
    version: config.version,
    kind: 'retrieval',
    status: 'candidate',
    config,
    parent_version: current.version,
    changes,
  });
  const baseline = await runSuite({ engine: 'v3', config: current, write: true });
  const candidate = await runSuite({ engine: 'v3', config, write: true });
  const verdict = gate(baseline, candidate);
  await admin
    .from('sonar_engine_configs')
    .update({
      evaluation: {
        ...verdict,
        baseline: baseline.summary,
        candidate: candidate.summary,
        suites: [baseline.suite, candidate.suite],
      },
    })
    .eq('version', config.version);
  console.log(
    verdict.approved
      ? `APPROVED. Promote with --promote ${config.version}`
      : `REJECTED: ${verdict.reasons.join(', ')}`,
  );
} else if (val('promote')) {
  const { error } = await admin.rpc('sonar_promote_config', {
    p_version: val('promote'),
    p_by: by,
  });
  console.log(error ? `Not promoted: ${error.message}` : `Promoted ${val('promote')}.`);
} else if (val('rollback')) {
  const v = val('rollback');
  const { data } = await admin
    .from('sonar_engine_configs')
    .select('status, evaluation')
    .eq('version', v)
    .maybeSingle();
  if (data?.status !== 'retired') {
    console.log('Only a retired config can be rolled back to.');
  } else {
    await admin
      .from('sonar_engine_configs')
      .update({
        status: 'candidate',
        evaluation: { ...(data.evaluation || {}), approved: true, rollback: true },
      })
      .eq('version', v);
    const { error } = await admin.rpc('sonar_promote_config', {
      p_version: v,
      p_by: `${by}:rollback`,
    });
    console.log(error ? `Rollback failed: ${error.message}` : `Rolled back to ${v}.`);
  }
} else {
  console.log('Use --propose, --promote <version> or --rollback <version>.');
}
