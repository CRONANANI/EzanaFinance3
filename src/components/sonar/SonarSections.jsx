'use client';

import { Lock, ArrowUpRight } from 'lucide-react';

/**
 * Sonar dashboard modules — each renders from the REAL /api/sonar/query response
 * (the sections it grouped) and unmounts when it has no data, so the grid never
 * holds a hole. Every module carries source attribution. The external-source
 * modules from the handoff (Markets Snapshot, Relevant News, Upcoming Catalysts)
 * are the Phase-2 fan-out and simply don't render until their data is wired.
 */

function sectionById(sections, id) {
  return sections.find((s) => s.id === id) || null;
}

function SourceRow({ item, serif }) {
  return (
    <div className="sonar-mod-row">
      <span className="sonar-mod-marker">{item.marker}</span>
      <div style={{ minWidth: 0 }}>
        {item.url ? (
          <a
            className={`sonar-mod-rowtitle${serif ? ' sonar-echo-title' : ''}`}
            href={item.url}
            target="_blank"
            rel="noreferrer"
          >
            {item.title}
          </a>
        ) : (
          <span className={`sonar-mod-rowtitle${serif ? ' sonar-echo-title' : ''}`}>{item.title}</span>
        )}
        <div className="sonar-mod-meta">
          {item.ticker && <span>{item.ticker}</span>}
          {item.date && <span>{String(item.date).slice(0, 10)}</span>}
          {item.similarity != null && <span>sim {item.similarity}</span>}
        </div>
        {item.snippet && <div className="sonar-mod-snip">{item.snippet}</div>}
      </div>
    </div>
  );
}

/** From Ezana Echo — serif headlines, ties to the Echo archive. */
export function EchoResults({ sections }) {
  const echo = sectionById(sections, 'echo');
  if (!echo || !echo.items.length) return null;
  return (
    <div className="sonar-module">
      <div className="sonar-mod-head">
        <span className="sonar-mod-title">From Ezana Echo</span>
        <span className="sonar-mod-source">{echo.source}</span>
      </div>
      {echo.items.map((it) => (
        <SourceRow key={it.marker} item={it} serif />
      ))}
    </div>
  );
}

/** Government Signal (Ezana's differentiator) — government contracts + congressional
    trades, combined. */
export function GovernmentSignal({ sections }) {
  const contracts = sectionById(sections, 'gov-contracts');
  const congress = sectionById(sections, 'congress');
  const items = [...(contracts?.items || []), ...(congress?.items || [])];
  if (!items.length) return null;
  const sources = [contracts?.source, congress?.source].filter(Boolean).join(' · ');
  return (
    <div className="sonar-module">
      <div className="sonar-mod-head">
        <span className="sonar-mod-title">Government Signal</span>
        <span className="sonar-mod-source">{sources}</span>
      </div>
      {items.map((it) => (
        <SourceRow key={it.marker} item={it} />
      ))}
    </div>
  );
}

/** Prediction Markets — GATED pattern. Entitled + data → real rows. Not entitled →
    blurred skeleton under a Lock overlay (never hidden; no fabricated claims). */
export function PredictionMarkets({ sections, locked }) {
  const markets = sectionById(sections, 'prediction-markets');
  const isLocked = locked?.some((d) => d.id === 'prediction-markets');

  if (isLocked) {
    return (
      <div className="sonar-module sonar-gated">
        <div className="sonar-mod-head">
          <span className="sonar-mod-title">Prediction Markets</span>
          <span className="sonar-mod-source">Polymarket</span>
        </div>
        <div className="sonar-gated-content" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div className="sonar-mod-row" key={i}>
              <span className="sonar-mod-marker">S{i + 1}</span>
              <div style={{ minWidth: 0, width: '100%' }}>
                <div
                  className="sonar-mod-rowtitle"
                  style={{ height: 12, width: '78%', background: 'currentColor', opacity: 0.25, borderRadius: 4 }}
                />
                <div className="sonar-mod-meta" style={{ height: 9, width: '40%', background: 'currentColor', opacity: 0.18, borderRadius: 4, marginTop: 8 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="sonar-gated-overlay">
          <Lock className="sonar-gated-lock" size={22} aria-hidden />
          <span className="sonar-gated-title">Prediction markets are a Pro section</span>
          <a className="sonar-gated-cta" href="/pricing">
            Upgrade to include
          </a>
        </div>
      </div>
    );
  }

  if (!markets || !markets.items.length) return null;
  return (
    <div className="sonar-module">
      <div className="sonar-mod-head">
        <span className="sonar-mod-title">Prediction Markets</span>
        <span className="sonar-mod-source">{markets.source}</span>
      </div>
      {markets.items.map((it) => (
        <SourceRow key={it.marker} item={it} />
      ))}
    </div>
  );
}

/** Key Entities — synthesized from the tickers surfaced across datasets. */
export function KeyEntities({ sections, subject }) {
  const tickers = [
    ...new Set(sections.flatMap((s) => s.items.map((it) => it.ticker).filter(Boolean))),
  ].slice(0, 12);
  if (!subject && tickers.length === 0) return null;
  return (
    <div className="sonar-module">
      <div className="sonar-mod-head">
        <span className="sonar-mod-title">Key Entities</span>
        <span className="sonar-mod-source">Cross-dataset</span>
      </div>
      <div className="sonar-entities">
        {subject && (
          <span className="sonar-entity">
            <span className="sonar-entity-dot" />
            {subject}
          </span>
        )}
        {tickers.map((t) => (
          <span className="sonar-entity" key={t}>
            <span className="sonar-entity-dot" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Ping Next — related queries derived from the surfaced tickers. Clicking re-pings. */
export function PingNext({ sections, onPick }) {
  const tickers = [
    ...new Set(sections.flatMap((s) => s.items.map((it) => it.ticker).filter(Boolean))),
  ].slice(0, 6);
  if (!tickers.length) return null;
  return (
    <div className="sonar-module">
      <div className="sonar-mod-head">
        <span className="sonar-mod-title">Ping Next</span>
        <span className="sonar-mod-source">Related</span>
      </div>
      <div className="sonar-next">
        {tickers.map((t) => (
          <button key={t} type="button" className="sonar-next-pill" onClick={() => onPick(t)}>
            {t} <ArrowUpRight size={12} aria-hidden style={{ verticalAlign: 'middle' }} />
          </button>
        ))}
      </div>
    </div>
  );
}
