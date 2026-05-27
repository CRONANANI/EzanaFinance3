'use client';

const PEER_DEFAULTS = ['Risk vs Reward', 'Options 101', 'Macro Basics'];

export function LcSavedCourses({ count = 0, peerSaved, onChipClick }) {
  const peers = peerSaved && peerSaved.length > 0 ? peerSaved : PEER_DEFAULTS;

  return (
    <div className="lc-card lc-sc">
      <div className="lc-sc-head">
        <span className="lc-card-title">Saved courses</span>
        <span className="lc-sc-count-pill">{count} saved</span>
      </div>
      <div className="lc-sc-big">{count}</div>
      <p className="lc-sc-empty">
        Bookmark courses from your active path or recommendations to come back to them later.
      </p>
      <div className="lc-sc-peer">
        <div className="lc-sc-peer-label">
          <span className="lc-sc-peer-dot" />
          Your peers are saving
        </div>
        <div className="lc-sc-peer-chips">
          {peers.map((p) => (
            <button
              key={p}
              type="button"
              className="lc-sc-peer-chip"
              onClick={() => onChipClick?.(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
