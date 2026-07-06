'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Archive } from 'lucide-react';
import { formatPublishedShort } from '@/lib/echo-format';
import { getTag } from '@/lib/echo-tag-taxonomy';
import { useAuth } from '@/components/AuthProvider';
import { isAdminUserClient } from '@/lib/admin-helpers-client';

import './ezana-echo.css';
import './ezana-echo-home.css';

/* The 12 canonical Echo categories (id → label), shown as filter chips. "All"
   is prepended in the nav. Article `category` ids must match one of these. */
const CATEGORIES = [
  { id: 'markets', label: 'Markets' },
  { id: 'public-policy', label: 'Public Policy' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'commodities', label: 'Commodities' },
  { id: 'inside-the-capitol', label: 'Inside the Capitol' },
  { id: 'companies-earnings', label: 'Companies & Earnings' },
  { id: 'tech-infrastructure', label: 'Tech & Infrastructure' },
  { id: 'global-emerging', label: 'Global & Emerging Markets' },
  { id: 'deals-dealmakers', label: 'Deals & Dealmakers' },
  { id: 'founders-power', label: 'Founders & Power Players' },
  { id: 'science-health', label: 'Science & Health' },
  { id: 'quant-data', label: 'Quant & Data' },
];

/* Accent for the category eyebrow dot. Emerald-forward per the design system;
   anything unmapped falls back to emerald. */
const CAT_ACCENT = {
  markets: '#10b981',
  'public-policy': '#d4a853',
  crypto: '#818cf8',
  commodities: '#f59e0b',
  'inside-the-capitol': '#34d399',
  'companies-earnings': '#10b981',
  'tech-infrastructure': '#22d3ee',
  'global-emerging': '#2dd4bf',
  'deals-dealmakers': '#a78bfa',
  'founders-power': '#d4a853',
  'science-health': '#2dd4bf',
  'quant-data': '#818cf8',
};

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
/* Proper label for a category id — never shows a raw kebab id. Falls back to a
   title-cased version for any legacy/unknown id. */
