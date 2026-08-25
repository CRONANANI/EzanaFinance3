/**
 * Display-layer helpers for org entity labels.
 *
 * The council demo seed (supabase/migrations/20260824100000_seed_ezana_council_demo.sql)
 * prefixed its rows with a bracketed DEMO marker so they were identifiable
 * in the database.
 * That prefix must never reach the UI: strip it at render time. The companion
 * migration 20260825140000_strip_demo_prefix_seed.sql cleans the stored values;
 * this helper keeps the UI clean regardless of when that migration is applied.
 * Underlying keys/ids/slugs are never touched — display strings only.
 */
export function stripDemoLabel(label) {
  return typeof label === 'string' ? label.replace(/^\s*\[DEMO\]\s*/i, '') : label;
}
