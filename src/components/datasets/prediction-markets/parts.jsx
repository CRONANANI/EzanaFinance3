'use client';

/**
 * Shared primitives for the Prediction Markets cards (pmk- prefix). Pure
 * presentation: values arrive formatted or as model output.
 */
import { useRef } from 'react';
import { Skeleton } from '@/components/ds';
import { sparkPath } from '@/lib/prediction-markets/page-model';
import { VENUE_LABEL, pts } from './format';

export function cx(...c) {
  return c.filter(Boolean).join(' ');
}

/** The Ezana standard card. `as` lets a card be a <section>. */
export function Card({ className, hero, children, label, ...rest }) {
  return (
    <section
      className={cx('pmk-card', hero && 'pmk-card--hero', className)}
      aria-label={label}
      {...rest}
    >
      {children}
    </section>
  );
}

export function CardHead({ title, sub, right, rule = true, children }) {
  return (
    <header className={cx('pmk-head', !rule && 'pmk-head--plain')}>
      <div className="pmk-head-text">
        <h2 className="pmk-title">{title}</h2>
        {sub ? <p className="pmk-sub">{sub}</p> : null}
        {children}
      </div>
      {right ? <div className="pmk-head-right">{right}</div> : null}
    </header>
  );
}

/**
 * Segmented radiogroup. options: [{ value, label, disabled, title }].
 * Arrow keys move the selection, per the radiogroup pattern.
 */
export function Seg({ label, value, options, onChange, mono, className, size }) {
  const ref = useRef(null);
  const enabled = options.filter((o) => !o.disabled);
  const onKeyDown = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const i = enabled.findIndex((o) => o.value === value);
    const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
    const next = enabled[(i + step + enabled.length) % enabled.length];
    if (next) {
      onChange(next.value);
      const btn = ref.current?.querySelector(`[data-value="${CSS.escape(String(next.value))}"]`);
      btn?.focus();
    }
  };
  return (
    <div
      ref={ref}
      className={cx('pmk-seg', mono && 'pmk-seg--mono', size === 'lg' && 'pmk-seg--lg', className)}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={o.disabled || undefined}
            tabIndex={on ? 0 : -1}
            data-value={o.value}
            title={o.title}
            className={cx(on && 'is-on', o.disabled && 'is-disabled')}
            onClick={() => !o.disabled && onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Tablist with arrow-key navigation. tabs: [{ value, label, count }]. */
export function Tabs({ label, value, tabs, onChange, idBase }) {
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.value === value);
    const next = tabs[(i + (e.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length];
    onChange(next.value);
    document.getElementById(`${idBase}-tab-${next.value}`)?.focus();
  };
  return (
    <div className="pmk-tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            id={`${idBase}-tab-${t.value}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={`${idBase}-panel`}
            tabIndex={on ? 0 : -1}
            className={cx(on && 'is-on')}
            onClick={() => onChange(t.value)}
          >
            {t.dot ? (
              <span className={cx('pmk-dot', `pmk-dot--${t.dot}`)} aria-hidden="true" />
            ) : null}
            {t.label}
            {t.count != null ? <span className="pmk-tab-count pmk-num">{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function VenueDot({ venue }) {
  return <span className={cx('pmk-dot', `pmk-dot--${venue}`)} aria-hidden="true" />;
}

export function VenueChip({ venue, small }) {
  return (
    <span className={cx('pmk-venue', small && 'pmk-venue--sm')}>
      <VenueDot venue={venue} />
      {VENUE_LABEL[venue] || venue}
    </span>
  );
}

/** Signed change pill, always with sign and arrow so colour is never alone. */
export function ChangePill({ change, size }) {
  if (change == null || !Number.isFinite(change)) return null;
  const up = change > 0;
  const down = change < 0;
  return (
    <span
      className={cx(
        'pmk-pill',
        up && 'pmk-pill--up',
        down && 'pmk-pill--down',
        size && `pmk-pill--${size}`,
      )}
    >
      {up ? <i className="bi bi-arrow-up-right" aria-hidden="true" /> : null}
      {down ? <i className="bi bi-arrow-down-right" aria-hidden="true" /> : null}
      {pts(change)}
    </span>
  );
}

const CONF_LABEL = { high: 'High', medium: 'Medium', low: 'Low', none: 'No gap' };
export function ConfChip({ confidence }) {
  const c = confidence || 'none';
  return <span className={cx('pmk-conf', `pmk-conf--${c}`)}>{CONF_LABEL[c] || c}</span>;
}

/** Inline SVG sparkline from model points. */
export function Spark({ points, width = 64, height = 24, direction }) {
  const d = sparkPath(points, width, height);
  if (!d) return <span className="pmk-spark-empty" style={{ width, height }} aria-hidden="true" />;
  return (
    <svg
      className="pmk-spark"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        points={d}
        className={cx(
          'pmk-spark-line',
          direction > 0 && 'is-up',
          direction < 0 && 'is-down',
          !direction && 'is-flat',
        )}
      />
    </svg>
  );
}

/** Empty or error body: dashed box at the card's body height. */
export function StateBox({ kind = 'empty', title, children, onRetry, actions, minHeight }) {
  return (
    <div
      className={cx('pmk-state', `pmk-state--${kind}`)}
      style={minHeight ? { minHeight } : undefined}
      role={kind === 'error' ? 'alert' : undefined}
    >
      {kind === 'error' ? (
        <>
          <i className="bi bi-exclamation-circle pmk-state-icon" aria-hidden="true" />
          <p className="pmk-state-msg">
            This data is unavailable right now. Try again in a moment.
          </p>
          {onRetry ? (
            <button type="button" className="pmk-btn pmk-btn--ghost pmk-btn--sm" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </>
      ) : (
        <>
          {title ? <p className="pmk-state-title">{title}</p> : null}
          {children ? <p className="pmk-state-msg">{children}</p> : null}
          {actions ? <div className="pmk-state-actions">{actions}</div> : null}
        </>
      )}
    </div>
  );
}

/** Skeleton rows of a given height, wrapped for assistive tech. */
export function SkelRows({ n, height, gap = 8, label = 'Loading' }) {
  return (
    <div className="pmk-skel-rows" aria-busy="true" aria-live="polite" style={{ gap }}>
      <span className="pmk-sr">{label}</span>
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} height={height} radius={8} />
      ))}
    </div>
  );
}

export { Skeleton };

/** Signed-out veil over an expansion panel. */
export function Gate({ title, line, next }) {
  const href = (intent) =>
    `/auth/continue?${intent ? 'intent=signup&' : ''}next=${encodeURIComponent(next || '/datasets/prediction-markets')}`;
  return (
    <div className="pmk-gate-veil">
      <i className="bi bi-lock" aria-hidden="true" />
      <p className="pmk-gate-title">{title}</p>
      {line ? <p className="pmk-gate-line">{line}</p> : null}
      <div className="pmk-gate-actions">
        <a className="pmk-btn pmk-btn--sm" href={href(true)}>
          Sign up free
        </a>
        <a className="pmk-btn pmk-btn--ghost pmk-btn--sm" href={href(false)}>
          Log in
        </a>
      </div>
    </div>
  );
}

export const EDU_LINE =
  'For educational purposes only. Not financial advice. Prediction-market participation is subject to eligibility and jurisdiction.';

export function EduFooter({ onMethod }) {
  return (
    <footer className="pmk-foot pmk-foot--edu">
      <p className="pmk-legal">{EDU_LINE}</p>
      <button type="button" className="pmk-link" onClick={onMethod}>
        How we calculate this
      </button>
    </footer>
  );
}
