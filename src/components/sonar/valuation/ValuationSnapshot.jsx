'use client';

/**
 * ValuationSnapshot (Nov 2026): a stock's valuation against its own history, beside the
 * executive answer on a company ping. One compact row per metric: the label, today's value,
 * the historical percentile on the right, and a thin indicator of where today sits in the
 * history (the median marked). Data from lib/sonar/valuation (history.js valuationSnapshot).
 *
 * Neutral by design: a high multiple is not coloured green or red, the context label compares
 * with the stock's own median and never says undervalued or overvalued, and FCF yield says
 * that its direction is reversed. A metric without enough history shows why, never a number
 * it does not have. "Explore valuations" never starts a run: it scrolls to the Valuation
 * section when it is open, opens the deep research offer (cost and quota shown, the reader
 * confirms), or follows the plan flow.
 *
 * Styles: valuation.css (vsn-). Tokens only. No price chart here: that stays in Charts and
 * data.
 */
import { useId } from 'react';
import { VisuallyHidden } from '@/components/ds';
import './valuation.css';

const ordinal = (p) => {
  const n = Math.round(p);
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${s}`;
};
export const fmtMetric = (r, v = r?.value) =>
  v == null ? 'n/a' : r.unit === '%' ? `${v.toFixed(2)}%` : `${v.toFixed(1)}x`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : String(d || '');
};

/* The indicator is a percentile scale (0 to 100), so the median always sits at the middle
   and the dot at today's percentile: one scale, no min and max stretching. */
export const medianSpot = (r) => (r?.median != null ? 50 : null);

function Row({ r, years }) {
  const hasPct = r.percentile != null;
  const label = hasPct
    ? `${r.label}: ${fmtMetric(r)}, ${ordinal(r.percentile)} percentile of its ${years}-year history (${r.observations} month-end observations, median ${fmtMetric(r, r.median)}). ${
        r.direction === 'yield'
          ? 'For a yield, a higher percentile means a lower valuation than usual.'
          : 'A higher percentile means a higher valuation than usual for this stock.'
      }`
    : `${r.label}: ${fmtMetric(r)}. ${r.note || ''}`;
  const spot = medianSpot(r);
  return (
    <li className="vsn-row">
      <div className="vsn-row-top">
        <span className="vsn-label">{r.label}</span>
        <span className="vsn-value">{r.status === 'nm' ? 'NM' : fmtMetric(r)}</span>
        <span className={`vsn-pct${hasPct ? '' : ' is-none'}`}>
          {hasPct ? (
            <>
              {ordinal(r.percentile)}
              <span className="vsn-pct-unit"> pct</span>
            </>
          ) : (
            'No percentile'
          )}
        </span>
      </div>
      {hasPct ? (
        <div className="vsn-track" role="img" aria-label={label}>
          {spot != null ? (
            <span className="vsn-median" style={{ left: `${spot}%` }} aria-hidden="true" />
          ) : null}
          <span className="vsn-dot" style={{ left: `${r.percentile}%` }} aria-hidden="true" />
        </div>
      ) : (
        <VisuallyHidden>{label}</VisuallyHidden>
      )}
      <p className="vsn-sub">
        {hasPct
          ? `${years}-year history, ${r.observations} month-end observations, median ${fmtMetric(r, r.median)}${r.direction === 'yield' ? '. Higher yield, lower valuation' : ''}`
          : r.note || (r.status === 'nm' ? 'Not meaningful' : 'Insufficient history')}
      </p>
    </li>
  );
}

/**
 * snapshot  valuationSnapshot() output
 * identity  { name, ticker }
 * action    exploreValuationAction() output, or null
 * onDeep    opens the deep research offer
 */
export function ValuationSnapshot({
  snapshot,
  identity,
  action = null,
  onDeep = null,
  className = '',
}) {
  const id = useId();
  const rows = snapshot?.rows || [];
  if (!rows.length) return null;
  const years = snapshot.lookbackYears;
  const go = (e) => {
    if (action?.kind !== 'scroll') return;
    const el = document.getElementById('sa-valuation');
    if (!el) return;
    e.preventDefault();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };
  return (
    <section className={`vsn ${className}`.trim()} aria-labelledby={id}>
      <header className="vsn-head">
        <h2 id={id} className="vsn-eyebrow">
          <i className="bi bi-speedometer2" aria-hidden="true" />
          Valuation snapshot
        </h2>
        {identity ? (
          <p className="vsn-id">
            {identity.name} <span aria-hidden="true">·</span> {identity.ticker}
          </p>
        ) : null}
        <p className="vsn-meta">
          As of {fmtDate(snapshot.asOf)}
          {snapshot.latestQuarter
            ? `, fundamentals to the quarter ending ${fmtDate(snapshot.latestQuarter)}`
            : ''}
        </p>
        {snapshot.context ? (
          <p className="vsn-context">
            <span className="vsn-context-label">{snapshot.context.label}</span>
            <span className="vsn-context-basis">{snapshot.context.basis}</span>
          </p>
        ) : null}
      </header>
      <ul className="vsn-rows">
        {rows.map((r) => (
          <Row key={r.id} r={r} years={years} />
        ))}
      </ul>
      <footer className="vsn-foot">
        <p className="vsn-note">
          Percentile: share of month-end values in the last {years} years at or below today&apos;s.
          Position in the stock&apos;s own history, not a verdict on value.
        </p>
        {action ? (
          action.kind === 'deep' ? (
            <button
              type="button"
              className="vsn-action"
              onClick={onDeep || undefined}
              disabled={!onDeep}
            >
              {action.label}
              <i className="bi bi-arrow-right" aria-hidden="true" />
              {action.note ? <span className="vsn-action-note">{action.note}</span> : null}
            </button>
          ) : (
            <a className="vsn-action" href={action.href} onClick={go}>
              {action.label}
              <i className="bi bi-arrow-right" aria-hidden="true" />
              {action.note ? <span className="vsn-action-note">{action.note}</span> : null}
            </a>
          )
        ) : null}
      </footer>
    </section>
  );
}

export default ValuationSnapshot;
