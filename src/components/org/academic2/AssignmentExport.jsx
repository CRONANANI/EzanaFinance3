'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { STATUS_LABEL, typeMeta } from './AssignmentCard';

function rows(assignments) {
  return (assignments || []).map((a) => ({
    Title: a.title || '',
    Type: typeMeta(a.type || a.assignment_type).label,
    Status: a.overdue ? 'Overdue' : STATUS_LABEL[a.status] || a.status,
    Assignees: (a.assignees || []).map((x) => x.name).join('; '),
    'Due date': a.due_date ? new Date(a.due_date).toLocaleDateString('en-US') : '',
    'Progress %': typeof a.progress_pct === 'number' ? a.progress_pct : '',
    Grade:
      a.rubric_score != null && a.rubric_max != null ? `${a.rubric_score}/${a.rubric_max}` : '',
  }));
}

function toCsv(data) {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...data.map((r) => headers.map((h) => esc(r[h])).join(','))].join(
    '\n',
  );
}

/* Export the term assignment log — CSV download or browser print-to-PDF. */
export function AssignmentExport({ assignments }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const data = rows(assignments);
  const disabled = data.length === 0;

  const downloadCsv = () => {
    const blob = new Blob([toCsv(data)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assignments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const printPdf = () => {
    const headers = data.length ? Object.keys(data[0]) : [];
    const win = window.open('', '_blank');
    if (!win) return;
    const body = data
      .map((r) => `<tr>${headers.map((h) => `<td>${String(r[h] ?? '')}</td>`).join('')}</tr>`)
      .join('');
    win.document.write(
      `<!doctype html><title>Assignment log</title>` +
        `<style>body{font-family:sans-serif;padding:24px}h1{font-size:18px}` +
        `table{border-collapse:collapse;width:100%;font-size:12px}` +
        `th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f3f4f6}</style>` +
        `<h1>Assignment log — ${new Date().toLocaleDateString('en-US')}</h1>` +
        `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`,
    );
    win.document.close();
    win.focus();
    win.print();
    setOpen(false);
  };

  return (
    <div className="asg2-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="asg2-btn"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download size={14} aria-hidden="true" /> Export
      </button>
      {open && (
        <div className="asg2-menu" role="menu">
          <button type="button" role="menuitem" onClick={downloadCsv}>
            <FileSpreadsheet size={14} aria-hidden="true" /> Download CSV
          </button>
          <button type="button" role="menuitem" onClick={printPdf}>
            <FileText size={14} aria-hidden="true" /> Print / Save as PDF
          </button>
        </div>
      )}
    </div>
  );
}
