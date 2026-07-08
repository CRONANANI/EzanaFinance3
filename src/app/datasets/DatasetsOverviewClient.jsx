'use client';

/**
 * Datasets index — "Interactive Signal Map" v2 (Claude Design).
 * Third page in the redesigned dataset family (Government Contracts 1b,
 * Congressional Trading 1a): shared CategoryBar + ticker pattern + 1440px
 * margins. Presentation layer only.
 *
 * v2 topology: pure HUB-AND-SPOKE. There are NO node-to-node edges — every
 * dataset connects only to the central EZANA engine (everything feeds the
 * engine; the engine relates everything). The 12 spokes animate a slow inward
 * "intake" flow. Selection is MULTI-SELECT (a Set of dataset ids); the right
 * panel renders a deep single-dataset analysis or a combined-signal analysis.
 *
 * The cross-dataset ticker is driven by REAL live items mixed from existing
 * integrations (congress trades, contract awards, 13F filings, prediction-market
 * odds). Sources without a live feed are omitted — never faked. Insider buys are
 * intentionally omitted: no live insider feed exists yet.
 *
 * Analysis copy is grounded in the project's analytical vocabulary (event
 * studies around disclosure dates, lead-lag cross-correlation, accumulation
 * breadth/clustering, vig-free implied probability vs. model edge). It is
 * informational only — no return promises or advice phrasing.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Zap, X } from 'lucide-react';
import CategoryBar from '@/components/datasets/CategoryBar';
import {
  DATASET_TAXONOMY,
  DIMENSION_IDS,
  TAXONOMY_STATS,
  SOURCE_TYPE_META,
} from '@/lib/datasets/taxonomy';
import './ds-overview.css';

/* ── 7 dimensions: the shared DATASET_TAXONOMY is the single source of truth ──
   The signal map is pure hub-and-spoke and its NODES ARE the 7 dimensions (one
   per arc). Each node carries a short blurb + its datasets (taxonomy items) for
   the analysis panel. Colors/labels/corners all come from the taxonomy. */
const CATS = DATASET_TAXONOMY.reduce((m, d) => {
  m[d.id] = { label: d.label, color: d.color, corner: d.corner };
  return m;
}, {});
const CAT_ORDER = DIMENSION_IDS;

const NODES = DATASET_TAXONOMY.map((d, i) => ({
  id: d.id,
  label: d.label,
  cat: d.id,
  angle: -90 + (i * 360) / DATASET_TAXONOMY.length,
  blurb: d.blurb,
  items: d.items,
  liveCount: d.items.filter((it) => it.live).length,
}));
const NODE_BY_ID = NODES.reduce((m, n) => ((m[n.id] = n), m), {});

/* the 7 sourced dimension cards below the map */
const CAT_CARDS = DATASET_TAXONOMY.map((d) => ({
  cat: d.id,
  scope: d.blurb,
  sources: d.items
    .map((it) => it.label)
    .slice(0, 4)
    .join(' · '),
  href: (d.items.find((it) => it.live) || d.items[0]).href,
  live: d.items.filter((it) => it.live).length,
  total: d.items.length,
}));

/* ── map geometry ── */
const VW = 720;
const VH = 500;
const CX = 360;
const CY = 250;
const RX = 280;
const RY = 185;

const rad = (deg) => (deg * Math.PI) / 180;
const nodePos = (angle) => ({
  x: CX + RX * Math.cos(rad(angle)),
  y: CY + RY * Math.sin(rad(angle)),
});

/* split a label into (at most) two balanced lines */
function wrapLabel(label) {
  const words = label.split(' ');
  if (words.length < 2) return [label];
  if (words.length === 2) return words;
  return [words.slice(0, 2).join(' '), words.slice(2).join(' ')];
}

function joinList(arr) {
  if (arr.length <= 1) return arr[0] || '';
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
}

/* ══════════════════════════ ticker (real live items) ══════════════════════════ */
function shortMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function parseMaybeJson(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : null;
    } catch {
      return null;
    }
  }
  return null;
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

/* Polymarket outcomePrices are already market-implied probabilities in [0,1]
   (same reading match.js's normalizeProbability uses). Parse to [{name,prob}]. */
