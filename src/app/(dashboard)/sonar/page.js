'use client';

import { useEffect, useState } from 'react';
import { SonarHero } from '@/components/sonar/SonarHero';
import { SonarQueryBar } from '@/components/sonar/SonarQueryBar';
import { SonarLiveAnswer } from '@/components/sonar/SonarLiveAnswer';
import { EchoResults, PredictionMarkets } from '@/components/sonar/SonarSections';
import { RelevantNews } from '@/components/sonar/SonarDataSections';
import {
  SnrKeyStats,
  SnrPriceCatalysts,
  SnrGovSignal,
  SnrFollowUp,
  useAwards,
  useCongressTrades,
  useLobbying,
} from '@/components/sonar/SonarDossier';
import { supabase } from '@/lib/supabase-browser';

import './sonar.css';

/** Current Supabase session access token (JWT), or null when signed out. Sent as a
    Bearer header (with credentials) on the authed Sonar fetches — matching the app's
    established pattern (e.g. select-plan/page.js) so getAuthUser accepts the request. */
async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

const EXAMPLES = ['Lockheed Martin', 'Section 232 tariffs', 'Nancy Pelosi', 'critical minerals'];

/** Classification → recent-ping/query-type badge (Policy=blue, Person=emerald, Topic=amber). */
function badgeType(classification) {
  switch (classification) {
    case 'person':
    case 'username':
      return { type: 'person', label: 'Person' };
    case 'policy':
    case 'bill':
      return { type: 'policy', label: 'Policy' };
    case 'ticker':
      return { type: 'ticker', label: 'Ticker' };
    case 'organization':
      return { type: 'topic', label: 'Firm' };
    default:
      return { type: 'topic', label: 'Topic' };
  }
}

