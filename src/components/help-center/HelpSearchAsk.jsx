'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { searchHelp } from '@/lib/help-center-search';

/**
 * The help-center search pill: instant matches while typing, plus an AI answer.
 *
 * - As-you-type: a dropdown of the top five articles from the in-repo lexical
 *   index (src/lib/help-center-search.js), debounced 150ms, no network. It
 *   works even when the AI endpoint is down. Up/Down move, Enter opens the
 *   highlighted article, Esc closes. The component stays controlled
 *   (`value`/`onChange`) so the hub page filters its categories too.
 * - AI answer: on Enter with nothing highlighted, or after a 600ms pause once
 *   the question has three or more words, it POSTs to /api/help-center/ask
 *   and shows the answer card under the pill: a skeleton, then a short answer,
 *   up to three source articles, thumbs feedback, and a caption saying it is
 *   AI-generated from Help Center articles. With no answer it shows the
 *   related articles only. Never a fabricated answer.
 * - Cmd+K / Ctrl+K focuses the pill.
 * - Questions, result clicks and feedback go to /api/help-center/search-event.
 *
 * @param {{ audience: 'user'|'partner', value: string, onChange: (v: string) => void }} props
 */
const AUTO_ASK_MS = 600;
const TYPEAHEAD_MS = 150;

function logEvent(payload) {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/help-center/search-event',
        new Blob([body], { type: 'application/json' }),
      );
    } else {
      fetch('/api/help-center/search-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* analytics never block search */
  }
}

const wordCount = (q) => q.trim().split(/\s+/).filter(Boolean).length;

