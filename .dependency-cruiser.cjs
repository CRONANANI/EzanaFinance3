/**
 * Architecture rules as data (Forge Lite item 1b) — belt-and-braces with the
 * ESLint no-restricted-imports layer bans, plus what ESLint cannot see:
 * transitive reachability and dependency cycles.
 *
 * Run: npm run lint:arch
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Dependency cycles make modules impossible to reason about or test in isolation.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'presentation-must-not-reach-server-db',
      severity: 'error',
      comment:
        'Components/hooks/contexts must never reach the server Supabase surface, ' +
        'even transitively — client code uses supabase-browser or /api/* routes.',
      from: { path: '^src/(components|hooks|contexts)' },
      to: { path: '^src/lib/supabase/' },
    },
    {
      name: 'no-orphans-in-lib',
      severity: 'warn',
      comment:
        'Module under src/lib that nothing imports — dead code candidate ' +
        '(verify before deleting; some are script/cron entry points).',
      from: { orphan: true, path: '^src/lib/' },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Resolve the '@/' alias from jsconfig.json's paths mapping.
    tsConfig: { fileName: 'jsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
