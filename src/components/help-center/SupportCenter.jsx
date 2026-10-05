'use client';

/**
 * Support centre landing page: ONE template, two audiences (user, partner),
 * two states (home, answered). Built to docs/design/support-handoff/.
 *
 * Home: the Ask AI pill with Try chips directly under the top nav, at the
 * top of the middle column and level with the category rail, then Start
 * here + FAQs + Recently updated + help card, across the full width beside
 * the rail (Trending appears only in the answered view). There is no visible
 * crumb, eyebrow, title or subline; the page title is a screen-reader-only
 * h1.
 *
 * Answered: a header holding the pill with the question and "Clear and browse",
 * then the rail in matches mode / answer card + follow-up + Keep reading /
 * Related articles + Still trending, with the help card across the bottom.
 *
 * Ask AI stays on the page: the body swaps in place, ?q= is written to the
 * URL (one history entry; a follow-up replaces it; Clear pops it), and Back
 * restores home. An answer is never rendered without at least one source.
 *
 * The AI answer and its sources come from /api/help-center/ask. Everything
 * else (rail counts, Keep reading, Related, Still trending) is derived by the
 * pure model in src/lib/help-center/support-model.js from the in-repo index.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  audienceConfig,
  categoriesFor,
  keepReading,
  matchesByCategory,
  matchesFor,
  recentlyUpdated,
  relatedArticles,
  relativeDate,
  startHere,
  stillTrending,
  trendingFallback,
} from '@/lib/help-center/support-model';
import CategoryRail from './CategoryRail';
import PlatformChangelog from './PlatformChangelog';
import './support-center.css';

const MIN_Q = 3;
const RELATED_VISIBLE = 6;
const SOURCES_VISIBLE = 5;

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
    /* analytics never block the page */
  }
}

function writeQ(q, mode) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (q) url.searchParams.set('q', q);
  else url.searchParams.delete('q');
  const fn = mode === 'push' ? 'pushState' : 'replaceState';
  window.history[fn](
    { ...(window.history.state || {}), hcsQ: q || null },
    '',
    `${url.pathname}${url.search}`,
  );
}

function Skel({ className = '' }) {
  return <span className={`hcs-skel ${className}`.trim()} aria-hidden="true" />;
}

function HelpCard({ cfg, from }) {
  return (
    <section className="hcs-help" aria-labelledby="hcs-help-title">
      <div className="hcs-help-text">
        <h2 id="hcs-help-title" className="hcs-h2">
          Still need help?
        </h2>
        <p>
          Our support team is here for you. Reach out and we&apos;ll get back to you as soon as
          possible.
        </p>
      </div>
      <div className="hcs-help-actions">
        <a
          href={cfg.contact}
          className="hcs-btn hcs-btn--primary"
          onClick={() => logEvent({ kind: 'contact', section: cfg.id, from })}
        >
          {cfg.contactLabel}
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </a>
        <Link href="/help-center" className="hcs-btn hcs-btn--secondary">
          Back to Help Center
        </Link>
      </div>
    </section>
  );
}

