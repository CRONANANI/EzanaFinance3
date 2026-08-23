'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Sonar dossier panels (snr- prefix) — the post-ping results layout.
 *
 * Every panel renders from a REAL wired source and unmounts cleanly when its
 * source returns nothing: Key Stats and the Government Signal band from
 * /api/usaspending/contract-awards + /api/quiver/congress-trades +
 * /api/quiver/lobbying, the chart band from /api/market-data/stock-candles
 * with event markers pinned to sourced dates. No invented figures anywhere:
 * a number either traces to a fetched row or its line is omitted.
 *
 * Deterministic by construction (real data in, no Math.random); each panel
 * shows a skeleton while its fetch is in flight.
 */

const fmtUsd = (n) => {
  if (!Number.isFinite(n)) return null;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

/** "Jan 12, 2026" / "2026-01-12" / raw → epoch ms, or null. */
function toMs(d) {
  if (!d) return null;
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : null;
}

function Skel({ rows = 3 }) {
  return (
    <div className="snr-skel" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} className="snr-skel-row" style={{ width: `${88 - i * 14}%` }} />
      ))}
    </div>
  );
}

/* ── Shared fetch hook: null = loading, [] = empty, [..] = data ─────────── */
function useJson(url, pick) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!url) {
      setData([]);
      return undefined;
    }
    let cancelled = false;
    // Back to the loading state on every url change, so a panel that was
    // "empty" for the previous ping shows its skeleton for the new one
    // instead of flashing hidden-then-visible.
    setData(null);
    (async () => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const j = await res.json();
        if (!cancelled) setData(pick(j) || []);
      } catch {
        if (!cancelled) setData([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  return data;
}

/** Awards for the pinged entity. Recipient search needs a company NAME, so a
    bare ticker ping usually returns nothing and the panels hide — honest. */
function useAwards(entity) {
  const url =
    entity && entity.length >= 3
      ? `/api/usaspending/contract-awards?recipient=${encodeURIComponent(entity)}&limit=10`
      : null;
  return useJson(url, (j) => j?.rows);
}

function useCongressTrades(ticker) {
  const url = ticker ? `/api/quiver/congress-trades?ticker=${encodeURIComponent(ticker)}` : null;
  return useJson(url, (j) => (Array.isArray(j) ? j : []));
}

function useLobbying(ticker) {
  const url = ticker ? `/api/quiver/lobbying?ticker=${encodeURIComponent(ticker)}` : null;
  return useJson(url, (j) => (Array.isArray(j) ? j : []));
}

/* ══ ROW 1 · KEY STATS ═══════════════════════════════════════════════════ */

export function SnrKeyStats({ entity, ticker, sections, awards, trades, lobbying }) {
  const loading = awards === null || trades === null;
  const stats = useMemo(() => {
    if (loading) return null;
    const out = [];
    const awardSum = (awards || []).reduce((n, r) => n + (Number(r.amountValue) || 0), 0);
    if (awardSum > 0) {
      out.push({
        label: 'Agency awards (recent FY)',
        value: fmtUsd(awardSum),
        src: 'USAspending',
      });
    }
    const cutoff = Date.now() - 90 * 24 * 3600 * 1000;
    const recent = (trades || []).filter((t) => (toMs(t.Traded) || 0) >= cutoff);
    if (recent.length) {
      const buys = recent.filter((t) => /purchase|buy/i.test(t.Transaction || '')).length;
      out.push({
        label: 'Congressional trades (90d)',
        value: String(recent.length),
        trend: buys * 2 >= recent.length ? 'up' : 'down',
        src: 'House/Senate disclosures',
      });
    }
    const lob = Array.isArray(lobbying) ? lobbying : [];
    const lobYtd = lob
      .filter((r) => String(r.Date || r.date || '').startsWith(String(new Date().getFullYear())))
      .reduce((n, r) => n + (Number(r.Amount ?? r.amount) || 0), 0);
    if (lobYtd > 0) {
      out.push({ label: 'Lobbying spend (YTD)', value: fmtUsd(lobYtd), src: 'Senate LDA' });
    }
    // Most-relevant linked prediction market: only when the retrieved snippet
    // itself carries a probability; nothing is derived, nothing invented.
    const market = (sections || []).find((s) => s.id === 'prediction-markets')?.items?.[0];
    const pct = market?.snippet?.match(/(\d{1,2})\s?%/)?.[1];
    if (market && pct) {
      out.push({ label: market.title, value: `${pct}%`, src: 'Prediction markets', clamp: true });
    }
    return out;
  }, [loading, awards, trades, lobbying, sections]);

  if (!loading && (!stats || stats.length === 0)) return null;
  return (
    <div className="sonar-module snr-card">
      <div className="sonar-mod-head">
        <span className="sonar-mod-title">Key Stats</span>
        <span className="sonar-mod-source">{ticker || entity}</span>
      </div>
      {loading ? (
        <Skel rows={4} />
      ) : (
        <div className="snr-stats">
          {stats.map((st) => (
            <div key={st.label} className="snr-stat">
              <span className={`snr-stat-label${st.clamp ? ' snr-stat-label--clamp' : ''}`}>
                {st.label}
              </span>
              <span className="snr-stat-val sonar-num">
                {st.value}
                {st.trend && (
                  <i
                    className={`bi ${st.trend === 'up' ? 'bi-arrow-up-right' : 'bi-arrow-down-right'} snr-stat-arrow snr-stat-arrow--${st.trend}`}
                    aria-hidden
                  />
                )}
              </span>
              <span className="snr-stat-src">{st.src}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══ ROW 2 · PRICE & CATALYSTS ═══════════════════════════════════════════ */

const RANGES = ['1M', '3M', '6M', '1Y'];

export function SnrPriceCatalysts({ ticker, isProxy, awards, trades }) {
  const [range, setRange] = useState('3M');
  const [candles, setCandles] = useState(null);
  const [picked, setPicked] = useState(null); // selected marker

  useEffect(() => {
    if (!ticker) return undefined;
    let cancelled = false;
    setCandles(null);
    setPicked(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/market-data/stock-candles?symbol=${encodeURIComponent(ticker)}&range=${range}`,
          { cache: 'no-store' },
        );
        const j = await res.json();
        if (!cancelled) setCandles(Array.isArray(j?.candles) ? j.candles : []);
      } catch {
        if (!cancelled) setCandles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ticker, range]);

  // Events pinned to REAL dates within the visible window.
  const events = useMemo(() => {
    if (!candles || candles.length < 2) return [];
    const t0 = candles[0].t * 1000;
    const t1 = candles[candles.length - 1].t * 1000;
    const out = [];
    for (const r of awards || []) {
      const ms = toMs(r.date);
      if (ms && ms >= t0 && ms <= t1)
        out.push({
          ms,
          kind: 'award',
          title: `${r.agency} award`,
          detail: `${r.amount} · ${r.date}`,
        });
    }
    for (const t of trades || []) {
      const ms = toMs(t.Traded);
      if (ms && ms >= t0 && ms <= t1)
        out.push({
          ms,
          kind: 'trade',
          title: `${t.Name || 'Member'} ${/purchase|buy/i.test(t.Transaction || '') ? 'buy' : 'sale'}`,
          detail: `${t.Transaction || 'Trade'} · filed ${t.Filed || t.Traded}`,
        });
    }
    return out.sort((a, b) => a.ms - b.ms).slice(0, 14);
  }, [candles, awards, trades]);

  if (!ticker) return null;
  const closes = (candles || []).map((c) => c.close).filter((n) => Number.isFinite(n));
  const W = 960;
  const H = 220;
  const PAD = 8;
  const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const fmtPrice = (v) =>
    v >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(v < 100 ? 1 : 0);
  let path = '';
  let markers = [];
  let grid = [];
  let xTicks = [];
  if (closes.length > 1) {
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const x = (i) => PAD + (i / (closes.length - 1)) * (W - PAD * 2);
    const y = (v) => H - 26 - ((v - min) / span) * (H - 48);
    path = closes.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    // Horizontal gridlines on "nice" price steps (deterministic).
    const rawStep = span / 4;
    const mag = 10 ** Math.floor(Math.log10(rawStep));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= rawStep) || rawStep;
    for (let v = Math.ceil(min / step) * step; v <= max && grid.length < 6; v += step) {
      grid.push({ v, yPct: (y(v) / H) * 100, label: fmtPrice(v) });
    }
    // Four evenly spaced date ticks, labeled in UTC so SSR and client agree.
    xTicks = [0, 1 / 3, 2 / 3, 1].map((f) => {
      const i = Math.round(f * (closes.length - 1));
      const d = new Date((candles[i]?.t || 0) * 1000);
      return {
        xPct: (x(i) / W) * 100,
        label: candles[i]?.label || `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`,
      };
    });
    const t0 = candles[0].t * 1000;
    const t1 = candles[candles.length - 1].t * 1000;
    markers = events.map((e, idx) => {
      const frac = (e.ms - t0) / (t1 - t0 || 1);
      const i = Math.round(frac * (closes.length - 1));
      const cx = x(i);
      const cy = y(closes[Math.max(0, Math.min(closes.length - 1, i))]);
      return { ...e, idx, cx, cy, xPct: (cx / W) * 100, yPct: (cy / H) * 100 };
    });
  }
  const kinds = [...new Set(markers.map((m) => m.kind))];
  const KIND_LABEL = { award: 'awards', trade: 'trades', earnings: 'earnings' };

  return (
    <div className="sonar-module snr-card snr-chartcard">
      <div className="sonar-mod-head">
        <span className="sonar-mod-title">
          Price &amp; Catalysts
          {isProxy && <span className="snr-proxy"> · proxy: most-surfaced ticker {ticker}</span>}
        </span>
        <span className="sonar-mod-source">FMP · USAspending · disclosures</span>
      </div>
      {candles === null ? (
        <Skel rows={3} />
      ) : closes.length < 2 ? null : (
        <>
          <div className="snr-chartwrap">
            {/* Stretched SVG carries only the geometry (line, fill, grid, dashed
                date guides) with non-scaling strokes; type and the tappable
                markers are HTML on top, so nothing distorts with the aspect
                ratio and the markers stay real buttons. */}
            <div className="snr-plot">
              <svg
                className="snr-chart"
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={`${ticker} price with sourced event markers`}
              >
                {grid.map((g) => (
                  <line
                    key={g.v}
                    className="snr-gridline"
                    x1={PAD}
                    x2={W - PAD}
                    y1={(g.yPct / 100) * H}
                    y2={(g.yPct / 100) * H}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                <path
                  className="snr-chart-area"
                  d={`${path} L${W - PAD} ${H - 8} L${PAD} ${H - 8} Z`}
                />
                <path className="snr-chart-line" d={path} vectorEffect="non-scaling-stroke" />
                {markers.map((m) => (
                  <line
                    key={m.idx}
                    className="snr-marker-guide"
                    x1={m.cx}
                    y1={m.cy}
                    x2={m.cx}
                    y2={H - 1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
              {grid.map((g) => (
                <span key={g.v} className="snr-ylabel sonar-num" style={{ top: `${g.yPct}%` }}>
                  {g.label}
                </span>
              ))}
              {markers.map((m) => (
                <button
                  key={m.idx}
                  type="button"
                  className={`snr-marker snr-marker--${m.kind}${picked?.idx === m.idx ? ' is-on' : ''}`}
                  style={{ left: `${m.xPct}%`, top: `${m.yPct}%` }}
                  aria-label={m.title}
                  aria-expanded={picked?.idx === m.idx}
                  onClick={() => setPicked(picked?.idx === m.idx ? null : m)}
                />
              ))}
              {picked && (
                <div
                  className="snr-annot"
                  style={{ left: `${Math.min(82, Math.max(4, picked.xPct))}%` }}
                >
                  <span className={`snr-annot-kind snr-annot-kind--${picked.kind}`}>
                    {picked.kind === 'award' ? 'Contract award' : 'Congressional trade'}
                  </span>
                  <span className="snr-annot-title">{picked.title}</span>
                  <span className="snr-annot-detail sonar-num">{picked.detail}</span>
                </div>
              )}
            </div>
            <div className="snr-xlabels">
              {xTicks.map((t, i) => (
                <span key={i} className="sonar-num" style={{ left: `${t.xPct}%` }}>
                  {t.label}
                </span>
              ))}
            </div>
          </div>
          <div className="snr-chart-foot">
            <div className="snr-ranges" role="group" aria-label="Time range">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`snr-range${range === r ? ' is-on' : ''}`}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            {kinds.length > 0 && (
              <span className="snr-legend">
                {kinds.map((k) => (
                  <span key={k} className="snr-legend-item">
                    <i className={`snr-dot snr-dot--${k}`} /> {KIND_LABEL[k] || k}
                  </span>
                ))}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ══ ROW 3 · GOVERNMENT SIGNAL ═══════════════════════════════════════════ */

/** Transparent derived blend of the sub-signals that are actually available.
    Weights are documented in the popover; a sub-signal with no data drops out
    and the remaining weights renormalize. Never an official rating. */
function deriveScore(awards, trades) {
  const parts = [];
  if (awards && awards.length) {
    const now = Date.now();
    const half = 182 * 24 * 3600 * 1000;
    const recent = awards.filter((r) => (toMs(r.date) || 0) >= now - half).length;
    const older = awards.length - recent;
    const momentum = awards.length ? (recent - older) / awards.length : 0; // -1..1
    parts.push({ id: 'Contract momentum', weight: 0.6, norm: (momentum + 1) / 2 });
  }
  if (trades && trades.length) {
    const buys = trades.filter((t) => /purchase|buy/i.test(t.Transaction || '')).length;
    const skew = trades.length ? (buys * 2 - trades.length) / trades.length : 0; // -1..1
    parts.push({ id: 'Congressional buy/sell skew', weight: 0.4, norm: (skew + 1) / 2 });
  }
  if (!parts.length) return null;
  const wsum = parts.reduce((n, p) => n + p.weight, 0);
  const score = Math.round(parts.reduce((n, p) => n + (p.weight / wsum) * p.norm * 100, 0));
  return { score, parts, wsum };
}

export function SnrGovSignal({ entity, ticker, awards, trades, lobbying }) {
  const [showHow, setShowHow] = useState(false);
  const loading = awards === null || trades === null;
  const derived = useMemo(
    () => (loading ? null : deriveScore(awards, trades)),
    [loading, awards, trades],
  );

  // By-quarter award volume for the bar sparkline.
  const quarters = useMemo(() => {
    const byQ = new Map();
    for (const r of awards || []) {
      const ms = toMs(r.date);
      if (!ms) continue;
      const d = new Date(ms);
      const key = `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${String(d.getUTCFullYear()).slice(2)}`;
      byQ.set(key, (byQ.get(key) || 0) + (Number(r.amountValue) || 0));
    }
    return [...byQ.entries()].slice(-6);
  }, [awards]);

  const lob = Array.isArray(lobbying) ? lobbying.slice(0, 4) : [];
  const hasAnything =
    loading || (awards && awards.length) || (trades && trades.length) || lob.length;
  if (!hasAnything) return null;

  const label = derived
    ? derived.score >= 70
      ? 'Strong'
      : derived.score >= 45
        ? 'Mixed'
        : 'Soft'
    : null;

  return (
    <div className="sonar-module snr-card snr-gov">
      <div className="sonar-mod-head">
        <span className="sonar-mod-title">Government Signal</span>
        <span className="sonar-mod-source">USAspending · disclosures · Senate LDA</span>
      </div>
      {loading ? (
        <Skel rows={4} />
      ) : (
        <div className="snr-gov-grid">
          {derived && (
            <div className="snr-gov-score">
              <div
                className="snr-dial"
                style={{ '--snr-dial-pct': `${derived.score}%` }}
                role="img"
                aria-label={`Ezana derived government signal index ${derived.score} of 100, ${label}`}
              >
                <span className="snr-dial-num sonar-num">{derived.score}</span>
                <span className="snr-dial-label">{label}</span>
              </div>
              <button
                type="button"
                className="snr-how"
                aria-expanded={showHow}
                onClick={() => setShowHow((v) => !v)}
              >
                How this is scored
              </button>
              <span className="snr-gov-kicker">Ezana derived index, not an official rating</span>
              {showHow && (
                <div className="snr-how-pop" role="note">
                  <span className="snr-how-title">Derived index methodology</span>
                  <p>
                    A weighted blend of the sub-signals available for this entity, each normalized
                    to 0-100. Sub-signals with no data drop out and the weights renormalize.
                  </p>
                  <ul>
                    {derived.parts.map((p) => (
                      <li key={p.id} className="sonar-num">
                        {p.id}: weight {Math.round((p.weight / derived.wsum) * 100)}%, value{' '}
                        {Math.round(p.norm * 100)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {awards && awards.length > 0 && (
            <div className="snr-gov-contracts">
              <span className="snr-gov-subtitle">Contracts</span>
              {quarters.length > 1 && (
                <div className="snr-qbars" aria-hidden>
                  {(() => {
                    const max = Math.max(...quarters.map(([, v]) => v)) || 1;
                    return quarters.map(([q, v]) => (
                      <span key={q} className="snr-qbar">
                        <i style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
                        <em>{q}</em>
                      </span>
                    ));
                  })()}
                </div>
              )}
              <div className="snr-awards">
                {awards.slice(0, 5).map((r) => (
                  <div key={r.id} className="snr-award">
                    <span className="snr-award-amt sonar-num">{r.amount}</span>
                    <span className="snr-award-agency">{r.agency}</span>
                    <span className="snr-award-date sonar-num">{r.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {lob.length > 0 && (
            <div className="snr-gov-lobby">
              <span className="snr-gov-subtitle">Lobbying</span>
              {lob.map((r, i) => (
                <div key={i} className="snr-award">
                  <span className="snr-award-amt sonar-num">
                    {fmtUsd(Number(r.Amount ?? r.amount)) || ''}
                  </span>
                  <span className="snr-award-agency">
                    {r.Client || r.client || r.Registrant || entity}
                  </span>
                  <span className="snr-award-date sonar-num">
                    {String(r.Date || r.date || '').slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══ STICKY FOLLOW-UP PILL ═══════════════════════════════════════════════ */

function chipsFor(classification, ticker) {
  switch (classification) {
    case 'ticker':
    case 'organization':
      return [
        'What filed this quarter?',
        ticker ? `Biggest ${ticker} contract this year` : 'Recent contract awards',
      ];
    case 'person':
    case 'username':
      return ['What did they trade recently?', 'Committee activity'];
    case 'policy':
    case 'bill':
      return ['Who benefits from this?', 'Latest developments'];
    default:
      return ['What filed this quarter?', 'Latest developments'];
  }
}

export function SnrFollowUp({ entity, classification, ticker, onFollowUp }) {
  const [text, setText] = useState('');
  const chips = chipsFor(classification, ticker);
  const submit = (q) => {
    const v = String(q || '').trim();
    if (v) onFollowUp(v);
    setText('');
  };
  return (
    <div className="snr-followup">
      <form
        className="snr-fu-pill"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
      >
        <i className="bi bi-arrow-return-right snr-fu-icon" aria-hidden />
        <input
          className="snr-fu-input"
          type="text"
          value={text}
          maxLength={300}
          placeholder="Ask a follow-up..."
          aria-label={`Follow-up about ${entity}`}
          onChange={(e) => setText(e.target.value)}
        />
        {chips.map((c) => (
          <button key={c} type="button" className="snr-fu-chip" onClick={() => submit(c)}>
            {c}
          </button>
        ))}
        <button className="snr-fu-send" type="submit" disabled={!text.trim()}>
          Ping
        </button>
      </form>
    </div>
  );
}

export { useAwards, useCongressTrades, useLobbying };
