/**
 * EzanaQL formatter — renders an executed result set as `table` (preview),
 * `csv`, or `json` per the AS clause. Drives the preview grid + Export buttons.
 */

function csvCell(v) {
  if (v == null) return '';
  let s = String(v);
  // Neutralize spreadsheet formula injection (= + - @ or tab/CR prefixes
  // execute as formulas in Excel/Sheets).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Columns holding a bracket MIDPOINT carry a label saying so, in every format.
 *
 * These datasets disclose a range, never a figure. The midpoint exists only so
 * a size ORDER BY is possible at all, and a bare `amount_est` header in a CSV
 * or a preview grid would be read as the amount. Renaming the column is the
 * one place that cannot be missed: it travels with the data into a spreadsheet.
 * The default projections do not include it; a caller has to ask for it.
 */
const ESTIMATE_SUFFIX = ' (~midpoint)';
const ESTIMATE_COLUMNS = new Set(['amount_est']);

function labelColumn(c) {
  return ESTIMATE_COLUMNS.has(c) ? `${c}${ESTIMATE_SUFFIX}` : c;
}

export function format(result, fmt = 'table') {
  const { rows } = result;
  const columns = (result.columns || []).map(labelColumn);
  const source = result.columns || [];
  if (fmt === 'json') {
    return { contentType: 'application/json', body: JSON.stringify(rows, null, 2) };
  }
  if (fmt === 'csv') {
    const header = columns.map(csvCell).join(',');
    /* Values are still read by their real key; only the header is labelled. */
    const lines = rows.map((r) => source.map((c) => csvCell(r[c])).join(','));
    return { contentType: 'text/csv', body: [header, ...lines].join('\n') };
  }
  // table (preview) — structured for the UI grid. `keys` keeps the real field
  // names so the grid can read each cell while showing the labelled header.
  return { contentType: 'application/json', columns, keys: source, rows, rowCount: rows.length };
}
