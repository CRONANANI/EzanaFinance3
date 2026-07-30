'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { isAdminUserClient } from '@/lib/admin-helpers-client';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import { EchoArticleCard } from '@/components/echo/EchoArticleCard';
import { EchoFeatureCircle } from '@/components/echo/EchoFeatureCircle';

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
      <div className="eth-col-head">
        <span className="eth-col-dot" aria-hidden />
        {category.label}
      </div>
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

/* A single category column: header + newest-first stack of cards (no carves —
   carved cards live only inside the center cluster's 2x2). */
function CategoryColumn({ col, admin, filter }) {
  return (
    <div className="eth-col">
      <ColHead category={col} filter={filter} />
      {col.items.length ? (
        col.items.map((a) => (
          <EchoArticleCard
            key={a.id}
            article={a}
            isAdmin={admin.isAdmin}
            onArchive={admin.onArchive}
            archivingId={admin.archivingId}
          />
        ))
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

  // Article of the Month = the flagged article (the `articleOfMonth` flag first,
  // then the DB-backed `featured` flag, then most-recent) — never a hardcoded id.
  // It becomes the circular centerpiece and is excluded from the columns.
  const articleOfMonth = useMemo(
    () => allArticles.find((a) => a.articleOfMonth) || featured || feedSource[0] || null,
    [allArticles, featured, feedSource],
  );

  // Six category columns, each = that category's articles (minus the centerpiece)
  // sorted newest-first. Empty categories (Crypto) render an honest empty state.
  const columns = useMemo(() => {
    const pool = allArticles.filter((a) => a.id !== articleOfMonth?.id);
    return CATEGORIES.map((c) => ({
      id: c.id,
      label: c.label,
      subs: c.subs,
      items: pool
        .filter((a) => a.category === c.id)
        .sort((x, y) => String(y.publishedAt).localeCompare(String(x.publishedAt))),
    }));
  }, [allArticles, articleOfMonth]);

  // Apply the subcategory filter: an article shows unless it carries a
  // `subcategory` that has been unchecked for its column.
  const displayColumns = useMemo(
    () =>
      columns.map((c) => ({
        ...c,
        items: c.items.filter(
          (a) => !a.subcategory || (activeSubs[c.id] || []).includes(a.subcategory),
        ),
      })),
    [columns, activeSubs],
  );

  // The two middle categories form the center cluster. The featured circle is
  // grid-centered on ROWS 2–3 of those columns (positional, not article-bound), so
  // row 1 sits above it normally. Needs ≥3 cards in each middle column (rows 2–3
  // plus row 1) and a featured article; otherwise fall back to plain columns + an
  // in-flow circle.
  const admin = { isAdmin, onArchive: handleArchive, archivingId };
  const filter = { activeSubs, openFilter, onOpenFilter: setOpenFilter, onToggleSub: toggleSub };
  const midL = displayColumns[2];
  const midR = displayColumns[3];
  const canCluster =
    Boolean(articleOfMonth) && midL.items.length >= 3 && midR.items.length >= 3;

  return (
    <div className="eth-page">
      {/* Header (marketing nav is suppressed on Echo). Logo + brand on the left,
          aligned to the card column's left edge; Login / Become a Partner on the
          right with centers aligned to the brand. The "Publish to the Echo →"
          note sits ABOVE the partner button. */}
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
            <a href="/auth/partner/apply" className="eth-partner-note">
              Publish to the Echo →
            </a>
            <a href="/auth/partner/apply" className="eth-partner-btn">
              Become a Partner
            </a>
          </div>
        </div>
      </header>

      <div className="eth-wrap">
        {/* Category board. The two middle categories render as a center cluster:
            row 1 sits normally above the circle, then ROWS 2–3 form a 2x2 that
            sculpts around the featured circle — the circle is grid-centered on the
            2x2's shared inner corner and each of the four cards carves the corner
            facing that same point, so the circle and all four carves share ONE
            center by construction (no pixel guess, no white corners). The other
            four categories are plain columns. Each header carries a subcategory
            filter; card bodies sit above the circle, so titles are never clipped. */}
        <div className="eth-board">
          {canCluster ? (
            <>
              <CategoryColumn col={displayColumns[0]} admin={admin} filter={filter} />
              <CategoryColumn col={displayColumns[1]} admin={admin} filter={filter} />

              <div className="eth-center-cluster">
                <div className="eth-cluster-heads">
                  <ColHead category={midL} filter={filter} />
                  <ColHead category={midR} filter={filter} />
                </div>
                {/* Row 1: normal cards above the circle. */}
                <div className="eth-cluster-top">
                  <EchoArticleCard article={midL.items[0]} {...admin} />
                  <EchoArticleCard article={midR.items[0]} {...admin} />
                </div>
                {/* Rows 2–3: the carved 2x2 [L1 | R1] / [L2 | R2]; each carves the
                    corner facing the circle grid-centered on the shared point. */}
                <div className="eth-cluster-feature">
                  <EchoArticleCard article={midL.items[1]} carve="br" {...admin} />
                  <EchoArticleCard article={midR.items[1]} carve="bl" {...admin} />
                  <EchoArticleCard article={midL.items[2]} carve="tr" {...admin} />
                  <EchoArticleCard article={midR.items[2]} carve="tl" {...admin} />
                  <EchoFeatureCircle article={articleOfMonth} className="eth-cluster-circle" />
                </div>
                <div className="eth-cluster-rest">
                  <div className="eth-col">
                    {midL.items.slice(3).map((a) => (
                      <EchoArticleCard key={a.id} article={a} {...admin} />
                    ))}
                  </div>
                  <div className="eth-col">
                    {midR.items.slice(3).map((a) => (
                      <EchoArticleCard key={a.id} article={a} {...admin} />
                    ))}
                  </div>
                </div>
              </div>

              <CategoryColumn col={displayColumns[4]} admin={admin} filter={filter} />
              <CategoryColumn col={displayColumns[5]} admin={admin} filter={filter} />
            </>
          ) : (
            <>
              {displayColumns.map((col) => (
                <CategoryColumn key={col.id} col={col} admin={admin} filter={filter} />
              ))}
              {articleOfMonth && (
                <EchoFeatureCircle article={articleOfMonth} className="eth-feature-standalone" />
              )}
            </>
          )}
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
