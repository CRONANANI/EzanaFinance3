'use client';

/**
 * The cards for an insider-buying ping (Nov 2026): "Who's buying their own
 * stock this week?" Built from sec_insider_transactions via
 * src/lib/sonar/landing-insider-buying.js. Every number comes from the
 * dossier (filings and quotes); nothing is computed by a model.
 *
 *   Who's buying their own stock?  a playable bar race: every buy smallest to
 *                                  largest on a log scale, the camera following
 *                                  the newest bar, a running total, a segment
 *                                  per buy (click to jump), a spoken-style
 *                                  caption, a detail card per buy (spotlight
 *                                  stops on the five largest companies by
 *                                  market cap) and a one-frame summary at the end
 *   Every buy                      the ledger, largest first; a row jumps the race
 *   Who bought                     buys and dollars by role
 *   Reporting limits               what Form 4 data cannot show
 *
 * Same .snr-news shells and .snr-card-head as the other stacks. Tokens only,
 * no card outlines, no em dashes. Respects prefers-reduced-motion: the race
 * opens on its final frame and steps without animation.
 * Imports only the pure formatters (src/lib/sec/insider-buys.js), never the
 * server module, so no server code reaches the client bundle.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  usdTight,
  usdSpoken,
  priceFmt,
  sharesFmt,
  pctSigned,
  dayFmt,
  filingUrl,
  decadeFmt,
} from '@/lib/sec/insider-buys';
import { monthYear } from '@/lib/sonar/insider-windows';
import './sonar-insider-buying.css';

const STEP_MS = { intro: 2600, spot: 3200, plain: 1250 };

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

const SUFFIX_RE =
  /[,\s]+(inc|incorporated|corp|corporation|co|company|ltd|limited|plc|holdings?|group|sa|nv|se|ag|llc|lp|the)\.?$/i;
function shortName(name) {
  let s = String(name || '').trim();
  for (let i = 0; i < 3; i += 1) s = s.replace(SUFFIX_RE, '');
  return s || name;
}
const roleWords = (role) =>
  role.label === '10% Owner' ? 'Ten percent owner' : role.label.replace(' & ', ' and ');
const two = (n) => String(n).padStart(2, '0');
const capUsd = (v) => (Number.isFinite(v) ? usdTight(v) : 'n/a');

function RolePill({ role, on = false, small = false }) {
  return (
    <span className={`snr-ib-pill is-${role.tier}${on ? ' is-on' : ''}${small ? ' is-small' : ''}`}>
      {role.label}
    </span>
  );
}

function Since({ pct }) {
  if (!Number.isFinite(pct)) return <span className="snr-ib-na">n/a</span>;
  const up = pct >= 0;
  return (
    <span className={up ? 'snr-ib-up' : 'snr-ib-down'}>
      <i className={`bi ${up ? 'bi-caret-up-fill' : 'bi-caret-down-fill'}`} aria-hidden="true" />{' '}
      {pctSigned(pct)}
    </span>
  );
}

/* Log scale over whole decades that hold every buy. */
function logScale(values) {
  const v = values.filter((x) => x > 0);
  const lo = 10 ** Math.floor(Math.log10(Math.min(...v)));
  let hi = 10 ** Math.ceil(Math.log10(Math.max(...v)));
  if (hi <= lo) hi = lo * 10;
  const span = Math.log10(hi) - Math.log10(lo);
  const frac = (x) => Math.max(0.04, (Math.log10(x) - Math.log10(lo)) / span);
  const ticks = [];
  for (let t = lo * 10; t <= hi; t *= 10) ticks.push({ value: t, frac: frac(t) });
  return { frac, ticks };
}

function captionFor(d, step) {
  const s = d.summary;
  const n = d.race.length;
  if (step === 0) {
    return d.truncated
      ? `Insiders bought ${usdSpoken(s.total)} of their own stock ${d.window.word}. Here are the ${n} largest buys, smallest to largest.`
      : `Insiders bought ${usdSpoken(s.total)} of their own stock ${d.window.word}. Here is every buy, smallest to largest.`;
  }
  if (step > n) {
    return `${s.count} buys, ${usdSpoken(s.total)} in total. ${s.quoted ? `${s.upCount} of ${s.quoted} are above the price paid.` : ''}`.trim();
  }
  const b = d.race[step - 1];
  const since = Number.isFinite(b.sincePct)
    ? ` ${b.sincePct >= 0 ? 'Up' : 'Down'} ${Math.abs(b.sincePct).toFixed(1)}% since.`
    : '';
  return `${shortName(b.name)}. ${roleWords(b.role)} ${b.reporter} bought ${usdSpoken(b.value)}.${since}`;
}

