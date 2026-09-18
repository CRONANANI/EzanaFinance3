'use client';

const PEER_DEFAULTS = ['Risk vs Reward', 'Options 101', 'Macro Basics'];

/**
 * Saved courses as a movers-style sub-column: group head with the count as
 * uppercase meta, then dotted rows for what peers are saving.
 */
export function LcSavedCourses({ count = 0, peerSaved, onChipClick }) {
  const peers = peerSaved && peerSaved.length > 0 ? peerSaved : PEER_DEFAULTS;

  return (
    <div>
      <div className="lc3-sub-head">
        <h3 className="lc3-sub-title">Saved courses</h3>
        <span className="lc3-sec-meta">{count} saved</span>
      </div>

      {count === 0 && (
        <p className="lc3-empty">
          Bookmark courses from your active path to come back to them later.
        </p>
      )}

      <div className="lc3-item">
        <span className="lc3-item-name lc3-dim">Your peers are saving</span>
      </div>
      {peers.map((p) => (
        <button
          type="button"
          className="lc3-item lc3-item--click"
          key={p}
          onClick={() => onChipClick?.(p)}
        >
          <span className="lc3-item-name">{p}</span>
          <span className="lc3-item-v lc3-dim">
            <i className="bi bi-bookmark" aria-hidden />
          </span>
        </button>
      ))}
    </div>
  );
}
