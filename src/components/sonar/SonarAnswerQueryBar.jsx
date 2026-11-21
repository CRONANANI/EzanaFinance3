'use client';

/**
 * SonarAnswerQueryBar (Nov 21 2026): the one Sonar query composer, at the top of every
 * answered Sonar page (the band's answer boards on /datasets and /sonar, and standard or deep
 * research runs). Adapted from the 21st.dev prompt composer to Ezana: plain JS, scoped CSS,
 * Bootstrap Icons, Ezana emerald accents, and no model selector.
 *
 *   field   the question (Enter sends, Shift+Enter is a new line), with a rotating hint
 *   +       add photos: each is read into text on the server (/api/sonar/attachment) and
 *           travels with the question as context
 *   Build   add charts from this answer, Quant Lab models, or saved EzanaQL queries as context
 *   Ping    send; while a ping is in flight it shows the loading state and is disabled
 *
 * Context only travels where the host can carry it (`contextEnabled`): the host then receives
 * onSubmit(q, context) with context = [{ kind, label, text }] and runs it as research with
 * the context attached. Without it, + and Build are not shown, so nothing a reader adds is
 * ever silently dropped. Guests see them disabled with a sign-in note.
 *
 * Presentation only: the host owns the submit path (auth, quota and the loader stay exactly
 * where they were). Styles: sonar-answer-query-bar.css (sqb-).
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { QUANT_MODELS } from '@/lib/quants/model-library';
import { useSonarPlan } from './useSonarPlan';
import './sonar-answer-query-bar.css';

const MAX_CONTEXT = 6;
const HINTS = [
  'Ask about a company, person, country or policy',
  'Try: How has this portfolio changed over the last year?',
  'Add a photo with + or a chart, model or saved query with Build',
];

const KIND_ICON = {
  photo: 'bi-image',
  chart: 'bi-bar-chart-line',
  model: 'bi-calculator',
  query: 'bi-terminal',
};

/** One attached item's text, as the research run receives it. */
export function contextText(items = []) {
  return items
    .filter((c) => c && c.status === 'ready' && c.text)
    .map((c) => `[${c.kind}] ${c.label}\n${c.text}`)
    .join('\n\n');
}

/**
 * value / onChange  a controlled field (the band); leave both out for an uncontrolled one
 * initial           the uncontrolled field's first value (the run's question)
 * onSubmit(q, ctx)  the host's ping path, with the trimmed question and the ready context
 * pending           a ping is in flight
 * inputRef          the host's ref to the field
 * contextEnabled    the host can carry photos and Build context with the question
 * charts            charts on this answer that can be added: [{ id, label, text }]
 */
