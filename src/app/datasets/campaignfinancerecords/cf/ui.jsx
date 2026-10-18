'use client';

/**
 * Shared building blocks for the Campaign Finance Intelligence page:
 * the one card wrapper every card uses (CFCardState), pills, section
 * headers, KPI cells, the member avatar and the member picker.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { resolveHeadshot } from '@/lib/politicians/headshots';
import { initials, partyOf, seatLabel } from './format';

/* ── card wrapper with the six data states ───────────────────────────── */

const STATE_COPY = {
  unavailable: 'Not available yet',
  empty: 'No records for this selection',
  error: 'This card could not load.',
};

/**
 * @param {object} p
 * @param {'loading'|'ready'|'partial'|'empty'|'unavailable'|'error'} [p.state]
 * @param {number} [p.span]   columns of the 12-column grid (desktop)
 * @param {number} [p.bodyHeight] reserved body height for non-ready states
 */
export function CFCardState({
  title,
  sub,
  actions = null,
  footer = null,
  state = 'ready',
  span = 12,
  bodyHeight = 160,
  onRetry,
  className = '',
  id,
  children,
}) {
  const headingId = useId();
  const live = state === 'ready' || state === 'partial';
  return (
    <section
      id={id}
      className={`cfi-card cfi-span-${span} ${className}`}
      aria-labelledby={headingId}
      aria-busy={state === 'loading' || undefined}
      data-state={state}
    >
      <div className="cfi-card-head">
        <div className="cfi-card-titles">
          <h3 id={headingId} className="cfi-card-title">
            {title}
          </h3>
          {sub ? <p className="cfi-card-sub">{sub}</p> : null}
        </div>
        {actions ? (
          <div className="cfi-card-actions" inert={state === 'unavailable' ? '' : undefined}>
            {actions}
          </div>
        ) : null}
      </div>

      {live ? (
        <div className="cfi-card-body">{children}</div>
      ) : (
        <div className="cfi-card-body cfi-card-body--state" style={{ minHeight: bodyHeight }}>
          {state === 'loading' ? (
            <div className="cfi-skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <p className="cfi-state-note" role={state === 'error' ? 'alert' : undefined}>
              {STATE_COPY[state]}
              {state === 'error' && onRetry ? (
                <button type="button" className="cfi-link-btn" onClick={onRetry}>
                  Try again
                </button>
              ) : null}
            </p>
          )}
        </div>
      )}

      {footer && live ? <div className="cfi-card-foot">{footer}</div> : null}
    </section>
  );
}

/** "Updated 3:37 PM ET · 538 of 538 members" */
export function CardFoot({ updated, covered, expected = 538, label = 'members', children }) {
  return (
    <>
      {updated ? (
        <span>
          Updated <b className="cfi-mono">{updated}</b>
        </span>
      ) : null}
      {covered != null ? (
        <span>
          <b className="cfi-mono">
            {covered} of {expected}
          </b>{' '}
          {label}
        </span>
      ) : null}
      {children}
    </>
  );
}

/* ── controls ─────────────────────────────────────────────────────────── */

/** A group of mutually exclusive pills. */
export function Pills({ label, value, onChange, options, size = 'md', className = '' }) {
  return (
    <div className={`cfi-pills cfi-pills--${size} ${className}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={`cfi-pill${value === o.key ? ' is-on' : ''}`}
          aria-pressed={value === o.key}
          disabled={o.disabled}
          title={o.disabled ? 'Not available yet' : undefined}
          onClick={() => onChange(o.key)}
        >
          {o.dot ? <i className={`cfi-dot ${o.dot}`} aria-hidden="true" /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SectionHeader({ num, title, question, id }) {
  return (
    <header className="cfi-section-head" id={id}>
      <span className="cfi-section-num cfi-mono">{num}</span>
      <h2 className="cfi-section-title">{title}</h2>
      <p className="cfi-section-q">{question}</p>
    </header>
  );
}

export function Kpi({ label, value, sub, tone, big = false }) {
  return (
    <div className={`cfi-kpi${big ? ' cfi-kpi--big' : ''}`}>
      <span className="cfi-eyebrow">{label}</span>
      <span className={`cfi-kpi-value cfi-mono${tone ? ` is-${tone}` : ''}`}>
        {value ?? <span className="cfi-na">Not available yet</span>}
      </span>
      {sub ? <span className="cfi-kpi-sub">{sub}</span> : null}
    </div>
  );
}

/** Horizontal bar, 0 to 1. */
export function Bar({ value, tone = 'emerald', label }) {
  const w = Math.max(0, Math.min(1, value || 0));
  return (
    <span className={`cfi-bar is-${tone}`} role={label ? 'img' : undefined} aria-label={label}>
      <span style={{ width: `${(w * 100).toFixed(2)}%` }} />
    </span>
  );
}

/* ── members ──────────────────────────────────────────────────────────── */

export function Avatar({ member, size = 28 }) {
  const shot = useMemo(
    () => resolveHeadshot({ name: member?.name, bioguideId: member?.id }),
    [member?.name, member?.id],
  );
  const [failed, setFailed] = useState(false);
  const p = partyOf(member?.party);
  return (
    <span
      className={`cfi-avatar ${p.cls}`}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size / 3)) }}
      aria-hidden="true"
    >
      {shot && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shot.src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        initials(member?.name)
      )}
    </span>
  );
}

export function PartyTag({ party, long = false }) {
  const p = partyOf(party);
  return (
    <span className={`cfi-party ${p.cls}`}>
      <i className="cfi-dot" aria-hidden="true" />
      {long ? p.word : p.code}
    </span>
  );
}

/**
 * A searchable member picker. `members` is the overview list; `value` a
 * bioguide ID. Keyboard: arrows move, Enter picks, Esc closes.
 */
export function MemberPicker({
  members,
  value,
  onChange,
  placeholder = 'Search member or state',
  allLabel,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);
  const listId = useId();
  const selected = members.find((m) => m.id === value) || null;

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s
      ? members.filter(
          (m) =>
            (m.name || '').toLowerCase().includes(s) ||
            (m.state || '').toLowerCase() === s ||
            (seatLabel(m) || '').toLowerCase().includes(s),
        )
      : members;
    return list.slice(0, 8);
  }, [members, q]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const pick = (id) => {
    onChange(id);
    setOpen(false);
    setQ('');
  };

  return (
    <div className="cfi-picker" ref={boxRef}>
      <i className="bi bi-search" aria-hidden="true" />
      <input
        className="cfi-picker-input"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={placeholder}
        placeholder={selected ? selected.name || placeholder : allLabel || placeholder}
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setHi(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Enter' && results[hi]) {
            e.preventDefault();
            pick(results[hi].id);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {allLabel && value ? (
        <button type="button" className="cfi-picker-clear" onClick={() => pick(null)}>
          {allLabel}
        </button>
      ) : null}
      {open && results.length ? (
        <ul className="cfi-picker-list" id={listId} role="listbox">
          {results.map((m, i) => (
            <li
              key={m.id}
              role="option"
              aria-selected={m.id === value}
              className={i === hi ? 'is-hi' : undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(m.id);
              }}
            >
              <Avatar member={m} size={22} />
              <span className="cfi-picker-name">{m.name}</span>
              <span className="cfi-mono cfi-muted">{seatLabel(m)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
