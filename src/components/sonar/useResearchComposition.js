'use client';

/**
 * useResearchComposition (Nov 22 2026): the Research Composer's analyses for one question.
 *
 * One list holds both kinds of attachment: those Sonar inferred from the question (origin
 * 'auto', lib/sonar/composer/intents.js) and those the reader added from the menu (origin
 * 'user'). Both are registry attachments, validated the same way and executed by the same
 * route. The hook:
 *   - re-reads the question as it changes (debounced) and keeps the inferred set current,
 *     dropping inferred items the question no longer supports;
 *   - never re-adds an inferred item the reader removed, until the question materially
 *     changes (its subject or the set of operations it asks for) or the reader resets;
 *   - keeps the reader's edits to an inferred item while its subject stays the same;
 *   - resolves the subject once per text (/api/sonar/composer) and revalidates against the
 *     data-dependent limit it returns (eligible holdings).
 *
 * 4.0 (Nov 23 2026): the hook also owns the research context (lib/sonar/composer/context):
 *   - every attachment carries `seq`, its insertion order; the composer shows that order
 *   - the question's subject is resolved as the primary subject; a query's entity (the 13F
 *     filer it filters on) as a secondary one
 *   - `context` (the host's other attachments, queries included) joins the analyses in one
 *     context, from which each analysis's target is reconciled: a default target follows the
 *     recommendation, an explicit one is kept and marked stale if its dataset disappears
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  makeAnalysis,
  validateAttachment,
  relationsFor,
  RELATIONS,
} from '@/lib/sonar/composer/registry';
import { inferComposition, compositionKey, extractSubject } from '@/lib/sonar/composer/intents';
import { buildContext, reconcileTargets, queryRelationOptions } from '@/lib/sonar/composer/context';

/** Insertion order: increasing, and later than anything restored from a draft. */
let SEQ = 0;
export const nextSeq = () => {
  SEQ = Math.max(SEQ + 1, Date.now());
  return SEQ;
};

const subjectCache = new Map();

