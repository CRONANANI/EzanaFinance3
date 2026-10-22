'use client';

/**
 * Institutional Holdings cards 4, 7, 8, 9 and 10: Consensus vs Conviction,
 * Signal Convergence, The Lag Tax, Manager Universe, Hedge Overlay.
 * Spec: institutional-handoff/04-SPEC.md. Scale maths from the model.
 */
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  convergenceRows,
  dotSize,
  logX,
  netBreadth,
  putCallRatio,
  quadrantOf,
  sqrtY,
} from '@/lib/titans/institutional-model';
import { int, pct, quarterShort, signedInt, signedPct, usd } from '@/lib/titans/format';
import { Card, M } from './ui';

/* ── Card 4: Consensus vs Conviction ─────────────────────────────────── */

const MAP_X = [100, 7943];
const MAP_Y = [0, 0.05];
const HOLDER_SPLIT = 1000;
const WEIGHT_SPLIT = 0.01;
const SECTOR_CHIPS = [
  ['All sectors', null],
  ['Tech', 'Technology'],
  ['Comm.', 'Communication Services'],
  ['Cons. disc.', 'Consumer Discretionary'],
  ['Health care', 'Health Care'],
  ['Financials', 'Financials'],
  ['Staples', 'Consumer Staples'],
  ['Energy', 'Energy'],
  ['Industrials', 'Industrials'],
  ['Utilities', 'Utilities'],
  ['Real estate', 'Real Estate'],
  ['Materials', 'Materials'],
  ['Funds & ETFs', 'Funds & ETFs'],
  ['Unclassified', 'Unclassified'],
];
const QUADRANT_WORD = {
  core: 'Crowded core',
  ballast: 'Index ballast',
  hidden: 'Hidden conviction',
  tail: 'Long tail',
};

