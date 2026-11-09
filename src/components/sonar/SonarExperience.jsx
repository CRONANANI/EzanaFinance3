'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { SonarHero } from '@/components/sonar/SonarHero';
import { SonarQueryBar } from '@/components/sonar/SonarQueryBar';
import { SonarLiveAnswer } from '@/components/sonar/SonarLiveAnswer';
import { EchoResults, PredictionMarkets } from '@/components/sonar/SonarSections';
import { createPortal } from 'react-dom';
import { SonarLoadingOverlay } from '@/components/sonar/SonarLoadingOverlay';
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

import '@/app/(dashboard)/sonar/sonar.css';
import { SonarLoader } from '@/components/sonar/SonarLoader';
import { SonarPingLoader } from '@/components/sonar/SonarPingLoader';
import { pingEntityLabel } from '@/lib/sonar/ping-entity';
import '@/app/datasets/datasets-loading.css';

/* The landing Sonar band, loaded only once a Datasets search is sent. */
import DatasetCardMatches from './DatasetCardMatches';
import { DeepResearchPrompt, DeepResearchRun, StandardResearchRun } from './DeepResearch';
import { DeepResearchCard, deepSignupHref } from './DeepResearchCard';
import SonarLoadingState from '@/components/sonar/loading/SonarLoadingState';
import { useAuth } from '@/components/auth-context';
import { SonarSignupCta } from './SonarSignupCta';
import { parseSseBlock } from '@/lib/sonar/research-state';

const SonarBand = dynamic(
  () => import('@/components/landing/SonarSection').then((m) => ({ default: m.SonarSection })),
  { ssr: false, loading: () => <SonarBandLoading /> },
);

function SonarBandLoading() {
  return (
    <div className="sonar-ds-loader">
      <SonarLoader size="md" sublabel="Sweeping filings, trades and contracts" />
    </div>
  );
}

/** Current Supabase session access token (JWT), or null when signed out. Sent as a
    Bearer header (with credentials) on the authed Sonar fetches, matching the app's
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
 * The Sonar search experience, shared by the signed-in Sonar page (variant
 * 'app') and the Datasets page (variant 'datasets'). On Datasets the hero is
 * minimal (no examples or recent pings), heroAddon (the orbital map) renders
 * under the search bar and disappears with the hero once a ping is sent, and
 * the in-flight state is the inline stacked-block loader from the landing
 * Sonar band instead of the fullscreen takeover.
 *
 * Ezana Sonar, redesigned intelligence surface. State 01 is a rings-gradient
 * hero (Ping input, examples, recent pings, live quota); on submit it collapses to
 * State 02: a sticky query bar, a streaming cited "Live Briefing" (from the real
 * /api/sonar/query), and a dashboard of modules that render from the real response
 * (Echo, Government Signal, Prediction Markets, gated when the plan doesn't
 * include it, Key Entities, Ping Next). The API enforces the entitlement matrix.
 */
