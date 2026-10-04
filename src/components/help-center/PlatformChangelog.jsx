'use client';

/**
 * Platform changelog + feedback, the last section of the support centre
 * (both audiences, both states). Left: the newest published changelog
 * entries from /api/help-center/changelog, with Show more. Right: a short
 * feedback form (platform, a product, or support) posting to
 * /api/help-center/platform-feedback; on success it says which team has the
 * message. Signed-in visitors are not asked for an email: the API takes it
 * from their session.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth-context';
import { Input, Select, Textarea } from '@/components/ds';
import { FEEDBACK_AREAS, FEEDBACK_PRODUCTS } from '@/lib/help-center/feedback-routing';

const PAGE = 6;
const MAX = 2000;

const CATEGORY_LABEL = {
  feature: 'NEW',
  improvement: 'IMPROVED',
  fix: 'FIXED',
  design: 'DESIGN',
  content: 'CONTENT',
  announcement: 'NEWS',
  breaking: 'CHANGED',
};

/** Changelog bodies are light markdown; the list shows plain text. */
function plain(md) {
  return String(md || '')
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function Entry({ e }) {
  const [open, setOpen] = useState(false);
  /* Read more only when the two-line clamp actually hides text; measured,
     so it follows the column width rather than a character count. */
  const [clipped, setClipped] = useState(false);
  const bodyRef = useRef(null);
  const text = plain(e.body);
  const bodyId = `hcs-cl-body-${e.id}`;
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || open) return undefined;
    const check = () => setClipped(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, open]);
  return (
    <li className="hcs-cl-entry">
      <div className="hcs-cl-meta">
        <time className="hcs-mono hcs-cl-date" dateTime={e.releasedAt}>
          {fmtDate(e.releasedAt)}
        </time>
        <span className={`hcs-mono hcs-cl-tag hcs-cl-tag--${e.category}`}>
          {CATEGORY_LABEL[e.category] || 'UPDATE'}
        </span>
      </div>
      <div className="hcs-cl-text">
        <h3 className="hcs-cl-title">{e.title}</h3>
        <p ref={bodyRef} id={bodyId} className={`hcs-cl-body${open ? ' is-open' : ''}`}>
          {text}
        </p>
        {clipped || open ? (
          <button
            type="button"
            className="hcs-link hcs-cl-more"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Show less' : 'Read more'}
          </button>
        ) : null}
      </div>
    </li>
  );
}

