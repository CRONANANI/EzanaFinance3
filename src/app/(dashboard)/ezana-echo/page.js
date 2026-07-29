'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Archive } from 'lucide-react';
import { formatPublishedShort } from '@/lib/echo-format';
import { useAuth } from '@/components/AuthProvider';
import { isAdminUserClient } from '@/lib/admin-helpers-client';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';

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

/* Board card — hero image on top, title + meta below. Used in the 6-column board.
   `carve` ('br' | 'tr' | 'bl' | 'tl') applies a radial-mask bite to the HERO IMAGE
   only (never the body/text) so the card's image curves away from the centerpiece
   circle, leaving a gap. A missing/broken hero falls back to the emerald-tinted
   placeholder (the hero box keeps its own background), so the grid never breaks. */
function BoardCard({ a, carve, isAdmin, onArchive, archivingId }) {
  return (
    <div className={`eth-bcard-wrap${carve ? ` eth-bcard--carve-${carve}` : ''}`}>
      {isAdmin && (
        <button
          type="button"
          className="eth-archive-btn"
          onClick={(e) => onArchive(a.id, e)}
          disabled={archivingId === a.id}
          title="Archive this article"
        >
          <Archive size={13} aria-hidden />
          {archivingId === a.id ? '…' : 'Archive'}
        </button>
      )}
      <Link href={`/ezana-echo/${a.id}`} className="eth-bcard">
        <div className="eth-bcard-hero">
          {a.heroImage?.src ? (
            <img
              src={a.heroImage.src}
              alt={a.heroImage.alt || a.title}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}
        </div>
        <div className="eth-bcard-body">
          <h3 className="eth-bcard-title">{a.title}</h3>
          <div className="eth-bcard-meta">
            {formatPublishedShort(a.publishedAt)} · {a.readTime} MIN
          </div>
        </div>
      </Link>
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
        {/* Six category columns of hero-image cards (newest-first per column). An
            image-filled "Article of the Month" circle (green outline + emerald
            pulse) is centered over the middle columns; the hero images of the 4
            cards nearest it are carved so the cards curve away, leaving a gap the
            circle nestles into (bodies sit above the circle, so titles are never
            clipped — desktop only). Crypto with no articles shows an empty state. */}
        <div className="eth-board">
          {columns.map((col, ci) => {
            // The circle sits on the seam between the two middle columns (ci 2 & 3),
            // vertically centered on the boundary between the 2nd and 3rd cards. The
            // card just ABOVE that boundary is bitten at its lower corner facing the
            // circle; the card just BELOW is bitten at its upper corner.
            const upperIdx = Math.min(1, col.items.length - 1); // card above the seam
            const lowerIdx = col.items.length > 2 ? 2 : -1; // card below the seam
            const carveFor = (i) => {
              if (ci === 2) return i === upperIdx ? 'br' : i === lowerIdx ? 'tr' : null;
              if (ci === 3) return i === upperIdx ? 'bl' : i === lowerIdx ? 'tl' : null;
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
                    <BoardCard
                      key={a.id}
                      a={a}
                      isAdmin={isAdmin}
                      onArchive={handleArchive}
                      archivingId={archivingId}
                      carve={carveFor(i)}
                    />
                  ))
                ) : (
                  <div className="eth-col-empty">No articles yet</div>
                )}
              </div>
            );
          })}

          {articleOfMonth && (
            <Link href={`/ezana-echo/${articleOfMonth.id}`} className="eth-circle">
              {articleOfMonth.heroImage?.src ? (
                <img
                  className="eth-circle-img"
                  src={articleOfMonth.heroImage.src}
                  alt={articleOfMonth.heroImage.alt || articleOfMonth.title}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <div className="eth-circle-overlay">
                <span className="eth-circle-eyebrow">Article of the Month</span>
                <h2 className="eth-circle-title">{articleOfMonth.title}</h2>
                <span className="eth-circle-meta">
                  {formatPublishedShort(articleOfMonth.publishedAt)} · {articleOfMonth.readTime} MIN
                </span>
              </div>
            </Link>
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