export function SonarAnswerQueryBar({
  value,
  onChange,
  initial = '',
  onSubmit,
  pending = false,
  inputRef = null,
  label = 'Ask Sonar a question',
  placeholder = null,
  maxLength = 600,
  contextEnabled = false,
  charts = [],
}) {
  const id = useId();
  const own = useRef(null);
  const ref = inputRef || own;
  const fileRef = useRef(null);
  const menuRef = useRef(null);
  const buildRef = useRef(null);
  const plan = useSonarPlan();
  const guest = plan.isGuest;
  const controlled = typeof value === 'string';
  const [local, setLocal] = useState(initial || '');
  const current = controlled ? value : local;
  const set = (v) => (controlled ? onChange?.(v) : setLocal(v));
  const [context, setContext] = useState([]);
  const [menu, setMenu] = useState(false);
  const [saved, setSaved] = useState({ status: 'idle', items: [] });
  const [error, setError] = useState(null);
  const [hint, setHint] = useState(0);

  /* The hint rotates while the field is empty, unless motion is reduced. */
  useEffect(() => {
    if (current) return undefined;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    )
      return undefined;
    const t = window.setInterval(() => setHint((h) => (h + 1) % HINTS.length), 5000);
    return () => window.clearInterval(t);
  }, [current]);

  /* Grow the field with its text, up to five lines. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [current, ref]);

  /* The Build menu closes on Escape or a click outside it. */
  useEffect(() => {
    if (!menu) return undefined;
    const down = (e) => {
      if (!menuRef.current?.contains(e.target) && !buildRef.current?.contains(e.target))
        setMenu(false);
    };
    const key = (e) => {
      if (e.key === 'Escape') {
        setMenu(false);
        buildRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('keydown', key);
    };
  }, [menu]);

  /* Saved EzanaQL queries, read once when the menu first opens for a signed-in reader. */
  useEffect(() => {
    if (!menu || guest || saved.status !== 'idle') return;
    setSaved({ status: 'loading', items: [] });
    fetch('/api/ezanaql/saved', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        setSaved({
          status: d ? 'ready' : 'error',
          items: (d?.reports || []).slice(0, 12).map((r) => ({
            id: r.id,
            label: r.title || 'Saved query',
            text: [r.prompt ? `Question: ${r.prompt}` : null, `EzanaQL: ${r.query}`]
              .filter(Boolean)
              .join('\n'),
          })),
        }),
      )
      .catch(() => setSaved({ status: 'error', items: [] }));
  }, [menu, guest, saved.status]);

  const has = (key) => context.some((c) => c.key === key);
  const toggle = useCallback((item) => {
    setError(null);
    setContext((list) => {
      if (list.some((c) => c.key === item.key)) return list.filter((c) => c.key !== item.key);
      if (list.length >= MAX_CONTEXT) {
        setError(`Up to ${MAX_CONTEXT} items can be added to one question.`);
        return list;
      }
      return [...list, { ...item, status: 'ready' }];
    });
  }, []);

  const addPhotos = async (files) => {
    setError(null);
    const room = MAX_CONTEXT - context.length;
    const picked = Array.from(files || []).slice(0, Math.max(0, room));
    if (!picked.length) {
      if (files?.length) setError(`Up to ${MAX_CONTEXT} items can be added to one question.`);
      return;
    }
    for (const f of picked) {
      const key = `photo:${f.name}:${f.size}:${f.lastModified}`;
      setContext((list) => [...list, { key, kind: 'photo', label: f.name, status: 'reading' }]);
      try {
        const body = new FormData();
        body.append('file', f);
        const res = await fetch('/api/sonar/attachment', {
          method: 'POST',
          body,
          credentials: 'include',
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || 'That image could not be read.');
        setContext((list) =>
          list.map((c) => (c.key === key ? { ...c, status: 'ready', text: j.text } : c)),
        );
      } catch (e) {
        setContext((list) => list.filter((c) => c.key !== key));
        setError(e?.message || 'That image could not be read.');
      }
    }
  };

  const reading = context.some((c) => c.status === 'reading');
  const ready = context.filter((c) => c.status === 'ready');

  const submit = (e) => {
    e?.preventDefault();
    const q = String(current || '')
      .trim()
      .slice(0, maxLength);
    if (!q) {
      ref.current?.focus();
      return;
    }
    if (pending || reading) return;
    onSubmit?.(
      q,
      contextEnabled ? ready.map(({ kind, label: l, text }) => ({ kind, label: l, text })) : [],
    );
    setContext([]);
    setMenu(false);
  };

  const clear = () => {
    set('');
    setContext([]);
    setError(null);
    ref.current?.focus();
  };

  const models = useMemo(
    () =>
      QUANT_MODELS.map((m) => ({
        key: `model:${m.id}`,
        kind: 'model',
        label: m.name,
        text: [
          `${m.name} (${m.family})`,
          m.summary,
          m.equation ? `Equation: ${m.equation}` : null,
          m.breaks ? `Limits: ${m.breaks}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      })),
    [],
  );
  const chartItems = (Array.isArray(charts) ? charts : [])
    .filter((c) => c?.id && c?.label && c?.text)
    .map((c) => ({ key: `chart:${c.id}`, kind: 'chart', label: c.label, text: c.text }));

  const Option = ({ item }) => (
    <li>
      <button
        type="button"
        className={`sqb-opt${has(item.key) ? ' is-on' : ''}`}
        aria-pressed={has(item.key)}
        onClick={() => toggle(item)}
      >
        <i className={`bi ${KIND_ICON[item.kind]}`} aria-hidden="true" />
        <span className="sqb-opt-label">{item.label}</span>
        {has(item.key) ? <i className="bi bi-check-lg sqb-opt-check" aria-hidden="true" /> : null}
      </button>
    </li>
  );

  return (
    <form className="sqb" role="search" onSubmit={submit} aria-busy={pending || undefined}>
      {contextEnabled && context.length ? (
        <ul className="sqb-chips" aria-label="Added to this question">
          {context.map((c) => (
            <li key={c.key} className={`sqb-chip${c.status === 'reading' ? ' is-reading' : ''}`}>
              <i className={`bi ${KIND_ICON[c.kind]}`} aria-hidden="true" />
              <span className="sqb-chip-label">{c.label}</span>
              {c.status === 'reading' ? <span className="sqb-chip-note">Reading</span> : null}
              <button
                type="button"
                className="sqb-chip-x"
                aria-label={`Remove ${c.label}`}
                onClick={() => setContext((list) => list.filter((x) => x.key !== c.key))}
              >
                <i className="bi bi-x" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label htmlFor={id} className="sqb-label">
        {label}
      </label>
      <div className="sqb-field">
        <i className="bi bi-search sqb-icon" aria-hidden="true" />
        <textarea
          ref={ref}
          id={id}
          name="q"
          rows={1}
          className="sqb-input"
          autoComplete="off"
          maxLength={maxLength}
          value={current}
          placeholder={placeholder || HINTS[hint]}
          onChange={(e) => set(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
          }}
        />
      </div>

      <div className="sqb-bar">
        <div className="sqb-tools">
          {contextEnabled ? (
            <>
              <button
                type="button"
                className="sqb-pill sqb-add"
                aria-label="Add photos"
                title={guest ? 'Sign in to add photos' : 'Add photos'}
                disabled={guest}
                onClick={() => fileRef.current?.click()}
              >
                <i className="bi bi-plus-lg" aria-hidden="true" />
                <span className="sqb-add-label">Add photos</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="sqb-file"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  addPhotos(e.target.files);
                  e.target.value = '';
                }}
              />
              <div className="sqb-build-wrap">
                <button
                  ref={buildRef}
                  type="button"
                  className={`sqb-pill sqb-build${menu ? ' is-open' : ''}`}
                  aria-haspopup="true"
                  aria-expanded={menu}
                  aria-controls={`${id}-build`}
                  onClick={() => setMenu((m) => !m)}
                >
                  <i className="bi bi-bricks" aria-hidden="true" />
                  Build
                  <i className="bi bi-chevron-down sqb-chev" aria-hidden="true" />
                </button>
                {menu ? (
                  <div
                    id={`${id}-build`}
                    ref={menuRef}
                    className="sqb-menu"
                    role="group"
                    aria-label="Add context"
                  >
                    <p className="sqb-menu-head">Add to this question</p>
                    {chartItems.length ? (
                      <>
                        <p className="sqb-menu-group">Charts on this answer</p>
                        <ul className="sqb-menu-list">
                          {chartItems.map((it) => (
                            <Option key={it.key} item={it} />
                          ))}
                        </ul>
                      </>
                    ) : null}
                    <p className="sqb-menu-group">Saved EzanaQL queries</p>
                    {guest ? (
                      <p className="sqb-menu-note">Sign in to add your saved queries.</p>
                    ) : saved.status === 'loading' ? (
                      <p className="sqb-menu-note">Loading your saved queries</p>
                    ) : saved.status === 'error' ? (
                      <p className="sqb-menu-note">Your saved queries could not be loaded.</p>
                    ) : saved.items.length ? (
                      <ul className="sqb-menu-list">
                        {saved.items.map((q) => (
                          <Option
                            key={q.id}
                            item={{
                              key: `query:${q.id}`,
                              kind: 'query',
                              label: q.label,
                              text: q.text,
                            }}
                          />
                        ))}
                      </ul>
                    ) : (
                      <p className="sqb-menu-note">
                        No saved queries yet. Save one from a dataset hub.
                      </p>
                    )}
                    <p className="sqb-menu-group">Quant Lab models</p>
                    <ul className="sqb-menu-list sqb-menu-list--models">
                      {models.map((it) => (
                        <Option key={it.key} item={it} />
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
        <div className="sqb-actions">
          {current || context.length ? (
            <button type="button" className="sqb-clear" onClick={clear}>
              Clear
            </button>
          ) : null}
          <button
            type="submit"
            className="sqb-ping"
            disabled={pending || reading}
            aria-busy={pending || undefined}
          >
            <i
              className={`bi ${pending ? 'bi-arrow-repeat sqb-spin' : 'bi-broadcast'}`}
              aria-hidden="true"
            />
            {pending ? 'Pinging' : 'Ping'}
          </button>
        </div>
      </div>
      {error ? (
        <p className="sqb-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export default SonarAnswerQueryBar;
