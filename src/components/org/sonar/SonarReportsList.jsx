'use client';

/**
 * SonarReportsList: the organization's Sonar research reports the viewer can
 * read (RLS decides), with filters for status, kind and "mine". Each row
 * shows the subject, the conclusion's first line, the status, who wrote it
 * and how well its claims held up in validation.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  KIND_LABEL,
  REPORT_KINDS,
  REPORT_STATUSES,
  STANCE_LABEL,
  STATUS_LABEL,
  VISIBILITY_LABEL,
} from '@/lib/org-sonar/reports';
import './org-sonar.css';

function pct(v) {
  return Number.isFinite(v) ? `${Math.round(v * 100)}%` : null;
}

function day(iso) {
  return iso ? String(iso).slice(0, 10) : '';
}

export function StatusChip({ status }) {
  return <span className={`osr-chip osr-chip--${status}`}>{STATUS_LABEL[status] || status}</span>;
}

export default function SonarReportsList({ pitchId = null, compact = false, limit = null }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    if (kind) sp.set('kind', kind);
    if (mine) sp.set('mine', '1');
    if (pitchId) sp.set('pitchId', pitchId);
    if (q.trim()) sp.set('q', q.trim());
    try {
      const r = await fetch(`/api/org/sonar-reports?${sp}`, { credentials: 'include' });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || 'Reports could not be loaded.');
      setRows(body.reports || []);
      setError(null);
    } catch (e) {
      setError(e.message);
      setRows([]);
    }
  }, [status, kind, mine, pitchId, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const list = limit && rows ? rows.slice(0, limit) : rows;

  return (
    <div className="osr-list">
      {!compact ? (
        <div className="osr-filters" role="group" aria-label="Filter reports">
          <input
            className="osr-search"
            type="search"
            placeholder="Search reports"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search reports"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Every status</option>
            {REPORT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind">
            <option value="">Every kind</option>
            {REPORT_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
          <label className="osr-check">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            <span>Mine</span>
          </label>
        </div>
      ) : null}
      {error ? (
        <p className="osr-error" role="alert">
          {error}
        </p>
      ) : null}
      {rows === null ? (
        <p className="osr-muted">Loading reports.</p>
      ) : !list.length ? (
        <p className="osr-empty">
          {pitchId
            ? 'No Sonar research is attached to this pitch yet. Save a research run and choose this pitch.'
            : 'No reports yet. Run research in Sonar and choose Save to your fund.'}
        </p>
      ) : (
        <ul className="osr-rows">
          {list.map((r) => (
            <li key={r.id} className="osr-row">
              <Link href={`/org-team-hub/sonar/${r.id}`} className="osr-row-link">
                <div className="osr-row-top">
                  <span className="osr-kind">{KIND_LABEL[r.kind] || r.kind}</span>
                  {r.ticker ? <span className="osr-ticker">{r.ticker}</span> : null}
                  <StatusChip status={r.status} />
                  {r.summary?.stance ? (
                    <span className={`osr-chip osr-chip--stance-${r.summary.stance}`}>
                      Sonar view: {STANCE_LABEL[r.summary.stance] || r.summary.stance}
                    </span>
                  ) : null}
                </div>
                <h3 className="osr-row-title">{r.title}</h3>
                {r.summary?.conclusion && !compact ? (
                  <p className="osr-row-body">{r.summary.conclusion.slice(0, 220)}</p>
                ) : null}
                <div className="osr-row-meta">
                  <span>{r.author_name}</span>
                  <span>v{r.current_version}</span>
                  <span>{VISIBILITY_LABEL[r.visibility]}</span>
                  {pct(r.summary?.stats?.claimSupportRate) ? (
                    <span>{pct(r.summary.stats.claimSupportRate)} of claims verified</span>
                  ) : null}
                  <span className="osr-mono">{day(r.updated_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
