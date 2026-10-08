/**
 * Capitol Watch hub: signal rules as stored rows and as API JSON. Pure.
 */

export const RULE_COLS =
  'id, name, datasets, conditions, time_window, alerts, created_at, updated_at';

/** A stored row as the SignalRule the page reads. */
export function ruleFromRow(r) {
  return {
    id: r.id,
    name: r.name,
    datasets: r.datasets || [],
    conditions: Array.isArray(r.conditions) ? r.conditions : [],
    window: r.time_window,
    alerts: r.alerts === true,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** A validated rule as the columns to write. */
export function rowFromRule(rule) {
  return {
    name: rule.name,
    datasets: rule.datasets,
    conditions: rule.conditions,
    time_window: rule.window,
    alerts: rule.alerts === true,
  };
}
