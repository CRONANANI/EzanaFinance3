'use client';

/**
 * A saved answer (Sonar research workspace, Nov 13 2026), read-only, rendered from its
 * snapshot. A saved research run renders with the same report renderer as a live run and the
 * organization reader (ResearchReport, from stateFromSnapshot); a saved quick ping renders its
 * Desk Summary and sources. "Saved {date}", the item's own Share, library and remove actions,
 * and "Run again", which pings the same question.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ResearchReport from '../research/ResearchReport';
import { stateFromSnapshot } from '@/lib/org-sonar/reports';
import { SonarSaveActions } from '../SonarSaveActions';
import { SavedAnswerView } from './SavedAnswerView';
import SonarAdaptiveReport from '../adaptive/SonarAdaptiveReport';
import { dateLabel } from './ResearchWorkspaceShell';
import './research-workspace.css';

export default function SavedItemClient({ id }) {
  const [item, setItem] = useState(null);
  const [state, setState] = useState('loading');
  useEffect(() => {
    let live = true;
    fetch(`/api/sonar/saved/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!live) return;
        if (!r.ok || !j.item) {
          setState(r.status === 404 ? 'missing' : 'error');
          return;
        }
        setItem(j.item);
        setState('ready');
      })
      .catch(() => live && setState('error'));
    return () => {
      live = false;
    };
  }, [id]);
  const research = useMemo(
    () =>
      item?.kind === 'research' && item?.snapshot?.report ? stateFromSnapshot(item.snapshot) : null,
    [item],
  );

  /* A saved adaptive answer carries its whole report; anything malformed falls back to the
     summary view. */
  const adaptive =
    item?.snapshot?.adaptive &&
    Array.isArray(item.snapshot.adaptive.sections) &&
    Array.isArray(item.snapshot.adaptive.sources)
      ? item.snapshot.adaptive
      : null;
  const runInSonar = (q) => {
    window.location.assign(`/sonar?q=${encodeURIComponent(String(q || '').slice(0, 600))}`);
  };

  if (state === 'loading') return <p className="srw-note srw-pad">Loading.</p>;
  if (state !== 'ready') {
    return (
      <div className="srw-pad">
        <p className="srw-empty">
          {state === 'missing'
            ? 'This saved research is not in your account.'
            : 'This saved research is not available right now.'}
        </p>
        <Link className="srw-btn" href="/sonar/saved">
          Back to saved research
        </Link>
      </div>
    );
  }
  const actions = <SonarSaveActions initial={item} question={item.question} getSave={() => null} />;
  return (
    <div className="srw-saved">
      <div className="srw-saved-bar">
        <Link className="srw-btn" href="/sonar/saved">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          Saved research
        </Link>
        <span>Saved {dateLabel(item.created_at)}</span>
        <Link className="srw-btn" href={`/sonar?q=${encodeURIComponent(item.question)}`}>
          <i className="bi bi-arrow-repeat" aria-hidden="true" />
          Run again
        </Link>
        {research ? actions : null}
      </div>
      {research ? (
        <ResearchReport state={research} />
      ) : adaptive ? (
        /* A saved adaptive answer reopens in the layout it was saved in. It is read-only:
           a new question or a follow-up leaves for Sonar and runs there as live research. */
        <div className="sdr-run force-dark-theme">
          <SonarAdaptiveReport
            report={adaptive}
            onPing={runInSonar}
            onFollowUp={runInSonar}
            actions={actions}
          />
        </div>
      ) : (
        <SavedAnswerView snapshot={item.snapshot} actions={actions} />
      )}
    </div>
  );
}