function BuyDetail({ b, n }) {
  const id = useId();
  const url = filingUrl(b);
  const dates =
    b.firstDate && b.firstDate !== b.date
      ? `${dayFmt(b.firstDate, { year: false })} to ${dayFmt(b.date)}`
      : dayFmt(b.date);
  return (
    <div className={`snr-ib-detail${b.spotlight ? ' is-spot' : ''}`} aria-labelledby={id}>
      <p className="snr-ib-eyebrow">
        {b.spotlight ? 'Spotlight' : `Buy ${two(b.i)} of ${two(n)}`}
        {Number.isFinite(b.marketCap) ? ` · Market cap ${capUsd(b.marketCap)}` : ''}
      </p>
      <div className="snr-ib-detail-head">
        <span className="snr-ib-idx">{two(b.i)}</span>
        <h4 id={id} className="snr-ib-co">
          {b.name}
        </h4>
        <RolePill role={b.role} />
      </div>
      <dl className="snr-ib-grid">
        <div>
          <dt>Insider</dt>
          <dd>{b.reporter}</dd>
        </div>
        <div>
          <dt>Position</dt>
          <dd>{b.title || b.role.label}</dd>
        </div>
        <div>
          <dt>Price paid</dt>
          <dd className="snr-ib-num">
            {priceFmt(b.price)} × {sharesFmt(b.shares)}
          </dd>
        </div>
        <div>
          <dt>P/E ratio</dt>
          <dd className="snr-ib-num">
            {Number.isFinite(b.pe) ? (b.pe > 0 ? b.pe.toFixed(1) : 'n/m') : 'n/a'}
          </dd>
        </div>
        <div>
          <dt>Trade date</dt>
          <dd className="snr-ib-num">{dates}</dd>
        </div>
        <div>
          <dt>Since purchase</dt>
          <dd className="snr-ib-num">
            <Since pct={b.sincePct} />
          </dd>
        </div>
      </dl>
      {url ? (
        <a className="snr-ib-filing" href={url} target="_blank" rel="noopener noreferrer">
          <i className="bi bi-file-earmark-text" aria-hidden="true" /> Form 4 filing
          {b.indirect ? <span className="snr-ib-faint"> · held indirectly</span> : null}
        </a>
      ) : null}
    </div>
  );
}

function HowToRead() {
  return (
    <div className="snr-ib-detail is-plain">
      <p className="snr-ib-eyebrow is-warm">How to read it</p>
      <p className="snr-ib-copy">
        Each bar is one insider purchase. Taller bar, bigger buy (log scale). The camera stops on
        the companies with the five biggest market caps.
      </p>
    </div>
  );
}

