/**
 * EzanaQL formatter — renders an executed result set as `table` (preview),
 * `csv`, or `json` per the AS clause. Drives the preview grid + Export buttons.
 */

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function format(result, fmt = 'table') {
  const { columns, rows } = result;
  if (fmt === 'json') {
    return { contentType: 'application/json', body: JSON.stringify(rows, null, 2) };
  }
  if (fmt === 'csv') {
    const header = columns.map(csvCell).join(',');
    const lines = rows.map((r) => columns.map((c) => csvCell(r[c])).join(','));
    return { contentType: 'text/csv', body: [header, ...lines].join('\n') };
  }
  // table (preview) — structured for the UI grid
  return { contentType: 'application/json', columns, rows, rowCount: rows.length };
}
