'use client';

/**
 * One Strategy Desk strategy: its rules, the thesis, the forward record the
 * Verified badge is judged on, the research backtest, and how to get access.
 * Figures come from /api/strategies/[slug]; individual bets are never sent.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STATUS_LABEL } from '@/lib/strategies/catalog';
import { StrategyDeskLegal } from '../legal';

const pct = (v, d = 1) => (Number.isFinite(v) ? `${(v * 100).toFixed(d)}%` : 'n/a');
const signedPct = (v, d = 1) =>
  Number.isFinite(v) ? `${v >= 0 ? '+' : '-'}${Math.abs(v * 100).toFixed(d)}%` : 'n/a';
const dayOf = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

function Curve({ points }) {
  if (!points || points.length < 2) return null;
  const ys = points.map((p) => p.equity);
  const lo = Math.min(0, ...ys);
  const hi = Math.max(0, ...ys);
  const span = hi - lo || 1;
  const W = 600;
  const H = 120;
  const x = (i) => (i / (points.length - 1)) * W;
  const y = (v) => 8 + (1 - (v - lo) / span) * (H - 16);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.equity).toFixed(1)}`).join(' ');
  const end = ys[ys.length - 1];
  return (
    <svg className="sd-curve" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
      aria-label={`Cumulative units, ending at ${end.toFixed(1)}`}>
      <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="var(--border-primary)" strokeDasharray="3 4" />
      <path d={d} fill="none" stroke={end >= 0 ? 'var(--emerald)' : 'var(--negative)'} strokeWidth="2"
        vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Figures({ s }) {
  if (!s || !s.n) return <p className="sd-p">No settled bets in this record yet.</p>;
  const edge = Number.isFinite(s.hitRate) && Number.isFinite(s.breakEven) ? s.hitRate - s.breakEven : null;
  return (
    <>
      <dl className="sd-figs">
        <div>
          <dt>Settled bets</dt>
          <dd>{s.n.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Win rate</dt>
          <dd>{pct(s.hitRate)}</dd>
        </div>
        <div>
          <dt>Break-even from prices</dt>
          <dd>{pct(s.breakEven)}</dd>
        </div>
        <div>
          <dt>Edge</dt>
          <dd className={edge > 0 ? 'sd-pos' : edge < 0 ? 'sd-neg' : ''}>{signedPct(edge)}</dd>
        </div>
        <div>
          <dt>Return per bet</dt>
          <dd className={s.roi > 0 ? 'sd-pos' : s.roi < 0 ? 'sd-neg' : ''}>{signedPct(s.roi)}</dd>
        </div>
        <div>
          <dt>Units won</dt>
          <dd className={s.units > 0 ? 'sd-pos' : s.units < 0 ? 'sd-neg' : ''}>
            {Number.isFinite(s.units) ? `${s.units >= 0 ? '+' : ''}${s.units.toFixed(1)}` : 'n/a'}
          </dd>
        </div>
        <div>
          <dt>Worst drawdown</dt>
          <dd className="sd-neg">
            {Number.isFinite(s.maxDrawdown) ? `${s.maxDrawdown.toFixed(1)} u` : 'n/a'}
          </dd>
        </div>
        <div>
          <dt>Win rate, 95% range</dt>
          <dd>
            {pct(s.ci?.low, 0)} to {pct(s.ci?.high, 0)}
          </dd>
        </div>
      </dl>
      <Curve points={s.curve} />
      {s.from ? (
        <p className="sd-note">
          {dayOf(s.from)} to {dayOf(s.to)}, one unit per bet.
        </p>
      ) : null}
    </>
  );
}

export default function StrategyDetail({ strategy }) {
  const [state, setState] = useState({ status: strategy.backtest ? 'loading' : 'none' });

  useEffect(() => {
    if (!strategy.backtest) return undefined;
    const ctrl = new AbortController();
    fetch(`/api/strategies/${strategy.slug}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d?.ok ? { status: 'ready', ...d } : { status: 'error' }))
      .catch((e) => e?.name !== 'AbortError' && setState({ status: 'error' }));
    return () => ctrl.abort();
  }, [strategy.slug, strategy.backtest]);

  const checks = state.checks?.checks || [];
  const verified = Boolean(state.checks?.verified);
  const status = verified ? 'verified' : strategy.status;

  return (
    <div className="sd">
      <Link className="sd-back" href="/betting-markets/strategies">
        <i className="bi bi-arrow-left" aria-hidden="true" /> Strategy Desk
      </Link>
      <p className="sd-eyebrow">
        {strategy.market === 'sports' ? 'Sports betting' : 'Prediction markets'} · {strategy.venue}
      </p>
      <h1 className="sd-title">{strategy.name}</h1>
      <p className="sd-lead">{strategy.summary}</p>
      <p className={`sd-item-status sd-status--${status}`} style={{ marginTop: 10 }}>
        {STATUS_LABEL[status]}
      </p>

      <div className="sd-cols">
        <section aria-labelledby="sd-rules-h">
          <h2 className="sd-h2" id="sd-rules-h">
            The rules
          </h2>
          <ul className="sd-rules">
            {strategy.rules.map(([k, v]) => (
              <li key={k}>
                <span className="k">{k}</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
          <h2 className="sd-h2" style={{ marginTop: 28 }}>
            Why it might work
          </h2>
          <p className="sd-p">{strategy.thesis}</p>
          <p className="sd-note">{strategy.dataNote}</p>
        </section>

        <section aria-labelledby="sd-verify-h">
          <h2 className="sd-h2" id="sd-verify-h">
            Verification
          </h2>
          {strategy.backtest ? (
            state.status === 'loading' ? (
              <p className="sd-p">Counting settled bets…</p>
            ) : state.status === 'error' ? (
              <p className="sd-p">The record could not be loaded. Try again shortly.</p>
            ) : (
              <ul className="sd-checks">
                {checks.map((c) => (
                  <li key={c.key}>
                    <i
                      className={`bi ${c.pass ? 'bi-check-circle-fill' : 'bi-circle'}`}
                      aria-label={c.pass ? 'Passed' : 'Not yet'}
                    />
                    <span>
                      {c.label}
                      <span className="sd-check-detail">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="sd-p">
              Not yet testable: the data this strategy needs is not connected. It is listed so you
              can see what is coming; it will not be offered until it earns Verified.
            </p>
          )}
        </section>
      </div>

      {strategy.backtest && state.status === 'ready' ? (
        <div className="sd-cols">
          <section>
            <h2 className="sd-h2">Forward record (counts toward Verified)</h2>
            <Figures s={state.forward} />
            <p className="sd-note">
              Only bets placed after the rules were fixed on {dayOf(strategy.rulesFrozenAt)}.
            </p>
          </section>
          <section>
            <h2 className="sd-h2">Research backtest (does not count)</h2>
            <Figures s={state.research} />
            <p className="sd-note">
              Every bet the stored prices allow, including those before the rules were fixed. Use
              it to understand the strategy, not to judge it.
            </p>
          </section>
        </div>
      ) : null}

      <div className="sd-access">
        {verified ? (
          <p>This strategy is Verified. Access opens with Ezana Strategy Desk membership.</p>
        ) : (
          <p>
            Access opens once this strategy earns Verified. Until then its record builds here in
            public, bet by bet.
          </p>
        )}
      </div>

      <StrategyDeskLegal />
    </div>
  );
}