export default function HelpSearchAsk({ audience, value, onChange }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const listId = useId();
  const [debounced, setDebounced] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState(null); // { answer, sources, empty, degraded }
  const [answeredFor, setAnsweredFor] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const askSeq = useRef(0);

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), TYPEAHEAD_MS);
    return () => clearTimeout(t);
  }, [value]);

  const matches = useMemo(
    () => (debounced.trim() ? searchHelp(debounced, { audience, limit: 5 }) : []),
    [debounced, audience],
  );

  const ask = useCallback(
    async (q) => {
      const query = (q ?? value ?? '').trim();
      if (query.length < 3 || query === answeredFor) return;
      const seq = ++askSeq.current;
      /* The answer card sits where the dropdown opens; typing reopens it. */
      setOpen(false);
      setAsking(true);
      setError('');
      setFeedback(null);
      setAnsweredFor(query);
      try {
        const res = await fetch('/api/help-center/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query.slice(0, 300), audience }),
        });
        const data = await res.json().catch(() => ({}));
        if (seq !== askSeq.current) return;
        if (!res.ok) {
          setError(data?.error || 'Something went wrong. Please try again.');
          setResult(null);
        } else {
          setResult(data);
          logEvent({
            kind: 'ask',
            section: audience,
            question: query,
            topSlug: data?.sources?.[0]?.slug,
            answered: Boolean(data?.answer),
          });
        }
      } catch {
        if (seq !== askSeq.current) return;
        setError('Could not reach the assistant. The articles below still match your search.');
        setResult(null);
      } finally {
        if (seq === askSeq.current) setAsking(false);
      }
    },
    [value, audience, answeredFor],
  );

  /* Ask on its own once the reader pauses on a real question. */
  useEffect(() => {
    const q = value.trim();
    if (wordCount(q) < 3 || q === answeredFor) return undefined;
    const t = setTimeout(() => ask(q), AUTO_ASK_MS);
    return () => clearTimeout(t);
  }, [value, answeredFor, ask]);

  const openArticle = (m, from = 'typeahead') => {
    logEvent({
      kind: 'click',
      section: audience,
      question: value.trim() || undefined,
      clickedSlug: m.slug,
      topSlug: from === 'typeahead' ? matches[0]?.slug : result?.sources?.[0]?.slug,
    });
    setOpen(false);
    router.push(m.url);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    } else if (e.key === 'Enter' && open && active >= 0 && matches[active]) {
      e.preventDefault();
      openArticle(matches[active]);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    setOpen(false);
    ask();
  };

  const showList = open && matches.length > 0 && value.trim().length > 0;
  const hasAnswer = Boolean(result?.answer);
  const sources = (result?.sources || []).slice(0, 3);
  const related = sources.length ? sources : matches.slice(0, 3);

  const sendFeedback = (helpful) => {
    setFeedback(helpful ? 'up' : 'down');
    logEvent({
      kind: 'feedback',
      section: audience,
      question: answeredFor,
      topSlug: sources[0]?.slug,
      answered: hasAnswer,
      helpful,
    });
  };

  return (
    <div className="hc-search mx-auto max-w-2xl">
      <form onSubmit={submit} className="relative" role="search">
        <i
          className="bi bi-search hc-input-icon absolute left-4 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          placeholder="Ask anything, e.g. How do I connect my brokerage?"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="hc-input"
          aria-label="Search the help center or ask a question"
          enterKeyHint="search"
          autoComplete="off"
        />
        {value.trim() ? (
          <button
            type="submit"
            disabled={asking}
            className="hc-btn-primary absolute right-2 top-1/2 -translate-y-1/2 !px-3 !py-1.5 text-sm"
            aria-label="Ask AI"
          >
            {asking ? (
              <i className="bi bi-arrow-repeat hc-spin" aria-hidden="true" />
            ) : (
              <>
                <i className="bi bi-stars" aria-hidden="true" />
                Ask AI
              </>
            )}
          </button>
        ) : (
          <kbd className="hc-kbd absolute right-4 top-1/2 hidden -translate-y-1/2 rounded px-2 py-1 text-xs md:inline">
            ⌘K
          </kbd>
        )}

        {showList ? (
          <ul id={listId} role="listbox" className="hc-suggest" aria-label="Matching articles">
            {matches.map((m, i) => (
              <li
                key={`${m.audience}:${m.slug}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`hc-suggest-item${i === active ? ' is-active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  openArticle(m);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <i className="bi bi-file-earmark-text hc-accent" aria-hidden="true" />
                <span className="hc-suggest-title">{m.title}</span>
                {m.category ? <span className="hc-suggest-cat">{m.category}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </form>

      {(asking || result || error) && (
        <div className="hc-card hc-answer mt-4 p-6 text-left" aria-live="polite">
          <p className="hc-answer-eyebrow">
            <i className="bi bi-stars" aria-hidden="true" />
            AI answer
          </p>

          {asking ? (
            <div className="hc-answer-skel" aria-label="Loading answer">
              <span />
              <span />
              <span />
            </div>
          ) : error ? (
            <p className="hc-subtitle text-sm">{error}</p>
          ) : hasAnswer ? (
            <div className="hc-prose text-sm">
              {result.answer.split(/\n{2,}/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : result?.empty && !related.length ? (
            <p className="hc-subtitle text-sm">
              Nothing in the {audience === 'partner' ? 'partner' : 'user'} help center covers{' '}
              <span className="hc-accent font-semibold">&ldquo;{answeredFor}&rdquo;</span> yet.
              Browse the categories below, or contact support and we&apos;ll help directly.
            </p>
          ) : null}

          {!asking && related.length > 0 ? (
            <div className="mt-4">
              <p className="hc-faint mb-2 text-xs font-semibold uppercase tracking-wide">
                {hasAnswer ? 'Sources' : 'Related articles'}
              </p>
              <div className="hc-chips">
                {related.map((s) => (
                  <Link
                    key={`${s.audience}:${s.slug}`}
                    href={s.url}
                    className="hc-chip"
                    onClick={() =>
                      logEvent({
                        kind: 'click',
                        section: audience,
                        question: answeredFor || undefined,
                        clickedSlug: s.slug,
                        topSlug: related[0]?.slug,
                      })
                    }
                  >
                    <i className="bi bi-file-earmark-text" aria-hidden="true" />
                    {s.title}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {!asking && hasAnswer ? (
            <div className="hc-answer-foot">
              <p className="hc-answer-note">AI-generated from Ezana help articles.</p>
              <div className="hc-answer-vote" role="group" aria-label="Was this answer helpful?">
                <button
                  type="button"
                  aria-pressed={feedback === 'up'}
                  aria-label="Helpful"
                  disabled={feedback !== null}
                  onClick={() => sendFeedback(true)}
                >
                  <i
                    className={`bi ${feedback === 'up' ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}`}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  aria-pressed={feedback === 'down'}
                  aria-label="Not helpful"
                  disabled={feedback !== null}
                  onClick={() => sendFeedback(false)}
                >
                  <i
                    className={`bi ${feedback === 'down' ? 'bi-hand-thumbs-down-fill' : 'bi-hand-thumbs-down'}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          ) : null}

          {!asking && !hasAnswer ? (
            <Link
              href="mailto:contact@ezana.world"
              className="hc-link mt-4 inline-flex items-center gap-1 text-sm"
            >
              Still stuck? Contact support
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
