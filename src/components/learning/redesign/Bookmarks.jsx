'use client';

import Link from 'next/link';
import { TrackIcon } from './atoms';
import { TRACKS } from '@/lib/learning-curriculum';

export function Bookmarks({ bookmarks = [], onUnbookmark }) {
  return (
    <section className="lc-bookmarks">
      <div className="lc-section-header">
        <div>
          <div className="lc-eyebrow">Saved courses</div>
          <h2 className="lc-section-title">{bookmarks.length} courses</h2>
        </div>
      </div>

      <div className="lc-bookmarks-list">
        {bookmarks.length === 0 && (
          <p className="lc-text-sm lc-fg-muted">
            Bookmark courses from your active path to save them here.
          </p>
        )}
        {bookmarks.map((b) => {
          const trackLabel = TRACKS.find((t) => t.id === b.track)?.shortLabel || b.track;
          return (
            <Link
              key={b.course_id}
              href={`/learning-center/course/${b.course_id}`}
              className="lc-bookmark-row"
            >
              <TrackIcon trackId={b.track} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{b.title}</div>
                <div className="lc-text-xs lc-fg-muted">
                  {trackLabel} · {b.level} · {b.duration_minutes} min
                </div>
              </div>
              <span className="lc-text-xs" style={{ color: 'var(--amber)', fontWeight: 700 }}>
                +{b.reward_elo} ELO
              </span>
              <button
                type="button"
                className="lc-bookmark-remove"
                aria-label="Remove bookmark"
                onClick={(e) => {
                  e.preventDefault();
                  onUnbookmark?.(b.course_id);
                }}
              >
                <i className="bi bi-x" />
              </button>
              <i className="bi bi-chevron-right lc-fg-muted" />
            </Link>
          );
        })}
      </div>

      <div className="lc-bookmarks-footer">
        <span className="lc-text-xs lc-fg-muted">💡 Friends are saving these too</span>
        <div className="lc-bookmarks-chips">
          {['Risk vs Reward', 'Options 101', 'Macro Basics'].map((chip) => (
            <span key={chip} className="lc-bookmark-chip">
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
