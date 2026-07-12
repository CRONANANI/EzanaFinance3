'use client';

import { useCallback, useEffect, useState } from 'react';
import { Award, RefreshCw, Sliders, Sparkles } from 'lucide-react';
import { AwardModal, badgeIcon } from './AwardModal';
import { RatingLeaderboard } from './RatingLeaderboard';
import { EzanaRatingScorecard } from './EzanaRatingScorecard';
import { WeightsEditor } from './WeightsEditor';
import './social.css';
import './recognition2.css';

export function RecognitionWall() {
  const [members, setMembers] = useState([]);
  const [canAward, setCanAward] = useState(false);
  const [viewerMemberId, setViewerMemberId] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [flash, setFlash] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadMeta = useCallback(async () => {
    try {
      const [recRes, recentRes] = await Promise.all([
        fetch('/api/org/recognition', { cache: 'no-store' }),
        fetch('/api/org/recognition/recent?limit=8', { cache: 'no-store' }),
      ]);
      if (recRes.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const rec = await recRes.json().catch(() => ({}));
      if (!recRes.ok) {
        setError(rec?.error || 'Failed to load recognition.');
        return;
      }
      setMembers(rec.members || []);
      setCanAward(!!rec.viewer?.canAward);
      setViewerMemberId(rec.viewer?.memberId || null);
      const recentJson = await recentRes.json().catch(() => ({}));
      setRecent(recentJson.recent || []);
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const runAction = async (kind) => {
    setBusy(kind);
    setFlash('');
    try {
      const url = kind === 'auto' ? '/api/org/recognition/auto' : '/api/org/recognition/recompute';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFlash(data?.error || 'Action failed.');
      } else if (kind === 'auto') {
        setFlash(
          data.awarded?.length
            ? `Awarded ${data.awarded.length} badge(s) from outcomes.`
            : data.message || 'Nothing new to award.',
        );
      } else {
        const rated = (data.results || []).filter((r) => r.ratedThesisCount > 0).length;
        setFlash(
          `Recomputed ${data.count ?? data.results?.length ?? 0} member(s); ${rated} with rated theses.`,
        );
      }
      await loadMeta();
      setRefreshKey((k) => k + 1);
    } catch {
      setFlash('Network error.');
    } finally {
      setBusy('');
    }
  };

  if (loading) return <div className="sc2-state">Loading recognition…</div>;
  if (error) return <div className="sc2-state sc2-error">{error}</div>;

  return (
    <div className="sc2-root">
      <div className="sc2-header">
        <div>
          <p className="sc2-eyebrow">Team Hub</p>
          <h1 className="sc2-title">Recognition</h1>
          <p className="sc2-sub">
            The Ezana Rating — a per-member scorecard built from resolved theses, not vibes.
          </p>
        </div>
        {canAward && (
          <div className="rec2-actions">
            <button
              type="button"
              className="rec2-btn"
              onClick={() => runAction('recompute')}
              disabled={busy === 'recompute'}
            >
              <RefreshCw size={13} aria-hidden />{' '}
              {busy === 'recompute' ? 'Recomputing…' : 'Recompute ratings'}
            </button>
            <button
              type="button"
              className="rec2-btn"
              onClick={() => runAction('auto')}
              disabled={busy === 'auto'}
            >
              <Sparkles size={13} aria-hidden /> {busy === 'auto' ? 'Computing…' : 'Auto-award'}
            </button>
            <button type="button" className="rec2-btn" onClick={() => setWeightsOpen(true)}>
              <Sliders size={13} aria-hidden /> Weights
            </button>
            <button
              type="button"
              className="rec2-btn rec2-btn--primary"
              onClick={() => setModalOpen(true)}
            >
              <Award size={13} aria-hidden /> Award
            </button>
          </div>
        )}
      </div>

      {flash && (
        <div className="rec2-caveat" style={{ marginBottom: '1rem', color: 'var(--emerald-text)' }}>
          {flash}
        </div>
      )}

      <div className="rec2-grid">
        <div className="rec2-col">
          <RatingLeaderboard
            key={`lb-${refreshKey}`}
            selectedMemberId={selectedMemberId}
            onSelect={setSelectedMemberId}
          />

          <div className="rec2-card">
            <h3 className="rec2-card-title">Recently earned</h3>
            {recent.length === 0 ? (
              <div className="rec2-empty">No badges earned yet.</div>
            ) : (
              <div className="rec2-recent">
                {recent.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`rec2-recent-card${r.is_award ? ' rec2-recent-card--award' : ''}`}
                    onClick={() =>
                      r.recipient_member_id && setSelectedMemberId(r.recipient_member_id)
                    }
                    style={{
                      textAlign: 'left',
                      cursor: r.recipient_member_id ? 'pointer' : 'default',
                    }}
                  >
                    <span className="rec2-recent-icon" aria-hidden>
                      {badgeIcon(r.badge_type)}
                    </span>
                    <span className="rec2-recent-title">{r.title}</span>
                    <span className="rec2-recent-name">{r.recipient_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rec2-col">
          <EzanaRatingScorecard
            key={`sc-${selectedMemberId}-${refreshKey}`}
            memberId={selectedMemberId || viewerMemberId}
          />
        </div>
      </div>

      <AwardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        members={members}
        onAwarded={() => {
          loadMeta();
          setRefreshKey((k) => k + 1);
        }}
      />
      <WeightsEditor
        open={weightsOpen}
        onClose={() => setWeightsOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
