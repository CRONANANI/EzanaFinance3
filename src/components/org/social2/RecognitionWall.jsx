'use client';

import { useCallback, useEffect, useState } from 'react';
import { AwardModal, badgeIcon } from './AwardModal';
import './social.css';

export function RecognitionWall() {
  const [recognitions, setRecognitions] = useState([]);
  const [members, setMembers] = useState([]);
  const [canAward, setCanAward] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [computing, setComputing] = useState(false);
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/recognition', { cache: 'no-store' });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load recognitions.');
        return;
      }
      setRecognitions(data.recognitions || []);
      setMembers(data.members || []);
      setCanAward(!!data.viewer?.canAward);
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

  const computeFromOutcomes = async () => {
    setComputing(true);
    setFlash('');
    try {
      const res = await fetch('/api/org/recognition/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFlash(
          data.awarded?.length
            ? `Awarded ${data.awarded.length} badge(s) from outcomes.`
            : data.message || 'Nothing new to award.',
        );
        await load();
      } else {
        setFlash(data?.error || 'Could not compute.');
      }
    } catch {
      setFlash('Network error.');
    } finally {
      setComputing(false);
    }
  };

  if (loading) return <div className="sc2-state">Loading recognition wall…</div>;
  if (error) return <div className="sc2-state sc2-error">{error}</div>;

  return (
    <div className="sc2-root">
      <div className="sc2-header">
        <div>
          <p className="sc2-eyebrow">Team Hub</p>
          <h1 className="sc2-title">Recognition</h1>
          <p className="sc2-sub">Outcome-tied badges for the people moving the fund forward.</p>
        </div>
        {canAward && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="sc2-btn"
              onClick={computeFromOutcomes}
              disabled={computing}
            >
              <i className="bi bi-magic" aria-hidden /> {computing ? 'Computing…' : 'Compute from outcomes'}
            </button>
            <button type="button" className="sc2-btn sc2-btn--primary" onClick={() => setModalOpen(true)}>
              <i className="bi bi-award" aria-hidden /> Award
            </button>
          </div>
        )}
      </div>

      {flash && (
        <div className="sc2-sub" style={{ marginBottom: '1rem', color: 'var(--emerald-text, #10b981)' }}>
          {flash}
        </div>
      )}

      {recognitions.length === 0 ? (
        <div className="sc2-state">No badges yet. {canAward ? 'Award the first one!' : ''}</div>
      ) : (
        <div className="sc2-recog-grid">
          {recognitions.map((r) => (
            <div key={r.id} className="sc2-recog-card">
              <div className="sc2-badge-icon" aria-hidden>
                {badgeIcon(r.badge_type)}
              </div>
              <div className="sc2-recog-title">{r.title}</div>
              <div className="sc2-recog-recipient">{r.recipient_name}</div>
              {r.reason && <div className="sc2-recog-reason">{r.reason}</div>}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {r.period && <span className="sc2-recog-period">{r.period}</span>}
                {r.auto_generated && <span className="sc2-recog-auto">auto</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <AwardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        members={members}
        onAwarded={load}
      />
    </div>
  );
}
