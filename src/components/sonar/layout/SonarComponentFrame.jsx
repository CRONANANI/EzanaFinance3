'use client';

/**
 * SonarComponentFrame (Nov 28 2026): the one wrapper every Sonar research component sits in,
 * so every card in the library reads the same. It names what is drawn (title, metric, unit,
 * period, source and the data flags a reader must see: estimate, filing snapshot, award
 * year, delayed), offers the chart or table view as a text-only toggle, carries the screen
 * reader summary, and draws the honest state when the data cannot support the chart:
 * loading (skeleton in the final shape), empty, partial, unavailable, unsupported, locked.
 *
 * It never calculates a figure. `children(view)` draws the chart; the table view comes from
 * the payload through tableView(), so chart and table always agree.
 *
 * Styles: charts/sonar-research-library.css (srl-). Flat, tokens only, Bootstrap Icons.
 */
import { useId, useState } from 'react';
import { VisuallyHidden } from '@/components/ds';
import { flagLabels } from '@/lib/sonar/presentation/contracts';
import { tableView, textSummary } from '@/lib/sonar/presentation/table-views';
import { dayLabel } from '@/lib/sonar/desk-summary';
import { SonarFinancialResearchTable } from '../charts/SonarFinancialResearchTable';
import '../charts/sonar-research-library.css';

const STATE_ICON = {
  empty: 'bi-inbox',
  partial: 'bi-exclamation-triangle',
  overlapping: 'bi-info-circle',
  static: 'bi-info-circle',
  unavailable: 'bi-slash-circle',
  unsupported: 'bi-question-circle',
  locked: 'bi-lock',
};

/** The loading state: bones in the component's final shape, so nothing jumps. */
export function SonarComponentSkeleton({ height = 240, label = 'Loading chart' }) {
  return (
    <div className="srl" role="status" aria-label={label}>
      <span className="srl-bone" style={{ width: '40%', height: 18 }} />
      <span className="srl-bone" style={{ width: '60%', height: 12 }} />
      <span className="srl-bone" style={{ width: '100%', height }} />
    </div>
  );
}

/**
 * payload    normalized payload (presentation/contracts)
 * state      'ready' | 'partial' | 'static' | 'overlapping' | 'empty' | 'unavailable' |
 *            'unsupported' | 'locked'
 * reason     the state's explanation (from the registry evaluation)
 * takeaway   one sentence on what the chart shows (from the visualization plan)
 * views      ['chart', 'table'] or ['chart']
 * wide       spans the full grid row
 * actions    extra controls on the header's right (text buttons)
 */
export function SonarComponentFrame({
  payload,
  state = 'ready',
  reason = null,
  takeaway = null,
  views = ['chart', 'table'],
  wide = false,
  actions = null,
  className = '',
  children,
}) {
  const titleId = useId();
  const sumId = useId();
  const [view, setView] = useState('chart');
  const p = payload || {};
  const blocked = ['empty', 'unavailable', 'unsupported', 'locked'].includes(state);
  const table = !blocked && views.includes('table') ? tableView(p) : null;
  const summary = !blocked ? textSummary(p) : null;
  const flags = flagLabels(p.flags);
  const retrieved = dayLabel(p.retrievedAt);
  const unit = p.currency || (p.unit && !['count', 'value'].includes(p.unit) ? p.unit : null);

  return (
    <section
      className={`srl ${className}`.trim()}
      data-wide={wide ? 'true' : undefined}
      aria-labelledby={titleId}
      aria-describedby={summary ? sumId : undefined}
    >
      <header className="srl-head">
        <div className="srl-titles">
          <h3 id={titleId} className="srl-title">
            {p.title || 'Research data'}
          </h3>
          <p className="srl-labels">
            {p.metric && p.metric !== p.title ? <span>{p.metric}</span> : null}
            {unit ? <span>{unit}</span> : null}
            {p.period?.label ? <span>{p.period.label}</span> : null}
            {flags.map((f) => (
              <span key={f.key} className="srl-flag">
                <i className="bi bi-exclamation-circle" aria-hidden="true" />
                {f.label}
              </span>
            ))}
          </p>
        </div>
        <div className="srl-tools">
          {actions}
          {table && views.length > 1 ? (
            <ul className="srl-views" aria-label="View">
              {views.map((v) => (
                <li key={v}>
                  <button
                    type="button"
                    className="srl-view"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                  >
                    {v === 'chart' ? 'Chart' : 'Table'}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      {takeaway && !blocked ? <p className="srl-takeaway">{takeaway}</p> : null}
      {summary ? (
        <VisuallyHidden>
          <p id={sumId}>{summary}</p>
        </VisuallyHidden>
      ) : null}

      {blocked ? (
        <p className={`srl-state srl-state--${state}`} role="note">
          <i className={`bi ${STATE_ICON[state] || 'bi-info-circle'}`} aria-hidden="true" />
          <span>{reason || 'This view has no data for this question.'}</span>
        </p>
      ) : (
        <>
          {state !== 'ready' && reason ? (
            <p className={`srl-state srl-state--${state}`} role="note">
              <i className={`bi ${STATE_ICON[state] || 'bi-info-circle'}`} aria-hidden="true" />
              <span>{reason}</span>
            </p>
          ) : null}
          {view === 'table' && table ? (
            <SonarFinancialResearchTable
              columns={table.columns}
              rows={table.rows}
              caption={p.title}
              compact
            />
          ) : (
            children?.(view)
          )}
        </>
      )}

      {p.source || p.methodology || retrieved || p.limitations?.length ? (
        <footer className="srl-foot">
          {p.source ? <span>Source: {p.source}</span> : null}
          {retrieved ? <span>Retrieved {retrieved}</span> : null}
          {p.methodology ? <span>Method: {p.methodology}</span> : null}
          {p.limitations?.[0] ? <span>{p.limitations[0]}</span> : null}
        </footer>
      ) : null}
    </section>
  );
}

export default SonarComponentFrame;
