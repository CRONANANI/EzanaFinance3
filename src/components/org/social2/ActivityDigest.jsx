'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import './social.css';

function fmtPct(n) {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function Section({ title, icon, children, empty }) {
  return (
    <div className="sc2-digest-section">
      <div className="sc2-digest-section-title">
        <i className={`bi ${icon}`} aria-hidden /> {title}
      </div>
      {empty ? <div className="sc2-digest-empty">{empty}</div> : children}
    </div>
  );
}

/** "This Week in the Fund" — last-7-day activity for the org-team-hub home. */
export function ActivityDigest() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/org/digest', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setError('');
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="sc2-digest sc2-root sc2-state">Loading this week…</div>;
  if (!data) return null;

  const { newPitches, votes, positions, notes, recognitions, movers } = data;

  return (
    <div className="sc2-digest sc2-root">
      <div className="sc2-digest-head">
        <div>
          <p className="sc2-eyebrow" style={{ margin: 0 }}>
            This Week in the Fund
          </p>
        </div>
        <span className="sc2-comment-time sc2-num">last 7 days</span>
      </div>

      <Section
        title="New pitches"
        icon="bi-lightbulb"
        empty={!newPitches?.length ? 'No new pitches this week.' : null}
      >
        {newPitches?.map((p) => (
          <Link
            key={p.id}
            href="/org-team-hub/pitches"
            className="sc2-digest-row"
            style={{ textDecoration: 'none' }}
          >
            <span className="sc2-tag sc2-tag--ticker">{p.ticker}</span>
            {p.company_name || ''}
          </Link>
        ))}
      </Section>

      <Section
        title="Votes cast"
        icon="bi-check2-square"
        empty={!votes?.length ? 'No committee votes this week.' : null}
      >
        {votes?.slice(0, 6).map((v) => (
          <div key={v.id} className="sc2-digest-row">
            <span className="sc2-tag sc2-tag--ticker">{v.ticker || '—'}</span>
            <span style={{ textTransform: 'capitalize' }}>{v.vote}</span>
          </div>
        ))}
      </Section>

      <Section
        title="Positions opened"
        icon="bi-briefcase"
        empty={!positions?.length ? 'No new positions this week.' : null}
      >
        {positions?.map((p) => (
          <div key={p.id} className="sc2-digest-row">
            <span className="sc2-tag sc2-tag--ticker">{p.ticker_symbol}</span>
            {p.sector || ''} <span className="sc2-num">{p.shares ? `· ${p.shares} sh` : ''}</span>
          </div>
        ))}
      </Section>

      <Section
        title="Research notes"
        icon="bi-journal-text"
        empty={!notes?.length ? 'No new research notes this week.' : null}
      >
        {notes?.map((n) => (
          <Link
            key={n.id}
            href="/org-team-hub/research-library"
            className="sc2-digest-row"
            style={{ textDecoration: 'none' }}
          >
            {n.ticker && <span className="sc2-tag sc2-tag--ticker">{n.ticker}</span>}
            {n.title} <span className="sc2-comment-time">· {n.author_name}</span>
          </Link>
        ))}
      </Section>

      <Section
        title="Recognition"
        icon="bi-award"
        empty={!recognitions?.length ? 'No badges awarded this week.' : null}
      >
        {recognitions?.map((r) => (
          <Link
            key={r.id}
            href="/org-team-hub/recognition"
            className="sc2-digest-row"
            style={{ textDecoration: 'none' }}
          >
            🏅 {r.title} <span className="sc2-comment-time">· {r.recipient_name}</span>
          </Link>
        ))}
      </Section>

      <Section
        title="Performance movers"
        icon="bi-graph-up-arrow"
        empty={!movers?.length ? 'No outcome data yet.' : null}
      >
        {movers?.map((m, i) => (
          <div key={`${m.ticker}-${i}`} className="sc2-digest-row">
            <span className="sc2-tag sc2-tag--ticker">{m.ticker || '—'}</span>
            <span className={`sc2-num ${m.alpha_pct >= 0 ? 'sc2-pos' : 'sc2-neg'}`}>
              {fmtPct(m.alpha_pct)} alpha
            </span>
          </div>
        ))}
      </Section>
    </div>
  );
}
