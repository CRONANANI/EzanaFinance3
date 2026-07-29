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

/* The 6 Echo categories (id → label). Each renders as a column on the homepage
   board. Article `category` ids must match one of these. */
const CATEGORIES = [
  { id: 'markets-companies', label: 'Markets & Companies' },
  { id: 'politics-policy', label: 'Politics & Policy' },
  { id: 'tech-founders', label: 'Tech & Founders' },
  { id: 'commodities-energy', label: 'Commodities & Energy' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'global-emerging', label: 'Global & Emerging Markets' },
];

/* Centered column header: emerald dot beside the label, full-width underline. */
function ColHead({ label }) {
  return (
    <div className="eth-col-head">
      <span className="eth-col-dot" aria-hidden />
      {label}
    </div>
  );
}

/* A single category column: header + newest-first stack of cards (no carves —
   carved cards live only inside the center cluster's 2x2). */
function CategoryColumn({ col, admin }) {
  return (
    <div className="eth-col">
      <ColHead label={col.label} />
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
      items: pool
        .filter((a) => a.category === c.id)
        .sort((x, y) => String(y.publishedAt).localeCompare(String(x.publishedAt))),
    }));
  }, [allArticles, articleOfMonth]);

  // The two middle categories form the center cluster. Its top 2x2 of cards is
  // what the featured circle is grid-centered on, so the circle and all four
  // carves share one exact center. Needs ≥2 cards in each middle column and a
  // featured article; otherwise we fall back to plain columns + an in-flow circle.
  const admin = { isAdmin, onArchive: handleArchive, archivingId };
  const midL = columns[2];
  const midR = columns[3];
  const canCluster =
    Boolean(articleOfMonth) && midL.items.length >= 2 && midR.items.length >= 2;

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
        {/* Category board. The two middle categories render as a center cluster
            whose top four cards (a 2x2) sculpt around the featured circle: the
            circle is grid-centered on the 2x2's shared inner corner, and each of
            the four cards carves the corner facing that same point — so the circle
            and all four carves share ONE center by construction (no pixel guess,
            no overlap, no white disc). The other four categories are plain columns.
            Card bodies sit above the circle, so titles are never clipped. */}
        <div className="eth-board">
          {canCluster ? (
            <>
              <CategoryColumn col={columns[0]} admin={admin} />
              <CategoryColumn col={columns[1]} admin={admin} />

              <div className="eth-center-cluster">
                <div className="eth-cluster-heads">
                  <ColHead label={midL.label} />
                  <ColHead label={midR.label} />
                </div>
                {/* 2x2: [L0 | R0] / [L1 | R1]; each carves the corner facing center. */}
                <div className="eth-cluster-feature">
                  <EchoArticleCard article={midL.items[0]} carve="br" {...admin} />
                  <EchoArticleCard article={midR.items[0]} carve="bl" {...admin} />
                  <EchoArticleCard article={midL.items[1]} carve="tr" {...admin} />
                  <EchoArticleCard article={midR.items[1]} carve="tl" {...admin} />
                  <EchoFeatureCircle article={articleOfMonth} className="eth-cluster-circle" />
                </div>
                <div className="eth-cluster-rest">
                  <div className="eth-col">
                    {midL.items.slice(2).map((a) => (
                      <EchoArticleCard key={a.id} article={a} {...admin} />
                    ))}
                  </div>
                  <div className="eth-col">
                    {midR.items.slice(2).map((a) => (
                      <EchoArticleCard key={a.id} article={a} {...admin} />
                    ))}
                  </div>
                </div>
              </div>

              <CategoryColumn col={columns[4]} admin={admin} />
              <CategoryColumn col={columns[5]} admin={admin} />
            </>
          ) : (
            <>
              {columns.map((col) => (
                <CategoryColumn key={col.id} col={col} admin={admin} />
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
