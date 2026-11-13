'use client';

/**
 * Research history (Sonar research workspace, Nov 13 2026). Research runs come from the server
 * (/api/sonar/history: standard and deep runs, newest first); a row opens that run. Quick
 * pings are not stored on the server, so recent pings are read from this device
 * (localStorage `sonar_recent`) and a row re-runs the ping.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ResearchWorkspaceShell, MODE, dateLabel } from './ResearchWorkspaceShell';

function readRecent() {
  try {
    const r = JSON.parse(localStorage.getItem('sonar_recent') || '[]');
    return Array.isArray(r) ? r.filter((x) => x && typeof x.query === 'string') : [];
  } catch {
    return [];
  }
}

export default function HistoryClient() {
  const [runs, setRuns] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [state, setState] = useState('loading');
  const [recent, setRecent] = useState([]);

  const load = useCallback(async (after = null) => {
    setState('loading');
    try {
      const qs = after ? `?cursor=${encodeURIComponent(after)}` : '';
      const res = await fetch(`/api/sonar/history${qs}`, { credentials: 'include' });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Research history is not available right now.');
      setRuns((prev) => (after ? [...prev, ...(j.items || [])] : j.items || []));
      setCursor(j.nextCursor || null);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
    setRecent(readRecent());
  }, [load]);

  return (
    <ResearchWorkspaceShell
      current="history"
      title="Research history"
      lede="Your standard and deep research runs, and the quick pings made on this device."
    >
      <section className="srw-section" aria-labelledby="srw-runs">
        <h2 id="srw-runs" className="srw-section-title">
          Research runs
        </h2>
        {state === 'error' ? (
          <p className="srw-error" role="alert">
            Research history is not available right now.{' '}
            <button type="button" className="srw-btn" onClick={() => load()}>
              Retry
            </button>
          </p>
        ) : null}
        {state !== 'loading' && !runs.length && state !== 'error' ? (
          <p className="srw-empty">No research runs yet.</p>
        ) : null}
        {runs.length ? (
          <ul className="srw-rows">
            {runs.map((r) => (
              <li key={r.id} className="srw-row">
                <Link className="srw-row-link" href={`/sonar/history/${r.id}`}>
                  {r.question}
                </Link>
                <span className="srw-row-meta">
                  {r.subject ? <span>{r.subject}</span> : null}
                  {r.depth ? <span>{MODE[r.depth] || r.depth}</span> : null}
                  {r.status ? <span>{r.status}</span> : null}
                  <span>{dateLabel(r.created_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {state === 'loading' ? <p className="srw-note">Loading.</p> : null}
        {cursor && state === 'ready' ? (
          <button type="button" className="srw-btn" onClick={() => load(cursor)}>
            Show older runs
          </button>
        ) : null}
      </section>

      <section className="srw-section" aria-labelledby="srw-recent">
        <h2 id="srw-recent" className="srw-section-title">
          Recent pings on this device
        </h2>
        <p className="srw-note">Quick pings are kept on this device only, not in your account.</p>
        {recent.length ? (
          <ul className="srw-rows">
            {recent.map((r) => (
              <li key={`${r.query}-${r.at}`} className="srw-row">
                <Link className="srw-row-link" href={`/sonar?q=${encodeURIComponent(r.query)}`}>
                  {r.query}
                </Link>
                <span className="srw-row-meta">
                  {r.typeLabel ? <span>{r.typeLabel}</span> : null}
                  <span>{dateLabel(r.at)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="srw-empty">No recent pings on this device.</p>
        )}
      </section>
    </ResearchWorkspaceShell>
  );
}
