'use client';

/**
 * Government Contracts — Claude Design "Option 1b" (Chosen direction).
 * Presentation layer only: every recipient/agency/value below is aggregated
 * from the REAL USAspending award rows passed in `awards` (no mock data).
 *
 * Fields the USAspending ingest does NOT provide are handled honestly:
 *  - contract-type split, related-security price, weekly delta → "—" / "Not
 *    available" (never fabricated).
 *  - YoY and quarterly series → derived from the loaded award dates where the
 *    data supports it, else an honest empty state.
 */
import { useMemo, useState, useEffect, useRef } from 'react';
import {
  LayoutGrid,
  PieChart as PieIcon,
  X,
  ArrowUpRight,
  ChevronDown,
  Sparkles,
  Play,
  FileDown,
  Star,
} from 'lucide-react';
import './gov-contracts.css';

/* ── Agency color buckets (design key; SVG fills use the CSS tokens) ── */
const AGENCIES = {
  DoD: { label: 'DoD', color: 'var(--positive)' },
  DoE: { label: 'DoE', color: 'var(--warning)' },
  NASA: { label: 'NASA', color: 'var(--info)' },
  HHS: { label: 'HHS', color: 'var(--purple)' },
  GSA: { label: 'GSA', color: 'var(--pink)' },
  Other: { label: 'Other', color: 'var(--text-faint)' },
};
const AGENCY_ORDER = ['DoD', 'DoE', 'NASA', 'HHS', 'GSA', 'Other'];

function normalizeAgency(name) {
  const s = String(name || '').toLowerCase();
  if (/defen|army|navy|air force|marine|dod|military/.test(s)) return 'DoD';
  if (/energy|nuclear/.test(s)) return 'DoE';
  if (/aeronautic|nasa|space/.test(s)) return 'NASA';
  if (/health|human services|hhs|medic/.test(s)) return 'HHS';
  if (/general services|gsa/.test(s)) return 'GSA';
  return 'Other';
}

/* ── Category dropdown bar — items route to the real existing dataset pages.
   Where a dedicated sub-page doesn't exist, we route to that category's hub. ── */
const CATEGORIES = [
  {
    key: 'congress',
    label: 'Congressional & Political',
    items: [
      ['Politician Search', '/datasets/political'],
      ['Congress Trading', '/datasets/political'],
      ['Donald Trump Trade Tracker', '/datasets/political'],
      ['Congress Live Net Worth', '/datasets/political'],
      ['Legislation Search', '/datasets/political'],
      ['Election Fundraising', '/datasets/political'],
      ['2026 Midterm Elections', '/datasets/political'],
    ],
  },
  {
    key: 'gov',
    label: 'Government Activity',
    active: true,
    items: [
      ['Government Contracts', '/datasets/government/contracts', true],
      ['Corporate Lobbying', '/datasets/government'],
      ['Patents', '/datasets/government'],
    ],
  },
  {
    key: 'sec',
    label: 'SEC & Institutional Filings',
    items: [
      ['Insider Trading', '/datasets/sec-filings'],
      ['Executive Compensation', '/datasets/sec-filings'],
      ['Institutional Holdings', '/datasets/sec-filings'],
      ['Whale Moves', '/datasets/sec-filings'],
      ['ETF Holdings', '/datasets/sec-filings'],
    ],
  },
  {
    key: 'markets',
    label: 'Markets & Signals',
    items: [
      ['Markets & Equities', '/datasets/markets'],
      ['Prediction Markets', '/datasets/prediction-markets'],
      ['Alternative Signals', '/datasets/alternative'],
      ['Global & Macro', '/datasets/global'],
    ],
  },
];

const SEED_QUERY = `FROM gov.contracts
WHERE fiscal_year = 2026 AND awarding_agency = "DoD"
SELECT recipient, awarding_agency, SUM(award_value) AS total
GROUP BY recipient, awarding_agency
ORDER BY total DESC
LIMIT 10;`;

