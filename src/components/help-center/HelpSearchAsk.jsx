'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/**
 * The help-center search pill, upgraded to "search + ask".
 *
 * - As-you-type stays an instant, offline substring filter: this component is
 *   controlled (`value`/`onChange`) so the parent page keeps filtering categories
 *   exactly as before. No endpoint call on keystroke.
 * - On submit (Enter or the "Ask AI" button) it POSTs the question to
 *   /api/help-center/ask and renders a grounded, cited answer card directly
 *   beneath the pill: an "AI answer" eyebrow, the answer, the cited source
 *   articles, and a one-line note that answers come from Help Center articles.
 *   Honest empty-state when nothing matches; never a fabricated answer.
 * - Cmd+K / Ctrl+K focuses the pill.
 *
 * @param {{ audience: 'user'|'partner', value: string, onChange: (v: string) => void }} props
 */
export default function HelpSearchAsk({ audience, value, onChange }) {
  const inputRef = useRef(null);
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState(null); // { answer, sources, empty, grounded, degraded }
  const [answeredFor, setAnsweredFor] = useState('');
  const [error, setError] = useState('');

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

  const ask = useCallback(
    async (e) => {
      e?.preventDefault();
      const query = (value || '').trim();
      if (!query || asking) return;
      setAsking(true);
      setError('');
      setAnsweredFor(query);
      try {
        const res = await fetch('/api/help-center/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, audience }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || 'Something went wrong. Please try again.');
          setResult(null);
        } else {
          setResult(data);
        }
      } catch {
        setError('Could not reach the assistant. Please try again.');
        setResult(null);
      } finally {
        setAsking(false);
      }
    },
    [value, audience, asking],
  );

  const hasAnswer = result && result.answer;
  const isEmpty = result && result.empty;
  const sources = (result && result.sources) || [];

  return (
    <div className="mx-auto max-w-2xl">
      <form onSubmit={ask} className="relative" role="search">
        <i
          className="bi bi-search hc-input-icon absolute left-4 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search for help, or ask a question…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="hc-input"
          aria-label="Search the help center or ask a question"
          enterKeyHint="search"
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
      </form>
      {value.trim() && !result && !asking && !error ? (
        <p className="hc-faint mt-2 text-center text-xs">
          Press Enter or &ldquo;Ask AI&rdquo; for an answer from our articles. Typing filters the
          categories below.
        </p>
      ) : null}

      {(asking || result || error) && (
        <div className="hc-card hc-answer mt-4 p-6 text-left" aria-live="polite">
          <p className="hc-answer-eyebrow">
            <i className="bi bi-stars" aria-hidden="true" />
            AI answer
          </p>

          {asking ? (
            <div className="hc-subtitle flex items-center gap-3 text-sm">
              <i className="bi bi-arrow-repeat hc-spin" aria-hidden="true" />
              Searching the help center…
            </div>
          ) : error ? (
            <p className="hc-subtitle text-sm">{error}</p>
          ) : (
            <>
              {hasAnswer ? (
                <div className="hc-prose text-sm">
                  {result.answer.split(/\n{2,}/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              ) : isEmpty ? (
                <p className="hc-subtitle text-sm">
                  Nothing in the {audience === 'partner' ? 'partner' : 'user'} help center covers{' '}
                  <span className="hc-accent font-semibold">&ldquo;{answeredFor}&rdquo;</span> yet.
                  Browse the categories below, or contact support and we&apos;ll help directly.
                </p>
              ) : (
                <p className="hc-subtitle text-sm">
                  Here are the most relevant help articles for{' '}
                  <span className="hc-accent font-semibold">&ldquo;{answeredFor}&rdquo;</span>:
                </p>
              )}

              {sources.length > 0 && (
                <div className="mt-5">
                  <p className="hc-faint mb-2 text-xs font-semibold uppercase tracking-wide">
                    {hasAnswer ? 'Sources' : 'Related articles'}
                  </p>
                  <ul className="grid gap-2">
                    {sources.map((s) => (
                      <li key={`${s.audience}:${s.slug}`}>
                        <Link href={s.url} className="hc-card-compact flex items-center gap-3 p-3">
                          <i
                            className="bi bi-file-earmark-text hc-accent flex-shrink-0"
                            aria-hidden="true"
                          />
                          <span className="hc-title text-sm">{s.title}</span>
                          {s.category ? (
                            <span className="hc-faint ml-auto hidden text-xs sm:inline">
                              {s.category}
                            </span>
                          ) : null}
                          <i
                            className={`bi bi-chevron-right hc-faint flex-shrink-0 ${s.category ? '' : 'ml-auto'}`}
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!hasAnswer && !isEmpty && (
                <Link
                  href="mailto:contact@ezana.world"
                  className="hc-link mt-4 inline-flex items-center gap-1 text-sm"
                >
                  Still stuck? Contact support
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </Link>
              )}

              <p className="hc-answer-note">
                Answers are generated from Help Center articles and may be incomplete.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
