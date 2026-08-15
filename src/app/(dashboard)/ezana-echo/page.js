'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { isAdminUserClient } from '@/lib/admin-helpers-client';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import { EchoArticleCard } from '@/components/echo/EchoArticleCard';
import { CONTINENTS, continentsForGeos } from '@/lib/echo/geo-continents';
import { AOTM_HISTORY } from '@/lib/ezana-echo-mock';

import './ezana-echo.css';
import './ezana-echo-home.css';

/* The 6 Echo categories (id → label → subcategories). Each renders as a column on
   the homepage board; `subs` power the per-column subcategory filter. Article
   `category` ids must match one of these; an optional `subcategory` on an article
   is what the filter checks (articles without one always show). */
const CATEGORIES = [
  {
    id: 'markets-companies',
    label: 'Markets & Companies',
    subs: ['Equities', 'Earnings', 'M&A', 'IPOs', 'Credit'],
  },
  {
    id: 'politics-policy',
    label: 'Politics & Policy',
    subs: ['Congress', 'Regulation', 'Elections', 'Trade Policy'],
  },
  {
    id: 'tech-founders',
    label: 'Tech & Founders',
    subs: ['AI', 'Semiconductors', 'Founders', 'Infrastructure', 'Startups'],
  },
  {
    id: 'commodities-energy',
    label: 'Commodities & Energy',
    subs: ['Oil & Gas', 'Metals', 'Critical Minerals', 'Renewables'],
  },
  { id: 'crypto', label: 'Crypto', subs: ['Bitcoin', 'Stablecoins', 'DeFi', 'Regulation'] },
  {
    id: 'global-emerging',
    label: 'Global & Emerging Markets',
    subs: ['Africa', 'Asia', 'LatAm', 'Sovereign Funds'],
  },
];

/* REQUIREMENT: every Echo article MUST carry a `subcategory` (one of its category's
   `subs`). Homepage articles come from the DB, so this map is the authoritative
   id→subcategory source until `subcategory` is carried through the echo_articles
   pipeline; the same value also lives on each article's source file
   (src/lib/ezana-echo-article-*.js). When adding an article, tag it in BOTH places. */
const ARTICLE_SUBCATEGORY = {
  'nvidia-worlds-second-most-valuable-asset-2026': 'Equities',
  'private-credit-maturity-wall-2026': 'Credit',
  'fda-peptides-bpc157-compounding-vote-2026': 'Equities',
  'dominating-us-stock-market-sectors-through-the-times': 'Equities',
  'hantavirus-from-four-corners-to-open-sea': 'Equities',
  'ballroom-donors-federal-contracts-2026': 'Congress',
  'trump-portfolio-q1-2026': 'Congress',
  'peter-thiel-worldview-2026': 'Founders',
  'silicon-shield-taiwan-semiconductor-dominance': 'Semiconductors',
  'fiber-optic-cable-ai-boom-benny-fazio': 'Infrastructure',
  'acquirers-buy-the-pipeline-not-the-model-2026': 'AI',
  'critical-minerals-reserve-concentration-2026': 'Critical Minerals',
  'best-performing-commodities-iran-war-2026': 'Oil & Gas',
  'africa-refining-capacity-dangote-inflection-2026': 'Oil & Gas',
  'africa-billion-dollar-companies-2026': 'Africa',
  'johnny-mnemonic-tech-consolidation-2026': 'AI',
  'tokenization-collateral-2026': 'DeFi',
  // empire-rankings-1500-2026 is deliberately absent: none of the Global &
  // Emerging subs fits a country-power framework piece, and articles without a
  // subcategory always show (see the filter logic below).
  // Draft catalog (invisible until published; tagged now so they land in the
  // right column the moment they flip live):
  'bitcoin-institutional-holders-13f-2026': 'Bitcoin',
  'stablecoin-settlement-layer-2026': 'Stablecoins',
  'crypto-legislation-prediction-markets-2026': 'Regulation',
  'gulf-sovereign-funds-us-equities-2026': 'Sovereign Funds',
  'yen-carry-trade-unwind-2026': 'Asia',
  'latam-capital-markets-after-the-cows-2026': 'LatAm',
  'midterm-trade-2026': 'Elections',
  'tariff-winners-contract-losers-2026': 'Trade Policy',
  'central-bank-gold-cycle-2026': 'Metals',
  'datacenter-power-crunch-2026': 'Renewables',
};

