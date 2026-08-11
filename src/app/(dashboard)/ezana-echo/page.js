'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { isAdminUserClient } from '@/lib/admin-helpers-client';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import { EchoArticleCard } from '@/components/echo/EchoArticleCard';
import { InteractiveGlobe } from '@/components/ui/interactive-globe';
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

/* Conveyor-belt columns: constant speed in px/s (slow enough to read a title as
   it passes — one card height ≈ 9s), and the seam gap, which MUST equal the
   28px card gap so the loop's rhythm is invisible. */
const BELT_SPEED = 22;
const BELT_GAP = 28;

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

/* GEOGRAPHY OF THE NEWS: the article-rail globe on the homepage, extended
   with continent hover. Hovering land (or a chip below) filters the board;
   chips are the accessible/touch path (click pins, click again or tap
   elsewhere clears). Pauses offscreen via the same IO pattern as the rail. */
function GeoNewsPanel({ active, onHoverChange, onPinToggle }) {
  const hostRef = useRef(null);
  const [visible, setVisible] = useState(true);
  // Same read-once ocean token resolution as EchoGlobeRail, so the globe
  // does not render as a dark disc in light mode.
  const [oceanFill, setOceanFill] = useState(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cs = getComputedStyle(document.documentElement);
    const token =
      cs.getPropertyValue('--echo-globe-ocean').trim() ||
      cs.getPropertyValue('--bg-primary').trim();
    if (token) setOceanFill(token);
  }, []);

  return (
    <aside ref={hostRef} className="eth-geo" aria-label="Filter articles by continent">
      <div className="eth-geo-head">Geography of the News</div>
      <div className="eth-geo-globe">
        <InteractiveGlobe
          size={220}
          autoRotateSpeed={0.35}
          paused={!visible}
          continentHover
          onContinentHover={onHoverChange}
          highlightContinent={active}
          showConnections={false}
          {...(oceanFill ? { oceanFill } : {})}
        />
      </div>
      <div className="eth-geo-chips" role="group" aria-label="Continents">
        {CONTINENTS.map((c) => (
          <button
            key={c}
            type="button"
            className={active === c ? 'eth-geo-chip is-active' : 'eth-geo-chip'}
            aria-pressed={active === c}
            onMouseEnter={() => onHoverChange(c)}
            onMouseLeave={() => onHoverChange(null)}
            onFocus={() => onHoverChange(c)}
            onBlur={() => onHoverChange(null)}
            onClick={() => onPinToggle(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </aside>
  );
}

/* Masthead dateline, computed once per mount on the client (page is fully
   client-rendered, so there is no SSR text to mismatch). Format:
   "SATURDAY · AUG 9 2026" (uppercasing via CSS text-transform). */
function formatMastheadDate(d) {
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${weekday} · ${month} ${d.getDate()} ${d.getFullYear()}`;
}

export default function EzanaEchoPage() {
  const { user } = useAuth();
  const [mastheadDate] = useState(() => formatMastheadDate(new Date()));
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

  // Banner opening text: the excerpt, or the first paragraph content block if present.
  const aotmText = useMemo(() => {
    if (!articleOfMonth) return '';
    if (articleOfMonth.excerpt) return articleOfMonth.excerpt;
    const blocks = articleOfMonth.contentBlocks;
    const para = Array.isArray(blocks)
      ? blocks.find((b) => (b?.type === 'paragraph' || b?.type === 'text') && b?.text)
      : null;
    return para?.text || '';
  }, [articleOfMonth]);

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
        .map((a) => ({ ...a, subcategory: a.subcategory || ARTICLE_SUBCATEGORY[a.id] || null })),
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

  // Continent filter (globe panel + chips). Hover is transient; a chip click
  // (the touch path) pins until re-click or a tap outside the panel. Only
  // board cards mute; the AotM banner and MOST READ band are exempt.
  const [geoHover, setGeoHover] = useState(null);
  const [geoPinned, setGeoPinned] = useState(null);
  const activeContinent = geoPinned || geoHover;
  const toggleGeoPin = (c) => setGeoPinned((p) => (p === c ? null : c));
  useEffect(() => {
    if (!geoPinned) return undefined;
    const onDown = (e) => {
      if (!e.target.closest('.eth-geo')) setGeoPinned(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [geoPinned]);

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
        <Link href="/" className="eth-masthead-brand" aria-label="Ezana Echo home">
          <EzanaNavLogo width={44} height={37} priority />
          <span className="eth-masthead-name">
            Ezana <span>Echo</span>
          </span>
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
        {/* Newspaper masthead: serif wordmark between a hairline rule above and the
            classic double rule below, with a mono dateline row. Fully static. */}
        <div className="eth-paper">
          <div className="eth-paper-rule-top" aria-hidden />
          <h1 className="eth-paper-wordmark">Ezana Echo</h1>
          <div className="eth-paper-dateline">
            <span>Ezana Finance Editorial</span>
            <span className="eth-paper-date">{mastheadDate}</span>
            <span>Est. 2026</span>
          </div>
          <div className="eth-paper-rule-double" aria-hidden />
        </div>

        {/* Article of the Month — a full-width horizontal banner above the category
            headers: hero image on the left (same 16:9 size as a normal card), then
            the eyebrow, title, and as much opening text as fits. The current month's
            AOTM is excluded from the columns below so it never appears twice; older
            months are browsable via the dropdown (which lives OUTSIDE the Link so it
            can never trigger navigation). */}
        <div className="eth-aotm-wrap">
          {articleOfMonth && (
            <Link href={`/ezana-echo/${articleOfMonth.id}`} className="eth-aotm">
              <div className="eth-aotm-img">
                {articleOfMonth.heroImage?.src ? (
                  <img
                    src={articleOfMonth.heroImage.src}
                    alt={articleOfMonth.heroImage.alt || articleOfMonth.title}
                    loading="lazy"
                    onError={(e) => {
                      // remove (not display:none) so the :not(:has(img)) placeholder shows
                      e.currentTarget.remove();
                    }}
                  />
                ) : null}
              </div>
              <div className="eth-aotm-body">
                <span className="eth-aotm-eyebrow">
                  Article of the Month
                  {aotmIdx > 0 && aotmHistory[aotmIdx] ? ` — ${aotmHistory[aotmIdx].month}` : ''}
                </span>
                <h2 className="eth-aotm-title">{articleOfMonth.title}</h2>
                {aotmText && <p className="eth-aotm-text">{aotmText}</p>}
              </div>
            </Link>
          )}
          {aotmHistory.length > 1 && (
            <label className="eth-aotm-months">
              <span className="eth-aotm-months-label">Month</span>
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

        {/* MOST READ — top 5 by real all-time view counts; renders nothing when no
            article has a nonzero count. Rank numerals mono/emerald; honest label. */}
        {mostRead.length > 0 && (
          <div className="eth-mostread" aria-label="Most read articles">
            <span className="eth-mostread-label">Most Read</span>
            <ol className="eth-mostread-list">
              {mostRead.map((a, i) => (
                <li key={a.id} className="eth-mostread-item">
                  <Link href={`/ezana-echo/${a.id}`} className="eth-mostread-link">
                    <span className="eth-mostread-rank">{String(i + 1).padStart(2, '0')}</span>
                    <span className="eth-mostread-title">{a.title}</span>
                    <span className="eth-mostread-views">{(a.views || 0).toLocaleString()}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Toolbar row: the global time-window filter (unchanged capability)
            with the GEOGRAPHY OF THE NEWS globe panel right-aligned beside it.
            Hover a continent on the globe or the chips to mute non-matching
            board cards in place; the AotM and MOST READ above are exempt. */}
        <div className="eth-geo-row">
          <div className="eth-toolbar">
            <div className="eth-timefilter" role="group" aria-label="Time window">
              {TIME_WINDOWS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  aria-pressed={timeWindow === w.id}
                  onClick={() => setTimeWindow(w.id)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          <GeoNewsPanel
            active={activeContinent}
            onHoverChange={setGeoHover}
            onPinToggle={toggleGeoPin}
          />
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
              geoActive={activeContinent}
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
