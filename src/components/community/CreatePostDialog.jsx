'use client';

/**
 * Create Post (Community v3, Nov 23 2026): an accessible dialog that wraps the
 * existing composer (EvoComposer: title, body, topic, tickers and chart, image,
 * poll, terms gate) with what the redesign adds:
 *   - a post type (Discussion, Research Analysis, Investment Thesis, Market
 *     Insight, Research Question, Sonar Research Share, Echo Discussion, and
 *     the partner and admin types), gated here and again on the server;
 *   - a structured starting template for the research types;
 *   - a picker for a saved Sonar report the member has already made public by
 *     link (nothing private is listed), or a published Echo article;
 *   - supporting sources, appended to the post as a list;
 *   - Write / Preview, and a draft per type kept in this browser.
 * Quant Lab strategies are listed but not selectable: backtests have no public
 * share representation yet, and the dialog says so rather than faking one.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import s from '@/app/(dashboard)/community/community.module.css';
import { EvoComposer } from '@/components/community/redesign_v2/EvoComposer';
import { COMPOSER_TYPES, canUseType, composerTypeFor } from '@/lib/community/v3';

const DRAFT_PREFIX = 'ezana:community:draft:';

function useFocusTrap(open, ref, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const els = ref.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"])',
      );
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, ref, onClose]);
}

/** Saved Sonar reports that are already public by link. */
function SonarPicker({ value, onChange }) {
  const [state, setState] = useState({ loading: true, items: [], error: '' });
  useEffect(() => {
    let alive = true;
    fetch('/api/sonar/saved?limit=50', { credentials: 'include' })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!alive) return;
        if (!ok) throw new Error(d.error || 'Could not load your saved research.');
        setState({ loading: false, items: (d.items || []).filter((i) => i.shared), error: '' });
      })
      .catch((e) => alive && setState({ loading: false, items: [], error: e.message }));
    return () => {
      alive = false;
    };
  }, []);
  if (state.loading) return <p className={s.cv3Note}>Loading your saved research…</p>;
  if (state.error) return <p className={s.formError}>{state.error}</p>;
  if (!state.items.length) {
    return (
      <p className={s.cv3Note}>
        Only Sonar reports you have made public by link can be shared here. Open a saved report in{' '}
        <Link href="/sonar">Sonar</Link>, choose Share, then come back.
      </p>
    );
  }
  return (
    <div className={s.cv3Field}>
      <label htmlFor="cv3-sonar">Sonar report</label>
      <select
        id="cv3-sonar"
        className={s.cv3Select}
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Choose a shared report</option>
        {state.items.map((i) => (
          <option key={i.id} value={i.id}>
            {(i.title || i.question || 'Untitled report').slice(0, 90)}
            {i.ticker ? ` (${i.ticker})` : ''}
          </option>
        ))}
      </select>
      <p className={s.cv3Note}>
        The post links to the public share page. Your notes, controls and other saved reports stay
        private.
      </p>
    </div>
  );
}

