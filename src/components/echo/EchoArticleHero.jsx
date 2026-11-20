'use client';

/**
 * Ezana Echo article header (Nov 19th, 2026 redesign). Top of the article page
 * only: a slim Echo masthead, a two-column editorial hero (headline, summary,
 * byline, Save and Share on the left; the story's home image on the right)
 * and the Story Snapshot strip. Everything below it (contents rail, body,
 * figures, globe rail, footer) is untouched.
 *
 * Data comes from the article itself (lib/echo/article-header.js): the image
 * is the one the Echo home shows for the story, and the snapshot is the
 * article's own stat grid, which the body then skips.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { EchoSaveButton } from '@/components/echo/EchoSaveButton';
import { shareLink } from '@/lib/share';
import { formatPublishedDate } from '@/lib/echo-format';
import './echo-article-hero.css';

/** Slim publication bar: Echo wordmark (home link) and sign-in actions. */
export function EchoArticleMasthead() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const redirect = encodeURIComponent(pathname || '/ezana-echo');
  return (
    <div className="eah-masthead">
      <Link href="/ezana-echo" className="eah-wordmark" aria-label="Ezana Echo home">
        <span className="eah-wordmark-a">Ezana</span>
        <span className="eah-wordmark-b">Echo</span>
      </Link>
      {!isAuthenticated && (
        <div className="eah-masthead-actions">
          <Link href={`/auth/signin?redirect=${redirect}`} className="eah-text-btn">
            Log in
          </Link>
          <Link href={`/auth/signup?redirect=${redirect}`} className="eah-primary-btn">
            Subscribe
          </Link>
        </div>
      )}
    </div>
  );
}

/** Uppercase eyebrow: section in emerald, subcategory muted. */
export function EchoArticleEyebrow({ eyebrow }) {
  if (!eyebrow?.primary) return null;
  return (
    <p className="eah-eyebrow">
      <span className="eah-eyebrow-primary">{eyebrow.primary}</span>
      {eyebrow.secondary && (
        <>
          <span className="eah-eyebrow-dot" aria-hidden>
            ·
          </span>
          <span className="eah-eyebrow-secondary">{eyebrow.secondary}</span>
        </>
      )}
    </p>
  );
}

