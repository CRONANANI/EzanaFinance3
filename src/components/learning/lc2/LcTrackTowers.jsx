'use client';

import { TRACKS } from '@/lib/learning-curriculum';

const TIERS = [
  { key: 'basic', label: 'Bronze' },
  { key: 'intermediate', label: 'Silver' },
  { key: 'advanced', label: 'Gold' },
  { key: 'expert', label: 'Platinum' },
];

function tierCell(track, key) {
  const lv = track.summary?.levels?.[key];
  return { completed: lv?.completed || 0, total: lv?.total || 0 };
}

/**
 * Editorial track table. Replaces the tower cards: a thick-ruled header row,
 * one dotted row per track, per-tier cells as mono completed/total with the
 * completed count green once it is above zero.
 *
 * Carries the legacy `lc-track-towers` class so the BeginnerSpotlight step
 * that targets it still anchors (in the tower version that selector matched
 * nothing, because the class lived only in the older redesign tree).
 */
export function LcTrackTowers({ tracks, mainTrack, onSelectTrack, onSetMainTrack }) {
  return (
    <section className="lc-track-towers">
      <div className="lc3-sec-head">
        <h2 className="lc3-sec-title">Your tracks</h2>
        <span className="lc3-sec-meta">{tracks.length} tracks</span>
      </div>

      <div className="lc3-table-scroll">
        <table className="lc3-table">
          <thead>
            <tr>
              <th className="lc3-th">Track</th>
              {TIERS.map((t) => (
                <th className="lc3-th lc3-th--r" key={t.key}>
                  {t.label}
                </th>
              ))}
              <th className="lc3-th lc3-th--r">Total</th>
              <th className="lc3-th lc3-th--r">Main</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track) => {
              const isMain = track.id === mainTrack;
              const label = TRACKS.find((t) => t.id === track.id)?.shortLabel || track.name;
              const done = track.summary?.completed || 0;
              const total = track.summary?.total || 0;

              return (
                <tr
                  key={track.id}
                  className="lc3-tr lc3-tr--click"
                  onClick={() => onSelectTrack?.(track.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelectTrack?.(track.id);
                  }}
                >
                  <td className="lc3-td lc3-td--title">
                    {isMain && <span className="lc3-main-pill">Main</span>}
                    {label}
                  </td>
                  {TIERS.map((t) => {
                    const c = tierCell(track, t.key);
                    return (
                      <td className="lc3-td lc3-td--r lc3-mono" key={t.key}>
                        <span className={c.completed > 0 ? 'lc3-green' : ''}>{c.completed}</span>
                        <span className="lc3-dim">/{c.total}</span>
                      </td>
                    );
                  })}
                  <td className="lc3-td lc3-td--r lc3-td--sym">
                    <span className={done > 0 ? 'lc3-green' : ''}>{done}</span>
                    <span className="lc3-dim">/{total}</span>
                  </td>
                  <td className="lc3-td lc3-td--r">
                    {isMain ? (
                      <span className="lc3-kicker lc3-green">Current</span>
                    ) : (
                      <button
                        type="button"
                        className="lc3-setmain"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetMainTrack?.(track.id);
                        }}
                      >
                        Set main
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