async function resolveText(text) {
  const k = String(text || '')
    .trim()
    .toLowerCase();
  if (!k) return null;
  if (subjectCache.has(k)) return subjectCache.get(k);
  const p = fetch('/api/sonar/composer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action: 'resolve', subject: text }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => j?.subject || { text, kind: 'unresolved' })
    .catch(() => {
      subjectCache.delete(k);
      return null;
    });
  subjectCache.set(k, p);
  return p;
}

/** The question's subject: the extracted one, or a short bare name ("Nancy Pelosi"). */
export function questionSubject(question) {
  const q = String(question || '').trim();
  const s = extractSubject(q);
  if (s) return s;
  const words = q.split(/\s+/).filter(Boolean);
  return words.length && words.length <= 5 && !/[?]/.test(q) ? q : null;
}

const sameSubject = (a, b) =>
  String(a?.text || '').toLowerCase() === String(b?.text || '').toLowerCase();

export function useResearchComposition(
  question,
  { enabled = true, context = [], initial = null } = {},
) {
  const [items, setItems] = useState(() => (Array.isArray(initial) ? initial : []));
  const dismissed = useRef(new Set());
  const keyRef = useRef('');
  const [, force] = useState(0);
  const [primary, setPrimary] = useState(null);
  const [names, setNames] = useState({});

  /* Apply a resolved subject to every analysis that carries its text. */
  const applySubject = useCallback((resolved) => {
    if (!resolved) return;
    setItems((list) =>
      list.map((a) =>
        sameSubject(a.subject, resolved) && !a.subject?.kind
          ? validateAttachment({ ...a, subject: { ...resolved } })
          : a,
      ),
    );
  }, []);

  const resolve = useCallback(
    (text) => {
      if (!text) return;
      resolveText(text).then((s) => s && applySubject(s));
    },
    [applySubject],
  );

  /* Inferred attachments follow the question. */
  useEffect(() => {
    if (!enabled) return undefined;
    const t = setTimeout(() => {
      const key = compositionKey(question);
      if (key !== keyRef.current) {
        keyRef.current = key;
        dismissed.current = new Set();
      }
      const { attachments } = inferComposition(question);
      const qSubject = questionSubject(question);
      setItems((prev) => {
        const manual = prev
          .filter((a) => a.origin !== 'auto')
          .map((a) =>
            a.subjectFromQuestion && qSubject && !sameSubject(a.subject, { text: qSubject })
              ? validateAttachment({ ...a, subject: { text: qSubject } })
              : a,
          );
        const autos = attachments
          .filter(
            (a) =>
              !dismissed.current.has(a.capability) &&
              !manual.some((m) => m.capability === a.capability),
          )
          .map((a) => {
            const before = prev.find((p) => p.origin === 'auto' && p.capability === a.capability);
            if (before && sameSubject(before.subject, a.subject)) {
              /* Keep the reader's edits; take values the question now states explicitly. */
              return before.edited
                ? before
                : validateAttachment({ ...before, params: { ...before.params, ...a.params } });
            }
            return { ...a, seq: before?.seq ?? nextSeq() };
          });
        return [...autos, ...manual];
      });
      const texts = new Set(attachments.map((a) => a.subject?.text).filter(Boolean));
      if (qSubject) texts.add(qSubject);
      texts.forEach(resolve);
      /* The primary research subject, for the context (its holdings are a dataset). */
      if (qSubject)
        resolveText(qSubject).then((p) =>
          setPrimary((cur) =>
            p && String(questionSubject(question) || '').toLowerCase() === qSubject.toLowerCase()
              ? p
              : cur,
          ),
        );
      else setPrimary(null);
    }, 350);
    return () => clearTimeout(t);
  }, [question, enabled, resolve]);

  const update = useCallback((key, fn) => {
    setItems((list) =>
      list.map((a) => (a.key === key ? validateAttachment({ ...fn(a), edited: true }) : a)),
    );
  }, []);

  const setParam = useCallback(
    (key, id, value) =>
      update(key, (a) => ({
        ...a,
        params: { ...a.params, [id]: value },
        editedParams: { ...(a.editedParams || {}), [id]: true },
      })),
    [update],
  );
  const setRelation = useCallback(
    (key, relation, custom) =>
      update(key, (a) => {
        /* A relationship with a metric preset (financial strength, growth, risk) sets the
           metrics, unless the reader chose them by hand. */
        const preset = (RELATIONS[a.capability] || []).find(
          (r) => r.key === relation && r.metrics,
        )?.metrics;
        return {
          ...a,
          relation,
          custom: custom ?? a.custom ?? '',
          params:
            preset && !a.editedParams?.metrics ? { ...a.params, metrics: [...preset] } : a.params,
        };
      }),
    [update],
  );
  /** The reader picks what an analysis operates on: from now on it is explicit. */
  const setTarget = useCallback(
    (key, id) => update(key, (a) => ({ ...a, target: { id, explicit: true } })),
    [update],
  );
  const setSubject = useCallback(
    (key, text) => {
      update(key, (a) => ({ ...a, subject: text ? { text } : null, subjectFromQuestion: false }));
      if (text) resolve(text);
    },
    [update, resolve],
  );
  const chooseCandidate = useCallback(
    (key, cand) =>
      update(key, (a) => ({
        ...a,
        subject: {
          ...a.subject,
          id: cand.id,
          name: String(cand.name).replace(/\s*\([A-Z.]+\)\s*$/, ''),
          period: cand.period,
          candidates: undefined,
        },
      })),
    [update],
  );

  const remove = useCallback((key) => {
    setItems((list) => {
      const a = list.find((x) => x.key === key);
      if (a?.origin === 'auto') dismissed.current.add(a.capability);
      return list.filter((x) => x.key !== key);
    });
  }, []);

  /** Add an analysis from the menu, bound to the question's subject. */
  const add = useCallback(
    (capability) => {
      const text = questionSubject(question);
      setItems((list) => {
        if (list.some((a) => a.capability === capability)) {
          return list.map((a) =>
            a.capability === capability ? validateAttachment({ ...a, origin: 'user' }) : a,
          );
        }
        const a = makeAnalysis(capability, {
          origin: 'user',
          subject: text ? { text } : null,
        });
        return [...list, { ...a, seq: nextSeq(), subjectFromQuestion: Boolean(text) }];
      });
      if (text) resolve(text);
    },
    [question, resolve],
  );

  /** Back to what Sonar infers from the question: clears removals and edits of inferred items. */
  const reset = useCallback(() => {
    dismissed.current = new Set();
    const { attachments } = inferComposition(question);
    setItems((list) => [
      ...attachments
        .filter((a) => !list.some((m) => m.origin !== 'auto' && m.capability === a.capability))
        .map((a) => ({
          ...a,
          seq: list.find((m) => m.capability === a.capability)?.seq ?? nextSeq(),
        })),
      ...list.filter((a) => a.origin !== 'auto'),
    ]);
    attachments.forEach((a) => a.subject?.text && resolve(a.subject.text));
    force((n) => n + 1);
  }, [question, resolve]);

  const clear = useCallback(() => {
    setItems((list) => {
      list.filter((a) => a.origin === 'auto').forEach((a) => dismissed.current.add(a.capability));
      return [];
    });
  }, []);

  /* Secondary subjects: a query's entity (the filer it filters on), resolved to its name. */
  const entityTexts = context
    .map((c) => (c.kind === 'query' ? c.schema?.entity?.text : null))
    .filter(Boolean)
    .join('|');
  useEffect(() => {
    if (!enabled || !entityTexts) return;
    for (const t of entityTexts.split('|')) {
      if (names[t]) continue;
      resolveText(t).then((r) => {
        if (r?.name && r.kind !== 'unresolved') setNames((n) => ({ ...n, [t]: r.name }));
      });
    }
  }, [entityTexts, enabled, names]);

  const ctxItems = useMemo(
    () =>
      context.map((c) =>
        c.kind === 'query' && c.schema?.entity?.text && names[c.schema.entity.text]
          ? {
              ...c,
              schema: {
                ...c.schema,
                entity: { ...c.schema.entity, text: names[c.schema.entity.text] },
              },
            }
          : c,
      ),
    [context, names],
  );
  /* A query the reader has not given a relationship takes the recommended one (a holdings
     intersection when both sides are security sets), never a generic default. */
  const ctx = useMemo(() => {
    const pre = buildContext({
      question,
      primary,
      items: [
        ...items,
        ...ctxItems.map((c) =>
          c.kind === 'query' && !c.relationExplicit ? { ...c, relation: 'evidence' } : c,
        ),
      ],
    });
    const effective = ctxItems.map((c) =>
      c.kind === 'query' && !c.relationExplicit
        ? { ...c, relation: queryRelationOptions(c, pre).recommended }
        : c,
    );
    return buildContext({ question, primary, items: [...items, ...effective] });
  }, [question, primary, items, ctxItems]);

  /* Targets follow the context (a new derived set, a removed query, a changed relationship). */
  useEffect(() => {
    if (!enabled) return;
    const patches = reconcileTargets(items, ctx);
    if (!Object.keys(patches).length) return;
    setItems((list) =>
      list.map((a) => {
        const next = patches[a.key];
        if (!next) return a;
        const params = { ...(a.params || {}) };
        /* A count default does not carry across a change of target (ten holdings of a
           person are not ten matching equities); a value the reader set does. */
        if ((a.target?.kind || 'subject') !== next.kind && !a.editedParams?.top_n)
          delete params.top_n;
        return validateAttachment({ ...a, params, target: next });
      }),
    );
  }, [ctx, items, enabled]);

  /** Restore a saved draft's analyses (home page to result page, a reopened composition). */
  const restore = useCallback((list) => {
    if (!Array.isArray(list)) return;
    setItems(list.map((a) => validateAttachment(a)));
  }, []);

  return {
    items,
    ctx,
    primary,
    setTarget,
    restore,
    autoCount: items.filter((a) => a.origin === 'auto').length,
    dismissedCount: dismissed.current.size,
    setParam,
    setRelation,
    setSubject,
    chooseCandidate,
    remove,
    add,
    reset,
    clear,
    relationsFor,
  };
}