const getCategoryLabel = (id) =>
  CATEGORY_LABELS[id] ||
  (id || '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
const catAccent = (slug) => CAT_ACCENT[slug] || 'var(--emerald)';

function CatEyebrow({ slug }) {
  return (
    <span className="eth-eyebrow" style={{ color: catAccent(slug) }}>
      <span className="dot" style={{ background: catAccent(slug) }} />
      {getCategoryLabel(slug)}
    </span>
  );
}

function initialsOf(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function Byline({ article, dark }) {
  return (
    <div className="eth-byline">
      <span className="eth-avatar">{initialsOf(article.author)}</span>
      <span
        className="eth-byline-meta"
        style={dark ? { color: 'rgba(226,232,240,0.7)' } : undefined}
      >
        <b style={dark ? { color: '#fff' } : undefined}>{article.author}</b> ·{' '}
        {formatPublishedShort(article.publishedAt)} · {article.readTime} min
      </span>
    </div>
  );
}

export default function EzanaEchoPage() {
  const { user } = useAuth();
  const isAdmin = isAdminUserClient(user);
  const [archivedSet, setArchivedSet] = useState(new Set());
  const [archivedCount, setArchivedCount] = useState(0);
  const [archivingId, setArchivingId] = useState(null);

  const [cat, setCat] = useState('all');
  const [activeTag, setActiveTag] = useState(null);

  const [rawArticles, setRawArticles] = useState([]);
  const [featuredRaw, setFeaturedRaw] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tagFromUrl = new URLSearchParams(window.location.search).get('tag');
    if (tagFromUrl) setActiveTag(tagFromUrl);
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

  // Feed = everything except the featured story (so it isn't duplicated).
  const feedSource = useMemo(
    () => allArticles.filter((a) => a.id !== featured?.id),
    [allArticles, featured],
  );

  // Ranked "Top Stories" rail — first five of the feed (hub is newest-first).
  const topStories = useMemo(() => feedSource.slice(0, 5), [feedSource]);

  const filtered = useMemo(() => {
    let list = cat === 'all' ? feedSource : feedSource.filter((a) => a.category === cat);
    if (activeTag) list = list.filter((a) => a.tags?.includes(activeTag));
    return list;
  }, [feedSource, cat, activeTag]);

  const heroHref = featured ? `/ezana-echo/${featured.id}` : '#';

  return (
    <div className="eth-page">
      <div className="eth-wrap">
        {/* Intro (the global navbar carries the top chrome — no masthead band) */}
        <div className="eth-intro">
          <div>
            <h1 className="eth-intro-title">
              Ezana <span>Echo</span>
            </h1>
          </div>
          <Link href="/ezana-echo/archived" className="eth-archived-btn">
            View archived
            <span className="eth-archived-count">{archivedCount}</span>
          </Link>
        </div>

        {/* Split featured hero + ranked Top Stories rail */}
        {featured && (
          <section className="eth-hero">
            {isAdmin && (
              <button
                type="button"
                className="eth-archive-btn"
                onClick={(e) => handleArchive(featured.id, e)}
                disabled={archivingId === featured.id}
                title="Archive this article"
              >
                <Archive size={13} aria-hidden />
                {archivingId === featured.id ? 'Archiving…' : 'Archive'}
              </button>
            )}
            <Link href={heroHref} className="eth-feat">
              {featured.heroImage?.src ? (
                <img
                  className="eth-feat-img"
                  src={featured.heroImage.src}
                  alt={featured.heroImage.alt || featured.title}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span className="eth-feat-fallback" />
              )}
              <span className="eth-feat-scrim" />
              <div className="eth-feat-body">
                <span className="eth-eyebrow eth-feat-kicker">
                  <span className="dot" style={{ background: catAccent(featured.category) }} />
                  {getCategoryLabel(featured.category)} · The Big Read
                </span>
                <h2 className="eth-feat-title">{featured.title}</h2>
                {featured.excerpt && <p className="eth-feat-dek">{featured.excerpt}</p>}
                <Byline article={featured} dark />
              </div>
            </Link>

            <div className="eth-rail">
              <div className="eth-rail-head">
                <span className="eth-rail-title">Top Stories</span>
                <span className="eth-rail-live">
                  <i />
                  LATEST
                </span>
              </div>
              {topStories.map((a, i) => (
                <Link key={a.id} href={`/ezana-echo/${a.id}`} className="eth-rank">
                  <span className="eth-rank-n">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <CatEyebrow slug={a.category} />
                    <h4 className="eth-rank-title">{a.title}</h4>
                    <div className="eth-rank-meta">
                      {a.author} <span>·</span> {a.readTime} min
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* The Feed — controls + nav-style category filter (no dotted pills) */}
        <div className="eth-controls">
          <h2>{cat === 'all' ? 'The Feed' : getCategoryLabel(cat)}</h2>
          <span className="eth-count">
            {filtered.length} {filtered.length === 1 ? 'story' : 'stories'}
          </span>
        </div>

        <nav className="eth-catnav" aria-label="Filter by category">
          <button
            type="button"
            className={cat === 'all' ? 'active' : ''}
            onClick={() => {
              setCat('all');
              setActiveTag(null);
            }}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cat === c.id ? 'active' : ''}
              onClick={() => {
                setCat(c.id);
                setActiveTag(null);
              }}
            >
              {c.label}
            </button>
          ))}
        </nav>

        {activeTag && (
          <div className="eth-tag-banner">
            <span>Filtered by tag:</span>
            <span className="eth-tag-chip">{getTag(activeTag).label}</span>
            <button type="button" className="eth-tag-clear" onClick={() => setActiveTag(null)}>
              Clear
            </button>
          </div>
        )}

        {/* Dense article grid */}
        {filtered.length ? (
          <div className="eth-grid">
            {filtered.map((a) => (
              <div key={a.id} className="eth-card-wrap">
                {isAdmin && (
                  <button
                    type="button"
                    className="eth-archive-btn"
                    onClick={(e) => handleArchive(a.id, e)}
                    disabled={archivingId === a.id}
                    title="Archive this article"
                  >
                    <Archive size={13} aria-hidden />
                    {archivingId === a.id ? '…' : 'Archive'}
                  </button>
                )}
                <Link href={`/ezana-echo/${a.id}`} className="eth-card">
                  <div className="eth-card-img">
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
                  <div className="eth-card-body">
                    <h3 className="eth-card-title">{a.title}</h3>
                    <div className="eth-card-foot">
                      <span>{a.author}</span>
                      <span className="sep">·</span>
                      <span>{formatPublishedShort(a.publishedAt)}</span>
                      <span className="sep">·</span>
                      <span>{a.readTime} min</span>
                    </div>
                    {/* Category moved off the image → below the author, sized to match. */}
                    <div className="eth-card-category">{getCategoryLabel(a.category)}</div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="eth-empty">
            No stories in this section yet.
            {(cat !== 'all' || activeTag) && (
              <button
                type="button"
                className="eth-empty-clear"
                onClick={() => {
                  setCat('all');
                  setActiveTag(null);
                }}
              >
                Clear filter
              </button>
            )}
          </div>
        )}

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
            <span className="eth-news-fine">Free · Curated daily · Unsubscribe anytime</span>
          </form>
        </div>
      </div>
    </div>
  );
}
