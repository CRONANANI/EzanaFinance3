'use client';

import { motion, useReducedMotion } from 'framer-motion';
import './ez-sentiment-bar.css';

const TONE_ICON = {
  pos: 'bi-arrow-up-right',
  neu: 'bi-dash-lg',
  neg: 'bi-arrow-down-right',
};

/**
 * EzSentimentBar (Nov 2026): a segmented share bar for a sentiment split,
 * such as members net buying / even / net selling. The segments grow in on
 * mount; the legend under it gives each part's share and count, with an
 * icon so tone never rests on colour alone. Plain JS, tokens only.
 *
 * parts:   [{ key, label, value, tone: 'pos' | 'neu' | 'neg' }]
 * overall: optional { label, tone } shown at the right of the title row
 * count(v): how a part's raw value reads in the legend (default: grouped)
 */
export function EzSentimentBar({
  title,
  overall,
  parts,
  count = (v) => Number(v).toLocaleString('en-US'),
  note,
  className = '',
}) {
  const reduced = useReducedMotion();
  const clean = (parts || []).filter((p) => Number(p.value) > 0);
  const total = clean.reduce((a, p) => a + Number(p.value), 0);
  if (!total) return null;
  const share = (p) => (Number(p.value) / total) * 100;
  const summary = clean.map((p) => `${p.label} ${Math.round(share(p))}%`).join(', ');

  return (
    <div className={`ezsb ${className}`.trim()}>
      {title || overall ? (
        <div className="ezsb-head">
          {title ? <span className="ezsb-title">{title}</span> : <span />}
          {overall ? (
            <span className={`ezsb-overall is-${overall.tone || 'neu'}`}>
              <i className={`bi ${TONE_ICON[overall.tone] || TONE_ICON.neu}`} aria-hidden="true" />
              {overall.label}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="ezsb-bar" role="img" aria-label={`${title ? `${title}: ` : ''}${summary}`}>
        {clean.map((p, i) => (
          <motion.span
            key={p.key}
            className={`ezsb-seg is-${p.tone || 'neu'}`}
            initial={reduced ? false : { width: '0%' }}
            animate={{ width: `${share(p)}%` }}
            transition={{ duration: 0.8, ease: 'easeInOut', delay: i * 0.1 }}
          />
        ))}
      </div>
      <ul className="ezsb-legend">
        {clean.map((p) => (
          <li key={p.key} className={`is-${p.tone || 'neu'}`}>
            <i className={`bi ${TONE_ICON[p.tone] || TONE_ICON.neu}`} aria-hidden="true" />
            <span className="ezsb-legend-label">{p.label}</span>
            <span className="ezsb-legend-fig">{Math.round(share(p))}%</span>
            <span className="ezsb-legend-n">{count(p.value)}</span>
          </li>
        ))}
      </ul>
      {note ? <p className="ezsb-note">{note}</p> : null}
    </div>
  );
}

export default EzSentimentBar;