export function SonarExperience({
  variant = 'app',
  heroAddon = null,
  initialQuery = null,
  stage = 'datasets',
}) {
  const onDatasets = variant === 'datasets';
  /* Datasets: once a search is sent, the page shows the landing Sonar band
     (same format, same guest pipeline, follow-up pings in its own bar).
     Oct 18: /datasets?q=... (the landing pill's hand-off) opens straight on
     that band; the band's own query prop auto-pings it. */
  const startQuery = onDatasets
    ? String(initialQuery || '')
        .trim()
        .slice(0, 600) || null
    : null;
  const [bandQuery, setBandQuery] = useState(startQuery);
  const [entitlements, setEntitlements] = useState(null);
  const [queryText, setQueryText] = useState(startQuery || '');
  /* What the band last pinged, including follow-ups typed in its own bar;
     drives the sign-up CTA and the ?q= in the address. */
  const [shownQuery, setShownQuery] = useState(startQuery);
  const [answeredQuery, setAnsweredQuery] = useState(null);
  /* Every ping in flight (the hero's first ping, the landing pill's
     /datasets?q= hand-off, and follow-ups typed in the band) shows only the
     Sonar ping screen until it settles (Nov 2: "Pulse", SonarPingLoader).
     { query, phase: 'sweeping' | 'ready' | 'error', leaving } or null. */
  const [loader, setLoader] = useState(
    startQuery ? { query: startQuery, phase: 'sweeping', leaving: false } : null,
  );
  /* Nov 7: the loading screen is a full-viewport overlay, so Tab stays on it while it is
     up. The band and the runs under it are inert; this also keeps focus off the page
     footer and header behind it, which sit outside this component. */
  const loaderRef = useRef(null);
  useEffect(() => {
    if (!loader) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const root = loaderRef.current;
      if (!root) return;
      const items = [
        ...root.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.getClientRects().length);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!root.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [loader]);
  const pingInFlight = Boolean(loader && loader.phase === 'sweeping');
  /* The band's handle on its ping (cancel, retry), and whether it has ever
     shown an answer (Cancel or Back then returns to it, not the hero). */
  const bandControlRef = useRef(null);
  const hadAnswerRef = useRef(false);
  const loaderTimers = useRef([]);
  useEffect(() => () => loaderTimers.current.forEach(clearTimeout), []);
  const [phase, setPhase] = useState('idle'); // idle | searching | streaming | complete | error
  const pingIdRef = useRef(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(null);
  /* Nov 2026: a streamed answer is `live` while it arrives and `final` once the server
     has sent its last event. */
  const [answerLive, setAnswerLive] = useState(false);
  const [answerFinal, setAnswerFinal] = useState(true);
  const [recent, setRecent] = useState([]);
  /* Nov 4, deep research: the offer for a research assignment ({ query,
     deep }), and the run once the visitor says yes ({ query, estimate }). */
  const [deepOffer, setDeepOffer] = useState(null);
  const [deepRun, setDeepRun] = useState(null);
  /* Nov 2026, research modes: a focused question runs standard research
     automatically ({ query, classification, goDeeper }). */
  const [standardRun, setStandardRun] = useState(null);
  /* Nov 2026, estimates: POST /api/sonar/estimate for the latest ping
     ({ query, data }), fired by the band on submit just before the ping. It
     times the answer in progress and fills the deep research card. */
  const [estimate, setEstimate] = useState(null);
  const estimateFor = (query) =>
    estimate && estimate.query === query && estimate.data ? estimate.data : null;
  const { isAuthenticated: signedIn } = useAuth();

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
    if (onDatasets) return undefined;
    const cls = 'sonar-hero-active';
    if (phase === 'idle') document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [phase, onDatasets]);

  /* Safety valve: the loader can never stick if a ping never reports back. */
  useEffect(() => {
    if (!pingInFlight) return undefined;
    /* A ping that never reports back shows the error state, not a sweep
       that runs forever. */
    const id = setTimeout(
      () => setLoader((l) => (l && l.phase === 'sweeping' ? { ...l, phase: 'error' } : l)),
      70_000,
    );
    return () => clearTimeout(id);
  }, [pingInFlight]);

  /* Keep the address shareable and refresh-safe without a navigation. */
  function onBandPing(query, meta = null) {
    /* The band reports twice: the raw words when the ping starts (for ?q=),
       then the understood display title once it lands, which is what the
       sign-up CTA shows. The address keeps the raw words. It also reports
       `settled` when the ping finishes either way, which lifts the rail
       loader. */
    if (meta?.settled) {
      if (meta.cancelled) return;
      if (meta.ok === false) {
        /* A failed ping: the screen stays up in its error state, with Try
           again and Back. */
        setLoader((l) => (l ? { ...l, phase: 'error', leaving: false } : l));
        return;
      }
      /* Settled without a briefing (gated, or nothing found): the screen
         simply fades out; "Briefing ready" would not be true. The loading
         state clears itself when its fade ends (onExited); the timer is a
         safety net. */
      /* Nov 7: routed to standard research, the loading screen stays up (hold) until the
         report lands (onStandardStatus), so every new answer loads behind the same screen. */
      setLoader((l) => (l && l.phase === 'sweeping' && !l.hold ? { ...l, leaving: true } : l));
      loaderTimers.current.push(setTimeout(() => setLoader((l) => (l?.leaving ? null : l)), 900));
      return;
    }
    if (meta?.display) {
      hadAnswerRef.current = true;
      /* The brief has landed: the loading state plays its hand-off (every
         dimension Complete, the cube's core flares, "Your research brief is
         ready", then a fade) and clears itself (onExited). The timer is a
         safety net in case it never reports back. */
      setLoader((l) => (l ? { ...l, phase: 'ready', leaving: false } : l));
      loaderTimers.current.push(
        setTimeout(() => setLoader((l) => (l && l.phase === 'ready' ? null : l)), 2600),
      );
      setShownQuery(meta.display);
      /* The briefing has landed: only now may matching dataset cards show,
         so a card list is never the whole response. */
      setAnsweredQuery(query);
      return;
    }
    loaderTimers.current.forEach(clearTimeout);
    loaderTimers.current = [];
    setLoader({ query, phase: 'sweeping', leaving: false });
    setAnsweredQuery(null);
    setShownQuery(query);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('q', query);
      window.history.replaceState(window.history.state, '', url);
    } catch {
      /* non-fatal */
    }
  }

  /* The loading state's hand-off (or quiet fade) has finished: show what is
     underneath. Stable, so the state's effect does not re-run. */
  const clearLoader = useCallback(() => {
    loaderTimers.current.forEach(clearTimeout);
    loaderTimers.current = [];
    setLoader((l) => (l && (l.phase === 'ready' || l.leaving) ? null : l));
  }, []);

  /* Nov 7: standard research runs behind the loading screen. The screen holds while the run
     works, plays its hand-off when the report lands, and steps aside for an error, a gate or
     a quota so the run can say what happened. */
  function holdLoaderFor(query) {
    loaderTimers.current.forEach(clearTimeout);
    loaderTimers.current = [];
    setLoader((l) =>
      l && l.phase !== 'error'
        ? { ...l, query: l.query || query, hold: 'standard', leaving: false }
        : { query, phase: 'sweeping', leaving: false, hold: 'standard' },
    );
  }
  function startStandard(query, { classification = null, goDeeper: hint = null } = {}) {
    setDeepRun(null);
    setDeepOffer(null);
    setStandardRun({ query, classification, goDeeper: hint, nonce: Date.now() });
    holdLoaderFor(query);
  }
  const onStandardStatus = useCallback((status) => {
    if (status === 'done') {
      setLoader((l) => (l?.hold === 'standard' ? { ...l, phase: 'ready', leaving: false } : l));
      loaderTimers.current.push(
        setTimeout(
          () => setLoader((l) => (l?.hold === 'standard' && l.phase === 'ready' ? null : l)),
          2600,
        ),
      );
    } else if (status === 'error' || status === 'gated' || status === 'quota') {
      setLoader((l) => (l?.hold === 'standard' ? { ...l, leaving: true } : l));
      loaderTimers.current.push(
        setTimeout(() => setLoader((l) => (l?.hold === 'standard' && l.leaving ? null : l)), 900),
      );
    }
  }, []);

  /* Nov 7: a new question from a research answer's ping bar: close the run and ping it
     through the band, which raises the same loading screen as any other ping. */
  function pingFromRun(query) {
    const q = String(query || '')
      .trim()
      .slice(0, 600);
    if (!q) return;
    setDeepOffer(null);
    setDeepRun(null);
    setStandardRun(null);
    setQueryText(q);
    if (bandControlRef.current?.ping?.(q)) return;
    /* No band handle yet: start the band on the question (it auto-pings its query). */
    setBandQuery(q);
    onBandPing(q);
  }

  /* Leave the ping screen. With an earlier answer on the page, back to it;
     on a first ping, back to the Ping field with the query still in it. */
  function leavePing() {
    const query = loader?.query || bandQuery || '';
    loaderTimers.current.forEach(clearTimeout);
    loaderTimers.current = [];
    setLoader(null);
    if (hadAnswerRef.current) return;
    setQueryText(query);
    setBandQuery(null);
    setShownQuery(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('q');
      window.history.replaceState(window.history.state, '', url);
    } catch {
      /* non-fatal */
    }
  }

  /* Cancel: abort the request (nothing is shown for it), then leave. */
  function cancelPing() {
    bandControlRef.current?.cancel();
    /* A standard run behind the screen is cancelled with it (unmounting ends its stream,
       and a cancelled run is never charged). */
    if (loader?.hold === 'standard') setStandardRun(null);
    leavePing();
  }

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
    if (onDatasets) {
      setQueryText(query);
      setBandQuery(query);
      onBandPing(query);
      return;
    }
    setQueryText(query);
    setError(null);
    setResult(null);
    setAnswerLive(false);
    setAnswerFinal(true);
    setPhase('searching');
    const t0 = Date.now();
    const pingId = ++pingIdRef.current;
    // Takeover safety valve: track the server budget (maxDuration = 60 on the
    // route) instead of undercutting it. A real briefing with live web search
    // takes 20 to 45s; the old 30s valve was abandoning pings the server
    // completed and billed. 55s = server budget minus network headroom. The
    // controller actually cancels the request instead of letting a response
    // straggle in after the UI gave up.
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      if (pingIdRef.current !== pingId) return;
      pingIdRef.current += 1; // invalidate the in-flight response
      controller.abort();
      setError('The ping timed out. Try again.');
      setPhase('error');
    }, 55_000);
    const stillCurrent = () => pingIdRef.current === pingId;
    try {
      const token = await getAccessToken();
      if (!stillCurrent()) return;
      /* A missing bearer token is NOT proof of being signed out. It comes from
         supabase.auth.getSession() on the browser client, which this repo
         documents as prone to Web Locks stalls (see supabase-browser.js), and a
         transient null was walling genuinely signed-in visitors with
         "Sign in to use Sonar" before any request went out. The route accepts
         bearer OR cookie, and credentials are already included, so the request
         goes regardless and the SERVER decides: a real 401 below is the only
         thing that shows the sign-in message. */
      /* Nov 2026: ask for the answer as it is written. Every gate (sign-in, quota,
         limits) still answers in JSON, and so does any server that cannot stream. */
      const headers = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/sonar/query', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ query, ...(priorEntity ? { context: priorEntity } : {}) }),
        signal: controller.signal,
      });
      const type = res.headers.get('content-type') || '';
      if (res.ok && type.includes('text/event-stream') && res.body) {
        await readAnswerStream(res, { query, t0, stillCurrent, timeout });
        return;
      }
      const data = await res.json().catch(() => null);
      if (!stillCurrent()) return;
      clearTimeout(timeout);
      setElapsedSec(((Date.now() - t0) / 1000).toFixed(1));
      if (res.status === 401) {
        setError('Sign in to use Sonar.');
        setPhase('error');
        return;
      }
      if (res.status === 429) {
        setError('That ping did not land. Try again in a moment.');
        setPhase('error');
        return;
      }
      if (res.status === 503) {
        setError('Sonar is busy right now. Nothing was spent; try again in a minute.');
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
    } catch (e) {
      if (!stillCurrent()) return;
      clearTimeout(timeout);
      // When the failure IS the valve firing, the timeout handler has already
      // set the message; overwriting it would hide why the ping stopped.
      if (e?.name !== 'AbortError') {
        setError('That ping did not land. Try again in a moment.');
        setPhase('error');
      }
    }
  }

  /* The streamed quick answer: meta (the dashboard modules, at once), delta (answer
     text that passed the server's grounding gate), done (the final answer), error. */
  async function readAnswerStream(res, { query, t0, stillCurrent, timeout }) {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let gotText = false;
    let finished = false;
    setAnswerLive(true);
    setAnswerFinal(false);
    const handle = ([event, d]) => {
      if (event === 'meta') {
        setResult({ ...d, briefing: '' });
        pushRecent(query, d.classification);
        if (d.quota) setEntitlements((prev) => (prev ? { ...prev, quota: d.quota } : prev));
        setPhase('streaming');
      } else if (event === 'delta') {
        if (!d?.text) return;
        gotText = true;
        setResult((r) => (r ? { ...r, briefing: `${r.briefing || ''}${d.text}` } : r));
      } else if (event === 'done') {
        finished = true;
        clearTimeout(timeout);
        setElapsedSec(((Date.now() - t0) / 1000).toFixed(1));
        setResult((r) => ({ ...(r || {}), ...d, briefing: d.briefing || '' }));
        setAnswerFinal(true);
        /* With an answer, SonarLiveAnswer reports completion; without one, complete now. */
        if (!d.briefing) setPhase('complete');
      } else if (event === 'error') {
        finished = true;
        clearTimeout(timeout);
        setAnswerFinal(true);
        if (gotText) {
          setElapsedSec(((Date.now() - t0) / 1000).toFixed(1));
        } else {
          setError(d?.error || 'That ping did not land. Try again in a moment.');
          setPhase('error');
        }
      }
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (!stillCurrent()) {
        reader.cancel().catch(() => {});
        return;
      }
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let cut;
      while ((cut = buf.indexOf('\n\n')) >= 0) {
        const ev = parseSseBlock(buf.slice(0, cut));
        buf = buf.slice(cut + 2);
        if (ev) handle(ev);
      }
    }
    if (finished || !stillCurrent()) return;
    /* The connection closed without a last event: keep whatever text arrived. */
    clearTimeout(timeout);
    setAnswerFinal(true);
    if (!gotText) {
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

  // Tickers the query surfaced, drives the live market/news/catalyst modules.
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

  /* The results root's distance from the top of the document, published as
     --snrp-top so the root can be exactly "rest of the first screen" tall and
     the sign-up card lands at the bottom of it without a scroll (Oct 19
     block in app/datasets/sonar/sonar.css). */
  const bandRootRef = useRef(null);
  useEffect(() => {
    const el = bandRootRef.current;
    if (!el) return undefined;
    const publish = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.setProperty('--snrp-top', `${Math.max(0, Math.round(top))}px`);
    };
    publish();
    window.addEventListener('resize', publish);
    return () => window.removeEventListener('resize', publish);
  }, [onDatasets, bandQuery]);

  /* The deep estimate for the run view: the card's time when there is one. */
  function deepEstimate(query, fallback = null) {
    const d = estimateFor(query)?.deep;
    return d ? { minSec: d.minSec, maxSec: d.maxSec, label: d.label } : fallback;
  }

  /* Deep research from the card. `supersede`: an answer to this question is
     still running, so it is cancelled first (the aborted ping is released,
     and the deep run releases its ledger row if the server finished it in
     the same moment), and the visitor is charged for the deep run only. A
     guest goes to sign-up and comes back to the question. */
  function chooseDeep(query, { supersede = false, signup = false } = {}) {
    if (supersede) bandControlRef.current?.cancel();
    loaderTimers.current.forEach(clearTimeout);
    loaderTimers.current = [];
    setLoader(null);
    if (signup) {
      window.location.assign(deepSignupHref(query));
      return;
    }
    setDeepOffer(null);
    setStandardRun(null);
    setDeepRun({ query, estimate: deepEstimate(query), supersedes: supersede, fromCard: true });
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('q', query);
      url.searchParams.set('deep', '1');
      window.history.replaceState(window.history.state, '', url);
    } catch {
      /* non-fatal */
    }
  }

  function acceptDeep() {
    if (!deepOffer) return;
    setStandardRun(null);
    setDeepRun({
      query: deepOffer.query,
      estimate: deepEstimate(deepOffer.query, deepOffer.deep?.estimate || null),
    });
    setDeepOffer(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('q', deepOffer.query);
      url.searchParams.set('deep', '1');
      window.history.replaceState(window.history.state, '', url);
    } catch {
      /* non-fatal */
    }
  }
  function quickInstead(query) {
    setDeepOffer(null);
    setDeepRun(null);
    setStandardRun(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('deep');
      window.history.replaceState(window.history.state, '', url);
    } catch {
      /* non-fatal */
    }
    bandControlRef.current?.quick(query);
  }
  function closeDeep() {
    setDeepOffer(null);
    setDeepRun(null);
    setStandardRun(null);
    leavePing();
  }
  /* Go deeper from a lighter answer: to deep opens the offer (a guest sees
     the sign-up path in it); to standard runs standard straight away. */
  function goDeeper(query, hint) {
    if (hint?.to === 'standard') {
      startStandard(query);
      return;
    }
    setDeepOffer({
      query,
      deep: hint?.deep || {
        reasons: hint?.reasons || [],
        domains: [],
        format: 'report',
        estimate: { label: 'about 1 to 4 minutes' },
        guestNeedsAccount: !signedIn,
        meta: hint?.meta || null,
      },
    });
  }
  /* Today's deep runs are used: run standard on the same question. */
  function standardInstead(query) {
    startStandard(query);
  }

  if (onDatasets && bandQuery) {
    return (
      <div ref={bandRootRef} className="sonar-root sonar-root--datasets sonar-root--band">
        {/* Nov 7: while the loading screen is up the runs under it are inert, like the band. */}
        <div style={{ display: 'contents' }} inert={loader ? '' : undefined}>
          {deepRun ? (
            <DeepResearchRun
              onPing={pingFromRun}
              query={deepRun.query}
              estimate={deepRun.estimate}
              extra={deepRun.supersedes ? { supersedes: { query: deepRun.query } } : null}
              focusOnMount={Boolean(deepRun.fromCard)}
              onQuick={() => quickInstead(deepRun.query)}
              onStandard={() => standardInstead(deepRun.query)}
              onBack={closeDeep}
            />
          ) : null}
          {standardRun && !deepRun ? (
            <StandardResearchRun
              key={standardRun.nonce || standardRun.query}
              onPing={pingFromRun}
              onStatus={onStandardStatus}
              query={standardRun.query}
              classification={standardRun.classification}
              goDeeper={standardRun.goDeeper}
              onGoDeeper={(hint) => goDeeper(standardRun.query, hint)}
              onQuick={() => quickInstead(standardRun.query)}
              onBack={closeDeep}
              estimate={estimateFor(standardRun.query)}
              onDeep={(opts) => chooseDeep(standardRun.query, opts)}
            />
          ) : null}
        </div>
        {deepOffer ? (
          <DeepResearchPrompt
            query={deepOffer.query}
            deep={deepOffer.deep}
            estimate={estimateFor(deepOffer.query)}
            onDeep={acceptDeep}
            onQuick={() => quickInstead(deepOffer.query)}
            onClose={closeDeep}
          />
        ) : null}
        {/* Oct 25: the matching dataset cards sit at the top of the
            right-hand stack, placed by the band. They wait for the briefing
            to land (never the whole response) and only show cards that pass
            the relevance rule. */}
        {/* While the progress overlay is up, the band under it is out of the
            tab order and the accessibility tree (inert), so focus stays on
            what is visible. display: contents keeps the layout as it was. */}
        <div
          className="sonar-band-wrap"
          style={{ display: 'contents' }}
          inert={loader ? '' : undefined}
        >
          <SonarBand
            variant="page"
            query={bandQuery}
            onPing={onBandPing}
            controlRef={bandControlRef}
            onDeepOffer={(query, deep) => {
              /* A shared or refreshed deep research link (?deep=1) runs it
               straight away; otherwise ask. */
              let auto = false;
              try {
                auto = new URL(window.location.href).searchParams.get('deep') === '1';
              } catch {
                auto = false;
              }
              if (auto && !deep?.guestNeedsAccount) {
                setStandardRun(null);
                setDeepRun({ query, estimate: deep?.estimate || null });
              } else setDeepOffer({ query, deep });
            }}
            onStandardResearch={(query, { classification, goDeeper: hint } = {}) =>
              startStandard(query, { classification, goDeeper: hint || null })
            }
            hidden={Boolean(deepRun || standardRun)}
            onEstimate={(query, data) => setEstimate({ query, data })}
            afterAnswer={
              answeredQuery && estimateFor(answeredQuery) ? (
                <DeepResearchCard
                  query={answeredQuery}
                  estimate={estimateFor(answeredQuery)}
                  placement="after"
                  pingsSpent={1}
                  onRun={(st) => chooseDeep(answeredQuery, { signup: st.blocked === 'signup' })}
                />
              ) : null
            }
            deepAction={
              /* Nov 6: the country answer board's executive answer carries deep
                 research as one inline button instead of the full card. */
              answeredQuery && estimateFor(answeredQuery) ? (
                <DeepResearchCard
                  query={answeredQuery}
                  estimate={estimateFor(answeredQuery)}
                  placement="inline"
                  pingsSpent={1}
                  onRun={(st) => chooseDeep(answeredQuery, { signup: st.blocked === 'signup' })}
                />
              ) : null
            }
            stackTop={
              answeredQuery ? <DatasetCardMatches query={answeredQuery} variant="rail" /> : null
            }
          />
        </div>
        {/* Guests only (the card checks auth itself): a centred popup once
            the briefing lands, minimizable to a small widget bottom left. */}
        <SonarSignupCta query={shownQuery || bandQuery} ready={Boolean(answeredQuery)} />
        {loader ? (
          <div
            ref={loaderRef}
            className={`dsl-handoff${stage === 'app' ? ' dsl-handoff--app' : ''}`}
          >
            {loader.phase === 'error' ? (
              <SonarPingLoader
                entityLabel={pingEntityLabel(loader.query)}
                phase={loader.phase}
                leaving={loader.leaving}
                onCancel={cancelPing}
                onRetry={() => bandControlRef.current?.retry()}
                onBack={leavePing}
              />
            ) : (
              /* Nov 2026: the Sonar research loading state, the cube and
                 the seven dimensions only (Nov 8: no query pill, clock,
                 Cancel button or deep research card; Escape still cancels). */
              <SonarLoadingState
                key={loader.query}
                query={loader.query}
                estimate={estimateFor(loader.query)?.answer || null}
                isComplete={loader.phase === 'ready'}
                dismissed={loader.leaving && loader.phase === 'sweeping'}
                onCancel={cancelPing}
                onExited={clearLoader}
              />
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`sonar-root${onDatasets ? ' sonar-root--datasets' : ''}`}>
      {/* Light glow behind the pill: inside the isolated .sonar-root so it
          paints ABOVE the dashboard shell's opaque background but BEHIND the
          sonar content. Present in the hero and, slightly intensified, while a
          ping is in flight; the results view is clean like the design. */}
      {!onDatasets && (phase === 'idle' || phase === 'searching') && (
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
            minimal={onDatasets}
            ghostBar={onDatasets}
            bare={onDatasets}
          >
            {heroAddon}
          </SonarHero>
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
                ghost={onDatasets}
              />
            </div>

            <div className="sonar-body">
              {error && <div className="sonar-error">{error}</div>}

              {/* In-flight: fullscreen takeover portaled to <body> so it
                  paints above the app nav (the page root is an isolated
                  stacking context at z-index 0, which would otherwise trap
                  it beneath the nav). It unmounts, with a short fade, the
                  moment the response lands and the phase leaves 'searching';
                  error and quota states render in the normal page below. */}
              {onDatasets ? (
                phase === 'searching' ? (
                  <div className="sonar-ds-loader">
                    <SonarLoader size="md" sublabel="Sweeping filings, trades and contracts" />
                  </div>
                ) : null
              ) : (
                typeof document !== 'undefined' &&
                createPortal(<SonarLoadingOverlay open={phase === 'searching'} />, document.body)
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
                      {result.briefing || (answerLive && !answerFinal) ? (
                        <SonarLiveAnswer
                          answer={result.briefing}
                          sourceCount={sourceCount}
                          elapsedSec={elapsedSec}
                          searched={result.searched}
                          webSources={result.webSources}
                          live={answerLive}
                          final={answerFinal}
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

export default SonarExperience;