function marketOutcomes(m) {
  const names = parseMaybeJson(m.outcomes) || [];
  const prices = parseMaybeJson(m.outcomePrices) || [];
  const out = [];
  for (let i = 0; i < Math.max(names.length, prices.length); i++) {
    const prob = Number(prices[i]);
    if (!Number.isFinite(prob)) continue;
    out.push({ name: names[i] || (i === 0 ? 'Yes' : 'No'), prob });
  }
  return out.sort((a, b) => b.prob - a.prob);
}

const PER_SOURCE_CAP = 4;

/* Each ticker item carries its parent category (for tag color) plus a
   per-subcategory tag. ODDS items also carry the Polymarket slug so a click can
   open the detail popup. Every subcategory with a live route is sampled; those
   without one are omitted and reported (dynamically).
   Wireable now: congress trades, lobbying, contracts, 13F, prices, prediction.
   No live route (omitted): FEC fundraising, federal outlays, patents, insider
   Form 4, ETF holdings, analyst ratings (auth-gated). */
async function loadTickerItems() {
  const [congress, lobbying, contracts, thirteenF, movers, markets] = await Promise.all([
    getJson('/api/fmp/congress-latest').catch(() => null),
    getJson('/api/quiver/lobbying').catch(() => null),
    getJson('/api/usaspending/contract-awards?limit=8').catch(() => null),
    getJson('/api/quiver/sec13f').catch(() => null),
    getJson('/api/fmp/movers?limit=8').catch(() => null),
    getJson('/api/polymarket/markets?limit=12&active=true').catch(() => null),
  ]);

  const omitted = [];
  // ordered so a round-robin rotates categories (no back-to-back same source)
  const buckets = [];
  const pushOrOmit = (rows, label) => {
    if (rows && rows.length) buckets.push(rows.slice(0, PER_SOURCE_CAP));
    else omitted.push(label);
  };

  // 1 · Congress trading (congress)
  const cTrades = Array.isArray(congress?.trades) ? congress.trades : [];
  pushOrOmit(
    cTrades.map((t) => ({
      cat: 'capitol',
      tag: 'CONGRESS',
      subject: `${t.name} · ${t.symbol || '—'}`,
      value: t.amount || (t.positive ? 'Buy' : 'Sell'),
      positive: !!t.positive,
    })),
    'Congress trading',
  );

  // 2 · Government contracts (gov)
  const cRows = Array.isArray(contracts?.rows) ? contracts.rows : [];
  pushOrOmit(
    cRows.map((r) => ({
      cat: 'capitol',
      tag: 'CONTRACT',
      subject: `${r.recipient} · ${r.agency}`,
      value: r.amount,
      positive: false,
    })),
    'Government contracts',
  );

  // 3 · 13F holdings (sec)
  const f13 = Array.isArray(thirteenF) ? thirteenF : parseMaybeJson(thirteenF?.data) || [];
  pushOrOmit(
    f13.map((r) => ({
      cat: 'titans',
      tag: '13F',
      subject: `${r.Name || r.Fund || 'Institution'} · ${r.Ticker || r.ticker || '—'}`,
      value: shortMoney(r.Value ?? r.value) || '—',
      positive: false,
    })),
    '13F holdings',
  );

  // 4 · Prediction markets (markets) — clickable, carries slug
  const mkts = Array.isArray(markets)
    ? markets
    : Array.isArray(markets?.markets)
      ? markets.markets
      : [];
  const oddsItems = [];
  for (const m of mkts) {
    const outs = marketOutcomes(m);
    const q = String(m.question || '').slice(0, 44);
    if (!q || !outs.length || !m.slug) continue;
    oddsItems.push({
      cat: 'hive',
      tag: 'ODDS',
      subject: `${q} · ${outs[0].name}`,
      value: `${Math.round(outs[0].prob * 100)}¢`,
      positive: false,
      slug: m.slug,
      question: m.question,
    });
  }
  pushOrOmit(oddsItems, 'Prediction markets');

  // 5 · Lobbying activity (congress)
  const lobRows = Array.isArray(lobbying) ? lobbying : parseMaybeJson(lobbying?.data) || [];
  pushOrOmit(
    lobRows
      .filter((r) => r.Client || r.client)
      .map((r) => ({
        cat: 'capitol',
        tag: 'LOBBYING',
        subject: `${r.Client || r.client}${r.Ticker ? ` · ${r.Ticker}` : ''}`,
        value: shortMoney(r.Amount ?? r.amount) || '—',
        positive: false,
      })),
    'Lobbying activity',
  );

  // 6 · Prices & fundamentals (markets)
  const gainers = Array.isArray(movers?.gainers) ? movers.gainers : [];
  const losers = Array.isArray(movers?.losers) ? movers.losers : [];
  const moverRows = [...gainers.slice(0, 3), ...losers.slice(0, 1)];
  pushOrOmit(
    moverRows
      .filter((r) => r.ticker)
      .map((r) => ({
        cat: 'titans',
        tag: 'PRICES',
        subject: `${r.ticker}${r.name ? ` · ${r.name}` : ''}`,
        value: r.change || '—',
        positive: !!r.positive,
      })),
    'Prices & fundamentals',
  );

  // round-robin interleave across subcategories so no source runs back-to-back
  const items = [];
  const maxLen = buckets.reduce((m, b) => Math.max(m, b.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const b of buckets) if (b[i]) items.push(b[i]);
  }
  return { items, omitted };
}

