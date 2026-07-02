'use client';

/**
 * Datasets index — "Interactive Signal Map" (Claude Design direction 1a).
 * Third page in the redesigned dataset family (Government Contracts 1b,
 * Congressional Trading 1a): shared CategoryBar + ticker pattern + 1440px
 * margins. Presentation layer only.
 *
 * The cross-dataset ticker is driven by REAL live items mixed from existing
 * integrations (congress trades, contract awards, 13F filings, prediction-market
 * odds). Sources without a live feed are omitted — never faked. Insider buys are
 * intentionally omitted: no live insider feed exists yet (the SEC page renders a
 * static sample), so faking it here would violate the no-mock rule.
 *
 * The 12 dataset nodes, 11 connections, and their explainer copy are
 * product-approved content from the handoff (README). Node/hub/legend
 * interactions drive `selectedNode` and `categoryFilter` (mutually exclusive).
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Zap } from 'lucide-react';
import CategoryBar from '@/components/datasets/CategoryBar';
import './ds-overview.css';

/* ── category palette (tokens pinned on .dsx-page) ── */
const CATS = {
  congress: {
    label: 'Congressional & Political',
    color: 'var(--emerald)',
    corner: 'CONGRESSIONAL & POLITICAL',
  },
  gov: { label: 'Government Activity', color: 'var(--amber)', corner: 'GOVERNMENT ACTIVITY' },
  sec: { label: 'SEC & Institutional', color: 'var(--info)', corner: 'SEC & INSTITUTIONAL' },
  markets: { label: 'Markets & Signals', color: 'var(--purple)', corner: 'MARKETS & SIGNALS' },
};

/* ── the 12 dataset nodes (label · category · sources · scope) ──
   angle is in degrees (SVG y-down); nodes sit on an ellipse grouped into four
   quadrant arcs by category (top-left congress, top-right gov, bottom-left sec,
   bottom-right markets). */
const NODES = [
  // top-left — Congressional & Political
  {
    id: 'congress-trading',
    label: 'Congress trading',
    cat: 'congress',
    angle: 255,
    sources: 'Quiver Quantitative · STOCK Act disclosures',
    blurb:
      'Every stock transaction disclosed by members of Congress under the STOCK Act, enriched with party and chamber.',
  },
  {
    id: 'lobbying',
    label: 'Lobbying activity',
    cat: 'congress',
    angle: 225,
    sources: 'Senate LDA LD-1/LD-2',
    blurb:
      'Corporate and trade-group lobbying spend disclosed quarterly under the Lobbying Disclosure Act.',
  },
  {
    id: 'fundraising',
    label: 'Election fundraising',
    cat: 'congress',
    angle: 195,
    sources: 'FEC',
    blurb:
      'Federal campaign contributions and PAC money reported to the Federal Election Commission.',
  },
  // top-right — Government Activity
  {
    id: 'gov-contracts',
    label: 'Government contracts',
    cat: 'gov',
    angle: 285,
    sources: 'USAspending.gov · Treasury',
    blurb: 'Federal contract awards broken out by recipient, awarding agency, and amount.',
  },
  {
    id: 'federal-spending',
    label: 'Federal spending',
    cat: 'gov',
    angle: 315,
    sources: 'USAspending.gov · Treasury',
    blurb: 'Federal outlays across agencies and programs over time.',
  },
  {
    id: 'patents',
    label: 'Patent activity',
    cat: 'gov',
    angle: 345,
    sources: 'USPTO',
    blurb: 'Granted patents and application activity mapped to assignees.',
  },
  // bottom-right — Markets & Signals
  {
    id: 'ratings',
    label: 'Analyst ratings',
    cat: 'markets',
    angle: 15,
    sources: 'Finnhub · licensed providers',
    blurb: 'Analyst ratings, upgrades, downgrades, and price targets across equities.',
  },
  {
    id: 'prices',
    label: 'Prices & fundamentals',
    cat: 'markets',
    angle: 45,
    sources: 'Finnhub · FMP · Alpha Vantage',
    blurb: 'Real-time prices, fundamentals, and technical signals across equities.',
  },
  {
    id: 'prediction',
    label: 'Prediction markets',
    cat: 'markets',
    angle: 75,
    sources: 'Polymarket Gamma/Data/CLOB',
    blurb: 'Live event and election odds from on-chain prediction markets.',
  },
  // bottom-left — SEC & Institutional
  {
    id: 'etf',
    label: 'ETF holdings',
    cat: 'sec',
    angle: 105,
    sources: 'Financial Modeling Prep',
    blurb: 'ETF constituent holdings and the flow shifts that move them.',
  },
  {
    id: 'holdings13f',
    label: '13F holdings',
    cat: 'sec',
    angle: 135,
    sources: 'SEC EDGAR',
    blurb: 'Quarterly institutional equity holdings disclosed on Form 13F.',
  },
  {
    id: 'insider',
    label: 'Insider trades',
    cat: 'sec',
    angle: 165,
    sources: 'SEC EDGAR',
    blurb: "Officer and director transactions in their own company's stock (Form 4).",
  },
];

