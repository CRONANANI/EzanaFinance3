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
import { useMemo, useState, useEffect, useCallback, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  PieChart as PieIcon,
  X,
  ArrowUpRight,
  Sparkles,
  Play,
  FileDown,
  Star,
  Loader2,
  Plus,
  Check,
  ExternalLink,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import CategoryBar from '@/components/datasets/CategoryBar';
import DatasetTicker from '@/components/datasets/DatasetTicker';
import ContractsExplorer from './ContractsExplorer';
import ContractorQuickView from './ContractorQuickView';
import { slugify } from './contractor-mock';
// Positional palette: raw awarding_agency strings are the source of truth (no
// regex bucketing); colors bind to spend-rank slots (top 10) + Other.
import {
  buildSlotMap,
  colorForAgency,
  OTHER_COLOR,
  OTHER_LABEL,
  MAX_SLOTS,
} from '@/lib/gov-agency-palette';
// Seed queries live in a pure module so the ezanaql check script can validate
// them against the catalog (catalog fields only — never raw DB columns).
import { SEED_QUERY, seedFromFilters } from './ezanaql-seed';
import './gov-contracts.css';

/* ── formatting ── */
function fmtUSD(v) {
  const n = Number(v) || 0;
  // Trillions FIRST — these are sequential returns, so a >= 1e12 value would
  // otherwise match the billion branch and render as "$10977.5B". Two decimals
  // at this scale: $10.98T keeps ~$500B of precision that $11.0T would discard.
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
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
    const agency = a.agency || 'Unknown'; // raw awarding_agency (no bucketing)
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

export default function GovContractsClient({
  awards = [],
  isLive = false,
  note = '',
  coverage = null,
  rollup = null,
  recentAwards = [],
}) {
  // ── State first ──────────────────────────────────────────────────────
  // These must be declared BEFORE any useMemo that references them: a memo's
  // dependency array is evaluated eagerly on every render, so a `const` read
  // from above its declaration throws a temporal-dead-zone ReferenceError.
  // `recipients` became fiscalYear-aware in 8ecb19b, which is what surfaced it.
  const [selectedAgencies, setSelectedAgencies] = useState(() => new Set());
  const [agencySearch, setAgencySearch] = useState('');
  const [minValue, setMinValue] = useState(0); // in billions
  const [fiscalYear, setFiscalYear] = useState('all');
  const [heroView, setHeroView] = useState('treemap');
  const [selected, setSelected] = useState(null);
  const [selectedAward, setSelectedAward] = useState(null); // ticker → award detail modal
  const [quickViewRecipient, setQuickViewRecipient] = useState(null); // explorer row → contractor quick-view
  const [queryOpen, setQueryOpen] = useState(false);
  const [querySeed, setQuerySeed] = useState(''); // text handed off from the teaser

  // Prefer pre-aggregated BigQuery rollups (scales to millions of rows); fall
  // back to client-side aggregation of the small live-award slice.
  // Rollup rows are per (fiscal_year, recipient, agency). Collapse them for the
  // CURRENT view: a specific year keeps just that year's rows; "All years" sums
  // a recipient across every year. Doing this here — rather than filtering a
  // pre-summed list — is what makes per-year totals correct.
  const recipients = useMemo(() => {
    const rows = rollup?.recipients;
    // Fallback path: aggregate() emits recipients WITHOUT a fiscalYear field, so
    // scope it the old way (inclusion by award year) — its total stays all-years,
    // which is the degraded raw-award path's existing behavior.
    if (!rows || !rows.length) {
      const agg = aggregate(awards);
      return fiscalYear === 'all'
        ? agg
        : agg.filter((r) => r.awards.some((a) => a.year === Number(fiscalYear)));
    }

    const scoped =
      fiscalYear === 'all' ? rows : rows.filter((r) => r.fiscalYear === Number(fiscalYear));

    const m = new Map();
    for (const r of scoped) {
      const key = r.name;
      let rec = m.get(key);
      if (!rec) {
        rec = { ...r, total: 0, count: 0, awards: [], _maxAward: 0 };
        m.set(key, rec);
      }
      rec.total += r.total;
      rec.count += r.count;
      rec.awards.push(...r.awards);
      if (r.total >= rec._maxAward) {
        rec._maxAward = r.total;
        rec.agency = r.agency; // primary agency = the one with the largest spend
      }
    }
    return [...m.values()].map((r) => ({ ...r, avg: r.count ? r.total / r.count : 0 }));
  }, [rollup, awards, fiscalYear]);
  const coverageObj = rollup?.coverage || coverage;

  // Typing in the teaser opens the full builder and carries the keystroke over.
  const startBuilder = useCallback((seed) => {
    setQuerySeed(seed || '');
    setQueryOpen(true);
  }, []);

  // Debounce the agency search box (the list can be 80-100+ long).
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(agencySearch.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [agencySearch]);

  // Complete, fiscal-year-aware agency list (raw names) with true totals+counts,
  // sorted by spend desc. From the agency rollup (all agencies), else derived
  // from the loaded recipients as a fallback.
  const agencyTotals = useMemo(() => {
    const m = new Map();
    const rows = rollup?.agencyRollup;
    if (rows && rows.length) {
      for (const a of rows) {
        if (fiscalYear !== 'all' && a.fiscalYear !== Number(fiscalYear)) continue;
        const cur = m.get(a.agency) || { agency: a.agency, total: 0, count: 0 };
        cur.total += a.total;
        cur.count += a.count;
        m.set(a.agency, cur);
      }
    } else {
      for (const r of recipients) {
        if (fiscalYear !== 'all' && !r.awards.some((a) => a.year === Number(fiscalYear))) continue;
        const cur = m.get(r.agency) || { agency: r.agency, total: 0, count: 0 };
        cur.total += r.total;
        cur.count += r.count;
        m.set(r.agency, cur);
      }
    }
    return [...m.values()].sort((x, y) => y.total - x.total);
  }, [rollup, recipients, fiscalYear]);

  // Colors are positional: rank the CURRENT view's agencies (selected ones when
  // filtering, else all) by spend and bind the top 10 to slots; the rest → Other.
  const colorRanking = useMemo(() => {
    if (selectedAgencies.size) return agencyTotals.filter((a) => selectedAgencies.has(a.agency));
    return agencyTotals;
  }, [agencyTotals, selectedAgencies]);
  const slotMap = useMemo(() => buildSlotMap(colorRanking), [colorRanking]);
  const topSet = useMemo(
    () => new Set(colorRanking.slice(0, MAX_SLOTS).map((a) => a.agency)),
    [colorRanking],
  );
  const colorOf = useCallback((agency) => colorForAgency(slotMap, agency), [slotMap]);

  // ALL fiscal years present (newest first). No cap (was .slice(0, 3), which hid
  // every year but the latest three and kept FY2008 from ever appearing).
  const years = useMemo(() => {
    if (coverageObj?.fiscalYears?.length) {
      return [...coverageObj.fiscalYears].sort((a, b) => b - a);
    }
    const s = new Set(recipients.flatMap((r) => r.awards.map((a) => a.year)).filter(Boolean));
    return [...s].sort((a, b) => b - a);
  }, [coverageObj, recipients]);

  // Recipients matching the current filters, each tagged with a vizAgency that
  // folds non-top-10 agencies into a single "Other" series for the charts.
  const filtered = useMemo(() => {
    return (
      recipients
        .filter((r) => (selectedAgencies.size ? selectedAgencies.has(r.agency) : true))
        .filter((r) => r.total >= minValue * 1e9)
        // No fiscal-year filter here: `recipients` is already scoped to the
        // selected year (see the memo above). The previous `.some(a => a.year ===
        // fy)` check admitted a recipient based on one year while still rendering
        // their all-years total.
        .map((r) => ({ ...r, vizAgency: topSet.has(r.agency) ? r.agency : OTHER_LABEL }))
        .sort((a, b) => b.total - a.total)
    );
  }, [recipients, selectedAgencies, minValue, topSet]);

  // TRUE total across all agencies for the current FY selection (complete agency
  // rollup) — NOT the truncated top-N recipient sum, which understated the total
  // and pushed Defense's share past 100%.
  const totalObligatedTrue = useMemo(
    () => agencyTotals.reduce((s, a) => s + a.total, 0),
    [agencyTotals],
  );
  const totalAwards = useMemo(() => agencyTotals.reduce((s, a) => s + a.count, 0), [agencyTotals]);
  const largestAgency = agencyTotals[0]
    ? {
        ag: agencyTotals[0].agency,
        // Same (complete) denominator as the numerator → ≤ 100 by construction;
        // clamp as a belt-and-suspenders guard.
        pct: totalObligatedTrue
          ? Math.min(100, Math.round((agencyTotals[0].total / totalObligatedTrue) * 100))
          : 0,
      }
    : null;

  // The treemap can only carry legible labels for a handful of tiles, so it shows
  // a top-N by obligated value, capped PER AGENCY so one agency (Defense) can't
  // contribute hundreds of slivers. The long tail lives in the "Leading
  // contractors" list below — nothing hidden; the caption states "Top N of M".
  const treemapRecipients = useMemo(() => {
    const TREEMAP_MAX = 40;
    const PER_COL_MAX = 8;
    const perCol = new Map();
    const out = [];
    for (const r of filtered) {
      // filtered is already sorted by total desc
      const n = perCol.get(r.vizAgency) || 0;
      if (n >= PER_COL_MAX) continue;
      perCol.set(r.vizAgency, n + 1);
      out.push(r);
      if (out.length >= TREEMAP_MAX) break;
    }
    return out;
  }, [filtered]);

  // Agency share of the complete (true) obligated total — same denominator as
  // the largest-agency %, so shares never sum past 100. Sub-0.1% reads "<0.1%".
  const shareOf = useCallback(
    (total) => {
      if (!totalObligatedTrue) return '—';
      const pct = (total / totalObligatedTrue) * 100;
      if (pct >= 10) return `${Math.round(pct)}%`;
      if (pct >= 0.1) return `${pct.toFixed(1)}%`;
      return '<0.1%';
    },
    [totalObligatedTrue],
  );

  // Award count per fiscal year, oldest → newest. Feeds the card-2 sparkline,
  // which renders only when 2+ years exist (one point is not a trend).
  const countSeries = useMemo(() => {
    const rows = rollup?.agencyRollup;
    if (!rows?.length) return [];
    const m = new Map();
    for (const a of rows) {
      m.set(a.fiscalYear, (m.get(a.fiscalYear) || 0) + a.count);
    }
    return [...m.entries()].sort((x, y) => x[0] - y[0]).map(([year, count]) => ({ year, count }));
  }, [rollup]);

  const label =
    selectedAgencies.size === 0
      ? 'All agencies'
      : selectedAgencies.size === 1
        ? [...selectedAgencies][0]
        : `${selectedAgencies.size} agencies`;

  const toggleAgency = (ag) =>
    setSelectedAgencies((cur) => {
      const next = new Set(cur);
      if (next.has(ag)) next.delete(ag);
      else next.add(ag);
      return next;
    });
  const clearAgencies = () => setSelectedAgencies(new Set());

  // Agency chips for the rail: full list, filtered by the search box.
  const visibleAgencyChips = useMemo(() => {
    if (!debouncedSearch) return agencyTotals;
    return agencyTotals.filter((a) => a.agency.toLowerCase().includes(debouncedSearch));
  }, [agencyTotals, debouncedSearch]);

  return (
    <div className="gcx-page">
      <CategoryBar active="capitol" activeItem="Government Contracts" />

      {/* Shared, full-bleed dataset ticker (same component + speed as every other
          dataset page). Awards map to the generic item shape; _award carries the
          full record so a click still opens the award-analysis modal. */}
      <DatasetTicker
        ariaLabel="Latest contract awards"
        items={recentAwards
          .filter((a) => a.recipient && a.amount > 0)
          .slice(0, 30)
          .map((a) => ({
            id: a.id,
            lead: a.agency,
            main: a.recipient,
            value: fmtUSD(a.amount),
            _award: a,
          }))}
        onSelect={(it) => setSelectedAward(it._award)}
      />

      <header className="gcx-header">
        <p className="gcx-eyebrow">DATASETS · USASPENDING.GOV</p>
        <h1 className="gcx-title">Government contracts</h1>
      </header>

      <EzanaQLTeaser onStart={startBuilder} hidden={queryOpen} />

      {queryOpen && (
        <EzanaQLBuilder
          activeFilters={{ agencies: [...selectedAgencies], fiscalYear, minValue }}
          seedPrompt={querySeed}
          onClose={() => {
            setQueryOpen(false);
            setQuerySeed('');
          }}
        />
      )}

      <div className="gcx-body">
        {/* filter rail */}
        <aside className="gcx-rail">
          <button
            type="button"
            className="gcx-reportbtn"
            onClick={() => {
              if (queryOpen) {
                setQueryOpen(false);
                setQuerySeed('');
              } else {
                startBuilder('');
              }
            }}
          >
            {queryOpen ? 'Close builder' : 'Generate report'}
          </button>
          <FilterGroup title="Fiscal year">
            <FiscalYearSelect value={fiscalYear} years={years} onChange={setFiscalYear} />
          </FilterGroup>

          <FilterGroup
            title="Min award value"
            meta={minValue >= 130 ? '≥ $130B+' : `≥ $${minValue}B`}
          >
            <input
              type="range"
              min={0}
              max={130}
              step={1}
              value={minValue}
              onChange={(e) => setMinValue(Number(e.target.value))}
              className="gcx-slider"
              aria-label="Minimum total award value in billions"
            />
            <div className="gcx-slider-ends gcx-mono">
              <span>$0B</span>
              <span>$130B+</span>
            </div>
          </FilterGroup>

          <FilterGroup title="Awarding agency" meta={agencyTotals.length}>
            <div className="gcx-agency-search">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                value={agencySearch}
                onChange={(e) => setAgencySearch(e.target.value)}
                placeholder="Filter agencies"
                className="gcx-agency-search-input"
                aria-label="Search awarding agencies"
              />
            </div>
            {selectedAgencies.size > 0 && (
              <div className="gcx-agency-head">
                <span className="gcx-agency-count gcx-mono">{selectedAgencies.size} selected</span>
                <button type="button" className="gcx-agency-clear" onClick={clearAgencies}>
                  Clear
                </button>
              </div>
            )}
            <div className="gcx-agency-list">
              {visibleAgencyChips.length === 0 ? (
                <div className="gcx-rail-note">No agency matches “{agencySearch}”.</div>
              ) : (
                visibleAgencyChips.map((a) => (
                  <AgencyRow
                    key={a.agency}
                    agency={a.agency}
                    count={a.count}
                    share={shareOf(a.total)}
                    color={topSet.has(a.agency) ? colorOf(a.agency) : OTHER_COLOR}
                    active={selectedAgencies.has(a.agency)}
                    onClick={() => toggleAgency(a.agency)}
                  />
                ))
              )}
            </div>
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
            <MetricCard
              label="Total obligated"
              value={fmtUSD(totalObligatedTrue)}
              accent="var(--emerald)"
              visual={
                <ShareStrip ranking={colorRanking} colorOf={colorOf} total={totalObligatedTrue} />
              }
              meta={isLive ? `${fmtInt(agencyTotals.length)} agencies` : 'sample'}
            />
            <MetricCard
              label="Awards"
              value={fmtInt(totalAwards)}
              accent="var(--info)"
              visual={<CountSpark series={countSeries} />}
              meta="in current selection"
            />
            <DispersionCard agencyTotals={agencyTotals} colorOf={colorOf} />
          </div>

          <AgencyLegend
            ranking={colorRanking}
            selected={selectedAgencies}
            onPick={toggleAgency}
            colorOf={colorOf}
          />

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
              <>
                <Treemap recipients={treemapRecipients} onPick={setSelected} colorOf={colorOf} />
                <p className="gcx-treemap-cap">
                  {/* Rollup rows are trimmed to a top slice per year (see
                      getContractRollups), so `filtered.length` is "recipients
                      sent", not "recipients that exist" — don't claim an "of N"
                      total the page can no longer substantiate. */}
                  Top {treemapRecipients.length.toLocaleString()} recipients by obligated value.
                </p>
              </>
            ) : (
              <ShareDonut ranking={colorRanking} colorOf={colorOf} />
            )}
          </section>

          <p className="gcx-note">{note}</p>

          {/* Leading contractors — now inside .gcx-main so its left edge
              aligns with the treemap and its width tracks the main column. */}
          <section className="gcx-card gcx-list">
            <div className="gcx-list-head">
              <h2 className="gcx-hero-title">Leading contractors · {label}</h2>
              <span className="gcx-list-count">
                {Math.min(filtered.length, 25).toLocaleString()} shown
              </span>
            </div>
            <ContractorList
              recipients={filtered.slice(0, 25)}
              onPick={setSelected}
              colorOf={colorOf}
            />
          </section>

          {/* Full-table, server-paginated explorer (all 15 FYs, real filters) —
              scales past the overview slice above via /api/datasets/contracts. */}
          <ContractsExplorer coverage={coverage} onOpenQuickView={setQuickViewRecipient} />
        </main>
      </div>

      {selected && (
        <DrillModal
          recipient={selected}
          allRecipients={filtered}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
          colorOf={colorOf}
        />
      )}

      {selectedAward && (
        <AwardDetailModal award={selectedAward} onClose={() => setSelectedAward(null)} />
      )}

      {quickViewRecipient && (
        <ContractorQuickView
          recipient={quickViewRecipient}
          onClose={() => setQuickViewRecipient(null)}
        />
      )}
    </div>
  );
}

