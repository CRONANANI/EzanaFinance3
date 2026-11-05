/**
 * Sonar research modes: quality and cost per mode (Nov 2026). Reads
 * sonar_research_runs, sonar_queries and sonar_mode_events for the last N
 * days and prints, per mode (quick, standard, deep):
 *   volume and speed     runs, completion rate, partial rate, median and p90 duration
 *   evidence             median evidence selected, source families used
 *   validation           claims kept, downgraded and removed
 *   coverage             requested angles vs angles with a surviving finding
 *   user behaviour       deep offer acceptance, Go deeper click rate
 *
 *   node --env-file=.env.local --import ./scripts/register-sonar-loader.mjs \
 *     scripts/sonar-mode-report.mjs [--days 7]
 *
 * Read only. Uses the service role from the environment; prints no secrets.
 */
import { createClient } from '@supabase/supabase-js';

const { classifyResearchMode, DEEP_ANGLES, FAMILY_SOURCES } =
  await import('@/lib/sonar/research-mode');

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const DAYS = Math.max(1, Number(arg('days', 7)) || 7);
const since = new Date(Date.now() - DAYS * 864e5).toISOString();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env.local).');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function readAll(table, columns, build = (q) => q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(
      db.from(table).select(columns).gte('created_at', since).order('created_at'),
    ).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const median = (xs) => {
  const a = xs.filter((x) => Number.isFinite(x)).sort((p, q) => p - q);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const p90 = (xs) => {
  const a = xs.filter((x) => Number.isFinite(x)).sort((p, q) => p - q);
  return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * 0.9))] : null;
};
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : 'n/a');
const sec = (ms) => (ms == null ? 'n/a' : `${(ms / 1000).toFixed(1)}s`);

const SOURCE_FAMILY = Object.fromEntries(
  Object.entries(FAMILY_SOURCES).flatMap(([f, srcs]) => srcs.map((s) => [s, f])),
);

/** Angles the question asked for, and those with a surviving finding. */
function angleCoverage(run) {
  const asked = classifyResearchMode(run.question || '', { coverage: false }).angles;
  const findings = (run.report?.keyFindings || [])
    .map((f) => [f?.text, f?.claim, f?.statement, f?.title].filter(Boolean).join(' '))
    .join(' \n ');
  const covered = asked.filter((a) => {
    const re = DEEP_ANGLES.find((x) => x.id === a.id)?.re;
    return re ? re.test(findings) : false;
  });
  return { asked: asked.length, covered: covered.length };
}

const [runs, pings, events] = await Promise.all([
  readAll(
    'sonar_research_runs',
    'id, status, depth, partial, duration_ms, plan, evidence_decisions, validation, report, question, created_at',
  ),
  readAll('sonar_queries', 'id, version, status, grounded, created_at'),
  readAll('sonar_mode_events', 'action, predicted_mode, confidence, ran_mode, created_at'),
]);

console.log(`Sonar research modes, last ${DAYS} days (since ${since.slice(0, 10)})\n`);

/* Quick pings: the landing pipeline's ledger rows ('guest' / 'member'). */
const quick = pings.filter((p) => p.version === 'guest' || p.version === 'member');
console.log('QUICK');
console.log(
  `  pings ${quick.length}, completed ${pct(quick.filter((p) => p.status === 'completed').length, quick.length)}, grounded ${pct(
    quick.filter((p) => p.grounded).length,
    quick.length,
  )}`,
);
console.log('  (quick pings do not record duration or validation)\n');

for (const mode of ['standard', 'deep']) {
  const rs = runs.filter((r) => r.depth === mode);
  const ok = rs.filter((r) => r.status !== 'failed');
  const families = new Map();
  for (const r of ok) {
    const fams = new Set((r.plan?.tasks || []).map((t) => SOURCE_FAMILY[t.source]).filter(Boolean));
    for (const f of fams) families.set(f, (families.get(f) || 0) + 1);
  }
  const v = ok.map((r) => r.validation || {});
  const sum = (k) => v.reduce((s, x) => s + (Number(x[k]) || 0), 0);
  const cov = ok
    .map(angleCoverage)
    .reduce((a, x) => ({ asked: a.asked + x.asked, covered: a.covered + x.covered }), {
      asked: 0,
      covered: 0,
    });
  console.log(mode.toUpperCase());
  console.log(
    `  runs ${rs.length}, completed ${pct(ok.length, rs.length)}, partial ${pct(
      rs.filter((r) => r.partial || r.status === 'partial').length,
      rs.length,
    )}`,
  );
  console.log(
    `  duration median ${sec(median(rs.map((r) => r.duration_ms)))}, p90 ${sec(p90(rs.map((r) => r.duration_ms)))}`,
  );
  console.log(
    `  evidence selected, median ${median(ok.map((r) => r.evidence_decisions?.selected)) ?? 'n/a'}`,
  );
  console.log(
    `  source families used: ${
      [...families.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([f, n]) => `${f} ${pct(n, ok.length)}`)
        .join(', ') || 'n/a'
    }`,
  );
  console.log(
    `  claims ${sum('claims')}: kept ${sum('kept')}, downgraded ${sum('downgraded')}, removed ${sum('removed')}`,
  );
  console.log(
    `  requested-angle coverage ${pct(cov.covered, cov.asked)} (${cov.covered}/${cov.asked})\n`,
  );
}

const count = (action) => events.filter((e) => e.action === action).length;
console.log('USER BEHAVIOUR');
console.log(
  `  classified ${count('classified')}: ${['quick', 'standard', 'deep']
    .map(
      (m) =>
        `${m} ${events.filter((e) => e.action === 'classified' && e.predicted_mode === m).length}`,
    )
    .join(', ')}`,
);
console.log(
  `  deep offers ${count('offered_deep')}, accepted ${count('accepted_deep')} (${pct(
    count('accepted_deep'),
    count('offered_deep'),
  )}), quick instead ${count('chose_quick')}`,
);
console.log(
  `  Go deeper shown ${count('go_deeper_shown')}, clicked ${count('go_deeper_clicked')} (${pct(
    count('go_deeper_clicked'),
    count('go_deeper_shown'),
  )})`,
);
console.log(`  sign-up gates ${count('signup_gate')}, deep quota reached ${count('deep_quota')}`);
