'use client';

/**
 * "Most accurate analysts" (Nov 20, 2026; Advanced plan): the analysts and
 * firms covering this stock, ranked by how their past calls on it played
 * out. Sits under Analyst recommendations in the Company view's right rail.
 *
 * States: loading, locked (signed out or below Advanced: an upgrade prompt
 * over blank placeholder rows, never sample names), unavailable, no ranked
 * coverage, and the ranked list with an Analysts / Firms text toggle.
 * Data and method: /api/research/analyst-accuracy and
 * src/lib/research/analyst-accuracy.js.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import './analyst-track-record.css';

const pct = (v) => (v == null ? '--' : `${Math.round(v * 100)}%`);
const signedPct = (v) => {
  if (v == null) return '--';
  const p = Math.round(v * 1000) / 10;
  return `${p > 0 ? '+' : ''}${p}%`;
};
const money = (v) =>
  v == null
    ? '--'
    : `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: v >= 100 ? 0 : 2 })}`;
const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
const fullFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fullDate = (d) => {
  const t = Date.parse(`${d}T12:00:00Z`);
  return Number.isFinite(t) ? fullFmt.format(t) : d;
};
const monthOf = (d) => {
  const t = Date.parse(`${d}T12:00:00Z`);
  return Number.isFinite(t) ? dateFmt.format(t) : '';
};

function Row({ r, i, kind }) {
  const stance =
    kind === 'analysts'
      ? r.latest?.target != null
        ? `Latest target ${money(r.latest.target)}`
        : null
      : r.latest?.rating
        ? `Latest rating ${r.latest.rating}`
        : null;
  const tone = r.avgExcess == null ? 'flat' : r.avgExcess > 0 ? 'up' : r.avgExcess < 0 ? 'down' : 'flat';
  return (
    <li className="atr-row">
      <span className="atr-rank rc-num">{i + 1}</span>
      <div className="atr-who">
        <span className="atr-name">{r.name}</span>
        {r.firm ? <span className="atr-sub">{r.firm}</span> : null}
        {stance ? (
          <span className="atr-sub">
            {[stance, r.latest?.date ? monthOf(r.latest.date) : null].filter(Boolean).join(' · ')}
          </span>
        ) : null}
        <span className="atr-meta">
          <span className={`rc-num rc-tone--${tone}`}>{signedPct(r.avgExcess)}</span> avg vs S&amp;P
          {r.targetHitRate != null ? (
            <>
              {' · '}
              <span className="rc-num">{pct(r.targetHitRate)}</span> targets hit
            </>
          ) : null}
        </span>
      </div>
      <div className="atr-score">
        <span className="atr-rate rc-num">{pct(r.hitRate)}</span>
        <span className="atr-calls">
          {r.hits}/{r.calls} right
        </span>
      </div>
    </li>
  );
}

function Locked({ reason }) {
  return (
    <div className="atr-locked">
      <ul className="atr-ghost" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <span />
            <span />
            <span />
          </li>
        ))}
      </ul>
      <div className="atr-locked__panel">
        <p className="atr-locked__text">
          See which analysts have actually been right on this stock, ranked by how their calls
          played out over the following 12 months.
        </p>
        {reason === 'auth' ? (
          <Link className="atr-btn" href="/signin">
            Sign in
          </Link>
        ) : (
          <Link className="atr-btn" href="/pricing">
            <i className="bi bi-stars" aria-hidden="true" /> Upgrade to Advanced
          </Link>
        )}
      </div>
    </div>
  );
}

export function AnalystTrackRecordCard({ ticker }) {
  const [state, setState] = useState({ status: 'loading' });
  const [kind, setKind] = useState('analysts');

  useEffect(() => {
    if (!ticker) return undefined;
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    fetch(`/api/research/analyst-accuracy?symbol=${encodeURIComponent(ticker)}`, {
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (res.status === 401) return setState({ status: 'locked', reason: 'auth' });
        if (res.status === 402) return setState({ status: 'locked', reason: 'plan' });
        if (!res.ok) return setState({ status: 'error' });
        const data = await res.json();
        setState({ status: 'ready', data });
        /* Open on firms when no individual analyst has enough history. */
        if (!data.analysts?.length && data.firms?.length) setKind('firms');
        else setKind('analysts');
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setState({ status: 'error' });
      });
    return () => ctrl.abort();
  }, [ticker]);

  const data = state.data;
  const list = state.status === 'ready' ? data[kind] || [] : [];
  const hasAny = state.status === 'ready' && (data.analysts?.length || data.firms?.length);

  return (
    <section className="rc-card atr" aria-labelledby="atr-title" aria-busy={state.status === 'loading'}>
      <header className="rc-card__head atr-head">
        <h3 id="atr-title" className="rc-card__title">
          Most accurate analysts
        </h3>
        <span className="atr-plan">Advanced</span>
      </header>

      {state.status === 'loading' ? (
        <div className="rc-skel-stack" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="rc-skel rc-skel--line" />
          ))}
        </div>
      ) : state.status === 'locked' ? (
        <Locked reason={state.reason} />
      ) : state.status === 'error' ? (
        <p className="rc-state">Track records are unavailable right now. Try again shortly.</p>
      ) : !hasAny ? (
        <p className="rc-state">
          Not enough scored calls on {ticker} yet. An analyst or firm needs at least three calls
          that are a year old to be ranked.
        </p>
      ) : (
        <>
          <div className="atr-tabs" role="tablist" aria-label="Rank by">
            {[
              ['analysts', 'Analysts', data.analysts?.length],
              ['firms', 'Firms', data.firms?.length],
            ].map(([k, label, n]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={kind === k}
                className={`atr-tab${kind === k ? ' is-on' : ''}`}
                onClick={() => setKind(k)}
                disabled={!n}
              >
                {label}
              </button>
            ))}
          </div>
          {list.length ? (
            <ol className="atr-list">
              {list.map((r, i) => (
                <Row key={r.key} r={r} i={i} kind={kind} />
              ))}
            </ol>
          ) : (
            <p className="rc-state">
              No {kind === 'analysts' ? 'individual analyst' : 'firm'} has enough scored calls on{' '}
              {ticker} yet.
            </p>
          )}
          <details className="atr-how">
            <summary>How this is scored</summary>
            <p>
              Each call is scored once it is 12 months old. A bullish call (a Buy-type rating, or a
              target above the price when it was set) is right if {ticker} beat the S&amp;P 500 over
              the next 12 months; a bearish call is right if it trailed. Hold ratings are not
              scored. Repeat calls in the same direction within 30 days count once. Rankings pull
              short records toward 50%, so a few lucky calls cannot top the list, and need at least
              three scored calls. Analysts come from published price targets; firms from rating
              changes.
            </p>
            <p className="atr-fine">
              Updated {fullDate(data.asOf)}. Past accuracy does not predict future calls. Not investment
              advice.
            </p>
          </details>
        </>
      )}
    </section>
  );
}
