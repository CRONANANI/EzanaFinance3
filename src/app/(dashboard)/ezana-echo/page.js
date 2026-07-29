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
        {/* Six category columns of EchoArticleCards (newest-first per column).
            The EchoFeatureCircle (hero image + single emerald ring + pulse) is
            centered on the seam of the two middle columns; the images of the 4
            cards whose corners meet it are carved (via the card's `carve` prop)
            so the cards sculpt around the circle with a real gap. Bodies sit
            above the circle, so titles are never clipped. Crypto with no articles
            shows an honest empty state. */}
        <div className="eth-board">
          {columns.map((col, ci) => {
            // The circle sits on the seam between the two middle columns (ci 2 & 3)
            // and between the top two card rows. The upper card of each middle
            // column is bitten at its lower corner facing the circle; the lower
            // card is bitten at its upper corner facing the circle.
            const carveFor = (i) => {
              if (ci === 2) return i === 0 ? 'br' : i === 1 ? 'tr' : null;
              if (ci === 3) return i === 0 ? 'bl' : i === 1 ? 'tl' : null;
              return null;
            };
            return (
              <div className="eth-col" key={col.id}>
                <div className="eth-col-head">
                  <span className="eth-col-dot" aria-hidden />
                  {col.label}
                </div>
                {col.items.length ? (
                  col.items.map((a, i) => (
                    <EchoArticleCard
                      key={a.id}
                      article={a}
                      carve={carveFor(i)}
                      isAdmin={isAdmin}
                      onArchive={handleArchive}
                      archivingId={archivingId}
                    />
                  ))
                ) : (
                  <div className="eth-col-empty">No articles yet</div>
                )}
              </div>
            );
          })}

          {articleOfMonth && <EchoFeatureCircle article={articleOfMonth} />}
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