/* Global time-window filter options (applies to all 6 columns). Default 'all'. */
const TIME_WINDOWS = [
  { id: 'all', label: 'All' },
  { id: '7d', label: '7D', days: 7 },
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
  { id: '1y', label: '1Y', days: 365 },
];

function withinWindow(publishedAt, windowId) {
  if (windowId === 'all' || !publishedAt) return true;
  const win = TIME_WINDOWS.find((w) => w.id === windowId);
  if (!win?.days) return true;
  const then = new Date(publishedAt).getTime();
  if (Number.isNaN(then)) return true;
  return Date.now() - then <= win.days * 86400000;
}

/* Command-bar chip labels: abbreviated display only. Canonical continent
   values (keys) stay untouched; filtering still matches CONTINENTS. */
const CONTINENT_SHORT = {
  'North America': 'N. America',
  'South America': 'S. America',
  Europe: 'Europe',
  Africa: 'Africa',
  Asia: 'Asia',
  Oceania: 'Oceania',
};

/* Conveyor-belt columns: constant speed in px/s (slow enough to read a title as
   it passes — one card height ≈ 9s), and the seam gap, which MUST equal the
   6px tile gap so the loop's rhythm is invisible. */
const BELT_SPEED = 22;
const BELT_GAP = 6;

/* Per-column phase, as a FRACTION of that column's own loop cycle. Irregular
   on purpose (no arithmetic progression) so no two columns — adjacent or not —
   ever sit near the same point in their cycle. Fixed-seconds delays were too
   timid: against 40–80s cycles they left neighbours nearly in step.

   This is now the SOLE stagger mechanism. It offsets card positions WITHIN each
   belt (via a negative animation-delay) without moving the belt itself, so every
   column still top-aligns under its rule. The old per-column margin-top offsets
   in ezana-echo-home.css were removed — they displaced the belt viewport and its
   top fade mask below the rule, leaving dead gaps at the top of cols 2–6. And
   because each column's cycle duration is measured from its own content height,
   columns also drift relative to one another over time. */
const BELT_PHASE_FRACTIONS = [0, 0.43, 0.17, 0.71, 0.29, 0.87];

/* Centered column header: emerald dot beside the label, full-width underline, and
   a two-line toggle that opens a checkbox popover to filter the column's
   subcategories (all on by default). */
