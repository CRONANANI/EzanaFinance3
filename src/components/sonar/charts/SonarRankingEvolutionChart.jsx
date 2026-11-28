'use client';

/**
 * SonarRankingEvolutionChart (Nov 28 2026), adapted from the 21st.dev "bar race chart" for
 * rankings across real reporting periods: institutional holder counts by quarter, contractor
 * rankings by fiscal year, country rankings by release, market share by period.
 *
 * Integrity rules (contracts.comparableSnapshots):
 *   - One reporting period draws a static ranking. Nothing animates.
 *   - Two or more real periods give a period stepper. The bars move only between periods
 *     the data holds; nothing is interpolated between them.
 *   - Play steps through the real periods and is not offered under reduced motion.
 * The table view (in the frame) lists every entity's value in every period.
 *
 * payload.data: { snapshots: [{ period, rows: [{ id?, label, value }] }], top? }
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { comparableSnapshots, formatFigure, num } from '@/lib/sonar/presentation/contracts';
import { useSonarSelection } from '../layout/SonarSelectionContext';
import './sonar-research-library.css';

export function SonarRankingEvolutionChart({ payload }) {
  const p = payload || {};
  const all = p.data?.snapshots || [];
  const real = comparableSnapshots(all);
  const snaps = real.length ? real : all.slice(-1);
  const top = p.data?.top || 10;
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(snaps.length - 1);
  const [playing, setPlaying] = useState(false);
  const timer = useRef(null);
  const [selected, select] = useSonarSelection();

  useEffect(() => {
    if (!playing) return undefined;
    timer.current = window.setTimeout(() => {
      if (idx >= snaps.length - 1) setPlaying(false);
      else setIdx(idx + 1);
    }, 1400);
    return () => window.clearTimeout(timer.current);
  }, [playing, idx, snaps.length]);

  const cur = snaps[Math.min(idx, snaps.length - 1)];
  const prev = idx > 0 ? snaps[idx - 1] : null;
  const rows = useMemo(() => {
    const list = (cur?.rows || [])
      .map((r) => ({ id: String(r.id || r.label), label: r.label, value: num(r.value) }))
      .filter((r) => r.value !== null)
      .sort((a, b) => b.value - a.value)
      .slice(0, top);
    const prevRank = new Map(
      (prev?.rows || [])
        .map((r) => ({ id: String(r.id || r.label), value: num(r.value) }))
        .filter((r) => r.value !== null)
        .sort((a, b) => b.value - a.value)
        .map((r, i) => [r.id, i]),
    );
    return list.map((r, i) => ({
      ...r,
      rank: i,
      moved: prevRank.has(r.id) ? prevRank.get(r.id) - i : null,
    }));
  }, [cur, prev, top]);
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 0) || 1;
  const multi = snaps.length > 1;

  return (
    <div>
      {multi ? (
        <div className="srl-periods" role="group" aria-label="Reporting period">
          {!reduced ? (
            <button
              type="button"
              className={`srl-btn${playing ? ' is-on' : ''}`}
              onClick={() => {
                if (!playing && idx >= snaps.length - 1) setIdx(0);
                setPlaying(!playing);
              }}
            >
              <i
                className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`}
                aria-hidden="true"
              />
              {playing ? 'Pause' : 'Play periods'}
            </button>
          ) : null}
          {snaps.map((s, i) => (
            <button
              key={s.period}
              type="button"
              className="srl-view"
              aria-pressed={i === idx}
              onClick={() => {
                setPlaying(false);
                setIdx(i);
              }}
            >
              {s.period}
            </button>
          ))}
        </div>
      ) : null}
      <ol
        className="srl-bars"
        aria-live="polite"
        aria-label={cur?.period ? `Ranking, ${cur.period}` : 'Ranking'}
      >
        {rows.map((r) => (
          <li
            key={r.id}
            className="srl-bar-row"
            style={{ order: r.rank, color: selected === r.id ? 'var(--srl-accent)' : undefined }}
          >
            <button
              type="button"
              className="srl-row-btn srl-bar-label"
              title={r.label}
              aria-pressed={selected === r.id}
              onClick={() => select(r.id)}
            >
              <span className="srl-rank">{r.rank + 1}</span>
              {r.label}
              {multi && r.moved ? (
                <span className={`srl-move ${r.moved > 0 ? 'is-up' : 'is-down'}`}>
                  <i
                    className={`bi ${r.moved > 0 ? 'bi-caret-up-fill' : 'bi-caret-down-fill'}`}
                    aria-hidden="true"
                  />
                  {Math.abs(r.moved)}
                </span>
              ) : null}
            </button>
            <span className="srl-bar-track" aria-hidden="true">
              <span
                className={`srl-bar-fill${r.value < 0 ? ' is-neg' : ''}`}
                style={{ width: `${(Math.abs(r.value) / max) * 100}%` }}
              />
            </span>
            <span className="srl-bar-val">
              {formatFigure(r.value, p.unit, { currency: p.currency, compact: true })}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default SonarRankingEvolutionChart;
