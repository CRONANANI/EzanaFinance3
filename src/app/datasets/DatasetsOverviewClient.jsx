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
const CAT_ORDER = ['congress', 'gov', 'sec', 'markets'];

/* ── the 12 dataset nodes ──
   angle is in degrees (SVG y-down); nodes sit on an ellipse grouped into four
   quadrant arcs by category. Each node carries its sources, a scope blurb, the
   analytical treatment (`analyze`), a per-other-category cross mechanism
   (`moves`), and a short joint-pattern phrase (`pattern`) used to compose
   multi-select copy. */
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
    analyze:
      'We run event studies around each disclosure date, measuring abnormal returns in the traded name and its sector over 1-, 5-, and 20-day windows, and track filing lag alongside party and committee concentration.',
    moves: {
      gov: 'Disclosed positions are cross-referenced with contract and spending flows to flag members trading in industries their committees oversee.',
      sec: 'We test for overlap between member purchases and Form 4 insider buying in the same tickers — coincident buying tends to mark higher-conviction clusters.',
      markets:
        'Disclosed trades are compared against subsequent price and rating moves to see where member activity historically precedes sector rotation.',
    },
    pattern: 'member disclosures front-running sector moves',
  },
  {
    id: 'lobbying',
    label: 'Lobbying activity',
    cat: 'congress',
    angle: 225,
    sources: 'Senate LDA LD-1/LD-2',
    blurb:
      'Corporate and trade-group lobbying spend disclosed quarterly under the Lobbying Disclosure Act.',
    analyze:
      'We track lobbying spend by issue and client quarter over quarter, measuring acceleration and the lead-lag cross-correlation between spend and the downstream policy or award events it tends to precede.',
    moves: {
      gov: 'Rising lobbying spend by a firm is tested as a leading indicator of contract awards, which historically follow by roughly two to three quarters.',
      sec: 'Sustained lobbying by a company is compared with institutional 13F accumulation in the same name to see whether large holders position ahead of policy outcomes.',
      markets:
        'We watch whether lobbying intensity around a bill precedes re-rating in the affected sector’s prices and analyst coverage.',
    },
    pattern: 'lobbying spend leading contract awards',
  },
  {
    id: 'fundraising',
    label: 'Election fundraising',
    cat: 'congress',
    angle: 195,
    sources: 'FEC',
    blurb:
      'Federal campaign contributions and PAC money reported to the Federal Election Commission.',
    analyze:
      'We measure fundraising momentum — contribution velocity and PAC concentration by race and sector — and track how it shifts across the election cycle.',
    moves: {
      gov: 'Donor-industry concentration is mapped against agencies and programs to surface where fundraising aligns with spending priorities.',
      sec: 'Sector fundraising trends are compared with institutional positioning to see whether 13F rotations lean toward politically favored industries.',
      markets:
        'Fundraising momentum is tested against prediction-market odds — money tends to lead shifts in implied win probability, which in turn move policy-sensitive sectors.',
    },
    pattern: 'fundraising momentum leading election odds',
  },
  // top-right — Government Activity
  {
    id: 'gov-contracts',
    label: 'Government contracts',
    cat: 'gov',
    angle: 285,
    sources: 'USAspending.gov · Treasury',
    blurb: 'Federal contract awards broken out by recipient, awarding agency, and amount.',
    analyze:
      'We aggregate awards by recipient, agency, and NAICS, measuring award momentum and backlog growth, and run event studies on contractor equities around announcement dates.',
    moves: {
      congress:
        'Award timing is cross-referenced with lobbying spend and member trading to flag positioning ahead of public announcements.',
      sec: 'We check whether institutional 13F accumulation and insider buying in a contractor precede award momentum.',
      markets:
        'Award announcements are tested as re-rating catalysts — we measure abnormal returns and analyst-estimate revisions for the awarded contractor.',
    },
    pattern: 'award announcements re-rating contractor equities',
  },
  {
    id: 'federal-spending',
    label: 'Federal spending',
    cat: 'gov',
    angle: 315,
    sources: 'USAspending.gov · Treasury',
    blurb: 'Federal outlays across agencies and programs over time.',
    analyze:
      'We track outlays by agency and program over time, measuring growth rates and rotation across sectors relative to appropriations.',
    moves: {
      congress:
        'Spending shifts are aligned with fundraising and committee priorities to see which programs are funded ahead of budget cycles.',
      sec: 'Program-level outlay growth is compared with ETF and 13F flows into the exposed sectors.',
      markets:
        'We test whether federal outlay growth leads sector-level price performance — spending rotations tend to precede relative-strength shifts.',
    },
    pattern: 'outlay growth rotating sector performance',
  },
  {
    id: 'patents',
    label: 'Patent activity',
    cat: 'gov',
    angle: 345,
    sources: 'USPTO',
    blurb: 'Granted patents and application activity mapped to assignees.',
    analyze:
      'We measure patent grant and application momentum by assignee and technology class, using citation breadth as a proxy for innovation intensity.',
    moves: {
      congress:
        'Patent clusters in regulated technologies are cross-referenced with lobbying activity around the same standards.',
      sec: 'Accelerating patent activity is compared with institutional accumulation to see whether 13F filers position ahead of commercialization.',
      markets:
        'Patent momentum is tested as a leading input to analyst upgrades and longer-horizon fundamental re-rating.',
    },
    pattern: 'patent momentum feeding analyst upgrades',
  },
  // bottom-right — Markets & Signals
  {
    id: 'ratings',
    label: 'Analyst ratings',
    cat: 'markets',
    angle: 15,
    sources: 'Finnhub · licensed providers',
    blurb: 'Analyst ratings, upgrades, downgrades, and price targets across equities.',
    analyze:
      'We aggregate ratings, revisions, and price-target dispersion, measuring upgrade/downgrade momentum and how far consensus lags realized fundamentals.',
    moves: {
      congress:
        'Rating revisions are checked against member trading to see where disclosures front-run or trail sell-side consensus.',
      gov: 'We test whether contract awards and patent momentum lead analyst upgrades in the affected names.',
      sec: 'Rating momentum is compared with 13F rotation and insider buying — coverage tends to follow institutional accumulation.',
    },
    pattern: 'coverage revisions trailing institutional accumulation',
  },
  {
    id: 'prices',
    label: 'Prices & fundamentals',
    cat: 'markets',
    angle: 45,
    sources: 'Finnhub · FMP · Alpha Vantage',
    blurb: 'Real-time prices, fundamentals, and technical signals across equities.',
    analyze:
      'Prices and fundamentals are the common measurement layer: we compute abnormal returns, volatility regimes, and momentum, and use them as the dependent variable in every cross-dataset event study.',
    moves: {
      congress:
        'We measure whether disclosed member trades and lobbying intensity historically precede abnormal returns in the affected sectors.',
      gov: 'Contract awards and federal outlays are tested as re-rating catalysts against realized price and fundamental moves.',
      sec: 'Insider clusters, 13F rotations, and ETF flows are evaluated for lead-lag relationships with subsequent price inflections.',
    },
    pattern: 'abnormal returns confirming upstream signals',
  },
  {
    id: 'prediction',
    label: 'Prediction markets',
    cat: 'markets',
    angle: 75,
    sources: 'Polymarket Gamma/Data/CLOB',
    blurb: 'Live event and election odds from on-chain prediction markets.',
    analyze:
      'We convert market prices to vig-free implied probabilities and track how those odds shift over time, comparing implied probability against our own estimate to size the edge (model probability minus implied).',
    moves: {
      congress:
        'Odds movements are tested against fundraising momentum and member trading — shifting probabilities re-shape committee power and the policy landscape members trade around.',
      gov: 'Policy-market odds are aligned with expected spending and contract outcomes to anticipate which programs are being priced in.',
      sec: 'We watch whether institutional positioning shifts as event odds re-price, using implied-probability moves as a rotation signal.',
    },
    pattern: 'implied-probability shifts leading sector rotation',
  },
  // bottom-left — SEC & Institutional
  {
    id: 'etf',
    label: 'ETF holdings',
    cat: 'sec',
    angle: 105,
    sources: 'Financial Modeling Prep',
    blurb: 'ETF constituent holdings and the flow shifts that move them.',
    analyze:
      'We track ETF constituent weights and creation/redemption-driven flows, measuring flow breadth and concentration into and out of sectors.',
    moves: {
      congress:
        'Sector flows are compared with policy and fundraising trends to see whether allocation leans toward politically favored industries.',
      gov: 'ETF flows into contractor- and program-exposed sectors are checked against award and spending momentum.',
      markets:
        'We test whether ETF flow surges amplify existing price momentum — passive flows tend to reinforce trends rather than initiate them.',
    },
    pattern: 'flow surges amplifying price momentum',
  },
  {
    id: 'holdings13f',
    label: '13F holdings',
    cat: 'sec',
    angle: 135,
    sources: 'SEC EDGAR',
    blurb: 'Quarterly institutional equity holdings disclosed on Form 13F.',
    analyze:
      'We diff quarterly 13F filings to compute position changes by manager, measuring accumulation/distribution breadth and clustering across correlated institutions.',
    moves: {
      congress:
        'Institutional accumulation is cross-referenced with member trading and lobbying to flag names where multiple informed sources converge.',
      gov: 'We check whether 13F buying leads the beneficiaries of contract awards and spending.',
      markets:
        '13F rotations are tested as a lead indicator for analyst coverage and price momentum in the accumulated names.',
    },
    pattern: '13F accumulation leading coverage and price',
  },
  {
    id: 'insider',
    label: 'Insider trades',
    cat: 'sec',
    angle: 165,
    sources: 'SEC EDGAR',
    blurb: "Officer and director transactions in their own company's stock (Form 4).",
    analyze:
      'We measure insider-buy breadth and clustering (multiple officers buying within a short window), scoring transactions by size relative to holdings and by recency.',
    moves: {
      congress:
        'Insider clusters are overlapped with member purchases in the same tickers — coincident buying tends to mark the highest-conviction signals.',
      gov: 'We check whether insider buying at a contractor precedes award momentum.',
      markets:
        'Insider-buy clusters are tested as leading indicators of price inflections, historically preceding positive abnormal returns.',
    },
    pattern: 'insider-buy clusters leading price inflections',
  },
];