/* ── formatting ── */
function fmtUSD(v) {
  const n = Number(v) || 0;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtInt(v) {
  return (Number(v) || 0).toLocaleString('en-US');
}

/* Parse a formatted "$1.24B"/"$842.0M"/"$27K" string into a number (used only
   for the static sample fallback, whose rows carry `amount` but no numeric). */
function parseAmount(s) {
  const m = String(s || '').match(/([\d.]+)\s*([KMBT])?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const mult = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[(m[2] || '').toUpperCase()] || 1;
  return Number.isFinite(n) ? n * mult : 0;
}

/* ── aggregate real award rows into recipients ── */
function aggregate(awards) {
  const map = new Map();
  for (const a of awards) {
    const key = a.recipient || 'Unknown';
    const agency = normalizeAgency(a.agency);
    const val = Number(a.amountValue) || parseAmount(a.amount) || 0;
    const year = (() => {
      const d = new Date(a.date);
      return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
    })();
    if (!map.has(key)) {
      map.set(key, {
        name: key,
        agency,
        ticker: a.ticker && a.ticker !== '—' ? a.ticker : null,
        total: 0,
        count: 0,
        awards: [],
      });
    }
    const r = map.get(key);
    r.total += val;
    r.count += 1;
    r.awards.push({ value: val, year, agencyName: a.agency, awardId: a.awardId, date: a.date });
    // keep the agency of the largest award as the recipient's primary agency
    if (val >= (r._maxAward || 0)) {
      r._maxAward = val;
      r.agency = agency;
    }
  }
  return [...map.values()].map((r) => ({ ...r, avg: r.count ? r.total / r.count : 0 }));
}

export default function GovContractsClient({ awards = [], isLive = false, note = '' }) {
  const recipients = useMemo(() => aggregate(awards), [awards]);

  const [agencyFilter, setAgencyFilter] = useState('all');
  const [minValue, setMinValue] = useState(0); // in billions
  const [fiscalYear, setFiscalYear] = useState('all');
  const [heroView, setHeroView] = useState('treemap');
  const [selected, setSelected] = useState(null);
  const [queryOpen, setQueryOpen] = useState(false);
  const [openCat, setOpenCat] = useState(null);

  // agency counts (real)
  const agencyCounts = useMemo(() => {
    const c = { all: recipients.length };
    for (const r of recipients) c[r.agency] = (c[r.agency] || 0) + 1;
    return c;
  }, [recipients]);

  const years = useMemo(() => {
    const s = new Set(recipients.flatMap((r) => r.awards.map((a) => a.year)).filter(Boolean));
    return [...s].sort((a, b) => b - a).slice(0, 3);
  }, [recipients]);

  const filtered = useMemo(() => {
    return recipients
      .filter((r) => (agencyFilter === 'all' ? true : r.agency === agencyFilter))
      .filter((r) => r.total >= minValue * 1e9)
      .filter((r) =>
        fiscalYear === 'all' ? true : r.awards.some((a) => a.year === Number(fiscalYear)),
      )
      .sort((a, b) => b.total - a.total);
  }, [recipients, agencyFilter, minValue, fiscalYear]);

  const totalObligated = useMemo(() => recipients.reduce((s, r) => s + r.total, 0), [recipients]);
  const totalAwards = useMemo(() => recipients.reduce((s, r) => s + r.count, 0), [recipients]);
  const largestAgency = useMemo(() => {
    const byAgency = {};
    for (const r of recipients) byAgency[r.agency] = (byAgency[r.agency] || 0) + r.total;
    let top = null;
    for (const [ag, v] of Object.entries(byAgency)) if (!top || v > top.v) top = { ag, v };
    return top
      ? { ...top, pct: totalObligated ? Math.round((top.v / totalObligated) * 100) : 0 }
      : null;
  }, [recipients, totalObligated]);

  const label = agencyFilter === 'all' ? 'All agencies' : AGENCIES[agencyFilter].label;

  const toggleAgency = (ag) => setAgencyFilter((cur) => (cur === ag ? 'all' : ag));

  return (
    <div className="gcx-page">
      <CategoryBar openCat={openCat} setOpenCat={setOpenCat} />

      <header className="gcx-header">
        <p className="gcx-eyebrow">DATASETS · USASPENDING.GOV</p>
        <h1 className="gcx-title">Government contracts</h1>
        <p className="gcx-sub">
          Federal contract awards from USAspending.gov, aggregated by recipient and awarding agency.
          {isLive ? '' : ' Showing sample data — live source unavailable.'}
        </p>
        <button
          type="button"
          className={`gcx-btn ${queryOpen ? 'gcx-btn-outline' : 'gcx-btn-primary'}`}
          onClick={() => setQueryOpen((o) => !o)}
        >
          {queryOpen ? 'Close builder' : 'Generate report'}
        </button>
      </header>

      {queryOpen && (
        <EzanaQLBuilder
          activeFilters={{ agencyFilter, fiscalYear, minValue }}
          onClose={() => setQueryOpen(false)}
        />
      )}

      <div className="gcx-body">
        {/* filter rail */}
        <aside className="gcx-rail">
          <FilterGroup title="Awarding agency">
            <RailChip
              active={agencyFilter === 'all'}
              onClick={() => setAgencyFilter('all')}
              label="All"
              count={agencyCounts.all}
            />
            {AGENCY_ORDER.filter((a) => agencyCounts[a]).map((a) => (
              <RailChip
                key={a}
                active={agencyFilter === a}
                onClick={() => toggleAgency(a)}
                label={AGENCIES[a].label}
                color={AGENCIES[a].color}
                count={agencyCounts[a] || 0}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Min award value">
            <input
              type="range"
              min={0}
              max={130}
              value={minValue}
              onChange={(e) => setMinValue(Number(e.target.value))}
              className="gcx-slider"
              aria-label="Minimum total award value in billions"
            />
            <div className="gcx-slider-val">
              ≥ <span className="gcx-mono">${minValue}B</span>
            </div>
          </FilterGroup>

          <FilterGroup title="Fiscal year">
            <RailChip
              active={fiscalYear === 'all'}
              onClick={() => setFiscalYear('all')}
              label="All years"
            />
            {years.map((y) => (
              <RailChip
                key={y}
                active={fiscalYear === String(y)}
                onClick={() => setFiscalYear(String(y))}
                label={`FY${y}`}
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Contract type">
            <div className="gcx-rail-note">
              Not available in the USAspending ingest (types A/B/C/D are stored, but not
              products/services/R&amp;D split).
            </div>
          </FilterGroup>
        </aside>

        {/* main column */}
        <main className="gcx-main">
          <div className="gcx-stats">
            <StatCard
              label="Total obligated"
              value={fmtUSD(totalObligated)}
              sub={isLive ? `${fmtInt(recipients.length)} recipients` : 'sample'}
            />
            <StatCard label="Awards (loaded)" value={fmtInt(totalAwards)} sub="in current slice" />
            <StatCard
              label="Largest awarding agency"
              value={largestAgency ? AGENCIES[largestAgency.ag].label : '—'}
              sub={largestAgency ? `${largestAgency.pct}% of value` : ''}
              color={largestAgency ? AGENCIES[largestAgency.ag].color : undefined}
            />
          </div>

          <AgencyLegend agencyFilter={agencyFilter} onPick={toggleAgency} counts={agencyCounts} />

          <section className="gcx-card gcx-hero">
            <div className="gcx-hero-head">
              <h2 className="gcx-hero-title">Top recipients · {label}</h2>
              <div className="gcx-seg">
                <button
                  type="button"
                  className={heroView === 'treemap' ? 'is-active' : ''}
                  onClick={() => setHeroView('treemap')}
                >
                  <LayoutGrid size={13} /> Treemap
                </button>
                <button
                  type="button"
                  className={heroView === 'pie' ? 'is-active' : ''}
                  onClick={() => setHeroView('pie')}
                >
                  <PieIcon size={13} /> Share
                </button>
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="gcx-empty">No recipients match the current filters.</div>
            ) : heroView === 'treemap' ? (
              <Treemap recipients={filtered} onPick={setSelected} />
            ) : (
              <ShareDonut recipients={filtered} total={totalObligated} />
            )}
          </section>

          <section className="gcx-card gcx-list">
            <div className="gcx-list-head">
              <h2 className="gcx-hero-title">Leading contractors · {label}</h2>
              <span className="gcx-list-count">{filtered.length} shown</span>
            </div>
            <ContractorList recipients={filtered.slice(0, 25)} onPick={setSelected} />
          </section>

          <p className="gcx-note">{note}</p>
        </main>
      </div>

      {selected && <DrillModal recipient={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* ────────────────────────── Category bar ────────────────────────── */
function CategoryBar({ openCat, setOpenCat }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpenCat(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [setOpenCat]);
  return (
    <nav className="gcx-catbar" ref={ref}>
      {CATEGORIES.map((cat) => (
        <div className="gcx-cat" key={cat.key}>
          <button
            type="button"
            className={`gcx-cat-trigger ${cat.active ? 'is-active' : ''}`}
            onClick={() => setOpenCat((o) => (o === cat.key ? null : cat.key))}
          >
            {cat.label} <ChevronDown size={13} />
          </button>
          {openCat === cat.key && (
            <div className="gcx-cat-menu">
              {cat.items.map(([name, href, active]) => (
                <a key={name} href={href} className={`gcx-cat-item ${active ? 'is-active' : ''}`}>
                  {name}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

/* ────────────────────────── Rail bits ────────────────────────── */
function FilterGroup({ title, children }) {
  return (
    <div className="gcx-fg">
      <div className="gcx-fg-title">{title}</div>
      {children}
    </div>
  );
}
function RailChip({ active, onClick, label, count, color }) {
  return (
    <button type="button" className={`gcx-chip ${active ? 'is-active' : ''}`} onClick={onClick}>
      <span className="gcx-chip-label">
        {color && <span className="gcx-dot" style={{ background: color }} />}
        {label}
      </span>
      {count != null && <span className="gcx-chip-count gcx-mono">{count}</span>}
    </button>
  );
}
function StatCard({ label, value, sub, color }) {
  return (
    <div className="gcx-card gcx-stat">
      <div className="gcx-stat-label">{label}</div>
      <div className="gcx-stat-value gcx-mono" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <div className="gcx-stat-sub gcx-mono">{sub}</div>}
    </div>
  );
}

function AgencyLegend({ agencyFilter, onPick, counts }) {
  return (
    <div className="gcx-legend">
      {AGENCY_ORDER.filter((a) => counts[a]).map((a) => (
        <button
          key={a}
          type="button"
          className={`gcx-legend-chip ${agencyFilter === a ? 'is-active' : ''}`}
          onClick={() => onPick(a)}
          style={agencyFilter === a ? { borderColor: AGENCIES[a].color } : undefined}
        >
          <span className="gcx-dot" style={{ background: AGENCIES[a].color }} />
          {AGENCIES[a].label}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────── Treemap ────────────────────────── */
function Treemap({ recipients, onPick }) {
  const W = 900;
  const H = 440;
  const GAP = 3;
  const maxValue = Math.max(...recipients.map((r) => r.total), 1);

  // group by agency, order columns by agency order then total
  const byAgency = {};
  for (const r of recipients) (byAgency[r.agency] ||= []).push(r);
  const columns = AGENCY_ORDER.filter((a) => byAgency[a]).map((a) => ({
    agency: a,
    items: byAgency[a].sort((x, y) => y.total - x.total),
    total: byAgency[a].reduce((s, x) => s + x.total, 0),
  }));
  const grandTotal = columns.reduce((s, c) => s + c.total, 0) || 1;

  // Column widths: give every present agency a readable MINIMUM width so a
  // dominant agency (DoD) can't crush the rest into slivers, then distribute the
  // remaining width proportionally to each agency's total. Falls back to purely
  // proportional if the minimums wouldn't fit.
  const totalGaps = GAP * Math.max(0, columns.length - 1);
  const avail = W - totalGaps;
  const MIN_COL = 100;
  const useMin = MIN_COL * columns.length <= avail;
  const remainder = useMin ? avail - MIN_COL * columns.length : avail;

  let x = 0;
  const tiles = [];
  columns.forEach((col) => {
    const colW = useMin
      ? MIN_COL + (col.total / grandTotal) * remainder
      : Math.max(24, (col.total / grandTotal) * avail);
    // Recipient tiles fill the column height proportionally, with a readable
    // minimum so a tall stack of tiny awards still shows a hover target.
    const colGaps = GAP * Math.max(0, col.items.length - 1);
    const colInner = H - colGaps;
    let y = 0;
    col.items.forEach((r) => {
      const h = Math.max(3, (r.total / col.total) * colInner);
      tiles.push({ r, x, y, w: colW, h, agency: col.agency });
      y += h + GAP;
    });
    x += colW + GAP;
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="gcx-treemap"
      role="img"
      aria-label="Recipients treemap"
    >
      {tiles.map((t, i) => {
        const opacity = 0.14 + 0.5 * (t.r.total / maxValue);
        const big = t.w > 120 && t.h > 54;
        const med = !big && t.w > 90 && t.h > 30;
        const small = !big && !med && t.h > 16;
        return (
          <g
            key={`${t.r.name}-${i}`}
            className="gcx-tile"
            onClick={() => onPick(t.r)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onPick(t.r)}
          >
            <title>{`${t.r.name} · ${fmtUSD(t.r.total)}`}</title>
            <rect
              x={t.x}
              y={t.y}
              width={t.w}
              height={t.h}
              rx={5}
              fill={AGENCIES[t.agency].color}
              fillOpacity={opacity}
              stroke={AGENCIES[t.agency].color}
              strokeOpacity={0.35}
            />
            {big && (
              <>
                <text x={t.x + 8} y={t.y + 16} className="gcx-tl-tag">
                  {AGENCIES[t.agency].label}
                </text>
                <text x={t.x + 8} y={t.y + 32} className="gcx-tl-name">
                  {trim(t.r.name, t.w)}
                </text>
                <text x={t.x + 8} y={t.y + 48} className="gcx-tl-val">
                  {fmtUSD(t.r.total)}
                </text>
              </>
            )}
            {med && (
              <>
                <text x={t.x + 7} y={t.y + 15} className="gcx-tl-name">
                  {trim(t.r.name, t.w)}
                </text>
                <text x={t.x + 7} y={t.y + 28} className="gcx-tl-val">
                  {fmtUSD(t.r.total)}
                </text>
              </>
            )}
            {small && (
              <text x={t.x + 6} y={t.y + t.h / 2 + 3} className="gcx-tl-sm">
                {trim(`${t.r.name} · ${fmtUSD(t.r.total)}`, t.w)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
function trim(s, w) {
  const max = Math.max(4, Math.floor(w / 7));
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/* ────────────────────────── Donut ────────────────────────── */
function donutSegments(data, total) {
  const C = 2 * Math.PI * 70;
  let offset = 0;
  return data.map((d) => {
    const frac = total ? d.value / total : 0;
    const seg = { ...d, dash: frac * C, gap: C - frac * C, offset: -offset * C };
    offset += frac;
    return seg;
  });
}
function ShareDonut({ recipients, total }) {
  const byAgency = {};
  for (const r of recipients) byAgency[r.agency] = (byAgency[r.agency] || 0) + r.total;
  const data = AGENCY_ORDER.filter((a) => byAgency[a]).map((a) => ({
    agency: a,
    value: byAgency[a],
  }));
  const sum = data.reduce((s, d) => s + d.value, 0);
  const segs = donutSegments(data, sum);
  return (
    <div className="gcx-donut-wrap">
      <svg viewBox="0 0 180 180" className="gcx-donut">
        <circle cx={90} cy={90} r={70} fill="none" stroke="var(--bg-tertiary)" strokeWidth={30} />
        {segs.map((s) => (
          <circle
            key={s.agency}
            cx={90}
            cy={90}
            r={70}
            fill="none"
            stroke={AGENCIES[s.agency].color}
            strokeWidth={30}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={s.offset}
            transform="rotate(-90 90 90)"
          />
        ))}
        <text x={90} y={86} className="gcx-donut-c1">
          {fmtUSD(sum)}
        </text>
        <text x={90} y={102} className="gcx-donut-c2">
          obligated (loaded)
        </text>
      </svg>
      <div className="gcx-donut-list">
        {data
          .sort((a, b) => b.value - a.value)
          .map((d) => (
            <div className="gcx-donut-row" key={d.agency}>
              <span className="gcx-dot" style={{ background: AGENCIES[d.agency].color }} />
              <span className="gcx-donut-name">{AGENCIES[d.agency].label}</span>
              <span className="gcx-mono gcx-donut-val">{fmtUSD(d.value)}</span>
              <span className="gcx-mono gcx-donut-pct">
                {sum ? Math.round((d.value / sum) * 100) : 0}%
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ────────────────────────── Contractor list ────────────────────────── */
function ContractorList({ recipients, onPick }) {
  const max = Math.max(...recipients.map((r) => r.total), 1);
  return (
    <div className="gcx-rows">
      {recipients.map((r, i) => (
        <button type="button" className="gcx-row" key={r.name} onClick={() => onPick(r)}>
          <span className="gcx-rank gcx-mono">{i + 1}</span>
          <span className="gcx-row-main">
            <span className="gcx-row-name">{r.name}</span>
            <span className="gcx-row-meta">
              <span className="gcx-dot" style={{ background: AGENCIES[r.agency].color }} />
              {AGENCIES[r.agency].label}
              {r.ticker ? ` · ${r.ticker}` : ''}
            </span>
          </span>
          <span className="gcx-row-bar">
            <span
              className="gcx-row-bar-fill"
              style={{ width: `${(r.total / max) * 100}%`, background: AGENCIES[r.agency].color }}
            />
          </span>
          <span className="gcx-row-val gcx-mono">{fmtUSD(r.total)}</span>
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────── Drill-down modal ────────────────────────── */
function DrillModal({ recipient: r, onClose }) {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const initials = r.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  // Award value over time: derived from THIS recipient's real awards, by year.
  const byYear = {};
  for (const a of r.awards) if (a.year) byYear[a.year] = (byYear[a.year] || 0) + a.value;
  const series = Object.entries(byYear)
    .map(([y, v]) => ({ label: `FY${y}`, value: v }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="gcx-modal-backdrop" onClick={onClose}>
      <div
        className="gcx-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="gcx-modal-left">
          <div className="gcx-badge" style={{ background: AGENCIES[r.agency].color }}>
            {initials}
          </div>
          <h3 className="gcx-modal-name">{r.name}</h3>
          <p className="gcx-modal-sub">
            {AGENCIES[r.agency].label} · {r.ticker || 'HQ not available'}
          </p>
          <div className="gcx-modal-grid">
            <MiniStat label="Total awarded" value={fmtUSD(r.total)} />
            <MiniStat label="Awards" value={fmtInt(r.count)} />
            <MiniStat label="Avg contract" value={fmtUSD(r.avg)} />
            <MiniStat label="YoY" value={series.length >= 2 ? yoy(series) : '—'} />
          </div>

          <div className="gcx-modal-section">
            <div className="gcx-modal-h">Contract type split</div>
            <div className="gcx-rail-note">Not available from USAspending ingest.</div>
          </div>

          <div className="gcx-modal-section">
            <div className="gcx-modal-h">Related security</div>
            {r.ticker ? (
              <div className="gcx-related">
                <span className="gcx-mono gcx-related-tk">{r.ticker}</span>
                <span className="gcx-related-note">Price not available on this page</span>
              </div>
            ) : (
              <div className="gcx-rail-note">PRIVATE / Not publicly traded</div>
            )}
          </div>
        </div>

        <div className="gcx-modal-right">
          <button type="button" className="gcx-modal-x" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <div className="gcx-modal-h">Award value over time</div>
          {series.length ? (
            <AreaChart series={series} color={AGENCIES[r.agency].color} />
          ) : (
            <div className="gcx-empty">No dated awards for this recipient in the loaded slice.</div>
          )}

          <div className="gcx-modal-actions">
            <button type="button" className="gcx-btn gcx-btn-primary">
              <Star size={14} /> Add to watchlist
            </button>
            <button type="button" className="gcx-btn gcx-btn-outline">
              Full dossier <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
function MiniStat({ label, value }) {
  return (
    <div className="gcx-ministat">
      <div className="gcx-ministat-label">{label}</div>
      <div className="gcx-ministat-value gcx-mono">{value}</div>
    </div>
  );
}
function yoy(series) {
  const a = series[series.length - 2].value;
  const b = series[series.length - 1].value;
  if (!a) return '—';
  const pct = ((b - a) / Math.abs(a)) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}
function AreaChart({ series, color }) {
  const W = 460;
  const H = 150;
  const P = { t: 12, r: 12, b: 22, l: 12 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;
  const max = Math.max(...series.map((s) => s.value), 1);
  const step = series.length > 1 ? iw / (series.length - 1) : 0;
  const pts = series.map((s, i) => ({
    x: P.l + i * step,
    y: P.t + ih - (s.value / max) * ih,
    ...s,
  }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${P.t + ih} L${pts[0].x},${P.t + ih} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="gcx-area"
      role="img"
      aria-label="Award value over time"
    >
      <defs>
        <linearGradient id="gcx-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={P.l}
          x2={W - P.r}
          y1={P.t + ih * g}
          y2={P.t + ih * g}
          className="gcx-grid"
        />
      ))}
      <path d={area} fill="url(#gcx-grad)" />
      <path d={line} fill="none" stroke={color} strokeWidth={1.8} />
      {pts.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r={3.2} fill={color} stroke="#fff" strokeWidth={1.5} />
          <text x={p.x} y={H - 6} className="gcx-area-x">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ────────────────────────── EzanaQL builder ────────────────────────── */
function seedFromFilters({ agencyFilter, fiscalYear }) {
  const conds = [];
  if (fiscalYear !== 'all') conds.push(`fiscal_year = ${fiscalYear}`);
  if (agencyFilter !== 'all') conds.push(`awarding_agency = "${agencyFilter}"`);
  const where = conds.length ? `\nWHERE ${conds.join(' AND ')}` : '';
  return `FROM gov.contracts${where}
SELECT recipient, awarding_agency, SUM(award_value) AS total
GROUP BY recipient, awarding_agency
ORDER BY total DESC
LIMIT 10;`;
}

function EzanaQLBuilder({ activeFilters, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState(() => seedFromFilters(activeFilters) || SEED_QUERY);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ezanaql/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: code, format: 'table' }),
      });
      const data = await res.json();
      if (!data.ok) setError(data.error || 'Query failed.');
      else setResult(data.result);
    } catch {
      setError('Could not reach the query engine.');
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ezanaql/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, datasetScope: 'gov.contracts' }),
      });
      const data = await res.json();
      if (!data.ok) setError(data.error || 'Generation failed.');
      else {
        setCode(data.query);
        if (!data.valid && data.validationError)
          setError(`Generated query needs a fix: ${data.validationError}`);
      }
    } catch {
      setError('Could not reach the report model.');
    } finally {
      setGenBusy(false);
    }
  };

  const exportAs = async (format) => {
    try {
      const res = await fetch('/api/ezanaql/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: code, format }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Export failed.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ezanaql-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed.');
    }
  };

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    }
  };

  const lineCount = code.split('\n').length;

  return (
    <section className="gcx-card gcx-ql">
      <div className="gcx-ql-head">
        <span className="gcx-ql-title">EzanaQL report builder</span>
        <span className="gcx-ql-beta">BETA</span>
        <button type="button" className="gcx-ql-x" onClick={onClose} aria-label="Close builder">
          <X size={16} />
        </button>
      </div>

      <div className="gcx-ql-ai">
        <span className="gcx-ql-ai-badge">
          <Sparkles size={12} /> Ezana AI
        </span>
        <input
          className="gcx-ql-ai-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the report in plain English — e.g. “Top 10 defense contractors this fiscal year, with YoY change” — and we’ll write the EzanaQL"
        />
        <button
          type="button"
          className="gcx-btn gcx-btn-primary gcx-ql-gen"
          onClick={generate}
          disabled={genBusy}
        >
          {genBusy ? 'Generating…' : 'Generate EzanaQL'}
        </button>
      </div>

      <div className="gcx-ql-editor">
        <div className="gcx-ql-gutter gcx-mono">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          className="gcx-ql-code gcx-mono"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
        />
      </div>

      <div className="gcx-ql-actions">
        <span className="gcx-ql-hint gcx-mono">EzanaQL · press ⌘↵ to run</span>
        <div className="gcx-ql-btns">
          <button type="button" className="gcx-btn gcx-btn-outline" onClick={() => exportAs('csv')}>
            <FileDown size={13} /> Export CSV
          </button>
          <button
            type="button"
            className="gcx-btn gcx-btn-outline"
            onClick={() => exportAs('json')}
          >
            <FileDown size={13} /> Export JSON
          </button>
          <button type="button" className="gcx-btn gcx-btn-primary" onClick={run} disabled={busy}>
            <Play size={13} /> {busy ? 'Running…' : 'Run query'}
          </button>
        </div>
      </div>

      {error && <div className="gcx-ql-error">{error}</div>}
      {result && <QueryResult result={result} />}
    </section>
  );
}

function QueryResult({ result }) {
  const cols = result.columns || (result.rows?.[0] ? Object.keys(result.rows[0]) : []);
  const rows = result.rows || [];
  return (
    <div className="gcx-ql-result">
      <div className="gcx-ql-result-meta gcx-mono">{rows.length} row(s)</div>
      <div className="gcx-ql-table-wrap">
        <table className="gcx-ql-table gcx-mono">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((row, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c}>
                    {typeof row[c] === 'number'
                      ? row[c].toLocaleString('en-US')
                      : String(row[c] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
