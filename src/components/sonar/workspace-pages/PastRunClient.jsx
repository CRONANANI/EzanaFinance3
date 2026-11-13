'use client';

/**
 * One of the reader's past research runs (Sonar research workspace, Nov 13 2026), opened from
 * Research history with the same report renderer as a live run (ResearchReport and its
 * ResearchBoard). A personal run keeps its report text, evidence and metrics, not its charts,
 * so a past run opens without them; saving an answer keeps the full board.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ResearchReport from '../research/ResearchReport';
import { stateFromRunRow } from '@/lib/sonar/saved';
import { dateLabel } from './ResearchWorkspaceShell';
import './research-workspace.css';

export default function PastRunClient({ id }) {
  const [row, setRow] = useState(null);
  const [state, setState] = useState('loading');
  useEffect(() => {
    let live = true;
    fetch(`/api/sonar/history?id=${encodeURIComponent(id)}`, { credentials: 'include' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!live) return;
        if (!r.ok || !j.run) {
          setState(r.status === 404 ? 'missing' : 'error');
          return;
        }
        setRow(j.run);
        setState('ready');
      })
      .catch(() => live && setState('error'));
    return () => {
      live = false;
    };
  }, [id]);
  const research = useMemo(() => stateFromRunRow(row), [row]);

  if (state === 'loading') return <p className="srw-note srw-pad">Loading.</p>;
  if (state !== 'ready' || !research) {
    return (
      <div className="srw-pad">
        <p className="srw-empty">
          {state === 'missing' || (state === 'ready' && !research)
            ? 'This research run is not available.'
            : 'This research run is not available right now.'}
        </p>
        <Link className="srw-btn" href="/sonar/history">
          Back to research history
        </Link>
      </div>
    );
  }
  return (
    <div className="srw-saved">
      <div className="srw-saved-bar">
        <Link className="srw-btn" href="/sonar/history">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          Research history
        </Link>
        <span>Run {dateLabel(row.created_at)}</span>
        <Link className="srw-btn" href={`/sonar?q=${encodeURIComponent(row.question)}`}>
          <i className="bi bi-arrow-repeat" aria-hidden="true" />
          Run again
        </Link>
      </div>
      <ResearchReport state={research} />
    </div>
  );
}