function CrossDatasetTicker({ onOddsClick }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;
    loadTickerItems().then(({ items, omitted }) => {
      if (!alive) return;
      setItems(items);
      // Honest rule: report (never fake) any subcategory without a live feed.
      // eslint-disable-next-line no-console
      console.info(
        `[datasets ticker] ${items.length} live items across ${new Set(items.map((i) => i.tag)).size} subcategories` +
          (omitted.length ? ` · omitted (no live feed): ${omitted.join(', ')}` : ''),
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!items.length) return null;
  const loop = [...items, ...items];
  return (
    <div className="dsx-ticker">
      <div className="dsx-ticker-track">
        {loop.map((it, i) => {
          const color = CATS[it.cat].color;
          const inner = (
            <>
              <span className="dsx-mono dsx-ttag" style={{ color }}>
                {it.tag}
              </span>
              <span className="dsx-tsub">{it.subject}</span>
              <span className={`dsx-mono dsx-tval${it.positive ? ' pos' : ''}`}>{it.value}</span>
            </>
          );
          return it.slug ? (
            <button
              type="button"
              className="dsx-titem dsx-titem-odds"
              key={i}
              onClick={() => onOddsClick({ slug: it.slug, question: it.question })}
              aria-label={`Open market odds: ${it.question}`}
            >
              {inner}
            </button>
          ) : (
            <div className="dsx-titem" key={i} aria-hidden="true">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════ signal map (hub-and-spoke) ══════════════════════════ */
function SignalMap({ selectedNodes, categoryFilter, onToggleNode, onClear }) {
  const positions = useMemo(() => NODES.map((n) => ({ ...n, ...nodePos(n.angle) })), []);
  const hasSelection = selectedNodes.size > 0;

  // spoke emphasis: hot (selected / filtered category), dim (something else
  // active), or default (soft emerald intake flow on all).
  const spokeClass = (n) => {
    if (hasSelection) return selectedNodes.has(n.id) ? 'dsx-spoke is-hot' : 'dsx-spoke is-dim';
    if (categoryFilter) return n.cat === categoryFilter ? 'dsx-spoke is-hot' : 'dsx-spoke is-dim';
    return 'dsx-spoke is-flow';
  };

  const nodeOpacity = (n) => {
    if (hasSelection) return selectedNodes.has(n.id) ? 1 : 0.35;
    if (categoryFilter) return n.cat === categoryFilter ? 1 : 0.35;
    return 1;
  };

  return (
    <svg
      className="dsx-map-svg"
      viewBox={`0 0 ${VW} ${VH}`}
      role="img"
      aria-label="Interactive hub-and-spoke map of Ezana's seven dataset dimensions feeding the signal engine"
    >
      {/* the ONLY lines: 7 spokes, each animating an inward intake flow (node → hub) */}
      {positions.map((n, i) => (
        <line
          key={`sp-${n.id}`}
          className={spokeClass(n)}
          x1={n.x}
          y1={n.y}
          x2={CX}
          y2={CY}
          style={{ animationDelay: `${-(i * 0.24).toFixed(2)}s` }}
        />
      ))}

      {/* center hub — the living engine */}
      <circle className="dsx-hub-halo" cx={CX} cy={CY} r={40} />
      <circle className="dsx-hub-ring2" cx={CX} cy={CY} r={33} />
      <circle className="dsx-hub-ring" cx={CX} cy={CY} r={27} />
      <circle
        className="dsx-hub-circle"
        cx={CX}
        cy={CY}
        r={24}
        onClick={onClear}
        role="button"
        aria-label="Clear selection"
      />
      <text className="dsx-hub-t1" x={CX} y={CY - 1}>
        EZANA
      </text>
      <text className="dsx-hub-t2" x={CX} y={CY + 12}>
        SIGNAL ENGINE
      </text>

      {/* nodes */}
      {positions.map((n) => {
        const cosA = Math.cos(rad(n.angle));
        const sinA = Math.sin(rad(n.angle));
        const anchor = cosA < -0.34 ? 'end' : cosA > 0.34 ? 'start' : 'middle';
        const isSel = selectedNodes.has(n.id);
        const lines = anchor !== 'middle' || n.label.length > 15 ? wrapLabel(n.label) : [n.label];
        const color = CATS[n.cat].color;
        const op = nodeOpacity(n);

        // dot→label gap; grows a step when selected so the ring never touches text
        const sideGap = isSel ? 18 : 15;
        const topGap = isSel ? 22 : 18;
        const botGap = isSel ? 30 : 26;
        let lx;
        let firstY;
        if (anchor === 'middle') {
          lx = n.x;
          if (sinA < 0) {
            // top: stack lines ABOVE the dot
            const lastY = n.y - topGap;
            firstY = lastY - (lines.length - 1) * 13;
          } else {
            // bottom: stack lines BELOW the dot
            firstY = n.y + botGap;
          }
        } else {
          lx = anchor === 'start' ? n.x + sideGap : n.x - sideGap;
          firstY = n.y + 4 - (lines.length - 1) * 6.5;
        }

        return (
          <g key={n.id}>
            {isSel && (
              <circle
                className="dsx-node-ring"
                cx={n.x}
                cy={n.y}
                r={11}
                style={{ stroke: color }}
              />
            )}
            <circle
              className="dsx-node-dot"
              cx={n.x}
              cy={n.y}
              r={6.5}
              style={{ fill: color, opacity: op }}
            />
            <text
              className={`dsx-node-label${isSel ? ' is-sel' : ''}`}
              x={lx}
              y={firstY}
              textAnchor={anchor}
              style={{ opacity: op }}
            >
              {lines.length > 1
                ? lines.map((ln, k) => (
                    <tspan key={k} x={lx} dy={k === 0 ? 0 : 13}>
                      {ln}
                    </tspan>
                  ))
                : lines[0]}
            </text>
            {/* transparent oversized tap/click target (as large as node spacing
                allows — ~45px on desktop, the max feasible on phones without
                neighboring hit areas overlapping) */}
            <circle
              className="dsx-node-hit"
              cx={n.x}
              cy={n.y}
              r={27}
              onClick={() => onToggleNode(n.id)}
              role="button"
              tabIndex={0}
              aria-pressed={isSel}
              aria-label={`${n.label} — ${isSel ? 'deselect' : 'add to analysis'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleNode(n.id);
                }
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

/* ══════════════════════════ analysis panel ══════════════════════════ */
function CategoryChip({ cat, tinted }) {
  const c = CATS[cat];
  return (
    <span
      className="dsx-chip"
      style={
        tinted ? { color: c.color, background: 'transparent', borderColor: c.color } : undefined
      }
    >
      <span className="dsx-legend-dot" style={{ background: c.color }} /> {c.label}
    </span>
  );
}

/** the datasets that make up one dimension (live = link, roadmap = "soon") */
function DimensionDatasets({ node }) {
  return (
    <div className="dsx-rows">
      {node.items.map((it) => {
        const inner = (
          <span className="dsx-ds-row">
            <span className="dsx-row-dot" style={{ background: CATS[node.cat].color }} />
            <span>
              <span className="dsx-row-name">{it.label}</span>
              <span className="dsx-row-exp">{it.description}</span>
              {it.source && (
                <span className="dsx-ds-src">
                  {it.sourceType && SOURCE_TYPE_META[it.sourceType] && (
                    <span className={`dsx-ds-srctag dsx-src-${it.sourceType}`}>
                      {SOURCE_TYPE_META[it.sourceType].label}
                    </span>
                  )}
                  {it.source}
                </span>
              )}
            </span>
            {it.live ? (
              <ArrowRight size={13} className="dsx-ds-go" aria-hidden />
            ) : (
              <span className="dsx-ds-soon">Soon</span>
            )}
          </span>
        );
        return it.live ? (
          <a key={it.label} href={it.href} className="dsx-ds-link">
            {inner}
          </a>
        ) : (
          <div key={it.label} className="dsx-ds-link is-soon">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

function PanelDefault() {
  return (
    <div className="dsx-panel">
      <span className="dsx-chip">
        <Zap size={12} /> Signal engine
      </span>
      <h2 className="dsx-panel-title">Seven dimensions, one engine</h2>
      <p className="dsx-panel-blurb">
        Ezana organizes every dataset into seven dimensions — the same seven the orbital map weighs
        to you. Each feeds the signal engine, and the engine relates them all. Click a dimension to
        see its datasets; add more to compare.
      </p>
      <div className="dsx-stats">
        <span>
          <b>{TAXONOMY_STATS.dimensions}</b> dimensions
        </span>
        <span>
          <b>{TAXONOMY_STATS.live}</b> live datasets
        </span>
        <span>
          <b>1</b> signal engine
        </span>
      </div>
    </div>
  );
}

function PanelSingle({ node }) {
  return (
    <div className="dsx-panel">
      <CategoryChip cat={node.cat} tinted />
      <h2 className="dsx-panel-title">{node.label}</h2>
      <p className="dsx-panel-blurb">{node.blurb}</p>
      <div className="dsx-section-h">
        Datasets · {node.liveCount} live / {node.items.length} total
      </div>
      <DimensionDatasets node={node} />
    </div>
  );
}

function PanelCombined({ nodes }) {
  const liveTotal = nodes.reduce((s, n) => s + n.liveCount, 0);
  return (
    <div className="dsx-panel">
      <div className="dsx-selchips">
        {nodes.map((n) => (
          <span className="dsx-selchip" key={n.id} style={{ borderColor: CATS[n.cat].color }}>
            <span className="dsx-legend-dot" style={{ background: CATS[n.cat].color }} />
            {n.label}
          </span>
        ))}
      </div>
      <div className="dsx-section-h">Combined view</div>
      <p className="dsx-panel-blurb">
        You&apos;re comparing {joinList(nodes.map((n) => n.label))}. Ezana relates them through the
        signal engine — {liveTotal} live datasets across these dimensions.
      </p>
      {nodes.map((n) => (
        <div key={n.id}>
          <div className="dsx-section-h">
            <span className="dsx-legend-dot" style={{ background: CATS[n.cat].color }} /> {n.label}
          </div>
          <DimensionDatasets node={n} />
        </div>
      ))}
    </div>
  );
}

function AnalysisPanel({ selectedNodes }) {
  const list = [...selectedNodes].map((id) => NODE_BY_ID[id]).filter(Boolean);
  if (list.length === 0) return <PanelDefault />;
  if (list.length === 1) return <PanelSingle node={list[0]} />;
  return <PanelCombined nodes={list} />;
}

/* ══════════════════════════ odds popup (Polymarket detail) ══════════════════════════ */
function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

function OddsPopup({ slug, question, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(false);
    getJson(`/api/polymarket/market?slug=${encodeURIComponent(slug)}`)
      .then((d) => {
        if (!alive) return;
        if (d && !d.error && (d.question || d.outcomes)) setData(d);
        else setError(true);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  const outcomes = data ? marketOutcomes(data) : [];
  // Build the link from the VERIFIED event slug (events[0].slug), never the
  // market-level slug — the latter 404s in an /event/ URL. Null → no link.
  const eventUrl = data?.eventSlug ? `https://polymarket.com/event/${data.eventSlug}` : null;

  return (
    <div className="dsx-modal-backdrop" onClick={onClose}>
      <div
        className="dsx-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Market odds"
      >
        <button type="button" className="dsx-modal-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <span className="dsx-modal-tag">Odds · prediction market</span>
        <h2 className="dsx-modal-q">{data?.question || question}</h2>

        {!data && !error && (
          <div aria-live="polite" aria-busy="true">
            <div className="dsx-skel" style={{ width: '55%' }} />
            <div className="dsx-skel" style={{ width: '90%', height: 24 }} />
            <div className="dsx-skel" style={{ width: '90%', height: 24 }} />
          </div>
        )}

        {error && (
          <div className="dsx-modal-state">
            Couldn’t load this market right now.
            <br />
            <a
              className="dsx-modal-link"
              href="https://polymarket.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Polymarket <ArrowRight size={13} />
            </a>
          </div>
        )}

        {data && (
          <>
            <div className="dsx-modal-meta">
              {data.category && <span>{data.category}</span>}
              {data.endDate && (
                <span>
                  Resolves <b>{fmtDate(data.endDate)}</b>
                </span>
              )}
              {data.volume > 0 && (
                <span>
                  Volume <b>{shortMoney(data.volume)}</b>
                </span>
              )}
            </div>

            <div className="dsx-modal-h">Current market-implied probabilities</div>
            {outcomes.length ? (
              outcomes.map((o, i) => {
                const pct = Math.round(o.prob * 100);
                return (
                  <div className="dsx-outcome" key={i}>
                    <div className="dsx-outcome-top">
                      <span className="dsx-outcome-name">{o.name}</span>
                      <span className="dsx-outcome-val">
                        {pct}¢ · {pct}%
                      </span>
                    </div>
                    <div className="dsx-outcome-bar">
                      <i style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="dsx-modal-state">No current outcome prices published.</div>
            )}

            {eventUrl && (
              <a
                className="dsx-modal-link"
                href={eventUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Polymarket <ArrowRight size={13} />
              </a>
            )}
            <p className="dsx-modal-note">
              Current market-implied probabilities from Polymarket, shown for information only — not
              investment advice.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════ page ══════════════════════════ */
export default function DatasetsOverviewClient() {
  const [selectedNodes, setSelectedNodes] = useState(() => new Set());
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [oddsMarket, setOddsMarket] = useState(null); // { slug, question } | null

  const toggleNode = (id) => {
    setCategoryFilter(null);
    setSelectedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleCategory = (key) => {
    setSelectedNodes(new Set());
    setCategoryFilter((prev) => (prev === key ? null : key));
  };
  const clearAll = () => {
    setSelectedNodes(new Set());
    setCategoryFilter(null);
  };

  const hasSelection = selectedNodes.size > 0;

  return (
    <div className="dsx-page">
      <CategoryBar />

      <CrossDatasetTicker onOddsClick={setOddsMarket} />

      <header className="dsx-header">
        <p className="dsx-eyebrow">DATASETS</p>
        <h1 className="dsx-title">Every signal, sourced and attributed</h1>
        <p className="dsx-sub">
          Ezana organizes its data across seven dimensions — and shows you exactly how each one
          feeds the signal engine that relates them. No black boxes.
        </p>
      </header>

      {/* interactive category legend */}
      <div className="dsx-legend" role="group" aria-label="Filter the map by category">
        {Object.entries(CATS).map(([key, c]) => (
          <button
            key={key}
            type="button"
            className={`dsx-legend-chip${categoryFilter === key ? ' is-active' : ''}`}
            aria-pressed={categoryFilter === key}
            onClick={() => toggleCategory(key)}
          >
            <span className="dsx-legend-dot" style={{ background: c.color }} />
            {c.label}
          </button>
        ))}
      </div>

      {/* signal map card (two zones) */}
      <section className="dsx-card">
        <div className="dsx-mapwrap">
          <div className="dsx-map">
            {hasSelection && (
              <button type="button" className="dsx-clearbtn" onClick={clearAll}>
                <X size={13} /> Clear ({selectedNodes.size})
              </button>
            )}
            <SignalMap
              selectedNodes={selectedNodes}
              categoryFilter={categoryFilter}
              onToggleNode={toggleNode}
              onClear={clearAll}
            />
          </div>
          <AnalysisPanel selectedNodes={selectedNodes} />
        </div>
      </section>

      {/* four sourced category cards */}
      <div className="dsx-cards">
        {CAT_CARDS.map((card) => {
          const c = CATS[card.cat];
          return (
            <a key={card.cat} href={card.href} className="dsx-catcard">
              <span className="dsx-catcard-name">
                <span className="dsx-legend-dot" style={{ background: c.color }} />
                {c.label}
              </span>
              <p className="dsx-catcard-scope">{card.scope}</p>
              <p className="dsx-source">
                <b>HOW WE SOURCE IT ·</b> {card.sources}
              </p>
              <span className="dsx-catcard-explore">
                Explore <ArrowRight size={13} />
              </span>
            </a>
          );
        })}
      </div>

      {oddsMarket && (
        <OddsPopup
          slug={oddsMarket.slug}
          question={oddsMarket.question}
          onClose={() => setOddsMarket(null)}
        />
      )}
    </div>
  );
}
