'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getContractor, fyLabel } from './contractor-mock';
import './contractor-quick-view.css';

/**
 * Contractor Quick-View popup — 920px modal opened from ContractsExplorer
 * recipient rows. Payload is mock enrichment (contractor-mock.js) mapped by
 * recipient name; peer rows swap the payload in place, "Full dossier"
 * navigates to the dossier route.
 */

/* Inline-SVG area chart: emerald line, gradient fill, 3 gridlines, filled dot
   on the peak, hollow dot on the latest point, mono FY axis labels. */
function QuickAreaChart({ series, peakIndex, firstFy }) {
  const W = 380;
  const H = 148;
  const PAD = { t: 10, r: 8, b: 20, l: 8 };
  const min = Math.min(...series);
  const max = Math.max(...series);
  const x = (i) => PAD.l + (i * (W - PAD.l - PAD.r)) / (series.length - 1);
  const y = (v) => PAD.t + (1 - (v - min) / (max - min || 1)) * (H - PAD.t - PAD.b);
  const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${PAD.l},${H - PAD.b} ${pts} ${(W - PAD.r).toFixed(1)},${H - PAD.b}`;
  const axisIdx = [0, 6, 12, 18].filter((i) => i < series.length);
  const last = series.length - 1;
  return (
    <svg
      className="cqv-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Award value by fiscal year"
    >
      <defs>
        <linearGradient id="cqv-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--emerald)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--emerald)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => {
        const gy = PAD.t + f * (H - PAD.t - PAD.b);
        return <line key={f} className="cqv-grid" x1={PAD.l} x2={W - PAD.r} y1={gy} y2={gy} />;
      })}
      <polygon points={area} fill="url(#cqv-fill)" />
      <polyline
        points={pts}
        fill="none"
        stroke="var(--emerald)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(peakIndex)} cy={y(series[peakIndex])} r="3.5" fill="var(--emerald)" />
      <circle
        cx={x(last)}
        cy={y(series[last])}
        r="3.5"
        fill="var(--bg-primary)"
        stroke="var(--emerald)"
        strokeWidth="1.5"
      />
      {axisIdx.map((i) => (
        <text
          key={i}
          className="cqv-axis"
          x={x(i)}
          y={H - 6}
          textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}
        >
          {fyLabel(i, firstFy)}
        </text>
      ))}
    </svg>
  );
}

function Sparkline({ series }) {
  const W = 150;
  const H = 44;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const x = (i) => (i * W) / (series.length - 1);
  const y = (v) => 3 + (1 - (v - min) / (max - min || 1)) * (H - 8);
  const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg className="cqv-spark" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <linearGradient id="cqv-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--emerald)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--emerald)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#cqv-spark-fill)" />
      <polyline points={pts} fill="none" stroke="var(--emerald)" strokeWidth="1.5" />
    </svg>
  );
}

export default function ContractorQuickView({ recipient, onClose }) {
  const router = useRouter();
  const [company, setCompany] = useState(() => getContractor(recipient));
  const [watchlisted, setWatchlisted] = useState(false); // TODO: persist via /api/watchlist
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setCompany(getContractor(recipient));
    setWatchlisted(false);
  }, [recipient]);

  // Focus the dialog on open, close on Escape, return focus on unmount.
  useEffect(() => {
    const prev = document.activeElement;
    dialogRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, []);

  const openPeer = (peerName) => {
    setCompany(getContractor(peerName));
    setWatchlisted(false);
  };

  const openDossier = () => router.push(`/datasets/government/contracts/dossier/${company.slug}`);

  return (
    <div className="cqv-scrim" onClick={onClose}>
      <div
        className="cqv-root"
        role="dialog"
        aria-modal="true"
        aria-label={company.name}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cqv-head">
          <span className="cqv-monogram cqv-mono">{company.monogram}</span>
          <div className="cqv-title-wrap">
            <div className="cqv-title-row">
              <h2 className="cqv-name">{company.name}</h2>
              {company.isPublic ? (
                <span className="cqv-chip cqv-mono">
                  {company.ticker} · {company.exchange}
                </span>
              ) : (
                <span className="cqv-chip cqv-mono">PRIVATE</span>
              )}
              <span className="cqv-chip cqv-chip-rank cqv-mono">{company.rankChip}</span>
            </div>
            <p className="cqv-meta">{company.meta}</p>
          </div>
          <button type="button" className="cqv-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className="cqv-stats">
          {company.stats.map((s) => (
            <div key={s.label} className="cqv-stat">
              <div className="cqv-stat-label cqv-mono">{s.label}</div>
              <div
                className={s.neg ? 'cqv-stat-value cqv-mono cqv-neg' : 'cqv-stat-value cqv-mono'}
              >
                {s.value}
              </div>
              <div className="cqv-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="cqv-body">
          <section className="cqv-left">
            <div className="cqv-sec-head">
              <span className="cqv-eyebrow cqv-mono">{company.chartEyebrow}</span>
              <span className="cqv-peak cqv-mono">{company.peakCallout}</span>
            </div>
            <QuickAreaChart
              series={company.obligations}
              peakIndex={company.peakIndex}
              firstFy={company.firstFy}
            />

            <div className="cqv-sec-head cqv-sec-gap">
              <span className="cqv-eyebrow cqv-mono">AGENCY BREAKDOWN</span>
            </div>
            <div className="cqv-agencies">
              {company.agencies.slice(0, 4).map((a, i) => (
                <div key={a.name} className="cqv-agency-row">
                  <span className="cqv-agency-name">{a.name}</span>
                  <span className="cqv-agency-track">
                    <span
                      className="cqv-agency-bar"
                      style={{ width: `${Math.max(1, a.w * 100)}%`, opacity: 1 - i * 0.2 }}
                    />
                  </span>
                  <span className="cqv-agency-val cqv-mono">{a.value}</span>
                  <span className="cqv-agency-pct cqv-mono">{a.pct}</span>
                </div>
              ))}
            </div>
            <p className="cqv-agencies-more">{company.agenciesMore}</p>
          </section>

          <section className="cqv-right">
            {company.isPublic && company.quote ? (
              <div className="cqv-market-card">
                <div className="cqv-sec-head">
                  <span className="cqv-eyebrow cqv-mono">{company.ticker} · 1Y</span>
                  <span className="cqv-quote-y1 cqv-mono">{company.quote.y1}</span>
                </div>
                <div className="cqv-quote-price cqv-mono">{company.quote.price}</div>
                <div className="cqv-quote-change cqv-mono">{company.quote.change}</div>
                <Sparkline series={company.quote.series} />
                <div className="cqv-market-divider" />
                <p className="cqv-market-note">{company.marketNote}</p>
              </div>
            ) : (
              <div className="cqv-market-card">
                <div className="cqv-sec-head">
                  <span className="cqv-eyebrow cqv-mono">RELATED SECURITY</span>
                </div>
                <p className="cqv-market-note">{company.marketNote}</p>
              </div>
            )}

            <div className="cqv-sec-head cqv-sec-gap">
              <span className="cqv-eyebrow cqv-mono">{company.peersLabel}</span>
            </div>
            <div className="cqv-peers">
              {company.peers.map((p) => (
                <button
                  key={p.t}
                  type="button"
                  className="cqv-peer-row"
                  onClick={() => openPeer(p.name)}
                >
                  <span className="cqv-peer-ticker cqv-mono">{p.t}</span>
                  <span className="cqv-peer-name">{p.name}</span>
                  <span className="cqv-peer-val cqv-mono">{p.v}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className="cqv-foot">
          <p className="cqv-signal">
            <span className="cqv-signal-tag">Signal:</span>{' '}
            {company.signal.replace(/^Signal:\s*/, '')}
          </p>
          <button type="button" className="cqv-btn-outline" onClick={openDossier}>
            Full dossier
          </button>
          <button
            type="button"
            className={watchlisted ? 'cqv-btn-primary cqv-on' : 'cqv-btn-primary'}
            onClick={() => setWatchlisted((w) => !w)}
          >
            {watchlisted ? 'On watchlist' : 'Add to watchlist'}
          </button>
        </footer>
      </div>
    </div>
  );
}