function ColHead({ category, filter }) {
  const { activeSubs, openFilter, onOpenFilter, onToggleSub } = filter;
  const subs = category.subs || [];
  const open = openFilter === category.id;
  const active = activeSubs[category.id] || [];
  return (
    <div className="eth-col-head-wrap">
      <div className="eth-col-head">{category.label}</div>
      {subs.length > 0 && (
        <button
          type="button"
          className="eth-subfilter-toggle"
          aria-label={`Filter ${category.label}`}
          aria-expanded={open}
          onClick={() => onOpenFilter(open ? null : category.id)}
        >
          <span />
          <span />
        </button>
      )}
      <div className="eth-col-rule" aria-hidden />
      {open && (
        <div className="eth-subfilter-pop" role="menu">
          {subs.map((s) => (
            <label key={s} className="eth-subfilter-item">
              <input
                type="checkbox"
                checked={active.includes(s)}
                onChange={() => onToggleSub(category.id, s)}
              />
              {s}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* A single category column: header + a downward conveyor-belt loop of cards.
   The card list is duplicated into two identical segments; the track animates
   one full segment per cycle, so items exit the bottom and re-enter at the top.
   Duration is measured (segment height / BELT_SPEED) so every column moves at
   the same px/s regardless of how many articles it holds. Belts loop only with
   2+ articles and only on desktop (CSS disables them ≤1100px / reduced-motion). */
function CategoryColumn({ col, colIndex, admin, filter, geoActive }) {
  const loop = col.items.length >= 2;
  const beltRef = useRef(null);
  const segRef = useRef(null);
  // dupRef removed — duplicate segment no longer needs imperative access

  useEffect(() => {
    if (!loop) return undefined;
    const belt = beltRef.current;
    const seg = segRef.current;
    if (!belt || !seg) return undefined;
    const apply = () => {
      const cycle = seg.offsetHeight + BELT_GAP; // segment + seam gap
      const dur = cycle / BELT_SPEED;
      const frac = BELT_PHASE_FRACTIONS[colIndex % BELT_PHASE_FRACTIONS.length];
      belt.style.setProperty('--belt-seg', `${cycle}px`);
      belt.style.setProperty('--belt-dur', `${dur.toFixed(2)}s`);
      /* Negative delay = start mid-cycle: column i begins `frac` of a full
         loop out of phase, proportional to its own content height. */
      belt.style.setProperty('--belt-phase', `${(-(dur * frac)).toFixed(2)}s`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(seg);
    return () => ro.disconnect();
  }, [loop, col.items, colIndex]);

  const renderCards = (keyPrefix, { focusable = true } = {}) =>
    col.items.map((a) => (
      <EchoArticleCard
        key={`${keyPrefix}${a.id}`}
        article={a}
        isAdmin={admin.isAdmin}
        onArchive={admin.onArchive}
        archivingId={admin.archivingId}
        focusable={focusable}
        // Continent filter: cards whose geos do not reach the hovered continent
        // mute in place. Empty geos = no geographic metadata = muted on any
        // hover, the honest default.
        muted={!!geoActive && !continentsForGeos(a.geos).has(geoActive)}
      />
    ));

  return (
    <div className="eth-col" style={{ '--col-i': colIndex }}>
      <ColHead category={col} filter={filter} />
      {col.items.length ? (
        loop ? (
          <div className="eth-belt" ref={beltRef}>
            <div className="eth-belt-track">
              <div className="eth-belt-seg" ref={segRef}>
                {renderCards('')}
              </div>
              <div className="eth-belt-seg" aria-hidden="true">
                {renderCards('dup-', { focusable: false })}
              </div>
            </div>
          </div>
        ) : (
          renderCards('')
        )
      ) : (
        <div className="eth-col-empty">No articles yet</div>
      )}
    </div>
  );
}

export default function EzanaEchoPage() {
  const { user } = useAuth();
  const isAdmin = isAdminUserClient(user);
  const [archivedSet, setArchivedSet] = useState(new Set());
  const [archivedCount, setArchivedCount] = useState(0);
  const [archivingId, setArchivingId] = useState(null);

  const [rawArticles, setRawArticles] = useState([]);
  const [featuredRaw, setFeaturedRaw] = useState(null);

  // Per-category subcategory filter: all subs active by default; `openFilter`
  // tracks which column's popover is open.
  const [openFilter, setOpenFilter] = useState(null);
  const [timeWindow, setTimeWindow] = useState('all');
  const [activeSubs, setActiveSubs] = useState(() =>
    Object.fromEntries(CATEGORIES.map((c) => [c.id, c.subs])),
  );
  const toggleSub = (catId, sub) =>
    setActiveSubs((prev) => {
      const cur = prev[catId] || [];
      const next = cur.includes(sub) ? cur.filter((s) => s !== sub) : [...cur, sub];
      return { ...prev, [catId]: next };
    });

  // Close the open subcategory popover on outside-click.
  useEffect(() => {
    if (!openFilter) return undefined;
    const onDown = (e) => {
      if (!e.target.closest('.eth-col-head-wrap')) setOpenFilter(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openFilter]);

  // Mark the route so the (grey) dashboard shell background can be overridden to the
  // page's white --bg-primary — see ezana-echo-home.css. Scoped to Echo only.
  useEffect(() => {
    document.body.classList.add('echo-route');
    return () => document.body.classList.remove('echo-route');
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/echo/article-statuses', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const ids = new Set(data.archivedIds || []);
        setArchivedSet(ids);
        setArchivedCount(ids.size);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/echo/hub', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setRawArticles(data.articles || []);
        setFeaturedRaw(data.featured || null);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleArchive(articleId, e) {
    e?.preventDefault();
    e?.stopPropagation();
    if (!confirm('Archive this article? It will be hidden from non-admin users.')) return;
    setArchivingId(articleId);
    try {
      const res = await fetch('/api/echo/admin/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setArchivedSet((prev) => new Set(prev).add(articleId));
      setArchivedCount((c) => c + 1);
    } catch (err) {
      alert(`Failed to archive: ${err.message}`);
    } finally {
      setArchivingId(null);
    }
  }

  const allArticles = useMemo(
    () => rawArticles.filter((a) => !archivedSet.has(a.id)),
    [rawArticles, archivedSet],
  );
  const featured = useMemo(
    () => (featuredRaw && !archivedSet.has(featuredRaw.id) ? featuredRaw : null),
    [featuredRaw, archivedSet],
  );

  // Feed = everything except the featured story (so the Article of the Month
  // isn't also listed in a column).
  const feedSource = useMemo(
    () => allArticles.filter((a) => a.id !== featured?.id),
    [allArticles, featured],
  );

  // Article of the Month: AOTM_HISTORY[0] is the current month; older entries are
  // browsable via the banner's month dropdown. Fallback chain (flag → featured →
  // newest) covers a misconfigured history list.
  const aotmHistory = useMemo(
    () =>
      AOTM_HISTORY.map((h) => ({
        ...h,
        article: allArticles.find((a) => a.id === h.articleId),
      })).filter((h) => h.article),
    [allArticles],
  );
  const [aotmIdx, setAotmIdx] = useState(0);
  const currentAotm =
    aotmHistory[0]?.article ||
    allArticles.find((a) => a.articleOfMonth) ||
    featured ||
    feedSource[0] ||
    null;
  const articleOfMonth = aotmHistory[aotmIdx]?.article || currentAotm;

  // Six category columns, each = that category's articles (minus the centerpiece)
  // sorted newest-first. Empty categories (Crypto) render an honest empty state.
  const columns = useMemo(() => {
    // Exclude only the CURRENT month's AOTM — browsing an older month via the
    // dropdown must not reshuffle the columns.
    const pool = allArticles.filter((a) => a.id !== currentAotm?.id);
    return CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      subs: c.subs,
      items: pool
        .filter((a) => a.category === c.id)
        .sort((x, y) => String(y.publishedAt).localeCompare(String(x.publishedAt)))
        // Ensure every article carries a subcategory (from its own field or the
        // authoritative map) so the subcategory filter has something to match.
        // categoryLabel feeds the tile tag row when no subcategory exists.
        .map((a) => ({
          ...a,
          subcategory: a.subcategory || ARTICLE_SUBCATEGORY[a.id] || null,
          categoryLabel: c.label,
        })),
    }));
  }, [allArticles, currentAotm]);

  // Apply both filters together: the global time window AND the per-column
  // subcategory picker. An article shows only if it falls in the window and its
  // subcategory (if any) is still checked for its column.
  const displayColumns = useMemo(
    () =>
      columns.map((c) => ({
        ...c,
        items: c.items.filter(
          (a) =>
            withinWindow(a.publishedAt, timeWindow) &&
            (!a.subcategory || (activeSubs[c.id] || []).includes(a.subcategory)),
        ),
      })),
    [columns, activeSubs, timeWindow],
  );

  // MOST READ: top 5 by all-time view_count from the current hub payload.
  // Honest label (no "this week"): view_count is cumulative. Zero-view articles
  // never rank; with no nonzero counts the band renders nothing.
  const mostRead = useMemo(
    () =>
      [...allArticles]
        .filter((a) => (a.views || 0) > 0)
        .sort((x, y) => (y.views || 0) - (x.views || 0))
        .slice(0, 5),
    [allArticles],
  );

  // Scroll reveal, adapted to the belt board: per-card observers would misfire
  // inside the continuously-animating duplicated belt segments, so the reveal
  // runs at the column level. The board gains is-revealed the first time it
  // enters the viewport; columns stagger by index (CSS). SSR/no-IO safe:
  // reveals immediately when IntersectionObserver is unavailable.
  const boardRef = useRef(null);
  const [boardRevealed, setBoardRevealed] = useState(false);
  useEffect(() => {
    if (boardRevealed) return undefined;
    const el = boardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setBoardRevealed(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setBoardRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [boardRevealed]);

  // Continent filter, command-bar edition: a single persistent selection.
  // Click selects, clicking the active chip clears (no hover filtering, no
  // outside-click dismissal; the selection is deliberate UI state). null =
  // no region filter. Board cards outside the selection mute exactly as
  // before via the same geoActive wiring.
  const [selectedContinent, setSelectedContinent] = useState(null);
  const toggleContinent = (c) => setSelectedContinent((p) => (p === c ? null : c));

  const admin = { isAdmin, onArchive: handleArchive, archivingId };
  const filter = { activeSubs, openFilter, onOpenFilter: setOpenFilter, onToggleSub: toggleSub };

  return (
    <div className="eth-page">
      {/* Header (marketing nav is suppressed on Echo, so this masthead IS the top
          bar — a 64px bar matching the landing nav's vertical rhythm). Logo + brand
          on the left; Login / Become a Partner on the right, vertically centered
          with the brand. The "Publish to the Echo →" note hangs BELOW the partner
          button. */}
      <header className="eth-masthead">
        <Link href="/" className="eth-masthead-brand" aria-label="Ezana home">
          <EzanaNavLogo width={64} height={54} priority />
        </Link>
        {/* Centered wordmark: same serif treatment as the article nav
            (.nav-echo-wordmark supplies the typography; .eth-nav-center only
            positions it). Links to the hub; hidden at 640px and below where it
            would collide with the logo and auth cluster. */}
        <Link href="/ezana-echo" className="nav-echo-wordmark eth-nav-center">
          Ezana <span>Echo</span>
        </Link>
        <div className="eth-masthead-auth">
          {isAdmin && (
            <Link href="/ezana-echo/archived" className="eth-archived-btn">
              View archived
              <span className="eth-archived-count">{archivedCount}</span>
            </Link>
          )}
          <a href="/auth/login" className="eth-login">
            Login
          </a>
          <div className="eth-partner-stack">
            <a href="/auth/partner/apply" className="eth-partner-btn">
              Become a Partner
            </a>
            <a href="/auth/partner/apply" className="eth-partner-note">
              Publish to the Echo →
            </a>
          </div>
        </div>
      </header>

      <div className="eth-wrap">
        {/* ── 2a hero. Centered text-only Article of the Month directly under
            the untouched masthead (no separating rules), a compact 5-column
            Most Read ledger, and a floating command bar (continent chips +
            time segments) straddling the ledger's bottom hairline. The board
            below is untouched. */}
        {/* Article of the Month: text-forward, no image. The whole headline
            links to the article; the month pill is a real <select> styled as
            a pill, outside the link so changing months never navigates. */}
        {articleOfMonth && (
          <section className="eth-aotm2" aria-label="Article of the month">
            <div className="eth-aotm2-eyebrow">
              Article of the Month
              {aotmHistory[aotmIdx]?.month ? ` · ${aotmHistory[aotmIdx].month}` : ''}
            </div>
            <Link href={`/ezana-echo/${articleOfMonth.id}`} className="eth-aotm2-title">
              {articleOfMonth.title}
            </Link>
            <div className="eth-aotm2-meta">
              {articleOfMonth.readTime ? (
                <>
                  <span className="eth-aotm2-read">{articleOfMonth.readTime} min read</span>
                  <i className="eth-aotm2-dot" aria-hidden="true" />
                </>
              ) : null}
              {aotmHistory.length > 1 && (
                <label className="eth-month-pill">
                  <span>Month ·</span>
                  <select
                    value={aotmIdx}
                    onChange={(e) => setAotmIdx(Number(e.target.value))}
                    aria-label="View previous Articles of the Month"
                  >
                    {aotmHistory.map((h, i) => (
                      <option key={h.month} value={i}>
                        {h.month}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </section>
        )}

        {/* Most Read: 5-column ledger. Rank numerals in italic serif, whole
            cell links. Cumulative view counts (honest label: READS, not
            "this week"). With no nonzero counts the band renders nothing and
            the command bar straddles the AotM hairline instead. */}
        {mostRead.length > 0 && (
          <section className="eth-ledger" aria-label="Most read articles">
            <div className="eth-ledger-label">Most Read</div>
            <ol className="eth-ledger-grid">
              {mostRead.map((a, i) => (
                <li key={a.id} className="eth-ledger-cell">
                  <Link href={`/ezana-echo/${a.id}`} className="eth-ledger-link">
                    <span className="eth-ledger-rank">{String(i + 1).padStart(2, '0')}</span>
                    <span className="eth-ledger-title">{a.title}</span>
                    <span className="eth-ledger-reads">
                      {(a.views || 0).toLocaleString()} reads
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Command bar: one floating pill straddling the hairline above.
            Left: continent chips (single-select, re-click clears). Right:
            time-window segments (existing timeWindow state). Both filter the
            board below; continent mutes non-matching cards, time window
            hides out-of-window articles, exactly as before. */}
        <div className="eth-cmdbar-row">
          <div className="eth-cmdbar" role="toolbar" aria-label="Filter articles">
            <div className="eth-cmdbar-chips" role="group" aria-label="Continents">
              {CONTINENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`eth-chip${selectedContinent === c ? ' is-active' : ''}`}
                  aria-pressed={selectedContinent === c}
                  onClick={() => toggleContinent(c)}
                >
                  {CONTINENT_SHORT[c] || c}
                </button>
              ))}
            </div>
            <i className="eth-cmdbar-divider" aria-hidden="true" />
            <div className="eth-cmdbar-segs" role="group" aria-label="Time window">
              {TIME_WINDOWS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className={`eth-seg${timeWindow === w.id ? ' is-active' : ''}`}
                  aria-pressed={timeWindow === w.id}
                  onClick={() => setTimeWindow(w.id)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category board — six plain newest-first columns. */}
        <div className={`eth-board${boardRevealed ? ' is-revealed' : ''}`} ref={boardRef}>
          {displayColumns.map((col, i) => (
            <CategoryColumn
              key={col.id}
              col={col}
              colIndex={i}
              admin={admin}
              filter={filter}
              geoActive={selectedContinent}
            />
          ))}
        </div>

        {/* Newsletter band (presentational — wire to real signup later) */}
        <div className="eth-news">
          <div className="eth-news-l">
            <div className="eth-news-eyebrow">The Evening Brief</div>
            <h2 className="eth-news-title">Wall Street intelligence, in your inbox by 6pm.</h2>
            <p className="eth-news-sub">
              One email a day — the signals that moved markets, the disclosures that didn&apos;t
              make the wire, and the one chart worth your morning.
            </p>
          </div>
          <form className="eth-news-form" onSubmit={(e) => e.preventDefault()}>
            <div className="eth-news-row">
              <input className="eth-news-input" type="email" placeholder="you@firm.com" />
              <button className="eth-news-btn" type="submit">
                Subscribe
              </button>
            </div>
            <span className="eth-news-fine">Unsubscribe anytime</span>
          </form>
        </div>
      </div>
    </div>
  );
}