/* ── the 11 connection edges (verbatim explainer copy) ── */
const EDGES = [
  ['congress-trading', 'prices', "Members' disclosed trades often front-run sector moves."],
  [
    'congress-trading',
    'insider',
    'Congress + insider buying overlap is the strongest conviction signal.',
  ],
  [
    'lobbying',
    'gov-contracts',
    'Lobbying spend typically precedes contract awards by 2–3 quarters.',
  ],
  ['fundraising', 'prediction', 'Fundraising momentum moves election odds.'],
  [
    'prediction',
    'congress-trading',
    'Shifting odds re-shape committee power — and member trading.',
  ],
  ['gov-contracts', 'prices', 'Contract awards re-rate contractor stocks.'],
  ['federal-spending', 'prices', 'Federal outlays rotate sector performance.'],
  ['patents', 'ratings', 'Patent momentum feeds analyst upgrades.'],
  ['insider', 'prices', 'Insider buying clusters lead price inflections.'],
  ['holdings13f', 'ratings', '13F rotations pull analyst coverage with them.'],
  ['etf', 'prices', 'ETF flows amplify price trends.'],
];

/* signature signal chains — each selects its starting node */
const CHAINS = [
  { label: 'Lobbying → Contracts → Prices', start: 'lobbying' },
  { label: 'Congress trades → Insider overlap', start: 'congress-trading' },
  { label: 'Fundraising → Odds → Rotation', start: 'fundraising' },
];

/* four sourced category cards (route to each category's primary dataset page) */
const CAT_CARDS = [
  {
    cat: 'congress',
    scope: 'Congress trading, lobbying activity, and election fundraising.',
    sources: 'Quiver Quantitative · STOCK Act · Senate LDA · FEC',
    href: '/datasets/political',
  },
  {
    cat: 'gov',
    scope: 'Federal contract awards, spending, and patent activity.',
    sources: 'USAspending.gov · Treasury · USPTO',
    href: '/datasets/government/contracts',
  },
  {
    cat: 'sec',
    scope: 'Insider trades, 13F holdings, and ETF flows.',
    sources: 'SEC EDGAR · Financial Modeling Prep',
    href: '/datasets/sec-filings',
  },
  {
    cat: 'markets',
    scope: 'Prices, fundamentals, analyst ratings, and prediction-market odds.',
    sources: 'Finnhub · FMP · Alpha Vantage · Polymarket',
    href: '/datasets/markets',
  },
];

/* ── map geometry ── */
const VW = 720;
const VH = 500;
const CX = 360;
const CY = 250;
const RX = 280;
const RY = 185;
const BOW = 0.36;

const rad = (deg) => (deg * Math.PI) / 180;

function nodePos(angle) {
  return { x: CX + RX * Math.cos(rad(angle)), y: CY + RY * Math.sin(rad(angle)) };
}

/* split a label into (at most) two balanced lines for extreme/long placements */
function wrapLabel(label) {
  const words = label.split(' ');
  if (words.length < 2) return [label];
  // put the shorter run on top so the two lines look balanced
  if (words.length === 2) return words;
  return [words.slice(0, 2).join(' '), words.slice(2).join(' ')];
}

const NODE_BY_ID = NODES.reduce((m, n) => ((m[n.id] = n), m), {});

/* partner-node ids for a given node (nodes sharing an edge) */
function partnersOf(id) {
  const set = new Set();
  for (const [a, b] of EDGES) {
    if (a === id) set.add(b);
    if (b === id) set.add(a);
  }
  return set;
}

/* edges incident to a node → [{ partner, explainer }] */
function connectionsOf(id) {
  const out = [];
  for (const [a, b, exp] of EDGES) {
    if (a === id) out.push({ partner: b, explainer: exp });
    else if (b === id) out.push({ partner: a, explainer: exp });
  }
  return out;
}