/** Byline row: avatar, author(s), date, read time, then Save and Share. */
export function EchoArticleMetadata({ article, articleTags, articleTracker }) {
  const [shareNote, setShareNote] = useState('');
  const author = article.author || 'Ezana Finance Editorial';
  const initial = author.trim().charAt(0).toUpperCase() || 'E';
  const date = article.listMeta || formatPublishedDate(article.publishedAt);

  /* Same share path as the engagement bar (lib/share.js + the tracker's
     recordShare), so shares from either place count once each, in one system. */
  const handleShare = useCallback(async () => {
    const slug = article.slug || article.id;
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/ezana-echo/${slug}`
        : `/ezana-echo/${slug}`;
    const result = await shareLink({ title: article.title || 'Ezana Echo', url });
    if (result === 'native' || result === 'shared') {
      articleTracker?.recordShare?.('native');
      setShareNote('');
    } else if (result === 'copied') {
      articleTracker?.recordShare?.('link');
      setShareNote('Link copied');
    } else if (result === 'failed') {
      setShareNote('Could not share. Copy the address bar link.');
    }
  }, [article.slug, article.id, article.title, articleTracker]);

  return (
    <div className="eah-meta">
      <div className="eah-byline">
        {article.authorAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="eah-avatar" src={article.authorAvatar} alt="" />
        ) : (
          <span className="eah-avatar" aria-hidden>
            {initial}
          </span>
        )}
        <span className="eah-byline-text">
          By <strong>{author}</strong>
          {article.coAuthors?.length > 0 && (
            <>
              {' & '}
              {article.coAuthors.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ', '}
                  {c.username ? (
                    <Link href={`/profile/${c.username}`}>
                      <strong>{c.name}</strong>
                    </Link>
                  ) : (
                    <strong>{c.name}</strong>
                  )}
                </span>
              ))}
            </>
          )}
          {date && (
            <>
              <span className="eah-sep" aria-hidden>
                ·
              </span>
              <span className="eah-date">{date}</span>
            </>
          )}
          <span className="eah-sep" aria-hidden>
            ·
          </span>
          <span className="eah-readtime">{article.readTime} min read</span>
        </span>
      </div>
      <div className="eah-actions">
        <EchoSaveButton
          articleId={article.id}
          articleTags={articleTags}
          placement="top"
          articleTracker={articleTracker}
        />
        <button type="button" className="eah-text-btn eah-share" onClick={handleShare}>
          <i className="bi bi-share" aria-hidden />
          <span>Share</span>
        </button>
        <span className="eah-share-note" role="status" aria-live="polite">
          {shareNote}
        </span>
      </div>
    </div>
  );
}

/* Count every number inside a stat up from zero once it scrolls into view,
   keeping the words, symbols, separators and decimals around them ("$39.5B",
   "4 in 5 days", "294-134"). Dates stay static, as does everything under
   reduced motion. */
const NUM_RE = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;
const DATE_RE = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d/i;

function useCountUp(value, ref, duration = 1400) {
  const text = String(value ?? '');
  const [shown, setShown] = useState(text);
  useEffect(() => {
    setShown(text);
    const parts = [...text.matchAll(NUM_RE)];
    const el = ref.current;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!parts.length || DATE_RE.test(text) || !el || reduce) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const nums = parts.map((m) => {
      const raw = m[0];
      return {
        start: m.index,
        end: m.index + raw.length,
        target: Number(raw.replace(/,/g, '')),
        decimals: (raw.split('.')[1] || '').length,
        commas: raw.includes(','),
      };
    });
    const render = (k) => {
      let out = '';
      let at = 0;
      for (const n of nums) {
        const fixed = (n.target * k).toFixed(n.decimals);
        let str = fixed;
        if (n.commas) {
          const [i, d] = fixed.split('.');
          str = `${Number(i).toLocaleString('en-US')}${d ? `.${d}` : ''}`;
        }
        out += text.slice(at, n.start) + str;
        at = n.end;
      }
      return out + text.slice(at);
    };
    let raf = 0;
    setShown(render(0));
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t) => {
          const k = Math.min(1, (t - t0) / duration);
          setShown(k >= 1 ? text : render(1 - (1 - k) ** 3));
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return shown;
}

/* One stat as a moving-dot card (Nov 19, 2026; after the 21st.dev "moving
   dot card"): the glossy emerald surface, a light ray from the top left,
   hairlines lit on the top and left edges, and a small glowing dot that
   travels the card's border. The value counts up on first view. */
function SnapCard({ stat, index }) {
  const ref = useRef(null);
  const shown = useCountUp(stat.value, ref);
  return (
    <li className="eah-dot" ref={ref} style={{ '--eah-dot-delay': `${index * -1.6}s` }}>
      <span className="eah-dot__dot" aria-hidden="true" />
      <div className="eah-dot__card">
        <span className="eah-dot__ray" aria-hidden="true" />
        <span className="eah-dot__label">{stat.label}</span>
        <span className="eah-dot__value" aria-label={String(stat.value)}>
          <span aria-hidden="true">{shown}</span>
        </span>
        {stat.change ? <span className="eah-dot__desc">{stat.change}</span> : null}
        <span className="eah-dot__line eah-dot__line--top" aria-hidden="true" />
        <span className="eah-dot__line eah-dot__line--left" aria-hidden="true" />
        <span className="eah-dot__line eah-dot__line--bottom" aria-hidden="true" />
        <span className="eah-dot__line eah-dot__line--right" aria-hidden="true" />
      </div>
    </li>
  );
}

/** Story Snapshot: the article's own key stats as moving-dot cards. */
export function EchoArticleSnapshot({ stats }) {
  if (!stats?.length) return null;
  return (
    <section className="eah-snapshot" aria-label="Story snapshot">
      <div className="eah-snap-intro">
        <span className="eah-snap-kicker">Story snapshot</span>
        <span className="eah-snap-lede">The key facts, in context.</span>
      </div>
      <ul className="eah-snap-list" style={{ '--eah-snap-n': stats.length }}>
        {stats.map((s, i) => (
          <SnapCard key={i} stat={s} index={i} />
        ))}
      </ul>
    </section>
  );
}

/**
 * The whole header. `wide` stretches it to the globe rail's right edge on
 * grail articles at desktop (same widths as the old title band).
 */
export function EchoArticleHero({
  article,
  image,
  eyebrow,
  snapshot,
  articleTags,
  articleTracker,
  wide = false,
}) {
  const remote = Boolean(image?.src && /^https?:\/\//.test(image.src));
  return (
    <header className={`eah${wide ? ' eah--grail' : ''}${image ? '' : ' eah--text-only'}`}>
      <EchoArticleMasthead />
      <div className="eah-hero">
        <div className="eah-copy">
          <EchoArticleEyebrow eyebrow={eyebrow} />
          <h1 className="eah-title">{article.title}</h1>
          {article.excerpt && <p className="eah-dek">{article.excerpt}</p>}
        </div>
        {image && (
          <figure className={`eah-media${image.whole ? ' eah-media--whole' : ''}`}>
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              unoptimized={remote}
              sizes="(max-width: 1024px) 100vw, 46vw"
              style={{ objectFit: 'cover', objectPosition: image.position || '50% 50%' }}
            />
          </figure>
        )}
        <EchoArticleMetadata
          article={article}
          articleTags={articleTags}
          articleTracker={articleTracker}
        />
      </div>
      <EchoArticleSnapshot stats={snapshot} />
    </header>
  );
}

export default EchoArticleHero;
