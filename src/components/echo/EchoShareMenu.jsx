'use client';

/**
 * EchoShareMenu (Nov 25 2026): the Echo article share card.
 *
 * A popover anchored to its trigger: a header with the article it shares, four
 * ways to share (copy link, email, message, and the device's own share sheet
 * where there is one), and the link itself in a read-only field with its own
 * copy button. Every action confirms what happened in the card, since copying
 * and handing off to a mail or messages app otherwise leave no trace.
 *
 * Rendered in a portal and positioned against the viewport, so a parent with
 * hidden overflow cannot clip it; it flips above the trigger when there is no
 * room below and follows the trigger on scroll. Escape or a click outside
 * closes it and returns focus to the trigger. Plain JS, page-scoped CSS,
 * tokens only, Bootstrap Icons.
 *
 *   <EchoShareMenu title={article.title} url={url} onShared={(method) => ...}>
 *     {({ ref, open, toggle }) => <button ref={ref} onClick={toggle} ... />}
 *   </EchoShareMenu>
 */

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './echo-share-menu.css';

const WIDTH = 320;
const GAP = 8;
const EDGE = 12;

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the selection copy */
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    el.remove();
    return ok;
  } catch {
    return false;
  }
}

export function EchoShareMenu({ title, url, onShared, children }) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ top: 0, left: 0, above: false });
  const [note, setNote] = useState(null);
  const [canNative, setCanNative] = useState(false);
  const triggerRef = useRef(null);
  const cardRef = useRef(null);
  const uid = useId();
  /* A path is made absolute on the client (the card only renders after a click). */
  const href =
    url && url.startsWith('/') && typeof window !== 'undefined'
      ? `${window.location.origin}${url}`
      : url || (typeof window !== 'undefined' ? window.location.href : '');

  useEffect(() => {
    setCanNative(
      typeof navigator !== 'undefined' &&
        (typeof navigator.share === 'function' || Boolean(window.Capacitor?.isNativePlatform?.())),
    );
  }, []);

  const place = useCallback(() => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const h = cardRef.current?.offsetHeight ?? 380;
    const below = window.innerHeight - r.bottom;
    const above = below < h + GAP + EDGE && r.top > below;
    const left = Math.max(
      EDGE,
      Math.min(r.left + r.width / 2 - WIDTH / 2, window.innerWidth - WIDTH - EDGE),
    );
    setBox({ top: above ? Math.max(EDGE, r.top - GAP - h) : r.bottom + GAP, left, above });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    const id = window.requestAnimationFrame(place);
    return () => window.cancelAnimationFrame(id);
  }, [open, place]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setNote(null);
    if (refocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => {
      if (triggerRef.current?.contains(e.target) || cardRef.current?.contains(e.target)) return;
      close(false);
    };
    const key = (e) => {
      if (e.key === 'Escape') close(true);
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('touchstart', away, { passive: true });
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    /* focus the first action so the card is usable from the keyboard */
    const f = window.requestAnimationFrame(() =>
      cardRef.current?.querySelector('.esm-option')?.focus(),
    );
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('touchstart', away);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      window.cancelAnimationFrame(f);
    };
  }, [open, place, close]);

  useEffect(() => {
    if (!note) return undefined;
    const t = window.setTimeout(() => setNote(null), 2400);
    return () => window.clearTimeout(t);
  }, [note]);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  const doCopy = async (method) => {
    const ok = await copyText(href);
    setNote(
      ok
        ? { tone: 'done', text: 'Link copied to clipboard' }
        : { tone: 'error', text: 'Could not copy. Select the link below.' },
    );
    if (ok) onShared?.(method);
  };

  const subject = title || 'Ezana Echo';
  const body = `${subject}\n\n${href}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const smsHref = `sms:?&body=${encodeURIComponent(`${subject} ${href}`)}`;

  const doNative = async () => {
    try {
      if (window.Capacitor?.isNativePlatform?.()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title: subject, url: href, dialogTitle: subject });
      } else {
        await navigator.share({ title: subject, url: href });
      }
      onShared?.('native');
      close(true);
    } catch (err) {
      const msg = String(err?.message || err?.name || '');
      if (!/abort|cancel/i.test(msg))
        setNote({ tone: 'error', text: 'Could not open the share sheet.' });
    }
  };

  const card = open ? (
    <div
      ref={cardRef}
      id={uid}
      role="dialog"
      aria-label="Share this article"
      className={`esm-card${box.above ? ' esm-card--above' : ''}`}
      style={{ top: box.top, left: box.left, width: WIDTH }}
    >
      <div className="esm-head">
        <div className="esm-head-text">
          <p className="esm-title">Share this article</p>
          {title ? <p className="esm-sub">{title}</p> : null}
        </div>
        <button type="button" className="esm-close" aria-label="Close" onClick={() => close(true)}>
          <i className="bi bi-x-lg" aria-hidden />
        </button>
      </div>

      <div className="esm-options">
        <button type="button" className="esm-option" onClick={() => doCopy('link')}>
          <span className="esm-icon">
            <i className="bi bi-link-45deg" aria-hidden />
          </span>
          <span className="esm-option-text">
            <span className="esm-option-label">Copy link</span>
            <span className="esm-option-hint">Paste it anywhere</span>
          </span>
        </button>
        <a
          className="esm-option"
          href={mailHref}
          onClick={() => {
            onShared?.('email');
            close(false);
          }}
        >
          <span className="esm-icon">
            <i className="bi bi-envelope" aria-hidden />
          </span>
          <span className="esm-option-text">
            <span className="esm-option-label">Email</span>
            <span className="esm-option-hint">Opens your mail app with the link</span>
          </span>
        </a>
        <a
          className="esm-option"
          href={smsHref}
          onClick={() => {
            onShared?.('message');
            close(false);
          }}
        >
          <span className="esm-icon">
            <i className="bi bi-chat-dots" aria-hidden />
          </span>
          <span className="esm-option-text">
            <span className="esm-option-label">Message</span>
            <span className="esm-option-hint">Send it by text message</span>
          </span>
        </a>
        {canNative ? (
          <button type="button" className="esm-option" onClick={doNative}>
            <span className="esm-icon">
              <i className="bi bi-box-arrow-up" aria-hidden />
            </span>
            <span className="esm-option-text">
              <span className="esm-option-label">More options</span>
              <span className="esm-option-hint">Your device&apos;s share sheet</span>
            </span>
          </button>
        ) : null}
      </div>

      <div className="esm-foot">
        <label className="esm-url-label" htmlFor={`${uid}-url`}>
          Share URL
        </label>
        <div className="esm-url-row">
          <input
            id={`${uid}-url`}
            className="esm-url"
            value={href}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            className="esm-url-copy"
            aria-label="Copy share URL"
            onClick={() => doCopy('link')}
          >
            <i className={`bi ${note?.tone === 'done' ? 'bi-check2' : 'bi-copy'}`} aria-hidden />
          </button>
        </div>
        <p className={`esm-note${note ? ` is-${note.tone}` : ''}`} role="status" aria-live="polite">
          {note ? (
            <>
              {note.tone === 'done' ? <i className="bi bi-check2" aria-hidden /> : null}
              {note.text}
            </>
          ) : null}
        </p>
      </div>
    </div>
  ) : null;

  return (
    <>
      {children({
        ref: triggerRef,
        open,
        toggle,
        triggerProps: {
          'aria-haspopup': 'dialog',
          'aria-expanded': open,
          'aria-controls': open ? uid : undefined,
        },
      })}
      {typeof document !== 'undefined' && card ? createPortal(card, document.body) : null}
    </>
  );
}

export default EchoShareMenu;