function Feedback() {
  const { isAuthenticated } = useAuth() || {};
  const uid = useId();
  const [area, setArea] = useState('platform');
  const [product, setProduct] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [state, setState] = useState({ phase: 'idle' }); // idle | sending | sent | error

  const submit = async (ev) => {
    ev.preventDefault();
    setState({ phase: 'sending' });
    try {
      const res = await fetch('/api/help-center/platform-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area,
          product: area === 'product' ? product : undefined,
          message,
          email: isAuthenticated ? undefined : email,
          page: typeof window !== 'undefined' ? window.location.pathname : undefined,
          website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setState({ phase: 'sent', team: data.team || FEEDBACK_AREAS[area].team });
        return;
      }
      if (res.status === 429) {
        setState({
          phase: 'error',
          message: 'You have sent a few already. Try again in a few minutes.',
        });
        return;
      }
      setState({
        phase: 'error',
        message: data.error || 'We could not send your feedback. Please try again.',
        errors: data.errors || {},
      });
    } catch {
      setState({ phase: 'error', message: 'We could not send your feedback. Please try again.' });
    }
  };

  if (state.phase === 'sent') {
    return (
      <div className="hcs-fb hcs-fb--sent" role="status" aria-live="polite">
        <span className="hcs-tile hcs-tile--36" aria-hidden="true">
          <i className="bi bi-check2" />
        </span>
        <h3 className="hcs-h2">Thanks, it&apos;s on its way</h3>
        <p>
          Your message has gone to our {state.team}, who will receive and review it.
          {!isAuthenticated && email
            ? ` If they need more detail, they will reply to ${email}.`
            : ''}
        </p>
        <button
          type="button"
          className="hcs-btn hcs-btn--secondary"
          onClick={() => {
            setMessage('');
            setState({ phase: 'idle' });
          }}
        >
          Send more feedback
        </button>
      </div>
    );
  }

  const errs = state.errors || {};
  const sending = state.phase === 'sending';
  const tooShort = message.trim().length < 10;
  return (
    <form className="hcs-fb" onSubmit={submit} noValidate aria-labelledby={`${uid}-t`}>
      <h3 id={`${uid}-t`} className="hcs-h2">
        Share feedback
      </h3>
      <p className="hcs-fb-sub">
        Tell us what is working and what is not. It goes straight to the team that owns it.
      </p>

      <fieldset className="hcs-fb-areas">
        <legend className="hcs-mono-label">ABOUT</legend>
        {Object.entries(FEEDBACK_AREAS).map(([key, a]) => (
          <label key={key} className={`hcs-fb-area${area === key ? ' is-on' : ''}`}>
            <input
              type="radio"
              name={`${uid}-area`}
              value={key}
              checked={area === key}
              onChange={() => setArea(key)}
            />
            <span className="hcs-fb-area-name">{a.label}</span>
            <span className="hcs-fb-area-hint">{a.hint}</span>
          </label>
        ))}
      </fieldset>

      {area === 'product' ? (
        <Select
          id={`${uid}-product`}
          label="Product"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          error={errs.product}
          options={[{ value: '', label: 'Choose a product' }, ...FEEDBACK_PRODUCTS]}
        />
      ) : null}

      <div className="hcs-fb-field">
        <Textarea
          id={`${uid}-message`}
          label="Your feedback"
          rows={4}
          maxLength={MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What happened, what you expected, or what you would like to see"
          error={errs.message}
          aria-describedby={`${uid}-count`}
          required
        />
        <span id={`${uid}-count`} className="hcs-fb-count hcs-mono">
          {message.length}/{MAX}
        </span>
      </div>

      {!isAuthenticated ? (
        <Input
          id={`${uid}-email`}
          label="Email (optional, for a reply)"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errs.email}
        />
      ) : null}

      {/* Honeypot: hidden from people and assistive tech. */}
      <input
        className="hcs-fb-hp"
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />

      {state.phase === 'error' ? (
        <p className="hcs-fb-err" role="alert">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        className="hcs-btn hcs-btn--primary hcs-fb-send"
        disabled={sending || tooShort || (area === 'product' && !product)}
      >
        {sending ? 'Sending' : 'Send feedback'}
        <i
          className={`bi ${sending ? 'bi-arrow-repeat hcs-spin' : 'bi-send'}`}
          aria-hidden="true"
        />
      </button>
    </form>
  );
}

export default function PlatformChangelog() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [phase, setPhase] = useState('loading'); // loading | ready | more | error

  const load = useCallback(async (offset) => {
    setPhase(offset ? 'more' : 'loading');
    try {
      const r = await fetch(`/api/help-center/changelog?limit=${PAGE}&offset=${offset}`);
      const d = await r.json();
      if (!d.ok) throw new Error('unavailable');
      setEntries((prev) => (offset ? [...prev, ...d.entries] : d.entries));
      setTotal(d.total || 0);
      setPhase('ready');
    } catch {
      setPhase(offset ? 'ready' : 'error');
    }
  }, []);

  useEffect(() => {
    load(0);
  }, [load]);

  return (
    <section className="hcs-cl" aria-labelledby="hcs-cl-title">
      <div className="hcs-cl-log">
        <div className="hcs-sec-head">
          <h2 id="hcs-cl-title" className="hcs-h2">
            Platform changelog
          </h2>
          <span className="hcs-cap">what shipped recently</span>
        </div>

        {phase === 'loading' ? (
          <ul className="hcs-cl-list" aria-hidden="true">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="hcs-cl-entry">
                <span className="hcs-skel hcs-skel--line hcs-skel--w40" />
                <span className="hcs-skel hcs-skel--line" />
              </li>
            ))}
          </ul>
        ) : phase === 'error' || !entries.length ? (
          <p className="hcs-cl-empty">The changelog is not available right now.</p>
        ) : (
          <>
            <ol className="hcs-cl-list">
              {entries.map((e) => (
                <Entry key={e.id} e={e} />
              ))}
            </ol>
            {entries.length < total ? (
              <button
                type="button"
                className="hcs-btn hcs-btn--secondary hcs-cl-load"
                onClick={() => load(entries.length)}
                disabled={phase === 'more'}
              >
                {phase === 'more' ? 'Loading' : 'Show more updates'}
              </button>
            ) : null}
          </>
        )}
      </div>

      <aside className="hcs-cl-side">
        <Feedback />
      </aside>
    </section>
  );
}