/* ─────────────────────── Award detail + AI analysis ─────────────────────── */
function fmtAwardDate(d) {
  if (!d) return 'Not reported';
  // action_date is a plain 'YYYY-MM-DD' string; render without a TZ shift.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
  if (!m) return String(d);
  const months = [
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
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/* Hero amount: full comma-separated dollars on desktop, per the design.
   fmtUSD abbreviates and is used page-wide, so this is a separate helper. */
function fmtUSDFull(v) {
  const n = Number(v) || 0;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/* Sentence-case a SHOUTED source label (NAICS/PSC descriptions arrive all caps).
   Leaves already-mixed-case strings alone. */
function sentenceCase(s) {
  if (!s) return s;
  const str = String(s);
  if (str !== str.toUpperCase()) return str;
  return str.charAt(0) + str.slice(1).toLowerCase();
}

/* Only one award modal is mounted at a time, so the heading the dialog points
   its aria-labelledby at can carry a constant id. */
const AWARD_HEADING_ID = 'gcx-award-heading';

/* The analysis mark. Deliberately an inline glyph rather than an icon import:
   it is part of the badge's type, and it pulses on its own during loading. */
function AwardSpark({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
    </svg>
  );
}

/* One ledger row. The row renders whether or not the field is populated: an
   absent value reads "Not reported" instead of silently leaving the record,
   so what USAspending does not publish stays visible. */
function AwardFact({ label, value, kind = 'name', sublabel }) {
  const empty = value == null || value === '';
  return (
    <div className="gcx-award-row">
      <div className="gcx-award-eyebrow">{label}</div>
      <div className="gcx-award-row-v">
        {empty ? (
          <span className="gcx-award-none">Not reported</span>
        ) : kind === 'code' ? (
          <span className="gcx-award-code gcx-award-code--plain">{value}</span>
        ) : kind === 'code-with-label' ? (
          <>
            <span className="gcx-award-code">{value}</span>
            {sublabel ? (
              <span className="gcx-award-codelabel">{sentenceCase(sublabel)}</span>
            ) : null}
          </>
        ) : (
          <span className="gcx-award-value">{value}</span>
        )}
      </div>
    </div>
  );
}

/* On-demand, explicitly-labeled AI analysis. Fetches when mounted; the API takes
   only the award id and builds its prompt server-side from the DB record. The
   badge, disclaimer and hairline render in all three states, so the column never
   reflows as the request resolves. */
function AwardAnalysis({ awardId }) {
  const [state, setState] = useState('loading'); // loading | error | ready
  const [data, setData] = useState(null);
  const [nonce, setNonce] = useState(0); // bump to retry

  useEffect(() => {
    let alive = true;
    setState('loading');
    setData(null);
    (async () => {
      try {
        const res = await fetch('/api/gov-contracts/award-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generatedAwardId: awardId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok || !json.analysis) {
          setState('error');
          return;
        }
        setData(json.analysis);
        setState('ready');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [awardId, nonce]);

  return (
    <section className="gcx-award-analysis">
      <div className="gcx-award-analysis-inner">
        <div className="gcx-award-badge">
          <AwardSpark /> AI-generated analysis
        </div>
        <p className="gcx-award-disclaimer">
          Generated by Claude from this award&apos;s public USAspending record. Not investment
          advice, not reported fact, not verified against outside sources.
        </p>
        <div className="gcx-award-rule" />

        {state === 'loading' && (
          <div className="gcx-award-loading">
            <span className="gcx-award-spark">
              <AwardSpark size={22} />
            </span>
            <span className="gcx-award-loading-note">Claude is reading the award record</span>
            <div className="gcx-award-bars" aria-hidden="true">
              <span className="gcx-award-bar" />
              <span className="gcx-award-bar" />
              <span className="gcx-award-bar" />
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="gcx-award-error">
            <AlertCircle size={22} strokeWidth={1.75} aria-hidden="true" />
            <p className="gcx-award-error-t">Analysis is unavailable right now</p>
            <p className="gcx-award-error-s">
              The award record on the left is complete and unaffected.
            </p>
            <button
              type="button"
              className="gcx-award-ghost gcx-award-retry"
              onClick={() => setNonce((n) => n + 1)}
            >
              <RotateCw size={13} aria-hidden="true" /> Retry analysis
            </button>
          </div>
        )}

        {state === 'ready' && data && (
          <div className="gcx-award-state">
            {data.summary ? <p className="gcx-award-summary">{data.summary}</p> : null}
            {Array.isArray(data.sectors) && data.sectors.length > 0 ? (
              <div>
                <div className="gcx-award-eyebrow gcx-award-sectors-h">
                  Sectors and supply chains it may touch
                </div>
                {data.sectors.map((s, i) => (
                  <div key={i} className="gcx-award-sector">
                    <span className="gcx-award-sector-name">{s.name}</span>
                    {s.why ? <span className="gcx-award-sector-why">{s.why}</span> : null}
                  </div>
                ))}
              </div>
            ) : null}
            {data.uncertainty ? (
              <div className="gcx-award-uncertainty">
                <div className="gcx-award-eyebrow">Uncertainty</div>
                <p className="gcx-award-uncertainty-note">{data.uncertainty}</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function AwardDetailModal({ award: a, onClose }) {
  const router = useRouter();
  const [watchlisted, setWatchlisted] = useState(false); // TODO: persist via /api/watchlist

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const pop = [a.city, a.state].filter(Boolean).join(', ');

  return (
    <div className="gcx-modal-backdrop" onClick={onClose}>
      <div
        className="gcx-award-modal-root"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={AWARD_HEADING_ID}
      >
        <button type="button" className="gcx-award-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="gcx-award-ledger">
          <div className="gcx-award-eyebrow">
            Government contract award{a.fiscalYear ? ` · FY${a.fiscalYear}` : ''}
          </div>
          <h3 className="gcx-award-name" id={AWARD_HEADING_ID}>
            {a.recipient}
          </h3>
          <p className="gcx-award-agency">
            {a.agency}
            {a.subAgency ? ` · ${a.subAgency}` : ''}
          </p>

          <div className="gcx-award-hero">
            <div>
              <div className="gcx-award-eyebrow">Amount</div>
              {/* Both spellings render; CSS shows one. No resize observer, and
                  no hydration mismatch from measuring at render time. */}
              <span className="gcx-award-amount gcx-award-amount--full">
                {fmtUSDFull(a.amount)}
              </span>
              <span className="gcx-award-amount gcx-award-amount--short">{fmtUSD(a.amount)}</span>
            </div>
            <div className="gcx-award-when">
              <div className="gcx-award-eyebrow">Action date</div>
              <span className="gcx-award-date">{fmtAwardDate(a.date)}</span>
            </div>
          </div>

          <AwardFact label="PIID" value={a.piid} kind="code" />
          <AwardFact label="NAICS" value={a.naics} kind="code-with-label" sublabel={a.naicsLabel} />
          <AwardFact label="PSC" value={a.psc} kind="code-with-label" sublabel={a.pscLabel} />
          <AwardFact label="Recipient parent" value={a.parent} />
          <AwardFact label="Funding agency" value={a.fundingAgency} />
          <AwardFact label="Place of performance" value={pop} />

          <div className="gcx-award-desc-block">
            <div className="gcx-award-eyebrow">Description · source text</div>
            {a.description ? (
              <p className="gcx-award-desc-text">{a.description}</p>
            ) : (
              <p className="gcx-award-desc-none">Not provided in the USAspending record.</p>
            )}
          </div>
        </div>

        <AwardAnalysis awardId={a.id} />

        <div className="gcx-award-foot">
          <a
            className="gcx-award-src"
            href={`https://www.usaspending.gov/award/${encodeURIComponent(a.id)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on USAspending <ExternalLink size={13} aria-hidden="true" />
          </a>
          <div className="gcx-award-acts">
            <button
              type="button"
              className={watchlisted ? 'gcx-award-ghost is-on' : 'gcx-award-ghost'}
              onClick={() => setWatchlisted((w) => !w)}
            >
              {watchlisted ? (
                <Check size={13} aria-hidden="true" />
              ) : (
                <Plus size={13} aria-hidden="true" />
              )}
              {watchlisted ? 'On watchlist' : 'Add to watchlist'}
            </button>
            <button
              type="button"
              className="gcx-award-primary"
              onClick={() =>
                router.push(`/datasets/government/contracts/dossier/${slugify(a.recipient)}`)
              }
            >
              Recipient profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── Rail bits ────────────────────────── */
/**
 * Slim always-visible preview of the EzanaQL report builder. Typing here opens
 * the full builder below and hands off the text, so the user never loses a
 * keystroke. Purely an entry point — it runs nothing on its own.
 */
function EzanaQLTeaser({ onStart, hidden }) {
  const [teaserFocused, setTeaserFocused] = useState(false);
  if (hidden) return null;
  const start = (value) => {
    if (!value) return;
    onStart(value);
  };
  return (
    <section className="gcx-card gcx-qlteaser">
      <div className="gcx-qlteaser-head">
        <span className="gcx-ql-title">EzanaQL report builder</span>
        <span className="gcx-ql-beta">BETA</span>
      </div>
      <div className="gcx-ql-ai gcx-qlteaser-ai">
        <span className="gcx-ql-ai-badge">
          <Sparkles size={12} /> Ezana AI
        </span>
        <span className="gcx-ql-ai-field">
          {!teaserFocused && (
            <span className="gcx-ql-ai-caret" aria-hidden="true">
              |
            </span>
          )}
          <input
            className="gcx-ql-ai-input"
            value=""
            onFocus={() => setTeaserFocused(true)}
            onBlur={() => setTeaserFocused(false)}
            onChange={(e) => start(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              start(e.clipboardData.getData('text'));
            }}
            placeholder="Describe the report in plain English — we'll write the EzanaQL"
            aria-label="Describe the report you want"
          />
        </span>
        <button
          type="button"
          className="gcx-btn gcx-btn-primary gcx-ql-gen"
          onClick={() => onStart('')}
        >
          Generate EzanaQL
        </button>
      </div>
    </section>
  );
}

function FilterGroup({ title, meta, children }) {
  return (
    <div className="gcx-fg">
      <div className="gcx-fg-head">
        <div className="gcx-fg-title">{title}</div>
        {meta != null && <span className="gcx-fg-meta gcx-mono">{meta}</span>}
      </div>
      {children}
    </div>
  );
}
// Fiscal year selector. Custom listbox (not a native <select>) so the popup
// can carry the design system; years still derive from coverage, never hardcoded.
function FiscalYearSelect({ value, years, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const options = useMemo(
    () => [
      { value: 'all', label: 'All years', mono: false },
      ...years.map((y) => ({ value: String(y), label: `FY${y}`, mono: true })),
    ],
    [years],
  );

  const selectedIdx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selectedIdx];

  // Sync the keyboard cursor to the current selection each time the panel opens.
  useEffect(() => {
    if (open) setActiveIdx(selectedIdx);
  }, [open, selectedIdx]);

  // Outside pointerdown closes the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Keep the active option scrolled into view during keyboard navigation.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [open, activeIdx]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const commit = (idx) => {
    onChange(options[idx].value);
    close();
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIdx(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIdx(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(activeIdx);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="gcx-select-wrap" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="gcx-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Fiscal year"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span className={selected?.mono ? 'gcx-select-val gcx-num' : 'gcx-select-val'}>
          {selected?.label ?? 'All years'}
        </span>
      </button>
      <i
        className={`bi bi-chevron-down gcx-select-caret ${open ? 'is-open' : ''}`}
        aria-hidden="true"
      />

      {open && (
        <div
          ref={listRef}
          className="gcx-menu"
          role="listbox"
          tabIndex={-1}
          aria-label="Fiscal year"
          aria-activedescendant={`gcx-fy-opt-${activeIdx}`}
          onKeyDown={onKeyDown}
        >
          {options.map((o, i) => {
            const isSel = o.value === value;
            return (
              <div
                key={o.value}
                id={`gcx-fy-opt-${i}`}
                data-idx={i}
                role="option"
                aria-selected={isSel}
                className={`gcx-menu-item ${i === activeIdx ? 'is-active' : ''} ${
                  isSel ? 'is-selected' : ''
                }`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => commit(i)}
              >
                <span className="gcx-menu-check" aria-hidden="true">
                  {isSel ? <i className="bi bi-check2" /> : null}
                </span>
                <span className={o.mono ? 'gcx-num' : undefined}>{o.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Dense agency "composition" row: color rail, name, award count, share %.
function AgencyRow({ agency, count, share, color, active, onClick }) {
  return (
    <button
      type="button"
      className={`gcx-arow ${active ? 'is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="gcx-arow-rail" style={{ background: color }} aria-hidden="true" />
      <span className="gcx-arow-mid">
        <span className="gcx-arow-name">{agency}</span>
        <span className="gcx-arow-count gcx-mono">{count.toLocaleString()} awards</span>
      </span>
      <span className="gcx-arow-share gcx-mono">{share}</span>
    </button>
  );
}

/**
 * Centered metric card. `visual` is an optional node rendered between the value
 * and the meta line.
 */
function MetricCard({ label, value, meta, visual, accent }) {
  return (
    <div className="gcx-metric" style={accent ? { '--gcx-accent': accent } : undefined}>
      <div className="gcx-metric-label">{label}</div>
      <div className="gcx-metric-value gcx-mono">{value}</div>
      {visual}
      {meta && <div className="gcx-metric-meta">{meta}</div>}
    </div>
  );
}

/**
 * Composition strip — the top agencies' share of obligated value as a single
 * segmented bar. Reuses the positional slot colors so it reads as a compressed
 * echo of the treemap, not a new encoding.
 */
function ShareStrip({ ranking, colorOf, total }) {
  if (!total || !ranking.length) return null;
  const top = ranking.slice(0, 6);
  const rest = ranking.slice(6).reduce((s, a) => s + a.total, 0);
  const segs = [
    ...top.map((a) => ({ key: a.agency, w: (a.total / total) * 100, c: colorOf(a.agency) })),
    ...(rest > 0 ? [{ key: '__rest', w: (rest / total) * 100, c: 'var(--text-faint)' }] : []),
  ];
  return (
    <div className="gcx-mstrip" aria-hidden="true">
      {segs.map((s) => (
        <span
          key={s.key}
          className="gcx-mstrip-seg"
          style={{ width: `${s.w}%`, background: s.c }}
        />
      ))}
    </div>
  );
}

/**
 * Sparkline of award COUNT per fiscal year. Honest by construction: renders
 * nothing until at least two fiscal years are loaded, since one point is not a
 * trend.
 */
function CountSpark({ series }) {
  if (!series || series.length < 2) return null;
  const W = 80;
  const H = 14;
  const max = Math.max(...series.map((p) => p.count), 1);
  const min = Math.min(...series.map((p) => p.count), 0);
  const span = max - min || 1;
  const pts = series.map((p, i) => {
    const x = (i / (series.length - 1)) * W;
    const y = H - ((p.count - min) / span) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg
      className="gcx-mspark"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label="Award count by fiscal year"
    >
      <polyline
        points={pts.join(' ')}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="gcx-mspark-line"
      />
    </svg>
  );
}

/**
 * Award CONCENTRATION — the share of awards going to the agency with the most
 * awards, contrasted with its average award size. Deliberately NOT the "% of
 * obligated value" gauge (that number already appears in the legend bar, the
 * agency rail, and the treemap). Award-count concentration is a different, more
 * revealing cut — an agency can hold a small share of dollars while issuing the
 * overwhelming majority of individual awards.
 */
function DispersionCard({ agencyTotals, colorOf }) {
  const stat = useMemo(() => {
    if (!agencyTotals.length) return null;
    const totalAwards = agencyTotals.reduce((s, a) => s + a.count, 0);
    if (!totalAwards) return null;
    const byCount = [...agencyTotals].sort((a, b) => b.count - a.count);
    const leader = byCount[0];
    return {
      agency: leader.agency,
      pct: Math.round((leader.count / totalAwards) * 100),
      avg: leader.count ? leader.total / leader.count : 0,
    };
  }, [agencyTotals]);

  if (!stat) {
    return <MetricCard label="Award concentration" value="—" meta="" />;
  }
  return (
    <MetricCard
      label="Most awards issued"
      value={`${stat.pct}%`}
      accent={colorOf(stat.agency)}
      visual={<div className="gcx-metric-name">{stat.agency}</div>}
      meta={`${fmtUSD(stat.avg)} average award`}
    />
  );
}

// Legend: a single 100%-composition bar (<=10 visible series + Other) with a
// centered, toggleable label row. Segment and label share the same onPick, so
// they stay in sync with selectedAgencies (no separate visibility set).
function AgencyLegend({ ranking, selected, onPick, colorOf }) {
  const top = ranking.slice(0, MAX_SLOTS);
  const hasOther = ranking.length > MAX_SLOTS;
  const otherTotal = ranking.slice(MAX_SLOTS).reduce((s, a) => s + a.total, 0);
  const grand = ranking.reduce((s, a) => s + a.total, 0) || 1;

  const series = [
    ...top.map((a) => ({
      key: a.agency,
      label: a.agency,
      total: a.total,
      color: colorOf(a.agency),
      pick: true,
    })),
    ...(hasOther && otherTotal > 0
      ? [
          {
            key: OTHER_LABEL,
            label: OTHER_LABEL,
            total: otherTotal,
            color: OTHER_COLOR,
            pick: false,
          },
        ]
      : []),
  ];
  if (series.length === 0) return null;

  const pctOf = (t) => (t / grand) * 100;
  const fmtPct = (p) => (p >= 10 ? `${Math.round(p)}%` : p >= 0.1 ? `${p.toFixed(1)}%` : '<0.1%');
  // "Dimmed" = a selection exists and this series is not part of it.
  const dimmed = (s) => selected.size > 0 && !(s.pick && selected.has(s.key));

  return (
    <div className="gcx-legend">
      <div className="gcx-compbar" role="img" aria-label="Agency share of obligated value">
        {series.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`gcx-compseg ${dimmed(s) ? 'is-dim' : ''}`}
            style={{ width: `${pctOf(s.total)}%`, background: s.color }}
            onClick={s.pick ? () => onPick(s.key) : undefined}
            disabled={!s.pick}
            title={`${s.label} · ${fmtPct(pctOf(s.total))}`}
            aria-label={`${s.label}, ${fmtPct(pctOf(s.total))}`}
          />
        ))}
      </div>
      <div className="gcx-legend-labels">
        {series.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`gcx-legend-label ${dimmed(s) ? 'is-dim' : ''}`}
            onClick={s.pick ? () => onPick(s.key) : undefined}
            disabled={!s.pick}
            aria-pressed={s.pick ? selected.has(s.key) : undefined}
          >
            <span
              className="gcx-legend-chip-dot"
              style={{ background: s.color }}
              aria-hidden="true"
            />
            <span className="gcx-legend-name">{s.label}</span>
            <span className="gcx-legend-pct gcx-mono">{fmtPct(pctOf(s.total))}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────── Treemap ────────────────────────── */
function Treemap({ recipients, onPick, colorOf }) {
  // recipients is a per-agency-capped top-N (from the parent), so every tile can
  // carry a legible label. Taller viewBox gives each tile real height.
  const W = 1100;
  const H = 520;
  // useId keeps the clip ids unique if two treemaps ever mount on one page. Its
  // output contains colons, which are not usable inside url(#…), so strip them.
  const uid = useId().replace(/:/g, '');
  const probeRef = useRef(null);
  const [fonts, setFonts] = useState(null);
  // The probes are real <text> nodes in this SVG, so getComputedStyle returns
  // the font each label class actually paints with, letter-spacing included.
  // Measuring only after mount means the first paint (and any server render)
  // matches what React produced from the estimate, so there is no hydration
  // mismatch; the measured pass lands on the next frame.
  useEffect(() => {
    const g = probeRef.current;
    if (!g) return;
    const read = (cls) => {
      const node = g.querySelector(`.${cls}`);
      if (!node) return null;
      const cs = window.getComputedStyle(node);
      if (!cs || !cs.fontSize) return null;
      return {
        font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
        letterSpacing: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing,
      };
    };
    const next = { tag: read('gcx-tl-tag'), name: read('gcx-tl-name'), sm: read('gcx-tl-sm') };
    if (next.tag || next.name || next.sm) setFonts(next);
  }, []);
  const GAP = 3;
  const MIN_TILE_H = 22; // never render a sliver
  const maxValue = Math.max(...recipients.map((r) => r.total), 1);

  // Group by vizAgency (top-10 raw name, or "Other"); order columns by spend,
  // Other always last. Drop any empty column.
  const byAgency = {};
  for (const r of recipients) (byAgency[r.vizAgency] ||= []).push(r);
  const columns = Object.keys(byAgency)
    .map((a) => ({
      agency: a,
      items: byAgency[a].sort((x, y) => y.total - x.total),
      total: byAgency[a].reduce((s, x) => s + x.total, 0),
    }))
    .filter((c) => c.items.length > 0)
    .sort((x, y) => {
      if (x.agency === OTHER_LABEL) return 1;
      if (y.agency === OTHER_LABEL) return -1;
      return y.total - x.total;
    });

  // Column widths: a readable MINIMUM for every column, proportional remainder by
  // spend, then CAP any single column at 35% of W and redistribute the excess so
  // Defense stays largest but can't crush the rest.
  const totalGaps = GAP * Math.max(0, columns.length - 1);
  const avail = W - totalGaps;
  const grandTotal = columns.reduce((s, c) => s + c.total, 0) || 1;
  const MIN_COL = 130;
  const MAX_COL = 0.35 * W;
  const useMin = MIN_COL * columns.length <= avail;
  const remainder = useMin ? avail - MIN_COL * columns.length : avail;
  let widths = columns.map((c) =>
    useMin
      ? MIN_COL + (c.total / grandTotal) * remainder
      : Math.max(24, (c.total / grandTotal) * avail),
  );
  const capped = widths.map((w) => Math.min(w, MAX_COL));
  const excess = widths.reduce((s, w) => s + w, 0) - capped.reduce((s, w) => s + w, 0);
  if (excess > 0) {
    const room = capped.map((w) => Math.max(0, MAX_COL - w));
    const roomSum = room.reduce((s, r) => s + r, 0) || 1;
    widths = capped.map((w, i) => w + excess * (room[i] / roomSum));
  } else {
    widths = capped;
  }

  let x = 0;
  const tiles = [];
  columns.forEach((col, ci) => {
    const colW = widths[ci];
    // Tile heights are proportional WITHIN the column's shown items, with a hard
    // readable minimum. Capped item counts keep the minimums from overflowing.
    const itemsTotal = col.items.reduce((s, r) => s + r.total, 0) || 1;
    const colGaps = GAP * Math.max(0, col.items.length - 1);
    const colInner = H - colGaps;
    let y = 0;
    col.items.forEach((r) => {
      const h = Math.max(MIN_TILE_H, (r.total / itemsTotal) * colInner);
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
      {/* Font probes. Hidden from paint and from assistive tech; they exist so
          the measurement pass can read the real computed font of each label
          class off the DOM. */}
      <g ref={probeRef} aria-hidden="true" visibility="hidden" pointerEvents="none">
        <text className="gcx-tl-tag">M</text>
        <text className="gcx-tl-name">M</text>
        <text className="gcx-tl-sm">M</text>
      </g>
      {tiles.map((t, i) => {
        const opacity = 0.14 + 0.5 * (t.r.total / maxValue);
        const big = t.w > 110 && t.h > 44;
        const med = !big && t.w > 80 && t.h > 26;
        const small = !big && !med && t.h > 14;
        const clipId = `gcx-clip-${uid}-${i}`;
        const tagText = big ? measuredTrim(t.agency, t.w, fonts?.tag, 10, 16) : null;
        const bigName = big ? measuredTrim(t.r.name, t.w, fonts?.name, 11, 16) : null;
        const medName = med ? measuredTrim(t.r.name, t.w, fonts?.name, 11, 14) : null;
        const smallText = small
          ? measuredTrim(`${t.r.name} · ${fmtUSD(t.r.total)}`, t.w, fonts?.sm, 10, 12)
          : null;
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
            <defs>
              <clipPath id={clipId}>
                <rect x={t.x} y={t.y} width={t.w} height={t.h} rx={5} />
              </clipPath>
            </defs>
            <rect
              x={t.x}
              y={t.y}
              width={t.w}
              height={t.h}
              rx={5}
              fill={colorOf(t.agency)}
              fillOpacity={opacity}
              stroke={colorOf(t.agency)}
              strokeOpacity={0.35}
            />
            {/* Every label is clipped to its own tile, so no measurement error
                can ever paint one across a neighbour. The trims above still do
                the work of ending a label with a readable ellipsis rather than
                a severed glyph. */}
            <g clipPath={`url(#${clipId})`}>
              {big && (
                <>
                  <text x={t.x + 8} y={t.y + 16} className="gcx-tl-tag">
                    {tagText}
                  </text>
                  <text x={t.x + 8} y={t.y + 32} className="gcx-tl-name">
                    {bigName}
                  </text>
                  <text x={t.x + 8} y={t.y + 48} className="gcx-tl-val">
                    {fmtUSD(t.r.total)}
                  </text>
                </>
              )}
              {/* A medium tile that cannot fit four characters of its name plus
                  the ellipsis goes unlabelled, exactly as the small branch has
                  always done; the <title> above still carries name and value. */}
              {med && medName && (
                <>
                  <text x={t.x + 7} y={t.y + 15} className="gcx-tl-name">
                    {medName}
                  </text>
                  <text x={t.x + 7} y={t.y + 28} className="gcx-tl-val">
                    {fmtUSD(t.r.total)}
                  </text>
                </>
              )}
              {small && smallText && (
                <text x={t.x + 6} y={t.y + t.h / 2 + 3} className="gcx-tl-sm">
                  {smallText}
                </text>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
/* Character-count budget for a tile label, used when nothing has been measured
   yet (server render, first client paint, or a browser that gives us no 2D
   context). `inset` is the left offset plus a matching right gutter.

   The multiplier is an average advance width, which is exactly why it is only a
   fallback: the agency tag line is uppercase mono WITH letter-spacing, so its
   real advance runs well past 0.62em per character and long tags such as
   DEPARTMENT OF DEFENSE survived this trim and painted across the tile's right
   edge. measuredTrim below replaces the estimate once the fonts are known. */
function trim(s, w, fontPx = 10, inset = 14) {
  const max = Math.floor((w - inset) / (fontPx * 0.62));
  // Below four characters there is no label worth drawing: the old floor of
  // three produced stubs like "Pa…" that still ran past their own tile and out
  // of the SVG. The tile keeps its colour and its tooltip; it just goes
  // unlabelled, which is the honest presentation at that size.
  if (max < 4) return null;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/* ── Real text measurement for treemap labels ──────────────────────────────
   One module-level 2D context, reused for every measurement. `undefined` means
   "not tried yet", `null` means "tried and unavailable", so a browser without
   canvas is probed once rather than on every label. */
let measureCtx;
function labelCtx() {
  if (measureCtx !== undefined) return measureCtx;
  measureCtx = null;
  if (typeof document !== 'undefined') {
    try {
      measureCtx = document.createElement('canvas').getContext('2d') || null;
    } catch {
      measureCtx = null;
    }
  }
  return measureCtx;
}

/* Width of `s` in the font described by a {font, letterSpacing} probe, in the
   same units as the SVG viewBox (both are CSS pixels at scale 1, and the
   viewBox scales text and geometry together, so the ratio we care about holds
   at any rendered size). Returns null when we cannot measure. */
function textWidth(s, probe) {
  const c = labelCtx();
  if (!c || !probe || !probe.font) return null;
  c.font = probe.font;
  const track = parseFloat(probe.letterSpacing) || 0;
  let extra = 0;
  if ('letterSpacing' in c) {
    // Chromium honours ctx.letterSpacing, which also spaces correctly around
    // kerning pairs.
    c.letterSpacing = probe.letterSpacing || '0px';
  } else {
    // Everywhere else, add the tracking by hand: one gap per character.
    extra = track * s.length;
  }
  const w = c.measureText(s).width + extra;
  if ('letterSpacing' in c) c.letterSpacing = '0px';
  return w;
}

/* The longest prefix of `s` that fits `w - inset`, with a real ellipsis at the
   real edge rather than a guessed character count. Falls back to the estimate
   until the fonts have been read off the DOM. Returns null when not even four
   characters plus the ellipsis fit, which means the tile goes unlabelled. */
function measuredTrim(s, w, probe, fontPx, inset) {
  const avail = w - inset;
  if (avail <= 0) return null;
  const full = textWidth(s, probe);
  if (full === null) return trim(s, w, fontPx, inset);
  if (full <= avail) return s;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const fits = textWidth(`${s.slice(0, mid)}…`, probe);
    if (fits !== null && fits <= avail) lo = mid;
    else hi = mid - 1;
  }
  if (lo < 4) return null;
  return `${s.slice(0, lo)}…`;
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
// Share/pie is driven by the TRUE per-agency totals (summed across the current
// fiscal-year selection), not loaded-recipient sums — so it matches
// SUM(total_amount) GROUP BY awarding_agency. Top 10 by spend + a single Other.
function ShareDonut({ ranking, colorOf }) {
  const top = ranking.slice(0, MAX_SLOTS).map((a) => ({ agency: a.agency, value: a.total }));
  const otherTotal = ranking.slice(MAX_SLOTS).reduce((s, a) => s + a.total, 0);
  const data = otherTotal > 0 ? [...top, { agency: OTHER_LABEL, value: otherTotal }] : top;
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
            stroke={colorOf(s.agency)}
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
          obligated
        </text>
      </svg>
      <div className="gcx-donut-list">
        {data.map((d) => (
          <div className="gcx-donut-row" key={d.agency}>
            <span className="gcx-dot" style={{ background: colorOf(d.agency) }} />
            <span className="gcx-donut-name">{d.agency}</span>
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

/* Modal donut: this recipient's awards split by awarding agency (center = top
   agency %). Every award carries an agency, so this is always derivable. */
function AgencyBreakdown({ awards, colorOf }) {
  const byAgency = {};
  for (const a of awards) {
    const ag = a.agencyName || 'Unknown';
    byAgency[ag] = (byAgency[ag] || 0) + (Number(a.value) || 0);
  }
  const data = Object.keys(byAgency)
    .map((ag) => ({ agency: ag, value: byAgency[ag] }))
    .sort((x, y) => y.value - x.value);
  const sum = data.reduce((s, d) => s + d.value, 0);
  if (!sum) return <div className="gcx-empty">No agency data.</div>;
  const segs = donutSegments(data, sum);
  const top = [...data].sort((a, b) => b.value - a.value)[0];
  const topPct = Math.round((top.value / sum) * 100);
  return (
    <div className="gcx-donut-wrap gcx-donut-wrap--sm">
      <svg viewBox="0 0 150 150" className="gcx-donut">
        <circle cx={75} cy={75} r={58} fill="none" stroke="var(--bg-tertiary)" strokeWidth={26} />
        {segs.map((s) => {
          const C = 2 * Math.PI * 58;
          const frac = s.dash / (2 * Math.PI * 70); // recompute for r=58
          return (
            <circle
              key={s.agency}
              cx={75}
              cy={75}
              r={58}
              fill="none"
              stroke={colorOf(s.agency)}
              strokeWidth={26}
              strokeDasharray={`${frac * C} ${C - frac * C}`}
              strokeDashoffset={(s.offset / (2 * Math.PI * 70)) * C}
              transform="rotate(-90 75 75)"
            />
          );
        })}
        <text x={75} y={72} className="gcx-donut-c1">
          {topPct}%
        </text>
        <text x={75} y={88} className="gcx-donut-c2">
          {trim(top.agency, 90)}
        </text>
      </svg>
      <div className="gcx-donut-list">
        {[...data]
          .sort((a, b) => b.value - a.value)
          .map((d) => (
            <div className="gcx-donut-row" key={d.agency}>
              <span className="gcx-dot" style={{ background: colorOf(d.agency) }} />
              <span className="gcx-donut-name">{d.agency}</span>
              <span className="gcx-mono gcx-donut-val">{fmtUSD(d.value)}</span>
              <span className="gcx-mono gcx-donut-pct">{Math.round((d.value / sum) * 100)}%</span>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ────────────────────────── Contractor list ────────────────────────── */
function ContractorList({ recipients, onPick, colorOf }) {
  const max = Math.max(...recipients.map((r) => r.total), 1);
  return (
    <div className="gcx-rows">
      {recipients.map((r, i) => (
        <button type="button" className="gcx-row" key={r.name} onClick={() => onPick(r)}>
          <span className="gcx-rank gcx-mono">{i + 1}</span>
          <span className="gcx-row-main">
            <span className="gcx-row-name">{r.name}</span>
            <span className="gcx-row-meta">
              <span className="gcx-dot" style={{ background: colorOf(r.agency) }} />
              {r.agency}
              {r.ticker ? ` · ${r.ticker}` : ''}
            </span>
          </span>
          <span className="gcx-row-bar">
            <span
              className="gcx-row-bar-fill"
              style={{ width: `${(r.total / max) * 100}%`, background: colorOf(r.agency) }}
            />
          </span>
          <span className="gcx-row-val gcx-mono">{fmtUSD(r.total)}</span>
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────── Drill-down modal ────────────────────────── */
/* Initials badge text — shared by the modal header and the similar-recipients
   rows so both render a name the same way. */
function initialsOf(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/* "FY2008" → "FY'08" — the axis and captions share this two-digit style. */
function shortFY(label) {
  return label.replace(/^FY20/, "FY'").replace(/^FY19/, "FY'");
}

function DrillModal({ recipient: r, allRecipients = [], onSelect, onClose, colorOf }) {
  const [dossierOpen, setDossierOpen] = useState(false);
  useEffect(() => {
    // Escape layering: when the dossier overlay is up, ITS handler consumes
    // Escape (closing the dossier); a second press then reaches this one.
    const onEsc = (e) => {
      if (e.key === 'Escape' && !dossierOpen) onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose, dossierOpen]);

  // Selecting a similar recipient closes the dossier (if open) and swaps the
  // modal to that recipient in place.
  const pickRecipient = (x) => {
    setDossierOpen(false);
    onSelect?.(x);
  };

  const initials = initialsOf(r.name);

  // Award value over time: derived from THIS recipient's real awards, by year.
  const byYear = {};
  for (const a of r.awards) if (a.year) byYear[a.year] = (byYear[a.year] || 0) + a.value;
  const series = Object.entries(byYear)
    .map(([y, v]) => ({ label: `FY${y}`, value: v }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Stat sub-captions — every one computed from the loaded slice, never invented.
  const coverageSub = series.length
    ? series.length === 1
      ? shortFY(series[0].label)
      : `${shortFY(series[0].label)} – ${shortFY(series[series.length - 1].label)}`
    : null;
  const agencyCount = new Set(r.awards.map((a) => a.agency)).size;
  const agencySub = `across ${agencyCount} agenc${agencyCount === 1 ? 'y' : 'ies'}`;
  const yoySub =
    series.length >= 2
      ? `${shortFY(series[series.length - 2].label)} vs ${shortFY(series[series.length - 1].label)}`
      : null;

  // Other recipients receiving similar contracts: same primary agency, from
  // the currently loaded slice, ranked by total.
  const related = allRecipients
    .filter((x) => x.name !== r.name && x.agency === r.agency)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Dossier linkage: Capitol Watch arc strength = this recipient's share of
  // the largest loaded recipient total, clamped to a visible minimum. The
  // other six datasets have no data loaded on this page and stay dormant.
  const maxTotal = Math.max(...allRecipients.map((x) => x.total || 0), r.total || 0, 1);
  const capitolStrength = Math.min(1, Math.max(0.15, (r.total || 0) / maxTotal));

  return (
    <div className="gcx-modal-backdrop" onClick={onClose}>
      <div
        className="gcx-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="gcx-modal-left">
          <div className="gcx-badge" style={{ background: colorOf(r.agency) }}>
            {initials}
          </div>
          <h3 className="gcx-modal-name">{r.name}</h3>
          <p className="gcx-modal-sub">
            {r.agency} · {r.ticker || 'HQ not available'}
          </p>
          <div className="gcx-modal-grid">
            <MiniStat label="Total awarded" value={fmtUSD(r.total)} sub={coverageSub} />
            <MiniStat label="Awards" value={fmtInt(r.count)} sub={agencySub} />
            <MiniStat label="Avg contract" value={fmtUSD(r.avg)} sub="per award, all years" />
            <MiniStat label="YoY" value={series.length >= 2 ? yoy(series) : '—'} sub={yoySub} />
          </div>

          <div className="gcx-modal-section">
            <div className="gcx-modal-h">Contract type split</div>
            <div className="gcx-rail-note">Not available from USAspending ingest.</div>
          </div>

          <div className="gcx-modal-section">
            <div className="gcx-modal-h">Related security</div>
            {r.ticker ? (
              <RelatedSecurity ticker={r.ticker} />
            ) : (
              <div className="gcx-rail-note">PRIVATE / Not publicly traded</div>
            )}
          </div>

          <div className="gcx-modal-section gcx-sim-section">
            <div className="gcx-modal-h">
              Similar contract recipients <span className="gcx-sim-qual">· {r.agency}</span>
            </div>
            {related.length ? (
              <div className="gcx-sim-list">
                {related.map((x) => (
                  <button
                    key={x.name}
                    type="button"
                    className="gcx-sim-row"
                    onClick={() => pickRecipient(x)}
                    aria-label={`View ${x.name}`}
                  >
                    <span
                      className="gcx-badge gcx-sim-badge"
                      style={{ background: colorOf(x.agency) }}
                    >
                      {initialsOf(x.name)}
                    </span>
                    <span className="gcx-sim-name">{x.name}</span>
                    <span className="gcx-mono gcx-sim-total">{fmtUSD(x.total)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="gcx-rail-note">
                No other recipients for this agency in the loaded slice.
              </div>
            )}
          </div>
        </div>

        <div className="gcx-modal-right">
          <button type="button" className="gcx-modal-x" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <div className="gcx-modal-h">Award value over time</div>
          {series.length ? (
            <AreaChart series={series} color={colorOf(r.agency)} />
          ) : (
            <div className="gcx-empty">No dated awards for this recipient in the loaded slice.</div>
          )}

          <div className="gcx-modal-h" style={{ marginTop: 18 }}>
            Breakdown by agency
          </div>
          <AgencyBreakdown awards={r.awards} colorOf={colorOf} />

          <div className="gcx-modal-actions">
            <WatchlistCta recipient={r} />
            <button
              type="button"
              className="gcx-btn gcx-btn-outline"
              onClick={() => setDossierOpen(true)}
            >
              Full dossier <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {dossierOpen && (
        <DossierOverlay
          recipient={r}
          series={series}
          subs={{ coverageSub, agencySub, yoySub }}
          capitolStrength={capitolStrength}
          colorOf={colorOf}
          onClose={() => setDossierOpen(false)}
        />
      )}
    </div>
  );
}
function MiniStat({ label, value, sub }) {
  return (
    <div className="gcx-ministat">
      <div className="gcx-ministat-label">{label}</div>
      <div className="gcx-ministat-value gcx-mono">{value}</div>
      {sub ? <div className="gcx-ministat-sub">{sub}</div> : null}
    </div>
  );
}

/* 1Y candles for the modal's Related-security sparkline. Degrades gracefully:
   the modal never blocks on it — loading shows a shimmer, error/empty falls
   back to the "Price not available" note. */
function useTickerCandles(ticker, range = '1Y') {
  const [state, setState] = useState({ status: 'loading', candles: [] });
  useEffect(() => {
    if (!ticker) return undefined;
    const ctrl = new AbortController();
    setState({ status: 'loading', candles: [] });
    fetch(
      `/api/market-data/stock-candles?symbol=${encodeURIComponent(ticker)}&range=${encodeURIComponent(range)}`,
      { signal: ctrl.signal },
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        const candles = Array.isArray(data?.candles) ? data.candles : [];
        setState({ status: candles.length >= 2 ? 'ready' : 'error', candles });
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setState({ status: 'error', candles: [] });
      });
    return () => ctrl.abort();
  }, [ticker, range]);
  return state;
}

function RelatedSecurity({ ticker }) {
  const { status, candles } = useTickerCandles(ticker);
  return (
    <div className="gcx-related gcx-related-stack">
      <span className="gcx-mono gcx-related-tk">{ticker}</span>
      {status === 'loading' && <div className="gcx-skel" aria-hidden="true" />}
      {status === 'ready' && <PriceSparkline ticker={ticker} candles={candles} />}
      {status === 'error' && (
        <span className="gcx-related-note">Price not available on this page</span>
      )}
    </div>
  );
}

function PriceSparkline({ ticker, candles }) {
  const W = 460;
  const H = 90;
  const P = { t: 8, r: 12, b: 20, l: 12 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;
  const closes = candles.map((c) => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const step = candles.length > 1 ? iw / (candles.length - 1) : 0;
  const pts = candles.map((c, i) => ({
    x: P.l + i * step,
    y: P.t + ih - ((c.close - min) / span) * ih,
  }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const first = candles[0];
  const last = candles[candles.length - 1];
  const changePct = first.close ? ((last.close - first.close) / first.close) * 100 : 0;
  const up = last.close >= first.close;
  const stroke = up ? 'var(--emerald)' : 'var(--negative)';
  return (
    <div className="gcx-spark-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="gcx-area"
        role="img"
        aria-label={`${ticker} price, past year`}
      >
        <line x1={P.l} x2={W - P.r} y1={P.t + ih} y2={P.t + ih} className="gcx-axis" />
        <path d={line} fill="none" stroke={stroke} strokeWidth={1.6} />
        <text x={P.l} y={H - 6} className="gcx-area-x" style={{ textAnchor: 'start' }}>
          {first.label}
        </text>
        <text x={W - P.r} y={H - 6} className="gcx-area-x" style={{ textAnchor: 'end' }}>
          {last.label}
        </text>
      </svg>
      <div className="gcx-spark-meta gcx-mono">
        {/* Exact price, not fmtUSD — that helper compacts ≥$1K to "$1K" scale,
            which is right for award totals and wrong for a share price. */}
        ${Number(last.close).toFixed(2)}{' '}
        <span className={up ? 'gcx-spark-up' : 'gcx-spark-down'}>
          {changePct >= 0 ? '+' : ''}
          {changePct.toFixed(1)}% 1Y
        </span>
      </div>
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
  const H = 170;
  const P = { t: 12, r: 12, b: 34, l: 12 }; // deeper bottom band for the axis
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

  // ── Tick thinning: at most 6 ticks — always first and last, the rest
  // evenly spaced across the index range so labels never collide.
  const MAX_TICKS = 6;
  const tickIdx =
    pts.length <= MAX_TICKS
      ? pts.map((_, i) => i)
      : Array.from({ length: MAX_TICKS }, (_, k) =>
          Math.round((k * (pts.length - 1)) / (MAX_TICKS - 1)),
        );

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
      {/* Axis baseline separates plot from labels */}
      <line x1={P.l} x2={W - P.r} y1={P.t + ih} y2={P.t + ih} className="gcx-axis" />
      <path d={area} fill="url(#gcx-grad)" />
      <path d={line} fill="none" stroke={color} strokeWidth={1.8} />
      {pts.map((p) => (
        <circle
          key={p.label}
          cx={p.x}
          cy={p.y}
          r={3.2}
          fill={color}
          stroke="#fff"
          strokeWidth={1.5}
        />
      ))}
      {tickIdx.map((i, k) => (
        <g key={pts[i].label}>
          <line x1={pts[i].x} x2={pts[i].x} y1={P.t + ih} y2={P.t + ih + 4} className="gcx-axis" />
          <text
            x={pts[i].x}
            y={H - 10}
            className="gcx-area-x"
            /* Edge-clamp so the first/last labels never clip outside the viewBox. */
            style={
              k === 0
                ? { textAnchor: 'start' }
                : k === tickIdx.length - 1
                  ? { textAnchor: 'end' }
                  : undefined
            }
          >
            {shortFY(pts[i].label)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ── Auth-aware "Add to watchlist" (public marketing page) ───────────────── */
function WatchlistCta({ recipient: r }) {
  const { isAuthenticated } = useAuth() || {};
  const [promptOpen, setPromptOpen] = useState(false);
  const [addState, setAddState] = useState('idle'); // idle | adding | added | error
  const wrapRef = useRef(null);

  // Dismiss the auth prompt on click-outside WITHOUT closing the drill modal.
  useEffect(() => {
    if (!promptOpen) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setPromptOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [promptOpen]);

  const returnTo = encodeURIComponent('/datasets/government/contracts');

  const addToWatchlist = async () => {
    if (!r.ticker || addState === 'adding' || addState === 'added') return;
    setAddState('adding');
    try {
      // Default list first (GET ensures one exists), then add the ticker.
      const listsRes = await fetch('/api/watchlists');
      if (!listsRes.ok) throw new Error(`HTTP ${listsRes.status}`);
      const { watchlists } = await listsRes.json();
      const listId = watchlists?.[0]?.id;
      if (!listId) throw new Error('no list');
      const addRes = await fetch(`/api/watchlists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'stock', ticker: r.ticker, name: r.name }),
      });
      if (!addRes.ok && addRes.status !== 409) throw new Error(`HTTP ${addRes.status}`);
      setAddState('added');
    } catch {
      setAddState('error');
    }
  };

  if (isAuthenticated) {
    const label =
      addState === 'adding'
        ? 'Adding…'
        : addState === 'added'
          ? 'In watchlist'
          : addState === 'error'
            ? 'Retry add'
            : 'Add to watchlist';
    return (
      <button
        type="button"
        className="gcx-btn gcx-btn-primary"
        onClick={addToWatchlist}
        disabled={!r.ticker || addState === 'adding' || addState === 'added'}
        title={r.ticker ? undefined : 'No listed ticker for this recipient'}
      >
        <Star size={14} /> {label}
      </button>
    );
  }

  return (
    <div className="gcx-auth-wrap" ref={wrapRef}>
      <button
        type="button"
        className="gcx-btn gcx-btn-primary"
        onClick={() => setPromptOpen((v) => !v)}
        aria-expanded={promptOpen}
      >
        <Star size={14} /> Add to watchlist
      </button>
      {promptOpen && (
        <div className="gcx-auth-pop" role="dialog" aria-label="Sign up or log in">
          <button
            type="button"
            className="gcx-auth-pop-x"
            onClick={() => setPromptOpen(false)}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
          <div className="gcx-auth-pop-title">Track {r.name} in your watchlist</div>
          <div className="gcx-auth-pop-sub">Free to start · No brokerage required</div>
          <div className="gcx-auth-pop-actions">
            <a className="gcx-btn gcx-btn-primary" href={`/auth/signup?redirect=${returnTo}`}>
              Sign up
            </a>
            {/* /auth/signin is the working login form that honors ?redirect=
                (validated by safeInternalPath); /auth/login is a chooser page
                that drops query params. */}
            <a className="gcx-btn gcx-btn-outline" href={`/auth/signin?redirect=${returnTo}`}>
              Log in
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Full Dossier overlay (80% viewport) ─────────────────────────────────── */

function useCompanyMetrics(ticker) {
  const [state, setState] = useState({ status: 'loading', metrics: null });
  useEffect(() => {
    if (!ticker) return undefined;
    const ctrl = new AbortController();
    setState({ status: 'loading', metrics: null });
    fetch(`/api/market-data/company-metrics?symbol=${encodeURIComponent(ticker)}`, {
      signal: ctrl.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) =>
        setState(
          data?.metrics
            ? { status: 'ready', metrics: data.metrics }
            : { status: 'error', metrics: null },
        ),
      )
      .catch((err) => {
        if (err?.name !== 'AbortError') setState({ status: 'error', metrics: null });
      });
    return () => ctrl.abort();
  }, [ticker]);
  return state;
}

const DOSSIER_RANGES = ['1Y', '3Y', '5Y'];

function DossierChart({ ticker }) {
  const [range, setRange] = useState('1Y');
  const { status, candles } = useTickerCandles(ticker, range);

  let body;
  if (status === 'loading') {
    body = <div className="gcx-skel gcx-skel-lg" aria-hidden="true" />;
  } else if (status === 'ready') {
    body = <DossierPriceChart ticker={ticker} candles={candles} range={range} />;
  } else {
    body = <div className="gcx-rail-note">Price not available for {ticker}.</div>;
  }

  return (
    <section className="gcx-dossier-block">
      <div className="gcx-dossier-block-head">
        <span className="gcx-dossier-label">Price history</span>
        <div className="gcx-range-toggle" role="tablist" aria-label="Chart range">
          {DOSSIER_RANGES.map((rg) => (
            <button
              key={rg}
              type="button"
              role="tab"
              aria-selected={range === rg}
              className={`gcx-range-btn gcx-mono${range === rg ? ' is-active' : ''}`}
              onClick={() => setRange(rg)}
            >
              {rg}
            </button>
          ))}
        </div>
      </div>
      {body}
    </section>
  );
}

function DossierPriceChart({ ticker, candles, range }) {
  const W = 920;
  const H = 260;
  const P = { t: 14, r: 14, b: 34, l: 14 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;
  const closes = candles.map((c) => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const step = candles.length > 1 ? iw / (candles.length - 1) : 0;
  const pts = candles.map((c, i) => ({
    x: P.l + i * step,
    y: P.t + ih - ((c.close - min) / span) * ih,
  }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const first = candles[0];
  const last = candles[candles.length - 1];
  const up = last.close >= first.close;
  const stroke = up ? 'var(--emerald)' : 'var(--negative)';

  // ≤6 ticks, always first and last — same convention as the modal AreaChart.
  const MAX_TICKS = 6;
  const tickIdx =
    candles.length <= MAX_TICKS
      ? candles.map((_, i) => i)
      : Array.from({ length: MAX_TICKS }, (_, k) =>
          Math.round((k * (candles.length - 1)) / (MAX_TICKS - 1)),
        );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="gcx-area gcx-dossier-price"
      role="img"
      aria-label={`${ticker} price, ${range}`}
    >
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
      <line x1={P.l} x2={W - P.r} y1={P.t + ih} y2={P.t + ih} className="gcx-axis" />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.8} />
      {tickIdx.map((i, k) => (
        <g key={candles[i].t ?? i}>
          <line x1={pts[i].x} x2={pts[i].x} y1={P.t + ih} y2={P.t + ih + 4} className="gcx-axis" />
          <text
            x={pts[i].x}
            y={H - 10}
            className="gcx-area-x"
            style={
              k === 0
                ? { textAnchor: 'start' }
                : k === tickIdx.length - 1
                  ? { textAnchor: 'end' }
                  : undefined
            }
          >
            {candles[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const METRIC_DEFS = [
  { key: 'marketCap', label: 'Market cap', kind: 'usd' },
  { key: 'peRatioTTM', label: 'P/E (TTM)', kind: 'x' },
  { key: 'psRatioTTM', label: 'P/S (TTM)', kind: 'x' },
  { key: 'pbRatioTTM', label: 'P/B (TTM)', kind: 'x' },
  { key: 'debtToEquityTTM', label: 'Debt / equity', kind: 'x' },
  { key: 'currentRatioTTM', label: 'Current ratio', kind: 'x' },
  { key: 'grossProfitMarginTTM', label: 'Gross margin', kind: 'pct' },
  { key: 'netProfitMarginTTM', label: 'Net margin', kind: 'pct' },
  { key: 'returnOnEquityTTM', label: 'Return on equity', kind: 'pct' },
  { key: 'dividendYieldTTM', label: 'Dividend yield', kind: 'pct' },
];

function fmtMetric(v, kind) {
  if (v == null || !Number.isFinite(Number(v))) return null;
  const n = Number(v);
  if (kind === 'usd') return fmtUSD(n);
  if (kind === 'pct') return `${(n * 100).toFixed(1)}%`;
  return `${n.toFixed(2)}×`;
}

function DossierMetrics({ ticker }) {
  const { status, metrics } = useCompanyMetrics(ticker);
  return (
    <section className="gcx-dossier-block">
      <div className="gcx-dossier-label">Key indicators &amp; financial ratios</div>
      {status === 'loading' ? (
        <div className="gcx-dossier-metrics">
          {METRIC_DEFS.map((m) => (
            <div key={m.key} className="gcx-skel gcx-skel-card" aria-hidden="true" />
          ))}
        </div>
      ) : status === 'ready' ? (
        <div className="gcx-dossier-metrics">
          {METRIC_DEFS.map((m) => {
            const formatted = fmtMetric(metrics[m.key], m.kind);
            return (
              <MiniStat
                key={m.key}
                label={m.label}
                value={formatted ?? '—'}
                sub={formatted ? 'TTM · FMP' : 'Not available'}
              />
            );
          })}
        </div>
      ) : (
        <div className="gcx-rail-note">Financial metrics not available for {ticker}.</div>
      )}
    </section>
  );
}

/* Adapted from the datasets-overview signal map (hub-and-spoke, one node per
   dimension): the hub is this company; each spoke lights up only where this
   page actually loaded data for that dataset. Arcs take { key, strength|null }
   so more datasets can light up later without touching the rendering. */
function PlatformLinkage({ name, links }) {
  const W = 920;
  const H = 300;
  const CX = W / 2;
  const CY = H / 2;
  const R = 118;
  const nodes = links.map((l, i) => {
    const angle = -90 + (360 / links.length) * i;
    const a = (angle * Math.PI) / 180;
    return { ...l, x: CX + R * Math.cos(a), y: CY + R * Math.sin(a), angle };
  });
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="gcx-linkage"
      role="img"
      aria-label={`${name} signal linkage across Ezana's seven datasets`}
    >
      {nodes.map((n) => (
        <line
          key={`sp-${n.key}`}
          x1={n.x}
          y1={n.y}
          x2={CX}
          y2={CY}
          className={n.strength != null ? 'gcx-link-spoke is-live' : 'gcx-link-spoke'}
          style={
            n.strength != null
              ? { stroke: n.color, strokeWidth: 1.5 + 2.5 * n.strength, opacity: 0.9 }
              : undefined
          }
        />
      ))}
      <circle className="gcx-link-hub" cx={CX} cy={CY} r={26} />
      <text className="gcx-link-hub-t" x={CX} y={CY + 4}>
        {initialsOf(name)}
      </text>
      {nodes.map((n) => {
        const cosA = Math.cos((n.angle * Math.PI) / 180);
        const anchor = cosA < -0.34 ? 'end' : cosA > 0.34 ? 'start' : 'middle';
        const lx = anchor === 'start' ? n.x + 14 : anchor === 'end' ? n.x - 14 : n.x;
        const ly = anchor === 'middle' ? (n.y < CY ? n.y - 14 : n.y + 20) : n.y + 4;
        return (
          <g key={n.key}>
            <circle
              cx={n.x}
              cy={n.y}
              r={n.strength != null ? 7 : 5}
              style={{ fill: n.color, opacity: n.strength != null ? 1 : 0.35 }}
            />
            <text
              x={lx}
              y={ly}
              className={`gcx-link-label${n.strength != null ? ' is-live' : ''}`}
              style={{ textAnchor: anchor }}
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DossierOverlay({ recipient: r, series, subs, capitolStrength, colorOf, onClose }) {
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  // Header price chip reuses the 1Y candles (null-safe — header just omits it).
  const { status: pxStatus, candles } = useTickerCandles(r.ticker || null, '1Y');
  const first = candles[0];
  const last = candles[candles.length - 1];
  const pxUp = first && last ? last.close >= first.close : true;
  const pxChange =
    first && last && first.close ? ((last.close - first.close) / first.close) * 100 : null;

  const links = DATASET_TAXONOMY.map((d) => ({
    key: d.id,
    label: d.label,
    color: d.color,
    strength: d.id === 'capitol' ? capitolStrength : null,
  }));

  return (
    <div className="gcx-dossier-backdrop" onClick={onClose}>
      <div
        className="gcx-dossier"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${r.name} full dossier`}
      >
        <header className="gcx-dossier-head">
          <div className="gcx-badge" style={{ background: colorOf(r.agency), marginBottom: 0 }}>
            {initialsOf(r.name)}
          </div>
          <div className="gcx-dossier-id">
            <h2 className="gcx-dossier-name">{r.name}</h2>
            <div className="gcx-dossier-sub">
              {r.agency} · {r.ticker || 'Private'}
            </div>
          </div>
          {r.ticker && pxStatus === 'ready' && last && (
            <div className="gcx-dossier-px gcx-mono">
              ${Number(last.close).toFixed(2)}{' '}
              <span className={pxUp ? 'gcx-spark-up' : 'gcx-spark-down'}>
                {pxChange >= 0 ? '+' : ''}
                {pxChange?.toFixed(1)}% 1Y
              </span>
            </div>
          )}
          <button
            type="button"
            className="gcx-modal-x"
            onClick={onClose}
            aria-label="Close dossier"
          >
            <X size={18} />
          </button>
        </header>

        {r.ticker ? (
          <>
            <DossierChart ticker={r.ticker} />
            <DossierMetrics ticker={r.ticker} />
          </>
        ) : (
          <section className="gcx-dossier-block">
            <div className="gcx-dossier-private gcx-mono">PRIVATE / Not publicly traded</div>
          </section>
        )}

        <section className="gcx-dossier-block">
          <div className="gcx-dossier-label">Government contracts</div>
          <div className="gcx-dossier-contracts">
            <div>
              <div className="gcx-modal-grid">
                <MiniStat label="Total awarded" value={fmtUSD(r.total)} sub={subs.coverageSub} />
                <MiniStat label="Awards" value={fmtInt(r.count)} sub={subs.agencySub} />
                <MiniStat label="Avg contract" value={fmtUSD(r.avg)} sub="per award, all years" />
                <MiniStat
                  label="YoY"
                  value={series.length >= 2 ? yoy(series) : '—'}
                  sub={subs.yoySub}
                />
              </div>
              <AgencyBreakdown awards={r.awards} colorOf={colorOf} />
            </div>
            <div>
              {series.length ? (
                <AreaChart series={series} color={colorOf(r.agency)} />
              ) : (
                <div className="gcx-empty">
                  No dated awards for this recipient in the loaded slice.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="gcx-dossier-block">
          <div className="gcx-dossier-label">Across the Ezana platform</div>
          <PlatformLinkage name={r.name} links={links} />
          <div className="gcx-rail-note gcx-linkage-caption">
            Signal strength shown for datasets loaded on this page. Others activate as data ships.
          </div>
        </section>
      </div>
    </div>
  );
}

/* ────────────────────────── EzanaQL builder ────────────────────────── */

function EzanaQLBuilder({ activeFilters, seedPrompt = '', onClose }) {
  const [prompt, setPrompt] = useState(seedPrompt);
  const [promptFocused, setPromptFocused] = useState(false);
  const promptRef = useRef(null);
  const [code, setCode] = useState(() => seedFromFilters(activeFilters) || SEED_QUERY);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);

  // Mounted from the teaser: focus and put the caret after the handed-off text.
  useEffect(() => {
    const el = promptRef.current;
    if (!el) return;
    el.focus();
    const n = el.value.length;
    el.setSelectionRange(n, n);
    // Mount-only: re-running on prompt change would fight the user's caret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <span className="gcx-ql-ai-field">
          {!prompt && !promptFocused && (
            <span className="gcx-ql-ai-caret" aria-hidden="true">
              |
            </span>
          )}
          <input
            ref={promptRef}
            className="gcx-ql-ai-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setPromptFocused(true)}
            onBlur={() => setPromptFocused(false)}
            placeholder="Describe the report in plain English — we'll write the EzanaQL"
          />
        </span>
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
