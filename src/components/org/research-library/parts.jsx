'use client';

import { useEffect, useRef, useState } from 'react';
import {
  NA,
  STATUS_ICON,
  cleanTitle,
  docTypeLabel,
  statusLabel,
} from '@/lib/org-research-library-model';

/** Status as text with an icon, never colour alone. */
export function StatusText({ status }) {
  return (
    <span className={`orl-status orl-status--${status || 'none'}`}>
      <i className={`bi ${STATUS_ICON[status] || 'bi-circle'}`} aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}

/** The flags a document carries, as text with an icon. */
export function Flags({ note, withType = false }) {
  const items = [];
  if (withType) items.push(<span key="t">{docTypeLabel(note.doc_type)}</span>);
  if (note.ticker && withType)
    items.push(
      <span key="k" className="orl-mono orl-ticker">
        {note.ticker}
      </span>,
    );
  if (note.is_exemplar)
    items.push(
      <span key="e" className="orl-gold">
        <i className="bi bi-award" aria-hidden="true" />
        Exemplar
      </span>,
    );
  if (note.is_alum_authored)
    items.push(
      <span key="a" className="orl-flag">
        <i className="bi bi-mortarboard" aria-hidden="true" />
        Alum
      </span>,
    );
  return items.length ? <span className="orl-flags">{items}</span> : null;
}

/** A document title that opens the document panel. Hover is a colour change. */
export function OpenTitle({ note, onOpen, tab = null }) {
  const title = cleanTitle(note.title);
  return (
    <button
      type="button"
      className={`orl-open${note.status === 'superseded' || note.status === 'archived' ? ' is-dim' : ''}`}
      onClick={() => onOpen(note.id, tab)}
      title={title}
    >
      {title}
    </button>
  );
}

/** A pin slot so titles line up whether a row is pinned or not. */
export function PinSlot({ pinned }) {
  return (
    <span className="orl-pin" aria-hidden={!pinned}>
      {pinned ? (
        <>
          <i className="bi bi-pin-angle-fill" aria-hidden="true" />
          <span className="tcc-sr">Pinned</span>
        </>
      ) : null}
    </span>
  );
}

export function Mono({ children, className = '' }) {
  return <span className={`orl-mono ${className}`.trim()}>{children ?? NA}</span>;
}

/**
 * A multi-select filter: a text trigger and a menu of values with live counts.
 * The library's Dropdown closes on every click, which a multi-select cannot
 * do, so this menu is kept here; it uses the library's menu surface.
 */
export function FilterMenu({ label, options, selected, onToggle, onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const btn = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const chosen = options.filter((o) => selected.includes(o.value));
  const text =
    chosen.length === 0
      ? label
      : chosen.length === 1
        ? `${label}: ${chosen[0].label}`
        : `${label}: ${chosen.length}`;
  return (
    <div className="orl-filter" ref={ref}>
      <button
        ref={btn}
        type="button"
        className={`tcc-toggle orl-filter__btn${chosen.length ? ' is-on' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="orl-filter__text">{text}</span>
        <i className="bi bi-chevron-down orl-filter__chev" aria-hidden="true" />
      </button>
      {open && (
        <div className="ds-menu orl-menu" role="group" aria-label={`${label} filter`}>
          {options.length === 0 ? (
            <p className="orl-menu__empty">No values in this list</p>
          ) : (
            options.map((o) => {
              const on = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={on}
                  className={`ds-menu-item orl-menu__item${on ? ' is-on' : ''}`}
                  onClick={() => onToggle(o.value)}
                >
                  <i className={`bi ${on ? 'bi-check2-square' : 'bi-square'}`} aria-hidden="true" />
                  <span className="orl-menu__label">{o.label}</span>
                  <span className="orl-mono orl-menu__count">{o.count}</span>
                </button>
              );
            })
          )}
          {chosen.length > 0 && (
            <button type="button" className="tcc-textbtn orl-menu__clear" onClick={onClear}>
              Clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** One-line message under an action: success or failure, with Retry when asked. */
export function ActionMessage({ msg, onRetry, onDismiss }) {
  if (!msg) return null;
  const err = msg.tone === 'error';
  return (
    <p className={`orl-msg${err ? ' orl-msg--error' : ''}`} role={err ? 'alert' : 'status'}>
      <i
        className={`bi ${err ? 'bi-exclamation-circle' : 'bi-check2-circle'}`}
        aria-hidden="true"
      />
      <span>{msg.text}</span>
      {err && onRetry && msg.retry ? (
        <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onRetry}>
          Retry
        </button>
      ) : null}
      {onDismiss ? (
        <button type="button" className="tcc-textbtn" onClick={onDismiss}>
          Dismiss
        </button>
      ) : null}
    </p>
  );
}

/* Server messages a member can cause, in plain words. Anything else gets the
   fallback, so no internal text reaches the page. */
export function say(error, fallback) {
  const e = String(error || '');
  if (!e) return fallback;
  if (e === 'connect' || /connect/i.test(e)) return 'Could not connect. Nothing was changed.';
  if (/approve_deliverables/i.test(e))
    return 'Publishing another member’s work needs the approval right.';
  if (/upload_deliverables/i.test(e)) return 'Your role cannot attach files.';
  if (/25 MB/i.test(e)) return 'That file is over the 25 MB limit.';
  if (/empty/i.test(e)) return 'That file is empty.';
  if (/type not allowed|not allowed for|file type/i.test(e))
    return 'That file type is not accepted.';
  if (/Title and body/i.test(e)) return 'A title and a body are required.';
  if (/Pitch not found/i.test(e)) return 'That pitch could not be linked.';
  if (/Not found/i.test(e)) return 'This document is no longer available.';
  if (/Not allowed|Only faculty|permission/i.test(e)) return 'Your role cannot take this step.';
  if (/Ticker required/i.test(e)) return 'Enter a ticker.';
  if (/Comment body/i.test(e)) return 'Write a comment first.';
  return fallback;
}