const NODE_BY_ID = NODES.reduce((m, n) => ((m[n.id] = n), m), {});

/* signature signal chains → multi-select presets (each selects a SET of nodes).
   Combined copy + patterns are hand-written for the three presets. */
const PRESETS = [
  {
    label: 'Lobbying → Contracts → Prices',
    nodes: ['lobbying', 'gov-contracts', 'prices'],
    combined:
      'Lobbying spend, contract awards, and price action form Ezana’s clearest lead-lag chain. We test whether a firm’s rising lobbying intensity precedes federal awards by two to three quarters, then whether those awards re-rate the contractor’s equity.',
    patterns: [
      'Lobbying spend accelerating ahead of an award window → pre-award positioning in the contractor’s equity.',
      'Award-announcement clustering → abnormal returns and analyst-estimate revisions in the days after.',
      'Lobbying and award momentum diverging from flat prices → a lag the market may not have priced yet.',
    ],
  },
  {
    label: 'Congress trades → Insider overlap',
    nodes: ['congress-trading', 'insider'],
    combined:
      'Congressional disclosures and insider Form 4 activity are strongest when they agree. We test for the same tickers appearing in both feeds inside a short window, treating coincident buying as a higher-conviction cluster.',
    patterns: [
      'Member purchase and officer buying in the same name within weeks → convergent-conviction cluster.',
      'Committee-relevant member trade with no matching insider activity → single-source signal, weighted lower.',
      'Insider-cluster breadth rising alongside member buying → accumulation we watch for a price inflection.',
    ],
  },
  {
    label: 'Fundraising → Odds → Rotation',
    nodes: ['fundraising', 'prediction', 'prices'],
    combined:
      'Fundraising momentum, prediction-market odds, and sector prices trace how political expectations become market rotation. We test whether contribution velocity leads implied-probability shifts, and whether those odds moves precede rotation in policy-sensitive sectors.',
    patterns: [
      'Fundraising surge ahead of a race → a leading move in that outcome’s implied probability.',
      'Odds re-pricing a policy outcome → a rotation signal for the exposed sector’s prices.',
      'Implied probability diverging from the fundraising trend → a mispricing we flag for review.',
    ],
  },
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
      });
    }
    if (items.length) buckets.push(items);
    else omitted.push('prediction odds');
  } else omitted.push('prediction odds');

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

