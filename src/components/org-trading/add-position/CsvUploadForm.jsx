'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase-browser';

const TEMPLATE_CSV = `ticker,name,shares,avg_cost,sector,notes
AAPL,Apple Inc.,100,150.25,Technology,
MSFT,Microsoft Corp,50,310.00,Technology,Core position
`;

export function CsvUploadForm({ orgId, teamId, onSubmitting, onError, onSuccess }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [rowErrors, setRowErrors] = useState(null);

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'positions-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    if (!file) return;
    onError(null);
    setRowErrors(null);
    onSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('org_id', orgId);
      if (teamId) fd.append('team_id', teamId);
      const res = await fetch('/api/org/positions/csv', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        if (Array.isArray(json.errors) && json.errors.length) setRowErrors(json.errors);
        throw new Error(json.error || 'Upload failed');
      }
      if (Array.isArray(json.errors) && json.errors.length) setRowErrors(json.errors);
      onSuccess(json);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (e) {
      onError(e.message);
    } finally {
      onSubmitting(false);
    }
  };

  return (
    <div className="apm-org-form">
      <div className="apm-org-csv-help">
        <div>
          <b>Required columns:</b> <code>ticker</code>, <code>shares</code>, <code>avg_cost</code>.
          Optional: <code>name</code>, <code>sector</code>, <code>notes</code>. Files with the wrong
          headers or invalid values are rejected.
        </div>
        <button className="apm-org-btn apm-org-btn-ghost" onClick={downloadTemplate}>
          <i className="bi bi-download" /> Download template
        </button>
      </div>
      <div className="apm-org-file-zone">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setRowErrors(null);
          }}
        />
        {file && <div className="apm-org-file-name">{file.name}</div>}
      </div>
      {rowErrors && rowErrors.length > 0 && (
        <div className="apm-org-rowerrors">
          <div className="apm-org-rowerrors-title">
            {rowErrors.length} row{rowErrors.length === 1 ? '' : 's'} skipped:
          </div>
          <ul>
            {rowErrors.slice(0, 8).map((er, idx) => (
              <li key={idx}>
                Row {er.row}: {er.reason}
              </li>
            ))}
            {rowErrors.length > 8 && <li>…and {rowErrors.length - 8} more</li>}
          </ul>
        </div>
      )}
      <div className="apm-org-actions">
        <button className="apm-org-btn apm-org-btn-primary" onClick={submit} disabled={!file}>
          Import CSV
        </button>
      </div>
    </div>
  );
}
