'use client';

/**
 * Community page primitives (Nov 2026): StatTile, SectionCard, TickerChip,
 * DeltaValue, TrendBadge, Avatar, VerifiedBadge, CountPill. Styles in
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

export function CountPill({ value }) {
  if (value == null) return null;
  return <span className={s.countPill}>{value}</span>;
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

/** Arrow icon plus a signed percentage; colour is never the only signal. */
export function DeltaValue({ value, digits = 2, label }) {
  const text = signedPct(value, digits);
  if (text == null) return <span className={`${s.delta} ${s.flat}`}>{label || 'n/a'}</span>;
  const n = Number(value);
  const cls = n > 0 ? s.up : n < 0 ? s.down : s.flat;
  const icon = n > 0 ? 'bi-arrow-up-right' : n < 0 ? 'bi-arrow-down-right' : 'bi-dash';
  return (
    <span className={`${s.delta} ${cls}`}>
      <i className={`bi ${icon}`} aria-hidden="true" />
      {text}
    </span>
  );
}

const TREND = {
  hot: { cls: 'badgeHot', icon: 'bi-fire', label: 'Hot' },
  rising: { cls: 'badgeRising', icon: 'bi-arrow-up', label: 'Rising' },
  popular: { cls: 'badgePopular', icon: 'bi-arrow-up-right', label: 'Popular' },
};
export function TrendBadge({ kind }) {
  const t = TREND[kind] || TREND.popular;
  return (
    <span className={`${s.badge} ${s[t.cls]}`}>
      <i className={`bi ${t.icon}`} aria-hidden="true" />
      {t.label}
    </span>
  );
}

export function StatTile({ icon, value, label, extra }) {
  return (
    <div className={s.stat}>
      <span className={s.statIcon} aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className={s.statValue}>
          {value}
          {extra}
        </div>
        <div className={s.statLabel}>{label}</div>
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
  state,
  skeletonRows = 3,
  rowHeight = 44,
  children,
}) {
  return (
    <section className={s.card} id={id} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className={s.cardHead}>
        <h2 className={s.cardTitle} id={id ? `${id}-title` : undefined}>
          <i className={`bi ${icon}`} aria-hidden="true" />
          {title}
        </h2>
        {action}
      </div>
      {state?.loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-busy="true">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <div key={i} className={s.skel} style={{ height: rowHeight }} />
          ))}
        </div>
      ) : state?.error ? (
        <div className={s.cardError} role="alert">
          <span>Couldn&apos;t load this section.</span>
          <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={state.reload}>
            <i className="bi bi-arrow-clockwise" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
