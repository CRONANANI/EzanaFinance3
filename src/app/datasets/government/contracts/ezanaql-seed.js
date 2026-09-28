/**
 * Moved to src/lib/ezanaql/seeds.js, which every dataset page's query bar now
 * shares. Kept as a re-export so the contracts page and the check script keep
 * one import path while the seeds live in one place.
 *
 * Relative, not aliased: scripts/check-ezanaql-generate.mjs loads this in
 * plain node, where the @/ alias does not resolve.
 */
export { SEED_QUERY, seedFromFilters } from '../../../../lib/ezanaql/seeds';
