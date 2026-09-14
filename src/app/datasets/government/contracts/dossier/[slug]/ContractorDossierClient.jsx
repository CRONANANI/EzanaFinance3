'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import { getContractor, fyLabel } from '../../contractor-mock';
import './contractor-dossier.css';

/**
 * Contractor Full Dossier — /datasets/government/contracts/dossier/[slug].
 * Payload resolves from contractor-mock.js (mock enrichment; deterministic
 * fallback so every slug renders). Eight flat zones divided by hairlines.
 */

/* Large area chart: emerald line + gradient fill, value-scaled $B gridline
   labels, annotated filled dot on the peak, hollow dot on the latest point. */
function DossierAreaChart({ series, peakIndex, firstFy }) {
  const W = 720;
  const H = 210;
  const PAD = { t: 16, r: 12, b: 24, l: 40 };
  const min = Math.min(...series);
  const max = Math.max(...series);
  const x = (i) => PAD.l + (i * (W - PAD.l - PAD.r)) / (series.length - 1);
  const y = (v) => PAD.t + (1 - (v - min) / (max - min || 1)) * (H - PAD.t - PAD.b);
  const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${PAD.l},${H - PAD.b} ${pts} ${(W - PAD.r).toFixed(1)},${H - PAD.b}`;
  const axisIdx = [0, 4, 8, 12, 16, 18].filter((i) => i < series.length);
  const last = series.length - 1;
  const peakX = x(peakIndex);
  const peakY = y(series[peakIndex]);
  const peakLabel = `${fyLabel(peakIndex, firstFy)} · $${series[peakIndex].toFixed(1)}B`;
  // Gridlines snap to round $B values so the axis reads as designed ($25B,
  // not $25.4B); each line is drawn at its own value, and ticks that fall
  // outside the plotted range are dropped.
  const span = max - min;
  const step = span >= 30 ? 5 : span >= 10 ? 2 : 1;
  const ticks = [
    ...new Set([0.75, 0.5, 0.25].map((f) => Math.round((min + (1 - f) * span) / step) * step)),
  ].filter((v) => v > min && v < max);
  return (
    <svg
      className="cds-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Award value by fiscal year"
    >
      <defs>
        <linearGradient id="cds-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--emerald)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--emerald)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line className="cds-grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
          <text className="cds-axis" x={PAD.l - 8} y={y(v) + 3} textAnchor="end">
            ${v}B
          </text>
        </g>
      ))}
      <polygon points={area} fill="url(#cds-fill)" />
      <polyline
        points={pts}
        fill="none"
        stroke="var(--emerald)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={peakX} cy={peakY} r="4" fill="var(--emerald)" />
      <text
        className="cds-axis cds-peak-note"
        x={Math.min(peakX, W - PAD.r - 60)}
        y={Math.max(peakY - 10, 12)}
        textAnchor="middle"
      >
        {peakLabel}
      </text>
      <circle
        cx={x(last)}
        cy={y(series[last])}
        r="4"
        fill="var(--bg-primary)"
        stroke="var(--emerald)"
        strokeWidth="1.5"
      />
      {axisIdx.map((i) => (
        <text
          key={i}
          className="cds-axis"
          x={x(i)}
          y={H - 8}
          textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}
        >
          {fyLabel(i, firstFy)}
        </text>
      ))}
    </svg>
  );
}

function MarketChart({ series }) {
  const W = 560;
  const H = 130;
  const PAD = { t: 10, r: 8, b: 10, l: 8 };
  const min = Math.min(...series);
  const max = Math.max(...series);
  const x = (i) => PAD.l + (i * (W - PAD.l - PAD.r)) / (series.length - 1);
  const y = (v) => PAD.t + (1 - (v - min) / (max - min || 1)) * (H - PAD.t - PAD.b);
  const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg className="cds-chart" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <linearGradient id="cds-mkt-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--emerald)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--emerald)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.33, 0.66].map((f) => (
        <line
          key={f}
          className="cds-grid"
          x1={PAD.l}
          x2={W - PAD.r}
          y1={PAD.t + f * (H - PAD.t - PAD.b)}
          y2={PAD.t + f * (H - PAD.t - PAD.b)}
        />
      ))}
      <polygon
        points={`${PAD.l},${H - PAD.b} ${pts} ${(W - PAD.r).toFixed(1)},${H - PAD.b}`}
        fill="url(#cds-mkt-fill)"
      />
      <polyline points={pts} fill="none" stroke="var(--emerald)" strokeWidth="2" />
    </svg>
  );
}

/* Segmented distribution bar: 10px tall, 2px gaps, emerald alpha ramp. */
const MIX_ALPHAS = [1, 0.65, 0.4, 0.24];

function MixBar({ mix }) {
  return (
    <div className="cds-mix">
      <div className="cds-mix-label cds-mono">{mix.label}</div>
      <div className="cds-mix-bar">
        {mix.segments.map(
          (s, i) =>
            s.pct > 0 && (
              <span
                key={s.name}
                className="cds-mix-seg"
                style={{ flexGrow: s.pct, opacity: MIX_ALPHAS[i] ?? 0.2 }}
              />
            ),
        )}
      </div>
      <div className="cds-mix-legend">
        {mix.segments.map(
          (s, i) =>
            s.pct > 0 && (
              <span key={s.name} className="cds-mix-key">
                <span className="cds-mix-swatch" style={{ opacity: MIX_ALPHAS[i] ?? 0.2 }} />
                {s.name} <span className="cds-mono">{s.pct}%</span>
              </span>
            ),
        )}
      </div>
    </div>
  );
}

export default function ContractorDossierClient({ slug }) {
  const c = useMemo(() => getContractor(slug), [slug]);
  const [watchlisted, setWatchlisted] = useState(false); // TODO: persist via /api/watchlist

  return (
    <div className="cds-page">
      {/* 1 · top bar */}
      <header className="cds-topbar">
        <Link
          href="/datasets/government/contracts"
          className="cds-logo-link"
          aria-label="Government contracts"
        >
          <EzanaNavLogo width={23} height={26} className="cds-logo" />
        </Link>
        <span className="cds-topbar-eyebrow cds-mono">CONTRACTOR DOSSIER</span>
        <span className="cds-provenance cds-mono">{c.provenance}</span>
      </header>

      {/* 2 · hero */}
      <section className="cds-hero">
        <span className="cds-monogram cds-mono">{c.monogram}</span>
        <div className="cds-hero-main">
          <div className="cds-hero-titlerow">
            <h1 className="cds-name">{c.name}</h1>
            {c.isPublic ? (
              <span className="cds-chip cds-mono">
                {c.ticker} · {c.exchange}
              </span>
            ) : (
              <span className="cds-chip cds-mono">PRIVATE</span>
            )}
          </div>
          <p className="cds-hero-meta">{c.heroMeta}</p>
        </div>
        <div className="cds-hero-right">
          <div className="cds-lifetime cds-mono">{c.lifetime}</div>
          <div className="cds-ranks">
            lifetime obligations · rank <span className="cds-rank cds-mono">{c.rankLine.rank}</span>{' '}
            {c.rankLine.rest}
          </div>
        </div>
      </section>

      {/* 3 · KPI strip */}
      <section className="cds-kpis">
        {c.kpis.map((k) => (
          <div key={k.label} className="cds-kpi">
            <div className="cds-kpi-label cds-mono">{k.label}</div>
            <div className="cds-kpi-value cds-mono">{k.value}</div>
            <div
              className={
                k.tone === 'neg'
                  ? 'cds-kpi-sub cds-neg'
                  : k.tone === 'pos'
                    ? 'cds-kpi-sub cds-pos'
                    : 'cds-kpi-sub'
              }
            >
              {k.sub}
            </div>
          </div>
        ))}
      </section>

      {/* 4 · awards row */}
      <section className="cds-row cds-awards-row">
        <div className="cds-awards-left">
          <div className="cds-sec-head">
            <span className="cds-eyebrow cds-mono">{c.chartEyebrow}</span>
            <span className="cds-peak cds-mono">{c.peakCallout}</span>
          </div>
          <DossierAreaChart series={c.obligations} peakIndex={c.peakIndex} firstFy={c.firstFy} />
          <div className="cds-mixes">
            <MixBar mix={c.vehicleMix} />
            <MixBar mix={c.pricingMix} />
          </div>
        </div>
        <div className="cds-awards-right">
          <div className="cds-sec-head">
            <span className="cds-eyebrow cds-mono">AGENCY BREAKDOWN</span>
          </div>
          <div className="cds-agencies">
            {c.agencies.map((a) => (
              <div key={a.name} className="cds-agency-row">
                <span className="cds-agency-name">{a.name}</span>
                <span className="cds-agency-val cds-mono">{a.value}</span>
                <span className="cds-agency-pct cds-mono">{a.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 · market + capitol row */}
      <section className="cds-row cds-split">
        <div className="cds-col">
          <div className="cds-sec-head">
            <span className="cds-eyebrow cds-mono">MARKET CONTEXT</span>
            {c.isPublic && c.quote && (
              <span className="cds-mkt-quote cds-mono">
                {c.ticker} {c.quote.price} ·{' '}
                <span className={c.quote.y1Neg ? 'cds-neg' : 'cds-pos'}>{c.quote.y1} 1Y</span>
              </span>
            )}
          </div>
          {c.isPublic && c.quote ? (
            <>
              <MarketChart series={c.quote.series} />
              {c.marketStats && (
                <div className="cds-mkt-stats">
                  {c.marketStats.map((s) => (
                    <div key={s.label} className="cds-mkt-stat">
                      <div className="cds-kpi-label cds-mono">{s.label}</div>
                      <div className="cds-mkt-stat-value cds-mono">{s.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="cds-private-card">
              <p className="cds-note">{c.marketNote}</p>
              <div className="cds-peers">
                {c.peers.map((p) => (
                  <div key={p.t} className="cds-peer-row">
                    <span className="cds-peer-ticker cds-mono">{p.t}</span>
                    <span className="cds-peer-name">{p.name}</span>
                    <span className="cds-peer-val cds-mono">{p.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="cds-col">
          <div className="cds-sec-head">
            <span className="cds-eyebrow cds-mono">
              CONGRESSIONAL ACTIVITY{c.ticker ? ` · ${c.ticker}` : ''}
            </span>
            <span className="cds-eyebrow cds-mono">LAST 90 DAYS</span>
          </div>
          <div className="cds-congress">
            <div className="cds-congress-row cds-congress-head">
              <span className="cds-congress-th cds-mono">MEMBER</span>
              <span className="cds-congress-th cds-mono">TX</span>
              <span className="cds-congress-th cds-congress-num cds-mono">AMOUNT</span>
              <span className="cds-congress-th cds-congress-num cds-mono">FILED</span>
            </div>
            {c.congress.map((row) => (
              <div key={`${row.member}-${row.filed}`} className="cds-congress-row">
                <span className="cds-congress-member">
                  {row.member} <span className="cds-congress-detail">{row.detail}</span>
                </span>
                <span
                  className={
                    row.tx === 'SALE' ? 'cds-tx cds-mono cds-tx-sale' : 'cds-tx cds-mono cds-tx-buy'
                  }
                >
                  {row.tx}
                </span>
                <span className="cds-congress-amount cds-congress-num cds-mono">{row.amount}</span>
                <span className="cds-congress-filed cds-congress-num cds-mono">{row.filed}</span>
              </div>
            ))}
          </div>
          <p className="cds-congress-summary">
            {c.congressSummary.map(([text, bold], i) =>
              bold ? (
                <span key={i} className="cds-strong">
                  {text}
                </span>
              ) : (
                <span key={i}>{text}</span>
              ),
            )}
          </p>
        </div>
      </section>

      {/* 6 · across the platform */}
      <section className="cds-row">
        <div className="cds-sec-head">
          <span className="cds-eyebrow cds-mono">ACROSS THE EZANA PLATFORM</span>
        </div>
        <div className="cds-platform">
          {c.platformSignals.map((p) => {
            const fade = Math.max(0.45, Math.min(1, 0.45 + (0.55 * p.score) / 100));
            const inner = (
              <>
                <span className="cds-plat-name" style={{ opacity: fade }}>
                  {p.name}
                  {p.live && <span className="cds-live cds-mono">LIVE</span>}
                </span>
                <span className="cds-plat-track">
                  <span
                    className="cds-plat-bar"
                    style={{ width: `${Math.max(2, p.score)}%`, opacity: fade }}
                  />
                </span>
                <span className="cds-plat-score cds-mono" style={{ opacity: fade }}>
                  {p.score}
                </span>
              </>
            );
            // TODO: link each surface's real route once its dataset page ships.
            return p.score > 0 ? (
              <a key={p.name} href="#" className="cds-plat-row">
                {inner}
              </a>
            ) : (
              <div key={p.name} className="cds-plat-row">
                {inner}
              </div>
            );
          })}
        </div>
        <p className="cds-footnote">{c.platformFootnote}</p>
      </section>

      {/* 7 · recent awards */}
      <section className="cds-row">
        <div className="cds-sec-head">
          <span className="cds-eyebrow cds-mono">RECENT AWARDS</span>
          <Link href="/datasets/government/contracts" className="cds-viewall">
            {c.awardsAllLink}
          </Link>
        </div>
        <div className="cds-awards-table">
          <div className="cds-award-row cds-award-head">
            <span className="cds-award-th cds-mono">DATE</span>
            <span className="cds-award-th cds-mono">AGENCY</span>
            <span className="cds-award-th cds-mono">DESCRIPTION</span>
            <span className="cds-award-th cds-mono">VEHICLE</span>
            <span className="cds-award-th cds-award-num cds-mono">OBLIGATED</span>
          </div>
          {c.recentAwards.map((a) => (
            <div key={`${a.date}-${a.amount}`} className="cds-award-row">
              <span className="cds-award-date cds-mono">{a.date}</span>
              <span className="cds-award-agency">{a.agency}</span>
              <span className="cds-award-desc">{a.desc}</span>
              <span className="cds-award-vehicle cds-mono">{a.vehicle}</span>
              <span className="cds-award-amount cds-award-num cds-mono">{a.amount}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 8 · footer */}
      <footer className="cds-foot">
        <p className="cds-sources">{c.sources}</p>
        {/* TODO: wire the alerting flow once alerts ship for this dataset. */}
        <button type="button" className="cds-btn-outline">
          Set alert
        </button>
        <button
          type="button"
          className={watchlisted ? 'cds-btn-primary cds-on' : 'cds-btn-primary'}
          onClick={() => setWatchlisted((w) => !w)}
        >
          {watchlisted ? 'On watchlist' : 'Add to watchlist'}
        </button>
      </footer>
    </div>
  );
}
