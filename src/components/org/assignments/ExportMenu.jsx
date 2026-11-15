'use client';

import { Dropdown, MenuItem } from '@/components/ds';
import { exportRows, toCsv } from '@/lib/org-assignments-model';

/* Values written into the print window are escaped first: the window shares
   this origin, so a raw title or name there would run as markup. */
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

/**
 * Export the assignment log as a CSV file or through the browser's print
 * dialog. It exports every assignment the member can see, whatever tab is
 * open, with the columns Title, Type, Status, Assignees, Due date,
 * Progress % and Grade.
 */
export function ExportMenu({ assignments, disabled }) {
  if (disabled) {
    return (
      <button type="button" className="tcc-textbtn oas-action" disabled>
        <i className="bi bi-download" aria-hidden="true" />
        Export
      </button>
    );
  }

  const downloadCsv = () => {
    const blob = new Blob([toCsv(exportRows(assignments))], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assignments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const print = () => {
    const data = exportRows(assignments);
    const headers = data.length ? Object.keys(data[0]) : [];
    const win = window.open('', '_blank');
    if (!win) return;
    const body = data
      .map((r) => `<tr>${headers.map((h) => `<td>${esc(r[h])}</td>`).join('')}</tr>`)
      .join('');
    win.document.write(
      `<!doctype html><title>Assignment log</title>` +
        `<style>body{font-family:sans-serif;padding:24px}h1{font-size:18px}` +
        `table{border-collapse:collapse;width:100%;font-size:12px}` +
        `th,td{border-bottom:1px solid silver;padding:6px 8px;text-align:left}</style>` +
        `<h1>Assignment log: ${esc(new Date().toLocaleDateString('en-US'))}</h1>` +
        `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`,
    );
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <Dropdown
      align="right"
      className="oas-export"
      trigger={
        <span className="tcc-textbtn oas-action">
          <i className="bi bi-download" aria-hidden="true" />
          Export
        </span>
      }
    >
      <MenuItem icon="bi-file-earmark-spreadsheet" onClick={downloadCsv}>
        Download CSV
      </MenuItem>
      <MenuItem icon="bi-printer" onClick={print}>
        Print or save as PDF
      </MenuItem>
    </Dropdown>
  );
}