function relTime(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * Ezana Sonar — redesigned intelligence surface. State 01 is a rings-gradient
 * hero (Ping input, examples, recent pings, live quota); on submit it collapses to
 * State 02: a sticky query bar, a streaming cited "Live Briefing" (from the real
 * /api/sonar/query), and a dashboard of modules that render from the real response
 * (Echo, Government Signal, Prediction Markets — gated when the plan doesn't
 * include it, Key Entities, Ping Next). The API enforces the entitlement matrix.
 */
export default function SonarPage() {
  const [entitlements, setEntitlements] = useState(null);
  const [queryText, setQueryText] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | searching | streaming | complete | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/sonar/entitlements', {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.ok) setEntitlements(await res.json());
      } catch {
        /* non-fatal */
      }
    })();
    try {
      const r = JSON.parse(localStorage.getItem('sonar_recent') || '[]');
      if (Array.isArray(r)) setRecent(r);
    } catch {
      /* ignore */
    }
  }, []);

  // Fade the top nav into the radar rings only while the hero is showing. The class
  // drives a scoped nav-background override in sonar.css; removed on results/unmount
  // so the nav is normal everywhere else (and in Sonar's own results view).
  useEffect(() => {
    const cls = 'sonar-hero-active';
    if (phase === 'idle') document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [phase]);

  function pushRecent(query, classification) {
    const bt = badgeType(classification);
    setRecent((prev) => {
      const next = [
        { query, type: bt.type, typeLabel: bt.label, at: Date.now() },
        ...prev.filter((p) => p.query !== query),
      ].slice(0, 6);
      try {
        localStorage.setItem('sonar_recent', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function runQuery(raw, priorEntity) {
    const query = String(raw || '').trim();
    if (!query || phase === 'searching' || phase === 'streaming') return;
    setQueryText(query);
    setError(null);
    setResult(null);
    setPhase('searching');
    const t0 = Date.now();
    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Sign in to use Sonar.');
        setPhase('error');
        return;
      }
      const res = await fetch('/api/sonar/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ query, ...(priorEntity ? { context: priorEntity } : {}) }),
      });
      const data = await res.json().catch(() => null);
      setElapsedSec(((Date.now() - t0) / 1000).toFixed(1));
      if (res.status === 429) {
        setError('That ping did not land. Try again in a moment.');
        setPhase('error');
        return;
      }
      if (!res.ok) {
        setError(data?.error || 'Sonar could not complete that ping.');
        setPhase('error');
        return;
      }
      setResult(data);
      pushRecent(query, data.classification);
      if (data.quota) setEntitlements((prev) => (prev ? { ...prev, quota: data.quota } : prev));
      if (data.quotaExceeded) setPhase('complete');
      else if (data.briefing) setPhase('streaming');
      else setPhase('complete');
    } catch {
      setError('That ping did not land. Try again in a moment.');
      setPhase('error');
    }
  }

  const loading = phase === 'searching' || phase === 'streaming';
  const quota = result?.quota || entitlements?.quota;
  const dossierReady = Boolean(result && !result.quotaExceeded);
  // Shared dossier sources: fetched ONCE here so Key Stats, the chart band and
  // the Government Signal band read the same rows (and the same skeleton state).
  const awards = useAwards(dossierReady ? result.query : null);
  const qt = result?.classification ? badgeType(result.classification) : null;
  const sourceCount = result?.sections
    ? result.sections.reduce((n, s) => n + s.items.length, 0)
    : 0;

  // Tickers the query surfaced — drives the live market/news/catalyst modules.
  const tickers = (() => {
    if (!result) return [];
    const out = [];
    if (result.classification === 'ticker' && result.query) out.push(result.query.toUpperCase());
    for (const s of result.sections || []) {
      for (const it of s.items) {
        if (it.ticker && !out.includes(it.ticker)) out.push(it.ticker);
      }
    }
    return out;
  })();
  const primaryTicker = tickers[0] || null;
  const trades = useCongressTrades(dossierReady ? primaryTicker : null);
  const lobbying = useLobbying(dossierReady ? primaryTicker : null);

  return (
    <div className="sonar-root">
      {/* Light glow behind the pill: inside the isolated .sonar-root so it
          paints ABOVE the dashboard shell's opaque background but BEHIND the
          sonar content. Present in the hero and, slightly intensified, while a
          ping is in flight; the results view is clean like the design. */}
      {(phase === 'idle' || phase === 'searching') && (
        <div
          className={`sonar-glow${phase === 'searching' ? ' sonar-glow--active' : ''}`}
          aria-hidden
        />
      )}

      <div className="sonar-page">
        {phase === 'idle' ? (
          <SonarHero
            value={queryText}
            onChange={setQueryText}
            onSubmit={runQuery}
            loading={loading}
            examples={EXAMPLES}
            recent={recent.map((r) => ({ ...r, rel: relTime(r.at) }))}
            onPick={runQuery}
            quota={quota}
            version={entitlements?.version}
          />
        ) : (
          <>
            <div className="sonar-sticky">
              <span className="sonar-sticky-label">SONAR</span>
              {qt && <span className={`sonar-badge sonar-badge--${qt.type}`}>{qt.label}</span>}
              <SonarQueryBar
                value={queryText}
                onChange={setQueryText}
                onSubmit={runQuery}
                loading={loading}
                compact
              />
            </div>

            <div className="sonar-body">
              {error && <div className="sonar-error">{error}</div>}

              {phase === 'searching' && (
                <div className="sonar-answer sonar-surface">
                  <div className="sonar-answer-head">
                    <span className="sonar-ping-dot" aria-hidden />
                    <span className="sonar-live-label">Live Briefing</span>
                    <span className="sonar-answer-meta">Sweeping the field...</span>
                  </div>
                  <div className="sonar-answer-body" style={{ opacity: 0.6 }}>
                    Sonar is sweeping Ezana’s datasets
                    <span className="sonar-caret" aria-hidden />
                  </div>
                </div>
              )}

              {result?.quotaExceeded && (
                <div className="sonar-answer sonar-surface">
                  <div className="sonar-note">{result.message}</div>
                  {result.locked?.length > 0 && (
                    <div className="sonar-disclaimer" style={{ textAlign: 'left', marginTop: 10 }}>
                      Upgrade to include {result.locked.map((d) => d.label).join(', ')}.{' '}
                      <a href="/pricing" style={{ color: 'var(--emerald)' }}>
                        See plans →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {result && !result.quotaExceeded && (
                <>
                  {/* ── Dossier rows 1-4 (approved mockup layout) ── */}
                  <div className="snr-row1">
                    <div className="snr-brief">
                      <div className="snr-entity">
                        <span className="snr-entity-kicker sonar-num">LIVE BRIEFING</span>
                        <span className="snr-entity-name">
                          {result.query}
                          {primaryTicker && (
                            <span className="snr-entity-tkr sonar-num">${primaryTicker}</span>
                          )}
                        </span>
                      </div>
                      {result.briefing ? (
                        <SonarLiveAnswer
                          answer={result.briefing}
                          sourceCount={sourceCount}
                          elapsedSec={elapsedSec}
                          searched={result.searched}
                          webSources={result.webSources}
                          onComplete={() => setPhase('complete')}
                        />
                      ) : (
                        <div className="sonar-answer sonar-surface">
                          <div className="sonar-answer-head">
                            <span className="sonar-ping-dot sonar-ping-dot--frozen" aria-hidden />
                            <span className="sonar-live-label">Live Briefing</span>
                          </div>
                          <div className="sonar-note">
                            {result.empty
                              ? `Ezana has limited data on “${result.query}” across the datasets Sonar searched. Nothing was fabricated.`
                              : 'Synthesis is unavailable right now. The sourced matches are below.'}
                          </div>
                          {result.searched?.length > 0 && (
                            <div className="sonar-manifest">
                              <div className="sonar-manifest-title">Sonar searched</div>
                              <div className="sonar-manifest-row">
                                {result.searched.map((d) => (
                                  <span
                                    key={d.id}
                                    className={`sonar-src-chip${d.used ? ' sonar-src-chip--hit' : ''}`}
                                    title={d.source}
                                  >
                                    {d.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <SnrKeyStats
                      entity={result.query}
                      ticker={primaryTicker}
                      sections={result.sections || []}
                      awards={awards}
                      trades={trades}
                      lobbying={lobbying}
                    />
                    <div className="snr-newsrail">
                      <RelevantNews tickers={tickers} query={result.query} />
                    </div>
                  </div>

                  <SnrPriceCatalysts
                    ticker={primaryTicker}
                    isProxy={result.classification !== 'ticker' && Boolean(primaryTicker)}
                    awards={awards}
                    trades={trades}
                  />

                  <SnrGovSignal
                    entity={result.query}
                    ticker={primaryTicker}
                    awards={awards}
                    trades={trades}
                    lobbying={lobbying}
                  />

                  <div className="snr-row4">
                    <EchoResults sections={result.sections || []} />
                    <PredictionMarkets sections={result.sections || []} locked={result.locked} />
                  </div>

                  {result.disclaimer && <div className="sonar-disclaimer">{result.disclaimer}</div>}

                  {/* Sticky follow-up: hidden while the briefing is still streaming. */}
                  {phase === 'complete' && (
                    <SnrFollowUp
                      entity={result.query}
                      classification={result.classification}
                      ticker={primaryTicker}
                      onFollowUp={(q) => runQuery(q, result.query)}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