function TrendingList({ items, base, label, icon, more, rows, cls = '' }) {
  if (!items.length) return null;
  return (
    <section className={`hcs-trending ${cls}`.trim()} aria-label={label}>
      <div className="hcs-rail-head">
        <span className="hcs-mono-label">
          <i className={`bi ${icon}`} aria-hidden="true" /> {label}
        </span>
      </div>
      <ol className="hcs-trend-list">
        {items.slice(0, rows).map((it, i) => (
          <li key={it.slug}>
            <Link href={it.url || `${base}/article/${it.slug}`} className="hcs-trend-row">
              <span className="hcs-mono hcs-trend-idx">{String(i + 1).padStart(2, '0')}</span>
              <span className="hcs-trend-body">
                <span className="hcs-trend-title">{it.title}</span>
                {it.category ? <span className="hcs-trend-cat">{it.category}</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {more ? (
        <Link href={more.href} className="hcs-link hcs-more">
          {more.label}
        </Link>
      ) : null}
    </section>
  );
}

export default function SupportCenter({ audience = 'user', initialQuestion = '' }) {
  const cfg = audienceConfig(audience);
  const categories = useMemo(() => categoriesFor(audience), [audience]);
  const start = useMemo(() => startHere(audience), [audience]);
  const updated = useMemo(() => recentlyUpdated(audience), [audience]);

  const [value, setValue] = useState(initialQuestion);
  const [question, setQuestion] = useState(
    initialQuestion.trim().length >= MIN_Q ? initialQuestion.trim() : '',
  );
  const [phase, setPhase] = useState(question ? 'asking' : 'home'); // home | asking | answered | none | error
  const [result, setResult] = useState(null); // { answer, sources, fromUser }
  const [followUp, setFollowUp] = useState('');
  const [feedback, setFeedback] = useState(null); // null | 'up' | 'down' | 'sent'
  const [comment, setComment] = useState('');
  const [allRelated, setAllRelated] = useState(false);
  const [allSources, setAllSources] = useState(false);
  const [trending, setTrending] = useState(() => trendingFallback(audience));

  const inputRef = useRef(null);
  const answerRef = useRef(null);
  const seq = useRef(0);
  const pushedRef = useRef(false);

  /* ── trending (live counts replace the static fallback) ── */
  useEffect(() => {
    let alive = true;
    fetch(`/api/help-center/trending?section=${audience}&limit=6`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        if (!alive) return;
        const live = (d.items || [])
          .map((it) => ({ ...it, url: `${cfg.base}/article/${it.slug}` }))
          .filter((it) => it.title);
        if (live.length) setTrending(live);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [audience, cfg.base]);

  /* ── Cmd+K focuses the pill ── */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── the ask ── */
  const ask = useCallback(
    async (raw, { source = 'pill', history = 'push' } = {}) => {
      const q = String(raw || '')
        .trim()
        .slice(0, 300);
      if (q.length < MIN_Q) return;
      const my = ++seq.current;
      setQuestion(q);
      setValue(q);
      setPhase('asking');
      setResult(null);
      setFeedback(null);
      setComment('');
      setAllRelated(false);
      setAllSources(false);
      setFollowUp('');
      if (history === 'push' && !pushedRef.current) {
        writeQ(q, 'push');
        pushedRef.current = true;
      } else {
        writeQ(q, 'replace');
      }
      logEvent({ kind: 'ask', section: audience, question: q, source });

      const call = async (aud) => {
        const res = await fetch('/api/help-center/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, audience: aud }),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, data };
      };

      try {
        let { ok, data } = await call(audience);
        let fromUser = false;
        /* Partner questions fall back to the user help centre when nothing
           partner-side matches, and the label says so. */
        if (ok && audience === 'partner' && (!data?.answer || !data?.sources?.length)) {
          const again = await call('user');
          if (again.ok && again.data?.answer && again.data?.sources?.length) {
            data = again.data;
            fromUser = true;
          }
        }
        if (my !== seq.current) return;
        if (!ok) {
          setPhase('error');
          return;
        }
        /* An answer is only an answer with at least one source. */
        if (data?.answer && Array.isArray(data.sources) && data.sources.length) {
          setResult({ answer: data.answer, sources: data.sources, fromUser });
          setPhase('answered');
          logEvent({
            kind: 'ask',
            section: audience,
            question: q,
            topSlug: data.sources[0]?.slug,
            answered: true,
          });
        } else {
          setResult({ answer: null, sources: data?.sources || [], fromUser });
          setPhase('none');
          logEvent({ kind: 'ask', section: audience, question: q, answered: false });
        }
      } catch {
        if (my === seq.current) setPhase('error');
      }
    },
    [audience],
  );

  /* Loading with ?q= renders the answered state directly. */
  useEffect(() => {
    if (initialQuestion.trim().length >= MIN_Q)
      ask(initialQuestion, { source: 'deeplink', history: 'replace' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clear = useCallback(() => {
    seq.current += 1;
    setQuestion('');
    setValue('');
    setResult(null);
    setPhase('home');
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    } else {
      writeQ('', 'replace');
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      const q = new URL(window.location.href).searchParams.get('q') || '';
      pushedRef.current = false;
      if (q.trim().length >= MIN_Q) ask(q, { source: 'history', history: 'replace' });
      else {
        seq.current += 1;
        setQuestion('');
        setValue('');
        setResult(null);
        setPhase('home');
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [ask]);

  /* Focus lands on the answer heading when an answer arrives. */
  useEffect(() => {
    if (phase === 'answered' || phase === 'none' || phase === 'error') {
      answerRef.current?.focus({ preventScroll: false });
      answerRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }, [phase, question]);

  /* ── derived shapes for the answered state ── */
  const matches = useMemo(
    () => (question ? matchesFor(question, audience) : []),
    [question, audience],
  );
  const counts = useMemo(() => matchesByCategory(matches), [matches]);
  const sources = useMemo(() => result?.sources || [], [result]);
  const related = useMemo(
    () => relatedArticles(sources, matches, audience),
    [sources, matches, audience],
  );
  const reading = useMemo(
    () => keepReading(sources, matches, audience),
    [sources, matches, audience],
  );
  const still = useMemo(() => stillTrending(trending, related, 3), [trending, related]);
  const answered = phase !== 'home';
  const hasQ = value.trim().length >= MIN_Q;

  const sendFeedback = (helpful) => {
    setFeedback(helpful ? 'up' : 'down');
    logEvent({
      kind: 'feedback',
      section: audience,
      question,
      topSlug: sources[0]?.slug,
      answered: true,
      helpful,
    });
  };

  const onArticle = (from, slug) => () =>
    logEvent({
      kind: 'click',
      section: audience,
      question: question || undefined,
      clickedSlug: slug,
      topSlug: sources[0]?.slug,
      from,
    });

  const submitPill = (e) => {
    e.preventDefault();
    ask(value, { source: 'pill', history: pushedRef.current ? 'replace' : 'push' });
  };

  /* The pill and its Try/Clear row, written once: in the header once a
     question is asked, at the top of the home grid (level with the rail)
     before that. Only one is ever mounted, so inputRef is unambiguous. */
  const searchBlock = (
    <>
      <form
        className={`hcs-pill${answered ? ' is-active' : ''}${phase === 'asking' ? ' is-asking' : ''}`}
        role="search"
        onSubmit={submitPill}
      >
        <i className="bi bi-search hcs-pill-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          className="hcs-pill-input"
          placeholder="Ask anything, e.g. How do I connect my brokerage?"
          aria-label="Ask the help centre a question"
          value={value}
          enterKeyHint="search"
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && value) {
              e.preventDefault();
              setValue('');
            }
          }}
        />
        <button
          type="submit"
          className={`hcs-ask${hasQ ? ' is-solid' : ''}`}
          disabled={!hasQ || phase === 'asking'}
          aria-label="Ask AI"
        >
          {phase === 'asking' ? (
            <>
              <i className="bi bi-arrow-repeat hcs-spin" aria-hidden="true" />
              <span className="hcs-ask-label">Asking</span>
            </>
          ) : (
            <>
              <i className="bi bi-stars" aria-hidden="true" />
              <span className="hcs-ask-label">Ask AI</span>
            </>
          )}
        </button>
      </form>

      {answered ? (
        <button type="button" className="hcs-clear" onClick={clear}>
          <i className="bi bi-chevron-left" aria-hidden="true" /> Clear and browse
        </button>
      ) : (
        <p className="hcs-try">
          <span className="hcs-try-label">Try:</span>
          {cfg.tryChips.map((c) => (
            <button
              key={c}
              type="button"
              className="hcs-chip"
              onClick={() => ask(c, { source: 'try_chip' })}
            >
              {c}
            </button>
          ))}
        </p>
      )}
    </>
  );

  return (
    <div className="hc-page hcs">
      {/* Visible crumb, eyebrow, title and subline removed so the search sits
          directly under the top nav. The h1 stays for screen readers. The
          header only renders once a question is asked, to hold the pill. */}
      <h1 className="hcs-sr">{cfg.title}</h1>
      {answered ? <header className="hcs-head">{searchBlock}</header> : null}

      {/* ── home ── */}
      {!answered ? (
        <div className="hcs-grid hcs-grid--home">
          <div className="hcs-search">{searchBlock}</div>
          <CategoryRail categories={categories} mode="resting" />

          <div className="hcs-main">
            <section aria-labelledby="hcs-start-title">
              <div className="hcs-sec-head">
                <h2 id="hcs-start-title" className="hcs-h2">
                  Start here
                </h2>
                <span className="hcs-cap">the three most-opened categories</span>
              </div>
              <div className="hcs-start">
                {start.map((c) => (
                  <Link key={c.id} href={c.url} className="hcs-start-card">
                    <span className="hcs-tile hcs-tile--36" aria-hidden="true">
                      <i className={`bi ${c.icon}`} />
                    </span>
                    <span className="hcs-start-name">{c.title}</span>
                    <span className="hcs-start-desc">{c.description}</span>
                    <span className="hcs-link hcs-start-cta">
                      View articles <i className="bi bi-chevron-right" aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section aria-labelledby="hcs-faq-title">
              <div className="hcs-sec-head">
                <h2 id="hcs-faq-title" className="hcs-h2">
                  Frequently asked questions
                </h2>
              </div>
              <div className="hcs-faqs">
                {cfg.faqs.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="hcs-faq"
                    onClick={() => ask(q, { source: 'faq' })}
                  >
                    <span>{q}</span>
                    <i className="bi bi-chevron-right hcs-chev" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>

            {updated.length ? (
              <section aria-labelledby="hcs-upd-title">
                <div className="hcs-sec-head">
                  <h2 id="hcs-upd-title" className="hcs-h2">
                    Recently updated
                  </h2>
                  <span className="hcs-cap">articles changed in the last 30 days</span>
                </div>
                <ul className="hcs-updated">
                  {updated.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={a.url}
                        className="hcs-upd-row"
                        onClick={onArticle('updated', a.slug)}
                      >
                        <span className="hcs-upd-title">{a.title}</span>
                        <span className="hcs-upd-cat">{a.category}</span>
                        <span className="hcs-mono hcs-upd-date">{relativeDate(a.updatedAt)}</span>
                        <i className="bi bi-chevron-right hcs-chev" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <HelpCard cfg={cfg} from="home" />
          </div>
        </div>
      ) : (
        /* ── answered ── */
        <div className="hcs-grid hcs-grid--answered">
          <CategoryRail
            categories={categories}
            mode={phase === 'answered' ? 'matches' : 'resting'}
            counts={counts}
            q={question}
          />

          <div className="hcs-main hcs-main--answered">
            <section
              ref={answerRef}
              tabIndex={-1}
              className="hcs-answer"
              role="region"
              aria-label="AI answer"
              aria-busy={phase === 'asking'}
            >
              {phase === 'asking' ? (
                <>
                  <div className="hcs-answer-label">
                    <i className="bi bi-stars" aria-hidden="true" />
                    <span className="hcs-mono">AI ANSWER</span>
                  </div>
                  <Skel className="hcs-skel--line" />
                  <Skel className="hcs-skel--line" />
                  <Skel className="hcs-skel--line" />
                  <Skel className="hcs-skel--line hcs-skel--w70" />
                  <Skel className="hcs-skel--line hcs-skel--w40" />
                  <div className="hcs-sources">
                    <Skel className="hcs-skel--chip" />
                    <Skel className="hcs-skel--chip" />
                    <Skel className="hcs-skel--chip" />
                  </div>
                </>
              ) : phase === 'error' ? (
                <div className="hcs-quiet">
                  <p>
                    The assistant is unavailable right now. Browse a category or try again in a
                    moment.
                  </p>
                  <div className="hcs-quiet-actions">
                    <button
                      type="button"
                      className="hcs-btn hcs-btn--secondary"
                      onClick={() => ask(question, { history: 'replace' })}
                    >
                      Try again
                    </button>
                  </div>
                </div>
              ) : phase === 'none' ? (
                <div className="hcs-quiet">
                  <p>
                    We could not find an answer in the help centre. Try different words, browse a
                    category, or contact support.
                  </p>
                  <div className="hcs-quiet-actions">
                    <button type="button" className="hcs-btn hcs-btn--secondary" onClick={clear}>
                      Browse categories
                    </button>
                    <a
                      href={cfg.contact}
                      className="hcs-btn hcs-btn--primary"
                      onClick={() =>
                        logEvent({ kind: 'contact', section: audience, from: 'no_answer' })
                      }
                    >
                      {cfg.contactLabel}
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <div className="hcs-answer-label">
                    <i className="bi bi-stars" aria-hidden="true" />
                    <span className="hcs-mono">AI ANSWER</span>
                    <span className="hcs-spacer" />
                    <span className="hcs-cap">
                      from {sources.length} help article{sources.length === 1 ? '' : 's'}
                      {result?.fromUser ? ', from the user help centre' : ''}
                    </span>
                  </div>
                  <div className="hcs-answer-text">
                    {result.answer.split(/\n{2,}/).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                  {Array.isArray(result.steps) && result.steps.length ? (
                    <ol className="hcs-steps">
                      {result.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  ) : null}
                  <div>
                    <p className="hcs-mono-label hcs-sources-label">SOURCES</p>
                    <div className="hcs-sources">
                      {(allSources ? sources : sources.slice(0, SOURCES_VISIBLE)).map((s) => (
                        <Link
                          key={s.slug}
                          href={s.url}
                          className="hcs-source"
                          onClick={onArticle('source_chip', s.slug)}
                        >
                          <i className="bi bi-file-earmark-text" aria-hidden="true" />
                          {s.title}
                        </Link>
                      ))}
                      {!allSources && sources.length > SOURCES_VISIBLE ? (
                        <button
                          type="button"
                          className="hcs-source hcs-source--more"
                          onClick={() => setAllSources(true)}
                        >
                          +{sources.length - SOURCES_VISIBLE} more
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="hcs-answer-foot">
                    <p className="hcs-caveat">
                      AI-generated from Ezana help articles. Check the source before acting on
                      account changes.
                    </p>
                    <div className="hcs-vote" role="group" aria-label="Was this answer helpful?">
                      {feedback === 'sent' || feedback === 'up' ? (
                        <span className="hcs-vote-q">Thanks</span>
                      ) : (
                        <span className="hcs-vote-q">Was this helpful?</span>
                      )}
                      <button
                        type="button"
                        aria-label="Helpful"
                        aria-pressed={feedback === 'up'}
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
                        aria-label="Not helpful"
                        aria-pressed={feedback === 'down' || feedback === 'sent'}
                        disabled={feedback !== null}
                        onClick={() => sendFeedback(false)}
                      >
                        <i
                          className={`bi ${feedback === 'down' || feedback === 'sent' ? 'bi-hand-thumbs-down-fill' : 'bi-hand-thumbs-down'}`}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </div>
                  {feedback === 'down' ? (
                    <form
                      className="hcs-missing"
                      onSubmit={(e) => {
                        e.preventDefault();
                        logEvent({
                          kind: 'feedback',
                          section: audience,
                          question,
                          helpful: false,
                          comment: comment.slice(0, 500),
                        });
                        setFeedback('sent');
                      }}
                    >
                      <input
                        className="hcs-missing-input"
                        placeholder="What was missing?"
                        aria-label="What was missing?"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <button type="submit" className="hcs-btn hcs-btn--tint">
                        Send
                      </button>
                    </form>
                  ) : null}
                </>
              )}
            </section>

            {phase === 'answered' ? (
              <form
                className="hcs-follow"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(followUp, { source: 'follow_up', history: 'replace' });
                }}
              >
                <label className="hcs-follow-label" htmlFor="hcs-follow-input">
                  Ask a follow-up
                </label>
                <input
                  id="hcs-follow-input"
                  className="hcs-follow-input"
                  placeholder="e.g. Which brokerages support SnapTrade?"
                  value={followUp}
                  autoComplete="off"
                  onChange={(e) => setFollowUp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' && followUp) {
                      e.preventDefault();
                      setFollowUp('');
                    }
                  }}
                />
                <button
                  type="submit"
                  className="hcs-btn hcs-btn--tint"
                  disabled={followUp.trim().length < MIN_Q}
                >
                  Ask
                </button>
              </form>
            ) : null}

            {phase === 'asking' ? (
              <div className="hcs-keep" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="hcs-keep-card">
                    <Skel className="hcs-skel--line hcs-skel--w70" />
                    <Skel className="hcs-skel--line" />
                    <Skel className="hcs-skel--line" />
                  </div>
                ))}
              </div>
            ) : phase === 'answered' && reading.length ? (
              <section className="hcs-keep-sec" aria-labelledby="hcs-keep-title">
                <div className="hcs-sec-head">
                  <h2 id="hcs-keep-title" className="hcs-h2">
                    Keep reading
                  </h2>
                  <span className="hcs-cap">
                    {Math.max(0, related.length - sources.length)} more articles match, grouped by
                    category
                  </span>
                </div>
                <div className={`hcs-keep${reading.length === 1 ? ' hcs-keep--one' : ''}`}>
                  {reading.map((c) => (
                    <div key={c.id} className="hcs-keep-card">
                      <div className="hcs-keep-head">
                        <span className="hcs-tile hcs-tile--30" aria-hidden="true">
                          <i className={`bi ${c.icon}`} />
                        </span>
                        <span className="hcs-keep-name">{c.title}</span>
                        <span className="hcs-spacer" />
                        <span className="hcs-mono hcs-keep-count">{c.count}</span>
                      </div>
                      <ul className="hcs-keep-list">
                        {c.articles.map((a) => (
                          <li key={a.slug}>
                            <Link
                              href={a.url}
                              className="hcs-keep-link"
                              onClick={onArticle('keep_reading', a.slug)}
                            >
                              <span>{a.title}</span>
                              <i className="bi bi-chevron-right hcs-chev" aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={`${c.url}?q=${encodeURIComponent(question)}`}
                        className="hcs-link hcs-keep-all"
                      >
                        All {c.title} articles
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="hcs-side hcs-side--answered">
            {phase === 'asking' ? (
              <div className="hcs-related" aria-hidden="true">
                <Skel className="hcs-skel--line hcs-skel--w40" />
                {[0, 1, 2, 3].map((i) => (
                  <Skel key={i} className="hcs-skel--row" />
                ))}
              </div>
            ) : (phase === 'answered' || phase === 'none') && related.length ? (
              <section className="hcs-related" aria-labelledby="hcs-rel-title">
                <div className="hcs-sec-head">
                  <h2 id="hcs-rel-title" className="hcs-h2">
                    Related articles
                  </h2>
                  <span className="hcs-cap">ranked by match</span>
                </div>
                <ul className="hcs-rel-list">
                  {(allRelated ? related : related.slice(0, RELATED_VISIBLE)).map((a, i) => (
                    <li key={a.slug}>
                      <Link
                        href={a.url}
                        className="hcs-rel-row"
                        onClick={onArticle('related', a.slug)}
                      >
                        <span className="hcs-tile hcs-tile--34" aria-hidden="true">
                          <i className="bi bi-file-earmark-text" />
                        </span>
                        <span className="hcs-rel-body">
                          <span className="hcs-rel-title">{a.title}</span>
                          <span className="hcs-rel-meta">
                            {a.category ? `${a.category} · ` : ''}
                            <span className="hcs-mono">{a.readMinutes || 1} min read</span>
                            {i === 0 ? <span className="hcs-tag hcs-mono">BEST MATCH</span> : null}
                          </span>
                        </span>
                        <i className="bi bi-chevron-right hcs-chev" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
                {related.length > RELATED_VISIBLE ? (
                  <button
                    type="button"
                    className="hcs-link hcs-more"
                    onClick={() => setAllRelated((v) => !v)}
                  >
                    {allRelated ? 'Show fewer' : `See all ${related.length} results`}
                  </button>
                ) : null}
              </section>
            ) : null}

            <TrendingList
              items={still}
              base={cfg.base}
              label="STILL TRENDING"
              icon="bi-graph-up-arrow"
              rows={3}
              cls="hcs-still"
            />
          </aside>

          <div className="hcs-help-wrap">
            <HelpCard cfg={cfg} from="answered" />
          </div>
        </div>
      )}

      {/* ── platform changelog + feedback, below everything, both states ── */}
      <PlatformChangelog />
    </div>
  );
}