export function ConsensusMapCard({ overview, chip, chipPartial, onSecurity }) {
  const [sector, setSector] = useState(null);
  const [hot, setHot] = useState(null);
  const dots = useMemo(() => {
    const rows = (overview?.convictionMap || []).filter(
      (r) => r.holders >= MAP_X[0] && r.medianWeight != null,
    );
    const maxValue = Math.max(1, ...rows.map((r) => r.valueUsd || 0));
    return rows
      .map((r) => ({
        ...r,
        x: logX(r.holders, MAP_X) * 100,
        y: (1 - sqrtY(Math.min(r.medianWeight, MAP_Y[1]), MAP_Y)) * 100,
        size: dotSize(r.valueUsd, maxValue),
        quadrant: quadrantOf(
          { holders: r.holders, medianWeight: r.medianWeight },
          { holderSplit: HOLDER_SPLIT, weightSplit: WEIGHT_SPLIT },
        ),
      }))
      .sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));
  }, [overview]);
  const labelled = useMemo(() => {
    const byValue = new Set(dots.slice(0, 20).map((d) => d.cusip));
    for (const d of dots) if (d.quadrant === 'hidden') byValue.add(d.cusip);
    return byValue;
  }, [dots]);
  const hotDot = dots.find((d) => d.cusip === hot) || null;
  const xSplit = logX(HOLDER_SPLIT, MAP_X) * 100;
  const ySplit = (1 - sqrtY(WEIGHT_SPLIT, MAP_Y)) * 100;

  return (
    <Card
      id="inst-map"
      className="inst-card--map"
      icon="bi-bullseye"
      eyebrow="Consensus vs conviction"
      title="Is a stock widely owned, or deeply owned?"
      chip={chip}
      chipPartial={chipPartial}
      sourceExtra="Weight = position value / that manager's reported total."
      empty={
        overview && !dots.length
          ? 'The conviction map appears once both quarters are parsed.'
          : null
      }
    >
      <div className="inst-chips" role="group" aria-label="Sector filter">
        {SECTOR_CHIPS.map(([label, value]) => (
          <button
            key={label}
            type="button"
            aria-pressed={sector === value}
            className={`inst-chip${sector === value ? ' is-on' : ''}`}
            onClick={() => setSector(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="inst-map-grid">
        <div
          className="inst-map-plot"
          role="img"
          aria-label="Holders against median holder weight, one dot per security"
        >
          <span
            className="inst-map-wash inst-map-wash--hidden"
            style={{ right: `${100 - xSplit}%`, bottom: `${100 - ySplit}%` }}
          />
          <span
            className="inst-map-wash inst-map-wash--core"
            style={{ left: `${xSplit}%`, bottom: `${100 - ySplit}%` }}
          />
          <span
            className="inst-map-wash inst-map-wash--ballast"
            style={{ left: `${xSplit}%`, top: `${ySplit}%` }}
          />
          <span className="inst-map-split inst-map-split--x" style={{ left: `${xSplit}%` }} />
          <span className="inst-map-split inst-map-split--y" style={{ top: `${ySplit}%` }} />
          <span className="inst-map-q inst-map-q--hidden">Hidden conviction</span>
          <span className="inst-map-q inst-map-q--core">Crowded core</span>
          <span className="inst-map-q inst-map-q--ballast">Index ballast</span>
          <span className="inst-map-q inst-map-q--tail">Long tail</span>
          {[100, 300, 1000, 3000].map((h) => (
            <span
              key={h}
              className="inst-map-tick inst-mono"
              style={{ left: `${logX(h, MAP_X) * 100}%` }}
            >
              {int(h)}
            </span>
          ))}
          {dots.map((d) => {
            const dim = sector && d.sector !== sector;
            return (
              <button
                key={d.cusip}
                type="button"
                className={`inst-map-dot inst-map-dot--${d.quadrant}${dim ? ' is-dim' : ''}${hot === d.cusip ? ' is-hot' : ''}`}
                style={{ left: `${d.x}%`, top: `${d.y}%`, width: d.size, height: d.size }}
                onMouseEnter={() => setHot(d.cusip)}
                onFocus={() => setHot(d.cusip)}
                onClick={() => onSecurity(d.ticker || d.cusip)}
                aria-label={`${d.ticker || d.issuer}: ${int(d.holders)} holders, median weight ${pct((d.medianWeight || 0) * 100, 2)}, combined value ${usd(d.valueUsd)}, ${QUADRANT_WORD[d.quadrant]}. Open the Security X-ray.`}
              >
                {!dim && labelled.has(d.cusip) ? (
                  <span className="inst-map-label inst-mono">{d.ticker || ''}</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <aside className="inst-map-aside">
          <div className="inst-readout">
            <p className="inst-eyebrow">Hovered</p>
            {hotDot ? (
              <>
                <p className="inst-readout-ticker inst-mono">{hotDot.ticker || hotDot.issuer}</p>
                {hotDot.ticker && hotDot.issuer ? (
                  <p className="inst-muted">{hotDot.issuer}</p>
                ) : null}
                <dl className="inst-readout-dl inst-mono">
                  <div>
                    <dt>Holders</dt>
                    <dd>{int(hotDot.holders)}</dd>
                  </div>
                  <div>
                    <dt>Median weight</dt>
                    <dd>{pct((hotDot.medianWeight || 0) * 100, 2)}</dd>
                  </div>
                  <div>
                    <dt>Combined value</dt>
                    <dd>{usd(hotDot.valueUsd)}</dd>
                  </div>
                  <div>
                    <dt>Quadrant</dt>
                    <dd>{QUADRANT_WORD[hotDot.quadrant]}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="inst-link"
                  onClick={() => onSecurity(hotDot.ticker || hotDot.cusip)}
                >
                  Open Security X-ray
                </button>
              </>
            ) : (
              <p className="inst-muted">Hover or focus a dot.</p>
            )}
          </div>
          <div className="inst-map-defs">
            <p>
              <strong>Crowded core</strong>: widely held and a real weight in holders&apos; books.
            </p>
            <p>
              <strong>Index ballast</strong>: held everywhere, but thin in each book.
            </p>
            <p>
              <strong>Hidden conviction</strong>: few holders, each with a deep position.
            </p>
            <p>
              <strong>Long tail</strong>: few holders, thin weights.
            </p>
            <p className="inst-mono inst-muted">
              Splits at {int(HOLDER_SPLIT)} holders and {pct(WEIGHT_SPLIT * 100, 2)} median weight.
              Options lines excluded.
            </p>
          </div>
        </aside>
      </div>
      <p className="inst-axis-caption inst-mono">
        X: managers holding (log scale) · Y: median weight in holders&apos; books (square-root
        scale) · dot size: combined value
      </p>
      {/* screen-reader fallback */}
      <table className="inst-sr-table">
        <caption>Every security on the conviction map</caption>
        <thead>
          <tr>
            <th scope="col">Security</th>
            <th scope="col">Holders</th>
            <th scope="col">Median weight</th>
            <th scope="col">Combined value</th>
            <th scope="col">Quadrant</th>
          </tr>
        </thead>
        <tbody>
          {dots.map((d) => (
            <tr key={`sr-${d.cusip}`}>
              <td>{d.ticker || d.issuer}</td>
              <td>{int(d.holders)}</td>
              <td>{pct((d.medianWeight || 0) * 100, 2)}</td>
              <td>{usd(d.valueUsd)}</td>
              <td>{QUADRANT_WORD[d.quadrant]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* ── Card 7: Signal Convergence ──────────────────────────────────────── */

export function ConvergenceCard({ overview, convergence, chip, chipPartial, onSecurity }) {
  const rows = useMemo(() => {
    const base = (overview?.breadth || [])
      .filter((b) => b.ticker && convergence?.[b.ticker])
      .map((b) => {
        const c = convergence[b.ticker];
        return {
          ticker: b.ticker,
          issuer: b.issuer,
          net: netBreadth(b),
          breadth: netBreadth(b) > 0,
          insider: Boolean(c?.insider?.buys),
          congress: Boolean(c?.congress?.buys),
          activist: Boolean(c?.activist),
          netBreadth: netBreadth(b),
          insiderBuys: c?.insider?.buys || 0,
          congressBuys: c?.congress?.buys || 0,
          activistPct: c?.activist?.pct ?? null,
        };
      });
    const ranked = convergenceRows(base);
    const multi = ranked.filter((r) => r.count >= 2);
    return (multi.length >= 1 ? [...multi, ...ranked.filter((r) => r.count === 1)] : ranked).slice(
      0,
      8,
    );
  }, [overview, convergence]);

  const dot = (present, label, href, ticker) => (
    <Link
      className={`inst-sig${present ? ' is-on' : ''}`}
      href={href}
      aria-label={`${label} for ${ticker}: ${present ? 'signal present' : 'none this quarter'}`}
    >
      <span aria-hidden="true" />
    </Link>
  );

  return (
    <Card
      id="inst-convergence"
      icon="bi-intersect"
      eyebrow="Signal convergence · Titans Shadow × Capitol Watch"
      title="Where do several kinds of informed money point the same way?"
      chip={chip}
      chipPartial={chipPartial}
      sourceExtra="Signals: SEC EDGAR 13F-HR, Form 4, Schedules 13D and 13G; House Clerk and Senate PTR disclosures."
      empty={
        overview && !rows.some((r) => r.count >= 2)
          ? 'No security shows more than one signal this quarter.'
          : null
      }
    >
      <div className="inst-table-wrap">
        <table className="inst-table inst-table--convergence">
          <thead>
            <tr>
              <th scope="col">Security</th>
              <th scope="col">13F net buyers</th>
              <th scope="col">Insider buys</th>
              <th scope="col">Congress buys</th>
              <th scope="col">13D / 13G stake</th>
              <th scope="col">Signals present</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ticker}>
                <td>
                  <button
                    type="button"
                    className="inst-link inst-mono"
                    onClick={() => onSecurity(r.ticker)}
                  >
                    {r.ticker}
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className={`inst-sig${r.breadth ? ' is-on' : ''}`}
                    onClick={() => onSecurity(r.ticker)}
                    aria-label={`13F net buyers for ${r.ticker}: ${r.breadth ? signedInt(r.netBreadth) : 'none this quarter'}`}
                  >
                    <span aria-hidden="true" />
                  </button>
                </td>
                <td>{dot(r.insider, 'Insider buys', '/datasets/insider', r.ticker)}</td>
                <td>
                  {dot(r.congress, 'Congress buys', '/datasets/politician-tracker', r.ticker)}
                </td>
                <td>{dot(r.activist, '13D or 13G stake', '/datasets/activist', r.ticker)}</td>
                <td className="inst-mono inst-sig-count">{r.count} of 4</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="inst-legend">
        <span>
          <i className="inst-dot inst-dot--titans" aria-hidden="true" /> signal present
        </span>
        <span>
          <i className="inst-dot inst-dot--hollow" aria-hidden="true" /> none this quarter
        </span>
      </p>
    </Card>
  );
}

/* ── Card 8: The Lag Tax ─────────────────────────────────────────────── */

export function LagTaxCard({ overview, lag, daysSince, chip, onSecurity }) {
  const rows = useMemo(() => {
    const top = (overview?.breadth || [])
      .filter((b) => b.ticker)
      .sort((a, b) => netBreadth(b) - netBreadth(a))
      .slice(0, 10)
      .map((b) => ({ ticker: b.ticker, pctSince: lag?.[b.ticker] ?? null }))
      .filter((r) => r.pctSince != null);
    return top;
  }, [overview, lag]);
  let [lo, hi] = [-0.1, 0.35];
  for (const r of rows) {
    while (r.pctSince < lo) lo -= 0.05;
    while (r.pctSince > hi) hi += 0.05;
  }
  const x = (v) => ((v - lo) / (hi - lo)) * 100;

  return (
    <Card
      id="inst-lag"
      icon="bi-clock-history"
      eyebrow={`The lag tax · ${daysSince ?? M} days since ${quarterShort(overview?.quarter) || 'quarter end'}`}
      title="How far have the most-bought stocks moved since the holdings date?"
      chip={chip}
      sourceExtra="Prices: daily closes."
      empty={
        overview && !rows.length ? 'Price history is not available for these tickers yet.' : null
      }
    >
      <div className="inst-lag-rows">
        {rows.map((r) => (
          <button
            key={r.ticker}
            type="button"
            className="inst-lag-row"
            onClick={() => onSecurity(r.ticker)}
            aria-label={`${r.ticker}: ${signedPct(r.pctSince * 100, 1)} since the quarter end. Open the Security X-ray.`}
          >
            <span className="inst-mono inst-flow-ticker">{r.ticker}</span>
            <span className="inst-lag-plot" aria-hidden="true">
              <span className="inst-lag-zero" style={{ left: `${x(0)}%` }} />
              <span
                className={`inst-lag-stem${r.pctSince >= 0 ? '' : ' is-down'}`}
                style={{
                  left: `${Math.min(x(0), x(r.pctSince))}%`,
                  width: `${Math.abs(x(r.pctSince) - x(0))}%`,
                }}
              />
              <span
                className={`inst-lag-dot${r.pctSince >= 0 ? '' : ' is-down'}`}
                style={{ left: `${x(r.pctSince)}%` }}
              />
            </span>
            <span
              className={`inst-mono inst-lag-value ${r.pctSince >= 0 ? 'inst-pos' : 'inst-neg'}`}
            >
              {signedPct(r.pctSince * 100, 1)}
            </span>
          </button>
        ))}
      </div>
      <p className="inst-note inst-note--inset">
        Holdings are a quarter-end snapshot, published up to 45 days later. This is what has
        happened to the price since, for the ten names with the most net buyers. A position may have
        been sold before it became visible.
      </p>
    </Card>
  );
}

/* ── Card 9: Manager Universe ────────────────────────────────────────── */

const UNI_X = [1e8, 5e12];
const UNI_Y = [1, 1000];
const uniX = (v) => logX(v, UNI_X) * 100;
const uniY = (n) => (1 - logX(n, UNI_Y)) * 100;

export function ManagerUniverseCard({ overview, chip, chipPartial, selectedCik, onManager }) {
  const canvasRef = useRef(null);
  const shape = overview?.filerShape || [];
  const top25 = useMemo(() => {
    const byCik = new Map(shape.map((f) => [String(f.cik), f]));
    return (overview?.topFilers || [])
      .map((t) => ({ ...t, effN: byCik.get(String(t.cik))?.effN ?? null }))
      .filter((t) => t.valueUsd && t.effN);
  }, [overview, shape]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !shape.length) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const ink = getComputedStyle(canvas).color;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.22;
    for (const f of shape) {
      if (!f.valueUsd || !f.effN) continue;
      const x = (uniX(f.valueUsd) / 100) * w;
      const y = (uniY(f.effN) / 100) * h;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [shape]);

  return (
    <Card
      id="inst-universe"
      icon="bi-buildings"
      eyebrow="Manager universe"
      title="Diversified giants or focused stock pickers?"
      chip={chip}
      chipPartial={chipPartial}
      empty={
        overview && !shape.length
          ? 'The manager universe appears once the quarter is parsed.'
          : null
      }
    >
      <div
        className="inst-universe"
        role="img"
        aria-label="Every filer by reported value and effective number of positions"
      >
        {[10, 100].map((n) => (
          <span key={n} className="inst-uni-grid" style={{ top: `${uniY(n)}%` }} />
        ))}
        <canvas ref={canvasRef} className="inst-uni-canvas" aria-hidden="true" />
        {top25.map((t) => {
          const selected = selectedCik && String(t.cik) === String(selectedCik);
          return (
            <button
              key={t.cik}
              type="button"
              className={`inst-uni-dot${selected ? ' is-selected' : ''}`}
              style={{ left: `${uniX(t.valueUsd)}%`, top: `${uniY(t.effN)}%` }}
              onClick={() => onManager(t.cik)}
              aria-label={`${t.filer}: ${usd(t.valueUsd)} reported, effective N ${Math.round(t.effN)}. Open the Manager Fingerprint.`}
            >
              {selected || t.valueUsd >= (top25[7]?.valueUsd || 0) ? (
                <span
                  className="inst-uni-label"
                  style={uniX(t.valueUsd) > 70 ? { right: '100%', left: 'auto' } : undefined}
                >
                  {t.filer}
                </span>
              ) : null}
            </button>
          );
        })}
        <p className="inst-axis inst-mono" aria-hidden="true">
          {['$100M', '$1B', '$10B', '$100B', '$1T'].map((l, i) => (
            <span
              key={l}
              style={{
                position: 'absolute',
                left: `${uniX([1e8, 1e9, 1e10, 1e11, 1e12][i])}%`,
                bottom: -18,
              }}
            >
              {l}
            </span>
          ))}
        </p>
      </div>
      <p className="inst-axis-caption inst-mono">
        X: reported value (log) · Y: effective number of positions, 1 / Σ weight² (log)
      </p>
      <p className="inst-legend">
        <span>
          <i className="inst-dot inst-dot--neutral" aria-hidden="true" /> Top 25 by value
        </span>
        <span>
          <i className="inst-dot inst-dot--ghost" aria-hidden="true" /> All other filers
        </span>
        <span>
          <i className="inst-dot inst-dot--titans" aria-hidden="true" /> Selected
        </span>
      </p>
    </Card>
  );
}

/* ── Card 10: Hedge Overlay ──────────────────────────────────────────── */

export function HedgeOverlayCard({ overview, chip, chipPartial, onSecurity }) {
  const rows = useMemo(
    () =>
      [...(overview?.options || [])]
        .sort((a, b) => b.putUsd + b.callUsd - (a.putUsd + a.callUsd))
        .slice(0, 8),
    [overview],
  );
  const max = Math.max(1, ...rows.flatMap((r) => [r.putUsd, r.callUsd]));
  return (
    <Card
      id="inst-hedge"
      icon="bi-bank2"
      eyebrow="Hedge overlay"
      title="Where do managers hold puts and calls, and how big are they?"
      chip={chip}
      chipPartial={chipPartial}
      empty={
        overview && !rows.length ? 'No listed put or call lines were reported this quarter.' : null
      }
    >
      <div className="inst-hedge-rows">
        {rows.map((r) => {
          const ratio = putCallRatio({ put: r.putUsd, call: r.callUsd });
          return (
            <button
              key={r.cusip}
              type="button"
              className="inst-hedge-row"
              onClick={() => onSecurity(r.ticker || r.cusip)}
              aria-label={`${r.ticker || r.issuer}: puts ${usd(r.putUsd)} across ${int(r.putFilers)} filers, calls ${usd(r.callUsd)} across ${int(r.callFilers)} filers. Open the Security X-ray.`}
            >
              <span className="inst-mono inst-flow-ticker">{r.ticker || <em>{r.issuer}</em>}</span>
              <span className="inst-hedge-left" aria-hidden="true">
                <span className="inst-mono inst-muted">{usd(r.putUsd)}</span>
                <span
                  className="inst-bar inst-bar--put"
                  style={{ width: `${(r.putUsd / max) * 86}%` }}
                />
              </span>
              <span className="inst-hedge-right" aria-hidden="true">
                <span
                  className="inst-bar inst-bar--call"
                  style={{ width: `${(r.callUsd / max) * 86}%` }}
                />
                <span className="inst-mono inst-muted">{usd(r.callUsd)}</span>
              </span>
              <span
                className={`inst-mono inst-hedge-ratio${ratio != null && ratio > 1 ? ' is-putheavy' : ''}`}
              >
                {ratio != null ? ratio.toFixed(2) : M}
              </span>
            </button>
          );
        })}
      </div>
      <p className="inst-legend">
        <span>
          <i className="inst-dot inst-dot--put" aria-hidden="true" /> put notional
        </span>
        <span>
          <i className="inst-dot inst-dot--call" aria-hidden="true" /> call notional
        </span>
        <span className="inst-mono inst-muted">right: put / call ratio</span>
      </p>
      <p className="inst-note inst-note--hatch">
        <i className="bi bi-info-circle" aria-hidden="true" /> Option lines report the
        underlying&apos;s value, not the premium paid. A put line can be half of a hedged trade, and
        13F shows no shorts.
      </p>
    </Card>
  );
}