function OneFrame({ d }) {
  const s = d.summary;
  /* Nov 9: week, month, quarter, year, or "period" for a rolling window or a range. */
  const unit = d.window.unit || d.window.word.replace(/^(this|last)\s+/, '');
  return (
    <div className="snr-ib-detail is-plain">
      <p className="snr-ib-eyebrow is-warm">The {unit} in one frame</p>
      <h4 className="snr-ib-co">
        {s.count} buys · {usdTight(s.total)} in total
      </h4>
      <dl className="snr-ib-grid">
        <div>
          <dt>Largest buy</dt>
          <dd className="snr-ib-num">
            {s.largest.ticker} · {usdTight(s.largest.value)}
          </dd>
        </div>
        <div>
          <dt>Smallest buy</dt>
          <dd className="snr-ib-num">
            {s.smallest.ticker} · {usdTight(s.smallest.value)}
          </dd>
        </div>
        <div>
          <dt>Most common buyer</dt>
          <dd>
            {s.topRole?.label} ({s.topRole?.count})
          </dd>
        </div>
        <div>
          <dt>Spotlights</dt>
          <dd>{s.spotlights} companies</dd>
        </div>
        <div>
          <dt>Median buy</dt>
          <dd className="snr-ib-num">{usdTight(s.median)}</dd>
        </div>
        <div>
          <dt>Up since purchase</dt>
          <dd className="snr-ib-num is-up">
            {s.upCount} of {s.quoted}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function RaceCard({ d, jump }) {
  const titleId = useId();
  const race = d.race;
  const n = race.length;
  const reduced = useReducedMotion();
  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const [stageW, setStageW] = useState(0);
  const [step, setStep] = useState(0); // 0 intro, 1..n buys, n + 1 the final frame
  const [playing, setPlaying] = useState(false);
  const [peek, setPeek] = useState(null);
  const [word, setWord] = useState(0);

  /* Reduced motion opens on the final frame. */
  useEffect(() => {
    if (reduced) {
      setPlaying(false);
      setStep(n + 1);
    }
  }, [reduced, n]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setStageW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Pause when the card leaves the screen. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) setPlaying(false);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stepMs =
    step === 0
      ? STEP_MS.intro
      : step <= n
        ? race[step - 1].spotlight
          ? STEP_MS.spot
          : STEP_MS.plain
        : 0;

  useEffect(() => {
    if (!playing) return undefined;
    if (step > n) {
      setPlaying(false);
      return undefined;
    }
    const t = setTimeout(() => setStep((s) => s + 1), reduced ? Math.min(stepMs, 900) : stepMs);
    return () => clearTimeout(t);
  }, [playing, step, n, stepMs, reduced]);

  const caption = captionFor(d, step);
  const words = useMemo(() => caption.split(' '), [caption]);
  useEffect(() => {
    if (!playing || reduced || !stepMs) {
      setWord(words.length);
      return undefined;
    }
    setWord(0);
    const every = Math.max(90, (stepMs * 0.8) / words.length);
    const id = setInterval(() => setWord((w) => (w >= words.length ? w : w + 1)), every);
    return () => clearInterval(id);
  }, [words, playing, reduced, stepMs]);

  /* A ledger row (or a segment) jumps here. */
  useEffect(() => {
    if (!jump) return;
    setPlaying(false);
    setPeek(null);
    setStep(jump.i);
    rootRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  }, [jump, reduced]);

  const go = useCallback(
    (s) => {
      setPlaying(false);
      setPeek(null);
      setStep(Math.max(0, Math.min(n + 1, s)));
    },
    [n],
  );
  const toggle = () => {
    setPeek(null);
    if (step > n) {
      setStep(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(step + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(step - 1);
    } else if (e.key === ' ' && e.target === e.currentTarget) {
      e.preventDefault();
      toggle();
    }
  };

  const fit = step > n;
  const shown = fit ? n : Math.max(0, Math.min(step, n));
  const active = !fit && step >= 1 ? step - 1 : null;
  const scale = useMemo(() => logScale(race.map((b) => b.value)), [race]);
  const narrow = stageW > 0 && stageW < 520;
  const GUTTER = 52; /* right-hand room for the axis labels */
  const plotW = Math.max(120, (stageW || 600) - GUTTER);
  const slot = fit ? Math.max(10, plotW / n) : narrow ? 64 : 84;
  const anchor = active ?? 0;
  const offset = fit
    ? Math.max(0, (plotW - n * slot) / 2)
    : (stageW || 600) / 2 - (anchor + 0.5) * slot;
  const labels = !fit || slot >= 46;
  const cumulative = race.slice(0, shown).reduce((t, b) => t + b.value, 0);
  const detail = peek != null ? race[peek] : step === 0 ? null : step <= n ? race[step - 1] : null;

  return (
    <div
      ref={rootRef}
      className={`snr-news snr-sec-card snr-ib-card snr-ib-span${reduced ? ' is-still' : ''}`}
      aria-labelledby={titleId}
      tabIndex={0}
      onKeyDown={onKey}
    >
      <header className="snr-ib-head">
        <p className="snr-ib-kicker">Insider buying · SEC Form 4</p>
        <h3 id={titleId} className="snr-ib-title">
          Who&apos;s buying their own stock?
        </h3>
        <p className="snr-ib-sub">Open-market buys · {d.rangeLabel} · smallest to largest</p>
      </header>

      <div className="snr-ib-meter">
        <span className="snr-ib-meter-label">Cumulative bought</span>
        <span className="snr-ib-meter-value">{usdTight(cumulative)}</span>
        <span className="snr-ib-meter-count">
          {two(shown)} / {two(n)}
        </span>
      </div>
      <div className="snr-ib-segs" role="group" aria-label="Jump to a buy">
        {race.map((b, i) => (
          <button
            key={`${b.accession}-${i}`}
            type="button"
            className={`snr-ib-seg${i < shown ? (b.spotlight ? ' is-spot' : ' is-plain') : ''}${active === i ? ' is-now' : ''}`}
            aria-label={`Buy ${i + 1}: ${b.ticker}, ${usdTight(b.value)}`}
            onClick={() => go(i + 1)}
          />
        ))}
      </div>

      <div
        ref={stageRef}
        className={`snr-ib-stage${fit ? ' is-fit' : ''}`}
        style={{ '--ib-slot': `${slot}px` }}
      >
        <span className="snr-ib-scale-note">Log scale</span>
        {scale.ticks.map((t) => (
          <div
            key={t.value}
            className="snr-ib-grid-line"
            style={{ bottom: `calc(var(--ib-axis) + (var(--ib-plot) * ${t.frac}))` }}
          >
            <span>{decadeFmt(t.value)}</span>
          </div>
        ))}
        <div className="snr-ib-axis" />
        <div className="snr-ib-track" style={{ transform: `translateX(${offset}px)` }}>
          {race.slice(0, shown).map((b, i) => {
            const on = active === i || peek === i;
            const dim = active != null && !on;
            return (
              <button
                key={`${b.accession}-${i}`}
                type="button"
                className={`snr-ib-bar${b.spotlight ? ' is-spot' : ''}${on ? ' is-on' : ''}${dim ? ' is-dim' : ''}`}
                style={{ left: `${i * slot}px`, '--ib-h': scale.frac(b.value) }}
                aria-label={`${b.ticker}, ${b.role.label} ${b.reporter}, ${usdTight(b.value)}`}
                onClick={() => (fit ? setPeek(i) : go(i + 1))}
                onMouseEnter={fit ? () => setPeek(i) : undefined}
                onFocus={fit ? () => setPeek(i) : undefined}
              >
                {labels || on ? <span className="snr-ib-bar-val">{usdTight(b.value)}</span> : null}
                <span className="snr-ib-bar-fill">
                  {!fit && slot >= 60 ? <span className="snr-ib-bar-n">{two(i + 1)}</span> : null}
                </span>
                {/* The foot always renders: it holds the bar above the axis. */}
                <span className="snr-ib-bar-foot">
                  {labels || on ? <span className="snr-ib-bar-tk">{b.ticker}</span> : null}
                  {!fit ? <RolePill role={b.role} on={on} small /> : null}
                </span>
              </button>
            );
          })}
        </div>
        {step === 0 && !playing ? (
          <button type="button" className="snr-ib-play-big" onClick={toggle} aria-label="Play">
            <i className="bi bi-play-fill" aria-hidden="true" />
          </button>
        ) : null}
        {step === 0 ? <span className="snr-ib-stage-hint">Smallest → largest</span> : null}
      </div>

      <div className="snr-ib-controls">
        <button type="button" onClick={() => go(0)} aria-label="Back to the start">
          <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 0}
          aria-label="Previous buy"
        >
          <i className="bi bi-skip-start-fill" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="is-main"
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          <i className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => go(step + 1)}
          disabled={step > n}
          aria-label="Next buy"
        >
          <i className="bi bi-skip-end-fill" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => go(n + 1)}
          disabled={step > n}
          aria-label="Show every buy"
        >
          <i className="bi bi-bar-chart-fill" aria-hidden="true" />
        </button>
      </div>

      {detail ? <BuyDetail b={detail} n={n} /> : step === 0 ? <HowToRead /> : <OneFrame d={d} />}

      <p className="snr-ib-caption" aria-live={playing ? 'off' : 'polite'}>
        {words.map((w, i) => (
          <span
            key={`${i}-${w}`}
            className={i < word - 1 ? 'is-said' : i === word - 1 ? 'is-now' : 'is-ahead'}
          >
            {w}{' '}
          </span>
        ))}
      </p>

      {d.fallback ? (
        <p className="snr-ib-note">
          {d.fallback.askedLabel} has {d.fallback.askedCount} buy
          {d.fallback.askedCount === 1 ? '' : 's'} filed so far; showing {d.window.word}.
        </p>
      ) : null}
      {d.coverage?.note === 'partial' ? (
        <p className="snr-ib-note">
          Ezana&apos;s insider purchase records start in {monthYear(d.coverage.coveredFrom)}; this
          covers {d.window.noun} from then on.
        </p>
      ) : null}
      {d.truncated ? (
        <p className="snr-ib-note">
          The race plays the {d.truncated.shown} largest of{' '}
          {d.truncated.total.toLocaleString('en-US')} buys;{' '}
          {d.ledgerTruncated
            ? `the ledger lists the ${d.ledgerTruncated.shown} largest.`
            : 'the ledger lists every one.'}
        </p>
      ) : null}
      {d.capped ? (
        <p className="snr-ib-note">
          This window holds more filings than one answer reads; totals cover the first part of it.
        </p>
      ) : null}
      <p className="snr-ib-source">
        Source: SEC Form 4 open-market purchases (code P) via EDGAR · prices at the latest quote ·
        findings only, not investment advice.
      </p>
    </div>
  );
}

function LedgerCard({ d, onJump }) {
  const titleId = useId();
  /* Nov 9: dates carry the year when the window is not inside the current year. */
  const thisYear = String(d.asof || '').slice(0, 4);
  const withYear = d.window.from.slice(0, 4) !== thisYear || d.window.to.slice(0, 4) !== thisYear;
  const [all, setAll] = useState(false);
  const rows = all ? d.ledger : d.ledger.slice(0, 12);
  const raceIndex = useMemo(() => {
    const m = new Map();
    d.race.forEach((b) => m.set(b.accession + b.reporter, b.i));
    return m;
  }, [d.race]);
  return (
    <div className="snr-news snr-sec-card snr-ib-card" aria-labelledby={titleId}>
      <div className="snr-card-head">
        <span className="snr-panel-title" id={titleId}>
          {d.ledgerTruncated
            ? `The ${d.ledgerTruncated.shown} largest buys`
            : 'Every buy, largest first'}
        </span>
        <span className="snr-rule-soft" aria-hidden="true" />
      </div>
      <div className="snr-ib-table-wrap">
        <table className="snr-ib-table">
          <thead>
            <tr>
              <th scope="col">Ticker</th>
              <th scope="col">Insider</th>
              <th scope="col" className="is-num">
                Value
              </th>
              <th scope="col" className="is-num">
                Date
              </th>
              <th scope="col" className="is-num">
                Since
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const i = raceIndex.get(r.accession + r.reporter);
              return (
                <tr key={`${r.accession}-${r.reporter}`} className={i ? 'is-link' : ''}>
                  <th scope="row" className="snr-ib-num">
                    {i ? (
                      <button type="button" className="snr-ib-rowbtn" onClick={() => onJump(i)}>
                        {r.ticker}
                      </button>
                    ) : (
                      r.ticker
                    )}
                  </th>
                  <td>
                    <span className="snr-ib-who">{r.reporter}</span>
                    <RolePill role={{ label: r.role, tier: r.tier }} small />
                  </td>
                  <td className="is-num">{usdTight(r.value)}</td>
                  <td className="is-num">{dayFmt(r.date, { year: withYear })}</td>
                  <td className="is-num">
                    <Since pct={r.sincePct} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {d.ledger.length > 12 ? (
        <button type="button" className="snr-ib-more" onClick={() => setAll((v) => !v)}>
          {all
            ? 'Show the top 12'
            : d.ledgerTruncated
              ? `Show the ${d.ledger.length} largest`
              : `Show all ${d.ledger.length}`}
        </button>
      ) : null}
    </div>
  );
}

const TIERS = [
  { id: 'exec', label: 'CEOs, presidents, CFOs, chairs' },
  { id: 'director', label: 'Directors' },
  { id: 'officer', label: 'Other officers' },
  { id: 'owner', label: '10% owners' },
  { id: 'other', label: 'Other insiders' },
];

function RolesCard({ d }) {
  const titleId = useId();
  const s = d.summary;
  const rows = TIERS.filter((t) => s.tiers[t.id] > 0);
  const maxV = Math.max(1, ...rows.map((t) => s.tierValue[t.id]));
  return (
    <div className="snr-news snr-sec-card snr-ib-card" aria-labelledby={titleId}>
      <div className="snr-card-head">
        <span className="snr-panel-title" id={titleId}>
          Who bought
        </span>
        <span className="snr-rule-soft" aria-hidden="true" />
      </div>
      <ul className="snr-ib-roles">
        {rows.map((t) => (
          <li key={t.id}>
            <span className="snr-ib-roles-label">
              <span className={`snr-ib-swatch is-${t.id}`} aria-hidden="true" />
              {t.label}
            </span>
            <span className="snr-ib-roles-bar" aria-hidden="true">
              <span
                className={`is-${t.id}`}
                style={{ width: `${(s.tierValue[t.id] / maxV) * 100}%` }}
              />
            </span>
            <span className="snr-ib-num">
              {s.tiers[t.id]} · {usdTight(s.tierValue[t.id])}
            </span>
          </li>
        ))}
      </ul>
      <p className="snr-ib-faint">
        A filer with several roles counts once, at the most senior one.
      </p>
    </div>
  );
}

function LimitsCard({ d }) {
  const titleId = useId();
  const items = [
    'Open-market purchases only (Form 4 code P). Awards, option exercises, tax withholding and gifts are excluded, so a buy here is cash spent at the market price.',
    `Form 4s are due two business days after the trade, so the latest days are still filling in${d.latestFiled ? ` (newest filing on file: ${dayFmt(d.latestFiled)})` : ''}.`,
    'Several fills on one filing count as one buy at the value-weighted price; an amended Form 4 replaces the original.',
    'Since purchase compares the price paid with the latest quote. Market cap and P/E are the latest quote too, not as of the trade.',
    'The data shows what insiders filed, not why. A purchase is a disclosure, not a recommendation.',
  ];
  return (
    <div className="snr-news snr-sec-card snr-ib-card" aria-labelledby={titleId}>
      <div className="snr-card-head">
        <span className="snr-panel-title" id={titleId}>
          Reporting limits applied
        </span>
        <span className="snr-rule-soft" aria-hidden="true" />
      </div>
      <ul className="snr-ib-limits">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

export function SonarInsiderBuyingStack({
  dossier,
  onGate: _onGate,
  topSlot = null,
  newsSlot = null,
  full = false,
}) {
  const [jump, setJump] = useState(null);
  const d = dossier;
  if (!d || d.kind !== 'insider_buying') return null;
  if (d.empty || !d.race?.length) {
    return (
      <div className="snr-stack snr-stack--ib">
        {topSlot}
        <div className="snr-news snr-sec-card snr-ib-card snr-ib-span">
          <p className="snr-ib-kicker">Insider buying · SEC Form 4</p>
          <p className="snr-ib-copy">
            {d.coverage?.note === 'future'
              ? `${String(d.window?.noun || '').replace(/^./, (c) => c.toUpperCase())} has not started yet.`
              : d.coverage?.note === 'before'
                ? `Ezana's insider purchase records start in ${monthYear(d.coverage.coveredFrom)}, so ${d.window?.noun} is not covered yet.`
                : `No open-market insider purchases are on file for ${d.window?.noun || d.window?.word}. Form 4s arrive up to two business days after the trade.`}
          </p>
        </div>
        {newsSlot}
      </div>
    );
  }
  const onJump = (i) => setJump({ i, at: Date.now() });
  const cards = [
    <RaceCard key="race" d={d} jump={jump} />,
    <LedgerCard key="ledger" d={d} onJump={onJump} />,
    <RolesCard key="roles" d={d} />,
    <LimitsCard key="limits" d={d} />,
  ];
  return (
    <div className="snr-stack snr-stack--ib">
      {topSlot}
      {full ? cards : cards.slice(0, 1)}
      {newsSlot}
    </div>
  );
}

export default SonarInsiderBuyingStack;