/* ══════════════════════════ ticker (real live items) ══════════════════════════ */
const TAGS = {
  congress: { tag: 'CONGRESS', color: 'var(--emerald)' },
  gov: { tag: 'CONTRACTS', color: 'var(--amber)' },
  sec: { tag: '13F', color: 'var(--info)' },
  markets: { tag: 'ODDS', color: 'var(--purple)' },
};

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

/** Fetch the four live feeds, omit any that error/return nothing, round-robin
 *  interleave so tags mix, cap ~20. Returns { items, omitted[] }. */
async function loadTickerItems() {
  const [congress, contracts, thirteenF, odds] = await Promise.all([
    getJson('/api/fmp/congress-latest').catch(() => null),
    getJson('/api/usaspending/contract-awards?limit=8').catch(() => null),
    getJson('/api/quiver/sec13f').catch(() => null),
    getJson('/api/polymarket/markets?limit=10&active=true').catch(() => null),
  ]);

  const omitted = [];
  const buckets = [];

  const cTrades = Array.isArray(congress?.trades) ? congress.trades : [];
  if (cTrades.length) {
    buckets.push(
      cTrades.slice(0, 6).map((t) => ({
        cat: 'congress',
        subject: `${t.name} · ${t.symbol || '—'}`,
        value: t.amount || (t.positive ? 'Buy' : 'Sell'),
        positive: !!t.positive,
        href: '/datasets/political',
      })),
    );
  } else omitted.push('congress trades');

  const cRows = Array.isArray(contracts?.rows) ? contracts.rows : [];
  if (cRows.length) {
    buckets.push(
      cRows.slice(0, 6).map((r) => ({
        cat: 'gov',
        subject: `${r.recipient} · ${r.agency}`,
        value: r.amount,
        positive: false,
        href: '/datasets/government/contracts',
      })),
    );
  } else omitted.push('contract awards');

  const f13 = Array.isArray(thirteenF)
    ? thirteenF
    : Array.isArray(thirteenF?.data)
      ? thirteenF.data
      : [];
  if (f13.length) {
    buckets.push(
      f13.slice(0, 5).map((r) => ({
        cat: 'sec',
        subject: `${r.Name || r.Fund || r.owner || 'Institution'} · ${r.Ticker || r.ticker || '—'}`,
        value: shortMoney(r.Value ?? r.value) || '—',
        positive: false,
        href: '/datasets/sec-filings',
      })),
    );
  } else omitted.push('13F filings');

  const mkts = Array.isArray(odds) ? odds : Array.isArray(odds?.markets) ? odds.markets : [];
  if (mkts.length) {
    const items = [];
    for (const m of mkts.slice(0, 8)) {
      const outcomes = parseMaybeJson(m.outcomes);
      const prices = parseMaybeJson(m.outcomePrices);
      const price = prices && prices.length ? Number(prices[0]) : NaN;
      const outcome = outcomes && outcomes.length ? outcomes[0] : 'Yes';
      const q = String(m.question || '').slice(0, 46);
      if (!q || !Number.isFinite(price)) continue;
      items.push({
        cat: 'markets',
        subject: `${q} · ${outcome}`,
        value: `${Math.round(price * 100)}¢`,
        positive: false,
        href: '/datasets/prediction-markets',
      });
    }
    if (items.length) buckets.push(items);
    else omitted.push('prediction odds');
  } else omitted.push('prediction odds');

  // round-robin interleave across sources so tags mix, cap ~20
  const items = [];
  let idx = 0;
  while (items.length < 20) {
    let added = false;
    for (const b of buckets) {
      if (b[idx]) {
        items.push(b[idx]);
        added = true;
        if (items.length >= 20) break;
      }
    }
    if (!added) break;
    idx++;
  }
  return { items, omitted };
}

function CrossDatasetTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;
    loadTickerItems().then(({ items, omitted }) => {
      if (!alive) return;
      setItems(items);
      if (omitted.length) {
        // Honest rule: report (never fake) any source without a live feed.
        // eslint-disable-next-line no-console
        console.info(`[datasets ticker] omitted (no live feed): ${omitted.join(', ')}`);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!items.length) return null;
  const loop = [...items, ...items];
  return (
    <div className="dsx-ticker" aria-hidden="true">
      <div className="dsx-ticker-track">
        {loop.map((it, i) => {
          const t = TAGS[it.cat];
          return (
            <div className="dsx-titem" key={i}>
              <span className="dsx-mono dsx-ttag" style={{ color: t.color }}>
                {t.tag}
              </span>
              <span className="dsx-tsub">{it.subject}</span>
              <span className={`dsx-mono dsx-tval${it.positive ? ' pos' : ''}`}>{it.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════ signal map ══════════════════════════ */
function SignalMap({ selectedNode, categoryFilter, onSelectNode, onClear }) {
  const positions = useMemo(() => NODES.map((n) => ({ ...n, ...nodePos(n.angle) })), []);
  const posById = useMemo(() => positions.reduce((m, n) => ((m[n.id] = n), m), {}), [positions]);
  const partners = selectedNode ? partnersOf(selectedNode) : null;

  // corner category labels (mono uppercase, category-colored)
  const corners = [
    { cat: 'congress', x: 20, y: 24, anchor: 'start' },
    { cat: 'gov', x: VW - 20, y: 24, anchor: 'end' },
    { cat: 'sec', x: 20, y: VH - 14, anchor: 'start' },
    { cat: 'markets', x: VW - 20, y: VH - 14, anchor: 'end' },
  ];

  const nodeVisible = (n) => {
    if (selectedNode) return n.id === selectedNode || partners.has(n.id) ? 1 : 0.28;
    if (categoryFilter) return n.cat === categoryFilter ? 1 : 0.28;
    return 1;
  };

  const edgeStyle = ([a, b]) => {
    if (selectedNode) {
      const on = a === selectedNode || b === selectedNode;
      const color = CATS[NODE_BY_ID[selectedNode].cat].color;
      return on
        ? { stroke: color, strokeOpacity: 0.75, strokeWidth: 2, flow: true }
        : { stroke: '#94a3b8', strokeOpacity: 0.08, strokeWidth: 1.4, flow: false };
    }
    if (categoryFilter) {
      const on = NODE_BY_ID[a].cat === categoryFilter || NODE_BY_ID[b].cat === categoryFilter;
      const color = CATS[categoryFilter].color;
      return on
        ? { stroke: color, strokeOpacity: 0.6, strokeWidth: 1.8, flow: false }
        : { stroke: '#94a3b8', strokeOpacity: 0.08, strokeWidth: 1.4, flow: false };
    }
    return { stroke: '#94a3b8', strokeOpacity: 0.28, strokeWidth: 1.4, flow: false };
  };

  return (
    <svg
      className="dsx-map-svg"
      viewBox={`0 0 ${VW} ${VH}`}
      role="img"
      aria-label="Interactive map of how Ezana's 12 datasets connect across four categories"
    >
      {/* corner category names */}
      {corners.map((c) => (
        <text
          key={c.cat}
          className="dsx-corner"
          x={c.x}
          y={c.y}
          textAnchor={c.anchor}
          style={{ fill: CATS[c.cat].color }}
        >
          {CATS[c.cat].corner}
        </text>
      ))}

      {/* faint spokes node → center */}
      {positions.map((n) => (
        <line key={`sp-${n.id}`} className="dsx-spoke" x1={n.x} y1={n.y} x2={CX} y2={CY} />
      ))}

      {/* connection edges (bowed quadratics) */}
      {EDGES.map(([a, b], i) => {
        const pa = posById[a];
        const pb = posById[b];
        const mx = (pa.x + pb.x) / 2;
        const my = (pa.y + pb.y) / 2;
        const cxp = mx + (CX - mx) * BOW;
        const cyp = my + (CY - my) * BOW;
        const st = edgeStyle([a, b]);
        return (
          <path
            key={`edge-${i}`}
            className={`dsx-edge${st.flow ? ' is-flow' : ''}`}
            d={`M ${pa.x} ${pa.y} Q ${cxp} ${cyp} ${pb.x} ${pb.y}`}
            style={{
              stroke: st.stroke,
              strokeOpacity: st.strokeOpacity,
              strokeWidth: st.strokeWidth,
            }}
          />
        );
      })}

      {/* center hub */}
      <circle className="dsx-hub-halo" cx={CX} cy={CY} r={38} />
      <circle className="dsx-hub-ring" cx={CX} cy={CY} r={30} />
      <circle
        className="dsx-hub-circle"
        cx={CX}
        cy={CY}
        r={26}
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
        const lines = anchor !== 'middle' || n.label.length > 15 ? wrapLabel(n.label) : [n.label];
        const lx = anchor === 'start' ? n.x + 12 : anchor === 'end' ? n.x - 12 : n.x;
        let ly;
        if (anchor === 'middle') ly = sinA < 0 ? n.y - 14 : n.y + 20;
        else ly = n.y + 4;
        if (lines.length > 1) ly -= 6;
        const color = CATS[n.cat].color;
        const isSel = selectedNode === n.id;
        const op = nodeVisible(n);
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
              className="dsx-node-label"
              x={lx}
              y={ly}
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
            {/* transparent oversized tap/click target (≥44px hit area) */}
            <circle
              className="dsx-node-hit"
              cx={n.x}
              cy={n.y}
              r={24}
              onClick={() => onSelectNode(n.id)}
              role="button"
              tabIndex={0}
              aria-label={`${n.label} — show connections`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectNode(n.id);
                }
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

/* ══════════════════════════ explorer panel ══════════════════════════ */
function ExplorerPanel({ selectedNode, onSelectNode }) {
  if (!selectedNode) {
    return (
      <div className="dsx-panel">
        <span className="dsx-chip">
          <Zap size={12} /> Signal engine
        </span>
        <h2 className="dsx-panel-title">How our datasets move each other</h2>
        <p className="dsx-panel-blurb">
          Ezana&apos;s four categories aren&apos;t silos. Click any node to see what it feeds — and
          walk the graph from one dataset to the next.
        </p>
        <div className="dsx-stats">
          <span>
            <b>12</b> datasets
          </span>
          <span>
            <b>4</b> categories
          </span>
          <span>
            <b>11</b> live connections
          </span>
        </div>
        <div className="dsx-section-h">Signature signal chains</div>
        <div className="dsx-rows">
          {CHAINS.map((c) => (
            <button
              key={c.label}
              type="button"
              className="dsx-chain"
              onClick={() => onSelectNode(c.start)}
            >
              <ArrowRight size={14} /> {c.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const node = NODE_BY_ID[selectedNode];
  const cat = CATS[node.cat];
  const conns = connectionsOf(selectedNode);
  return (
    <div className="dsx-panel">
      <span
        className="dsx-chip"
        style={{ color: cat.color, background: 'transparent', borderColor: cat.color }}
      >
        <span className="dsx-legend-dot" style={{ background: cat.color }} /> {cat.label}
      </span>
      <h2 className="dsx-panel-title">{node.label}</h2>
      <p className="dsx-panel-blurb">{node.blurb}</p>
      <p className="dsx-source">
        <b>HOW WE SOURCE IT ·</b> {node.sources}
      </p>
      <div className="dsx-section-h">How it moves other datasets</div>
      <div className="dsx-rows">
        {conns.map(({ partner, explainer }) => {
          const p = NODE_BY_ID[partner];
          return (
            <button
              key={partner}
              type="button"
              className="dsx-row"
              onClick={() => onSelectNode(partner)}
            >
              <span className="dsx-row-dot" style={{ background: CATS[p.cat].color }} />
              <span>
                <span className="dsx-row-name">{p.label}</span>
                <span className="dsx-row-exp">{explainer}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════ page ══════════════════════════ */
export default function DatasetsOverviewClient() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);

  const selectNode = (id) => {
    setSelectedNode(id);
    setCategoryFilter(null);
  };
  const toggleCategory = (key) => {
    setCategoryFilter((prev) => (prev === key ? null : key));
    setSelectedNode(null);
  };
  const clearAll = () => {
    setSelectedNode(null);
    setCategoryFilter(null);
  };

  return (
    <div className="dsx-page">
      <CategoryBar />

      <CrossDatasetTicker />

      <header className="dsx-header">
        <p className="dsx-eyebrow">DATASETS</p>
        <h1 className="dsx-title">Every signal, sourced and attributed</h1>
        <p className="dsx-sub">
          Ezana organizes its data across four dimensions — and shows you exactly how each one moves
          the others. No black boxes.
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
            <SignalMap
              selectedNode={selectedNode}
              categoryFilter={categoryFilter}
              onSelectNode={selectNode}
              onClear={clearAll}
            />
          </div>
          <ExplorerPanel selectedNode={selectedNode} onSelectNode={selectNode} />
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
    </div>
  );
}
