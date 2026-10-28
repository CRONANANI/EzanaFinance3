'use client';

import { useCallback, useEffect, useState } from 'react';
import { orgRequest } from '@/lib/org-request';
import './analytics.css';

export function ReportCenter() {
  const [reports, setReports] = useState([]);
  const [canGenerate, setCanGenerate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('');
  const [busy, setBusy] = useState(false);
  const [genError, setGenError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/reports', { cache: 'no-store' });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load reports.');
        return;
      }
      setReports(data.reports || []);
      setCanGenerate(!!data.viewer?.canGenerate);
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setBusy(true);
    setGenError('');
    try {
      const data = await orgRequest('/api/org/reports', {
        method: 'POST',
        json: { period_label: period || 'Current Term' },
      });
      if (data.report?.id) {
        setPeriod('');
        await load();
        // Open the branded report immediately.
        window.open(`/api/org/reports/${data.report.id}/pdf`, '_blank', 'noopener');
      }
    } catch (err) {
      setGenError(err.message || 'Could not generate the report.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="an4-state">Loading reports…</div>;
  if (error) return <div className="an4-state an4-error">{error}</div>;

  return (
    <div className="an4-root">
      <div className="an4-header">
        <div>
          <p className="an4-eyebrow">Analytics</p>
          <h1 className="an4-title">Stakeholder Reports</h1>
          <p className="an4-sub">Branded fund reports for deans, donors, and advisory boards.</p>
        </div>
      </div>

      {canGenerate && (
        <div className="an4-toolbar">
          <input
            className="an4-input"
            style={{ maxWidth: 240 }}
            placeholder="Period label, e.g. Fall 2026"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
          <button
            type="button"
            className="an4-btn an4-btn--primary"
            onClick={generate}
            disabled={busy}
          >
            <i className="bi bi-file-earmark-bar-graph" aria-hidden />{' '}
            {busy ? 'Generating…' : 'Generate Stakeholder Report'}
          </button>
          {genError ? (
            <p className="org-inline-error" role="alert" style={{ width: '100%' }}>
              {genError}
            </p>
          ) : null}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="an4-state">No reports generated yet.</div>
      ) : (
        reports.map((r) => (
          <div key={r.id} className="an4-report-row">
            <div>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.title}</span>
              <div className="an4-sub" style={{ margin: 0 }}>
                {r.period_label} · {new Date(r.created_at).toLocaleDateString()}
              </div>
            </div>
            <a
              className="an4-btn"
              href={`/api/org/reports/${r.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="bi bi-download" aria-hidden /> Open printable report
            </a>
          </div>
        ))
      )}
    </div>
  );
}