/* ══════════════════════════ signal map (hub-and-spoke) ══════════════════════════ */
function SignalMap({ selectedNodes, categoryFilter, onToggleNode, onClear }) {
  const positions = useMemo(() => NODES.map((n) => ({ ...n, ...nodePos(n.angle) })), []);
  const hasSelection = selectedNodes.size > 0;

  const corners = [
    { cat: 'congress', x: 20, y: 24, anchor: 'start' },
    { cat: 'gov', x: VW - 20, y: 24, anchor: 'end' },
    { cat: 'sec', x: 20, y: VH - 14, anchor: 'start' },
    { cat: 'markets', x: VW - 20, y: VH - 14, anchor: 'end' },
  ];

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
      aria-label="Interactive hub-and-spoke map of Ezana's 12 datasets feeding the signal engine"
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

      {/* the ONLY lines: 12 spokes, each animating an inward intake flow (node → hub) */}
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
            {/* transparent oversized tap/click target (≥44px hit area) */}
            <circle
              className="dsx-node-hit"
              cx={n.x}
              cy={n.y}
              r={24}
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

/** per-other-category cross-mechanism blocks for one node */
function MovesBlocks({ node }) {
  return (
    <div className="dsx-moves">
      {CAT_ORDER.filter((k) => k !== node.cat).map((k) => (
        <div className="dsx-moveblock" key={k}>
          <span className="dsx-move-cat">
            <span className="dsx-legend-dot" style={{ background: CATS[k].color }} />
            {CATS[k].label}
          </span>
          <p className="dsx-move-text">{node.moves[k]}</p>
        </div>
      ))}
    </div>
  );
}

function PanelDefault({ onSelectPreset }) {
  return (
    <div className="dsx-panel">
      <span className="dsx-chip">
        <Zap size={12} /> Signal engine
      </span>
      <h2 className="dsx-panel-title">How our datasets move each other</h2>
      <p className="dsx-panel-blurb">
        Ezana&apos;s four categories aren&apos;t silos — every dataset feeds one engine, and the
        engine relates them all. Click any node to analyze it; add more to study how they combine.
      </p>
      <div className="dsx-stats">
        <span>
          <b>12</b> datasets
        </span>
        <span>
          <b>4</b> categories
        </span>
        <span>
          <b>1</b> signal engine
        </span>
      </div>
      <div className="dsx-section-h">Signature signal chains</div>
      <div className="dsx-rows">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="dsx-chain"
            onClick={() => onSelectPreset(p.nodes)}
          >
            <ArrowRight size={14} /> {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PanelSingle({ node }) {
  return (
    <div className="dsx-panel">
      <CategoryChip cat={node.cat} tinted />
      <h2 className="dsx-panel-title">{node.label}</h2>
      <p className="dsx-source">
        <b>HOW WE SOURCE IT ·</b> {node.sources}
      </p>
      <div className="dsx-section-h">How we analyze it</div>
      <p className="dsx-panel-blurb">{node.analyze}</p>
      <div className="dsx-section-h">How it moves the other three categories</div>
      <MovesBlocks node={node} />
    </div>
  );
}

function PanelCombined({ nodes }) {
  const selCats = new Set(nodes.map((n) => n.cat));
  const remaining = CAT_ORDER.filter((k) => !selCats.has(k));

  // exact-set match to a preset → use its hand-written combined copy + patterns
  const selIds = new Set(nodes.map((n) => n.id));
  const preset = PRESETS.find(
    (p) => p.nodes.length === selIds.size && p.nodes.every((id) => selIds.has(id)),
  );

  const combined =
    preset?.combined ||
    `You've combined ${joinList(nodes.map((n) => n.label))}. Ezana analyzes them together for lead-lag structure and convergent, cross-category signals.`;

  // patterns: preset copy, else each node's concrete joint pattern (sentence-cased)
  const patterns =
    preset?.patterns ||
    nodes.map((n) => {
      const s = n.pattern;
      return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
    });

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
      <div className="dsx-section-h">Combined signal</div>
      <p className="dsx-panel-blurb">{combined}</p>

      {remaining.length > 0 && (
        <>
          <div className="dsx-section-h">What it implies for the other categories</div>
          <div className="dsx-moves">
            {remaining.map((k) => {
              const texts = [...new Set(nodes.map((n) => n.moves[k]).filter(Boolean))].slice(0, 2);
              return (
                <div className="dsx-moveblock" key={k}>
                  <span className="dsx-move-cat">
                    <span className="dsx-legend-dot" style={{ background: CATS[k].color }} />
                    {CATS[k].label}
                  </span>
                  <p className="dsx-move-text">{texts.join(' ')}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="dsx-section-h">Patterns we watch</div>
      <ul className="dsx-patterns">
        {patterns.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

function AnalysisPanel({ selectedNodes, onSelectPreset }) {
  const list = [...selectedNodes].map((id) => NODE_BY_ID[id]).filter(Boolean);
  if (list.length === 0) return <PanelDefault onSelectPreset={onSelectPreset} />;
  if (list.length === 1) return <PanelSingle node={list[0]} />;
  return <PanelCombined nodes={list} />;
}

/* ══════════════════════════ page ══════════════════════════ */
export default function DatasetsOverviewClient() {
  const [selectedNodes, setSelectedNodes] = useState(() => new Set());
  const [categoryFilter, setCategoryFilter] = useState(null);

  const toggleNode = (id) => {
    setCategoryFilter(null);
    setSelectedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectPreset = (ids) => {
    setCategoryFilter(null);
    setSelectedNodes(new Set(ids));
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

      <CrossDatasetTicker />

      <header className="dsx-header">
        <p className="dsx-eyebrow">DATASETS</p>
        <h1 className="dsx-title">Every signal, sourced and attributed</h1>
        <p className="dsx-sub">
          Ezana organizes its data across four dimensions — and shows you exactly how each one feeds
          the signal engine that relates them. No black boxes.
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
          <AnalysisPanel selectedNodes={selectedNodes} onSelectPreset={selectPreset} />
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
