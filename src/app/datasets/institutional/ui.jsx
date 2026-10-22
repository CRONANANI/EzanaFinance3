'use client';

/**
 * Shared pieces for the Institutional Holdings (13F) page: the card shell,
 * skeletons, chips, the side-panel shell (Politician Tracker behaviour: one
 * history entry, Escape closes, focus returns, scrim) and the client fetch
 * hook. Components render; the maths lives in institutional-model.js.
 */
import { useState } from 'react';
import {
  Panel as TitansPanel,
  PanelClose as TitansPanelClose,
  PanelSection as TitansPanelSection,
  ScoreChip as TitansScoreChip,
  Skel as TitansSkel,
  useJson,
} from '@/components/datasets/titans/ui';

export { useJson };
import { MISSING } from '@/lib/titans/format';

export const SOURCE_LINE =
  'SEC EDGAR Form 13F-HR. Quarter-end holdings, filed up to 45 days later.';
export const ERROR_COPY = 'This data is unavailable right now. Try again in a moment.';
export const M = MISSING;

/* ── card shell ──────────────────────────────────────────────────────── */

export function QuarterChip({ label, partial = false }) {
  if (!label) return null;
  return <span className={`inst-qchip${partial ? ' is-partial' : ''}`}>{label}</span>;
}

/**
 * The standard card: icon tile, mono eyebrow, the card's question as h2,
 * quarter chip, body, then the source footer pinned at the bottom.
 */
export function Card({
  id,
  className = '',
  icon,
  eyebrow,
  title,
  chip,
  chipPartial = false,
  sourceExtra,
  empty = null,
  children,
}) {
  return (
    <section id={id} className={`inst-card ${className}`.trim()} aria-labelledby={`${id}-h`}>
      <header className="inst-card-head">
        {icon ? (
          <span className="inst-icon" aria-hidden="true">
            <i className={`bi ${icon}`} />
          </span>
        ) : null}
        <div className="inst-card-head-text">
          {eyebrow ? <p className="inst-eyebrow">{eyebrow}</p> : null}
          <h2 id={`${id}-h`} className="inst-h2">
            {title}
          </h2>
        </div>
        <QuarterChip label={chip} partial={chipPartial} />
      </header>
      <div className="inst-card-body">
        {empty ? <p className="inst-empty">{empty}</p> : children}
      </div>
      <footer className="inst-source">
        <span>{SOURCE_LINE}</span>
        {sourceExtra ? <span>{sourceExtra}</span> : null}
      </footer>
    </section>
  );
}

/* ── skeleton ────────────────────────────────────────────────────────── */

export const Skel = TitansSkel;

/* ── chips ───────────────────────────────────────────────────────────── */

const CHANGE_WORD = {
  new: 'New',
  doubled: 'Doubled',
  added: 'Added',
  trimmed: 'Trimmed',
  exited: 'Exited',
  flat: 'Flat',
};

export function ChangeChip({ change }) {
  const word = CHANGE_WORD[change];
  if (!word) return null;
  return <span className={`inst-chg inst-chg--${change}`}>{word}</span>;
}

export const ScoreChip = TitansScoreChip;

/* ── side panel shell ────────────────────────────────────────────────── */

export const Panel = TitansPanel;
export const PanelClose = TitansPanelClose;
export const PanelSection = TitansPanelSection;
