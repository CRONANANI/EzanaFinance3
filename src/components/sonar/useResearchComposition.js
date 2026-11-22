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
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { makeAnalysis, validateAttachment, relationsFor } from '@/lib/sonar/composer/registry';
import { inferComposition, compositionKey, extractSubject } from '@/lib/sonar/composer/intents';

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

export function useResearchComposition(question, { enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const dismissed = useRef(new Set());
  const keyRef = useRef('');
  const [, force] = useState(0);

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
            return a;
          });
        return [...autos, ...manual];
      });
      const texts = new Set(attachments.map((a) => a.subject?.text).filter(Boolean));
      if (qSubject) texts.add(qSubject);
      texts.forEach(resolve);
    }, 350);
    return () => clearTimeout(t);
  }, [question, enabled, resolve]);

  const update = useCallback((key, fn) => {
    setItems((list) =>
      list.map((a) => (a.key === key ? validateAttachment({ ...fn(a), edited: true }) : a)),
    );
  }, []);

  const setParam = useCallback(
    (key, id, value) => update(key, (a) => ({ ...a, params: { ...a.params, [id]: value } })),
    [update],
  );
  const setRelation = useCallback(
    (key, relation, custom) =>
      update(key, (a) => ({ ...a, relation, custom: custom ?? a.custom ?? '' })),
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
        return [...list, { ...a, subjectFromQuestion: Boolean(text) }];
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
      ...attachments.filter(
        (a) => !list.some((m) => m.origin !== 'auto' && m.capability === a.capability),
      ),
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

  return {
    items,
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
