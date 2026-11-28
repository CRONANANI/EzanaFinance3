'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { fmtRatio, fmtSignedPct, tone } from '../lab/lab-format';
import {
  CATEGORIES,
  PLANNED_FAMILIES,
  prebuiltStrategies,
  templateRuns,
} from './prebuilt-strategies';

const BASE = '/for-the-quants';
const toneClass = (x) => ({ positive: 'qlx-up', negative: 'qlx-down' })[tone(x)] || '';

/* A rule diagram, not a chart: entry, then the risk control, then the exit.
   It carries no performance and cannot be mistaken for an equity curve. */
function RuleFlow({ s }) {
  const steps = [
    ['bi-box-arrow-in-right', 'Entry', s.entry],
    ['bi-shield-check', 'Risk', s.risk],
    ['bi-box-arrow-right', 'Exit', s.exit],
  ];
  return (
    <ol className="qlo-flow" aria-label={`${s.name} rules`}>
      {steps.map(([icon, label, text]) => (
        <li key={label}>
          <i className={`bi ${icon}`} aria-hidden />
          <span className="qlo-flow-label">{label}</span>
          <span className="qlo-flow-text">{text}</span>
        </li>
      ))}
    </ol>
  );
}

function StrategyCard({ s, copy }) {
  const [open, setOpen] = useState(false);
  const m = copy?.run?.metrics;
  const cfg = copy?.run?.config;
  return (
    <article className="qlo-card" aria-labelledby={`tpl-${s.id}`}>
      <header className="qlo-card-head">
        <span className="qlo-card-icon" aria-hidden>
          <i className={`bi ${s.icon}`} />
        </span>
        <div className="qlo-card-title">
          <h3 id={`tpl-${s.id}`} className="qlx-h4">
            {s.name}
          </h3>
          <span className="qlx-sub">
            {s.discipline} · {s.side === 'short' ? 'Short' : 'Long only'} · Daily bars
          </span>
          <span className={`qlx-tag ${s.backtestable ? 'qlx-tag--ok' : 'qlx-tag--warn'}`}>
            {s.backtestable ? 'Backtestable' : 'Research only'}
          </span>
        </div>
      </header>

      <p className="qlo-card-method">{s.method}</p>

      <RuleFlow s={s} />

      <dl className="qlo-card-meta">
        <div>
          <dt>Universe</dt>
          <dd className="qlx-num">
            {s.universe.length > 4
              ? `${s.universe.slice(0, 4).join(', ')} +${s.universe.length - 4}`
              : s.universe.join(', ')}
          </dd>
        </div>
        <div>
          <dt>Benchmark</dt>
          <dd className="qlx-num">{s.benchmark}</dd>
        </div>
      </dl>

      <div className="qlo-card-perf">
        {m ? (
          <>
            <span className="qlx-eyebrow">Your copy, historical</span>
            <span className="qlx-num">
              <span className={toneClass(m.totalReturn)}>{fmtSignedPct(m.totalReturn, 1)}</span>
              {' · Sharpe '}
              <span className="qlx-ink">{fmtRatio(m.sharpe)}</span>
            </span>
            <span className="qlx-sub qlx-num">
              {cfg?.startDate} to {cfg?.endDate}
            </span>
          </>
        ) : (
          <span className="qlx-sub">
            <i className="bi bi-hourglass" aria-hidden /> Not yet backtested
          </span>
        )}
      </div>

      {open && (
        <ul className="qlo-card-rules" id={`rules-${s.id}`}>
          {s.rules.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      <footer className="qlo-card-actions">
        <Link
          className="qlx-btn qlx-btn--primary qlx-btn--sm"
          href={`${BASE}/strategy-lab?template=${s.id}`}
        >
          Use strategy
        </Link>
        <button
          type="button"
          className="qlx-btn qlx-btn--sm"
          aria-expanded={open}
          aria-controls={`rules-${s.id}`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Hide rules' : 'View rules'}
        </button>
        {copy && (
          <Link
            className="qlx-link"
            href={`${BASE}/backtesting?strategy=${copy.strategy.id}&run=${copy.run.id}`}
          >
            Open report
          </Link>
        )}
      </footer>
    </article>
  );
}

/**
 * The prebuilt strategy library: useful before the user has saved anything.
 * "Use strategy" opens the Strategy Lab with the template's rules filled in;
 * nothing is saved or run until the user does it there.
 */
export function PrebuiltStrategyLibrary({ strategies = [], latest = {}, id }) {
  const all = useMemo(() => prebuiltStrategies(), []);
  const [filter, setFilter] = useState('all');
  const [showPlanned, setShowPlanned] = useState(false);
  const copies = useMemo(() => templateRuns(all, strategies, latest), [all, strategies, latest]);

  const chips = [
    ['all', 'All'],
    ...CATEGORIES.filter(([cid]) => all.some((s) => s.category === cid)),
  ];
  const shown = filter === 'all' ? all : all.filter((s) => s.category === filter);

  return (
    <section id={id} className="qlo-library" aria-labelledby="qlo-library-title">
      <div className="qlx-head">
        <div className="qlo-head-text">
          <h2 id="qlo-library-title" className="qlx-title">
            Prebuilt strategies
          </h2>
          <p className="qlx-sub">
            Rule sets you can open in the Strategy Lab, review, save and backtest on your own dates.
            Results appear only after you run them.
          </p>
        </div>
        <div className="qlx-row">
          <div className="qlx-seg" role="group" aria-label="Filter strategies">
            {chips.map(([cid, label]) => (
              <button
                key={cid}
                type="button"
                aria-pressed={filter === cid}
                onClick={() => setFilter(cid)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="qlx-btn qlx-btn--sm"
            aria-expanded={showPlanned}
            aria-controls="qlo-planned-families"
            onClick={() => setShowPlanned((v) => !v)}
          >
            {showPlanned ? 'Hide planned' : 'Browse strategy library'}
          </button>
        </div>
      </div>

      <div className="qlo-cards">
        {shown.map((s) => (
          <StrategyCard key={s.id} s={s} copy={copies[s.id]} />
        ))}
      </div>

      {showPlanned && (
        <div id="qlo-planned-families" className="qlo-planned-list">
          <span className="qlx-eyebrow">Planned, not available yet</span>
          <ul>
            {PLANNED_FAMILIES.map(([name, why]) => (
              <li key={name}>
                <span className="qlx-tag qlx-tag--plan">Planned</span>
                <span className="qlx-ink">{name}</span>
                <span className="qlx-sub">{why}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
