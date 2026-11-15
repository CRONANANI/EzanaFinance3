'use client';

/**
 * Community page primitives (Nov 2026): StatTile, SectionCard, TickerChip,
 * DeltaValue, TrendBadge, Avatar, VerifiedBadge. All flat: text, not chips. Styles in
 * src/app/(dashboard)/community/community.module.css.
 */
import Link from 'next/link';
import s from '@/app/(dashboard)/community/community.module.css';
import { initials, signedPct } from '@/lib/community/redesign';

export function Avatar({ src, name, size = 40 }) {
  return (
    <span
      className={s.avatar}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <i
      className={`bi bi-patch-check-fill ${s.verified}`}
      role="img"
      aria-label="Verified partner"
    />
  );
}

export function TickerChip({ ticker, href = true }) {
  if (!ticker) return null;
  const t = String(ticker).toUpperCase();
  return href ? (
    <Link href={`/company-research?q=${encodeURIComponent(t)}`} className={s.ticker}>
      {t}
    </Link>
  ) : (
    <span className={s.ticker}>{t}</span>
  );
}

/** A signed percentage in the mono font. The sign carries the meaning, so
 *  colour is never the only signal; a missing value reads N/A. */
export function DeltaValue({ value, digits = 2, label }) {
  const text = signedPct(value, digits);
  if (text == null) return <span className={`${s.delta} ${s.flat}`}>{label || 'N/A'}</span>;
  const n = Number(value);
  const cls = n > 0 ? s.up : n < 0 ? s.down : s.flat;
  return <span className={`${s.delta} ${cls}`}>{text}</span>;
}

const TREND = {
  hot: { cls: 'badgeHot', label: 'Hot' },
  rising: { cls: 'badgeRising', label: 'Rising' },
  popular: { cls: 'badgePopular', label: 'Popular' },
};
/** Hot, Rising or Popular as a word. No pill, no fill. */
export function TrendBadge({ kind }) {
  const t = TREND[kind] || TREND.popular;
  return <span className={`${s.badge} ${s[t.cls]}`}>{t.label}</span>;
}

export function StatTile({ value, label, extra }) {
  return (
    <div className={s.stat}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue}>
        {value}
        {extra}
      </div>
    </div>
  );
}

/**
 * A right-rail card with its own loading, error and empty states.
 *   state: { loading, error, reload }
 */
export function SectionCard({
  id,
  icon,
  title,
  action,
  meta,
  taskTarget,
  state,
  skeletonRows = 3,
  rowHeight = 44,
  children,
}) {
  return (
    <section
      className={s.card}
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      data-task-target={taskTarget}
    >
      <div className={s.cardHead}>
        <h2 className={s.cardTitle} id={id ? `${id}-title` : undefined}>
          <i className={`bi ${icon}`} aria-hidden="true" />
          {title}
        </h2>
        {action || (meta ? <span className={s.cardMeta}>{meta}</span> : null)}
      </div>
      {state?.loading ? (
        <div className={s.skelRows} aria-busy="true">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <div key={i} className={s.skel} style={{ height: rowHeight }} />
          ))}
        </div>
      ) : state?.error ? (
        <div className={s.cardError} role="alert">
          <span>Couldn&apos;t load this section.</span>
          <button type="button" className={`${s.btn} ${s.btnLink}`} onClick={state.reload}>
            Retry
          </button>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