/** Published Echo articles, searchable by title. */
function EchoPicker({ value, onChange }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    const ctrl = new AbortController();
    setBusy(true);
    const t = setTimeout(() => {
      fetch(`/api/echo/articles?search=${encodeURIComponent(q.trim())}`, {
        credentials: 'include',
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then((d) => setItems(d.articles || []))
        .catch(() => {})
        .finally(() => setBusy(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);
  return (
    <div className={s.cv3Field}>
      <label htmlFor="cv3-echo-q">Ezana Echo article</label>
      <input
        id="cv3-echo-q"
        className={s.cv3Input}
        type="search"
        placeholder="Search articles"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul className={s.cv3PickList} aria-busy={busy}>
        {items.slice(0, 6).map((a) => (
          <li key={a.article_slug}>
            <button
              type="button"
              aria-pressed={value === a.article_slug}
              onClick={() => onChange(value === a.article_slug ? null : a.article_slug)}
            >
              <span className={s.ellipsis}>{a.article_title}</span>
              {a.read_time_minutes ? (
                <span className={s.cv3PickMeta}>{a.read_time_minutes} min read</span>
              ) : null}
            </button>
          </li>
        ))}
        {!busy && !items.length ? (
          <li className={s.cv3Note}>No published articles match.</li>
        ) : null}
      </ul>
    </div>
  );
}

export function CreatePostDialog({
  open,
  onClose,
  topics,
  defaultTopic,
  initialType = 'discussion',
  who = {},
  onPosted,
}) {
  const ref = useRef(null);
  const [type, setType] = useState(initialType);
  const [sonarId, setSonarId] = useState(null);
  const [echoSlug, setEchoSlug] = useState(null);
  const [sources, setSources] = useState('');
  useFocusTrap(open, ref, onClose);

  useEffect(() => {
    if (open) setType(canUseType(initialType, who) ? initialType : 'discussion');
  }, [open, initialType, who]);
  useEffect(() => {
    setSonarId(null);
    setEchoSlug(null);
  }, [type]);

  const available = useMemo(() => COMPOSER_TYPES.filter((t) => canUseType(t.key, who)), [who]);
  const def = composerTypeFor(type) || COMPOSER_TYPES[0];

  const extraBody = useMemo(() => {
    if (def.attach === 'sonar') return sonarId ? { attachment: { saved_id: sonarId } } : null;
    if (def.attach === 'echo') return echoSlug ? { attachment: { slug: echoSlug } } : null;
    return null;
  }, [def.attach, sonarId, echoSlug]);

  const sourceLines = sources
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 10);
  const appendText = sourceLines.length
    ? `**Sources**\n${sourceLines.map((l) => `- ${l}`).join('\n')}`
    : '';

  if (!open) return null;
  const needsPick = def.attach && !extraBody;

  return (
    <div
      className={s.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`${s.dialog} ${s.cv3Dialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv3-create-title"
        ref={ref}
      >
        <div className={s.dialogHead}>
          <h2 className={s.dialogTitle} id="cv3-create-title">
            Create post
          </h2>
          <button type="button" className={s.iconBtn} aria-label="Close" onClick={onClose}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className={s.cv3Field}>
          <label htmlFor="cv3-type">Post type</label>
          <select
            id="cv3-type"
            className={s.cv3Select}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {available.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
            <option value="quant" disabled>
              Quant Lab Strategy Share (not available yet)
            </option>
          </select>
          {def.hint ? <p className={s.cv3Note}>{def.hint}</p> : null}
          {type === 'thesis' ? (
            <p className={s.cv3Note}>
              Shown with a label that it is a member&apos;s view, not verified financial advice.
            </p>
          ) : null}
        </div>

        {def.attach === 'sonar' ? <SonarPicker value={sonarId} onChange={setSonarId} /> : null}
        {def.attach === 'echo' ? <EchoPicker value={echoSlug} onChange={setEchoSlug} /> : null}

        <EvoComposer
          key={type}
          kind={type}
          extraBody={extraBody}
          titleRequired={def.titleRequired !== false}
          template={def.template || ''}
          draftKey={`${DRAFT_PREFIX}${type}`}
          appendText={appendText}
          topics={topics}
          defaultTopic={defaultTopic || ''}
          onPosted={onPosted}
          autoFocusTitle
        />
        {needsPick ? (
          <p className={s.cv3Note} role="status">
            {def.attach === 'sonar'
              ? 'Choose a shared Sonar report above to attach it.'
              : 'Choose an article above to attach it.'}
          </p>
        ) : null}

        <div className={s.cv3Field}>
          <label htmlFor="cv3-sources">Supporting sources (optional, one link per line)</label>
          <textarea
            id="cv3-sources"
            className={s.cv3Input}
            rows={2}
            value={sources}
            onChange={(e) => setSources(e.target.value)}
            placeholder="https://"
          />
        </div>
        <p className={s.cv3Note}>Drafts are kept in this browser until you publish.</p>
      </div>
    </div>
  );
}
