'use client';

/**
 * SonarAnswerQueryBar (Nov 21 2026): the one Sonar query composer, at the top of every
 * answered Sonar page (the band's answer boards on /datasets and /sonar, and standard or deep
 * research runs). Adapted from the 21st.dev prompt composer to Ezana: plain JS, scoped CSS,
 * Bootstrap Icons, Ezana emerald accents, and no model selector.
 *
 *   field   the question (Enter sends), with a rotating hint; one row, 40px tall, the same
 *           height as the tools row beside it
 *   +       add photos: each is read into text on the server (/api/sonar/attachment) and
 *           travels with the question as context
 *   Build   "Build your research" (SonarBuildMenu): saved EzanaQL queries, Quant Lab models,
 *           data packs and analysis lenses (the Research controls) and charts on this answer
 *   Ping    a bare right arrow that sends; while a ping is in flight it spins and is disabled
 *   x       the search glyph turns into a clear button once the field holds any text
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
import { SonarBuildMenu } from './SonarBuildMenu';
import { SonarComposerRows, CONTEXT_RELATIONS } from './SonarComposerRows';
import { useResearchComposition, nextSeq, questionSubject } from './useResearchComposition';
import { deepQualification } from '@/lib/sonar/composer/registry';
import { querySchema, extractQuery } from '@/lib/sonar/composer/schema';
import { EVIDENCE_OPS, queryRelationOptions } from '@/lib/sonar/composer/context';
import { saveComposerDraft, loadComposerDraft } from './composer-draft';
import { useResearchControls } from './research-controls-store';
import './sonar-answer-query-bar.css';

const MAX_CONTEXT = 6;
const HINTS = [
  'Ask about a company, person, country or policy',
  'Try: How has this portfolio changed over the last year?',
  'Add a photo with + or a chart, model or saved query with Build',
];

/** One attached item's text, as the research run receives it. */
export function contextText(items = []) {
  return items
    .filter((c) => c && c.status === 'ready' && c.text)
    .map((c) =>
      [
        `[${c.kind}] ${c.label}`,
        c.relationText || c.relation ? `How to use it: ${c.relationText || c.relation}` : null,
        c.kind === 'echo'
          ? 'An Ezana Echo article: editorial interpretation, not primary evidence.'
          : null,
        c.text,
      ]
        .filter(Boolean)
        .join('\n'),
    )
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
  const [controls] = useResearchControls();
  const guest = plan.isGuest;
  const controlled = typeof value === 'string';
  const [local, setLocal] = useState(initial || '');
  const current = controlled ? value : local;
  const set = (v) => (controlled ? onChange?.(v) : setLocal(v));
  /* A composition carried from another composer for the same question (home page to the
     result, a reopened result) starts where it was left. */
  const [context, setContext] = useState([]);
  const [menu, setMenu] = useState(false);
  const [saved, setSaved] = useState({ status: 'idle', items: [] });
  const [error, setError] = useState(null);
  const [hint, setHint] = useState(0);
  const [running, setRunning] = useState(false);
  /* Research Composer: analyses inferred from the question or added from the menu. */
  const composer = useResearchComposition(current, { enabled: contextEnabled, context });
  /* Restored after mount (sessionStorage is client-only; restoring in the first render
     would not match the server's HTML). Query schemas are rebuilt from their EzanaQL. */
  const restoredRef = useRef(false);
  const restoreAnalyses = composer.restore;
  useEffect(() => {
    if (!contextEnabled || restoredRef.current) return;
    restoredRef.current = true;
    const d = loadComposerDraft(controlled ? value : initial);
    if (!d) return;
    if (Array.isArray(d.context) && d.context.length) {
      setContext(
        d.context.map((c) =>
          c.kind === 'query'
            ? { ...c, schema: querySchema(c.query || extractQuery(c.text), c.dimension || null) }
            : c,
        ),
      );
    }
    if (Array.isArray(d.analyses) && d.analyses.length) restoreAnalyses(d.analyses);
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount */
  }, [contextEnabled]);
  /* Every attachment in the context, in insertion order, with its effective relationship. */
  const ordered = composer.ctx.items;
  const ctxQueries = ordered.filter((c) => c.kind === 'query');

  /* The composition is saved as it changes, so the next composer for this question has it. */
  useEffect(() => {
    if (!contextEnabled || !restoredRef.current) return undefined;
    const t = setTimeout(
      () => saveComposerDraft({ question: current, context, analyses: composer.items }),
      300,
    );
    return () => clearTimeout(t);
  }, [contextEnabled, current, context, composer.items]);

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
            desc: r.prompt || r.query || '',
            query: r.query,
            dimension: r.dataset_scope || null,
            text: [r.prompt ? `Question: ${r.prompt}` : null, `EzanaQL: ${r.query}`]
              .filter(Boolean)
              .join('\n'),
          })),
        }),
      )
      .catch(() => setSaved({ status: 'error', items: [] }));
  }, [menu, guest, saved.status]);

  const toggle = useCallback((item) => {
    setError(null);
    setContext((list) => {
      if (list.some((c) => c.key === item.key)) return list.filter((c) => c.key !== item.key);
      if (list.length >= MAX_CONTEXT) {
        setError(`Up to ${MAX_CONTEXT} items can be added to one question.`);
        return list;
      }
      if (item.kind === 'query') {
        /* A query carries its EzanaQL and output schema; its relationship stays open (the
           context recommends one) until the reader picks. */
        const query = item.query || extractQuery(item.text);
        return [
          ...list,
          {
            ...item,
            query,
            status: 'ready',
            seq: nextSeq(),
            relation: null,
            relationExplicit: false,
            matchLevel: 'security',
            schema: querySchema(query, item.dimension || null),
          },
        ];
      }
      return [
        ...list,
        {
          ...item,
          status: 'ready',
          seq: nextSeq(),
          relation: item.relation || CONTEXT_RELATIONS[item.kind]?.[0],
        },
      ];
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
      setContext((list) => [
        ...list,
        { key, kind: 'photo', label: f.name, status: 'reading', seq: nextSeq() },
      ]);
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

  /* Pack and lens choices (the Research controls) count as resources too. */
  const resourceList = [
    ...composer.items,
    ...ordered.filter((c) => c.kind !== 'photo' && c.kind !== 'analysis' && c.status === 'ready'),
    ...(controls.sources !== 'all' ? [{ key: `pack:${controls.sources}`, kind: 'pack' }] : []),
    ...(controls.focus !== 'general' ? [{ key: `lens:${controls.focus}`, kind: 'tool' }] : []),
  ];
  const deep = deepQualification(resourceList);
  const runnable = composer.items.filter((a) => a.status === 'supported');
  /* 4.0: the server runs the whole composition when it has an analysis or a query. */
  const composes = runnable.length > 0 || ctxQueries.length > 0;
  const relationTextFor = (c) => {
    if (c.kind !== 'query') return c.relation;
    const opts = queryRelationOptions(c, composer.ctx).options;
    return opts.find((o) => o.key === c.relation)?.text || EVIDENCE_OPS.evidence.text();
  };

  const submit = async (e) => {
    e?.preventDefault();
    const q = String(current || '')
      .trim()
      .slice(0, maxLength);
    if (!q) {
      ref.current?.focus();
      return;
    }
    if (pending || reading || running) return;
    const runsQueries = composes && !guest;
    const ctx = contextEnabled
      ? ordered
          .filter((c) => c.kind !== 'analysis' && c.status === 'ready')
          /* Queries the server runs arrive as results, not as their text. */
          .filter((c) => !(runsQueries && c.kind === 'query'))
          .map((c) => ({
            kind: c.kind,
            label: c.label,
            text: c.text,
            relation: c.relation,
            relationText: relationTextFor(c),
            status: 'ready',
          }))
      : [];
    /* The composition runs first, with deterministic code on the server, in dependency
       order (queries, set operations, then analyses); its results travel with the
       question as the reader's attached material. */
    if (contextEnabled && composes) {
      if (guest && runnable.length) {
        setError('Sign in to run the attached analyses, or remove them.');
        return;
      }
      setRunning(true);
      setError(null);
      try {
        const res = await fetch('/api/sonar/composer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'run',
            version: 4,
            question: q,
            primary: questionSubject(q) ? { text: questionSubject(q) } : null,
            attachments: ordered
              .filter((c) => c.kind === 'analysis' || c.kind === 'query')
              .map((c) =>
                c.kind === 'query'
                  ? {
                      key: c.key,
                      kind: 'query',
                      seq: c.seq,
                      label: c.label,
                      query: c.query,
                      dimension: c.dimension || null,
                      relation: c.relation,
                      matchLevel: c.matchLevel,
                    }
                  : c,
              ),
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || 'The attached analyses could not run.');
        if (j.text) {
          ctx.unshift({
            kind: 'analysis',
            label: 'Research Composer results',
            text: j.text,
            status: 'ready',
          });
        }
        const failed = (j.results || []).filter((r) => r.status === 'failed');
        if (failed.length && !j.text) throw new Error(failed[0].failed);
      } catch (err) {
        setRunning(false);
        setError(err?.message || 'The attached analyses could not run.');
        return;
      }
      setRunning(false);
    }
    onSubmit?.(q, ctx, { deep: deep.qualifies, resources: deep.count });
    /* The composition stays (it is saved as the draft for this question), so the result
       page reopens it and an edit re-runs it. */
    setMenu(false);
  };

  const clear = () => {
    set('');
    setContext([]);
    composer.clear();
    setError(null);
    ref.current?.focus();
  };

  const models = useMemo(
    () =>
      QUANT_MODELS.map((m) => ({
        key: `model:${m.id}`,
        kind: 'model',
        label: m.name,
        family: m.family,
        summary: m.summary,
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

  /* What Build has added: context items (not photos) plus a data pack or lens set in the
     Research controls. */
  const buildCount =
    composer.items.length +
    context.filter((c) => c.kind !== 'photo').length +
    (controls.sources !== 'all' ? 1 : 0) +
    (controls.focus !== 'general' ? 1 : 0);

  return (
    <form className="sqb" role="search" onSubmit={submit} aria-busy={pending || undefined}>
      {contextEnabled ? (
        <SonarComposerRows
          ordered={ordered}
          ctx={composer.ctx}
          api={composer}
          onQueryRelation={(key, relation) =>
            setContext((list) =>
              list.map((x) => (x.key === key ? { ...x, relation, relationExplicit: true } : x)),
            )
          }
          onMatchLevel={(key, matchLevel) =>
            setContext((list) => list.map((x) => (x.key === key ? { ...x, matchLevel } : x)))
          }
          autoCount={composer.autoCount}
          dismissedCount={composer.dismissedCount}
          deep={deep}
          running={running}
          onRemoveContext={(key) => setContext((list) => list.filter((x) => x.key !== key))}
          onContextRelation={(key, relation) =>
            setContext((list) => list.map((x) => (x.key === key ? { ...x, relation } : x)))
          }
        />
      ) : null}

      <label htmlFor={id} className="sqb-label">
        {label}
      </label>
      {current ? (
        <button type="button" className="sqb-x" aria-label="Clear the question" onClick={clear}>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      ) : (
        <i className="bi bi-search sqb-icon" aria-hidden="true" />
      )}
      <input
        ref={ref}
        id={id}
        name="q"
        type="text"
        className="sqb-input"
        autoComplete="off"
        maxLength={maxLength}
        value={current}
        placeholder={placeholder || HINTS[hint]}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit(e);
        }}
      />

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
                className={`sqb-pill sqb-build${menu ? ' is-open' : ''}${buildCount ? ' is-active' : ''}`}
                aria-haspopup="dialog"
                aria-expanded={menu}
                aria-label={`Research Composer: add and configure research resources${buildCount ? `, ${buildCount} added` : ''}`}
                title="Research Composer: add and configure research resources"
                aria-controls={`${id}-build`}
                onClick={() => setMenu((m) => !m)}
              >
                <i className="bi bi-stack" aria-hidden="true" />
                Compose
                {buildCount ? <span className="sqb-build-n">· {buildCount}</span> : null}
                <i className="bi bi-chevron-down sqb-chev" aria-hidden="true" />
              </button>
              {menu ? (
                <SonarBuildMenu
                  id={`${id}-build`}
                  menuRef={menuRef}
                  items={context}
                  onToggle={toggle}
                  onClearContext={() => setContext((l) => l.filter((c) => c.kind === 'photo'))}
                  saved={saved}
                  guest={guest}
                  charts={chartItems}
                  models={models}
                  analyses={composer.items}
                  onAddAnalysis={composer.add}
                  onRemoveAnalysis={composer.remove}
                  question={current}
                />
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      <div className="sqb-actions">
        <button
          type="submit"
          className="sqb-ping"
          disabled={pending || reading || running}
          aria-busy={pending || running || undefined}
          aria-label={
            pending || running ? 'Pinging' : deep.qualifies ? 'Ping as Deep research' : 'Ping'
          }
          title="Ping"
        >
          <i
            className={`bi ${pending || running ? 'bi-arrow-repeat sqb-spin' : 'bi-arrow-right'}`}
            aria-hidden="true"
          />
        </button>
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
