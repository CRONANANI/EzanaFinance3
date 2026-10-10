'use client';

/**
 * Ezana Echo home, option B (Magazine bento). Presentational: the route
 * (src/app/(dashboard)/ezana-echo/page.js) owns data, URL filters, paging and
 * admin actions and passes them in. Tiles come only from packTiles().
 *
 * Order: hero, Most read strip, Latest row + section tabs, bento, Load more,
 * The Evening Brief, footer. The Echo masthead stays in the route.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { packTiles } from '@/lib/echo/bento-layout';
import { SECTIONS, REGIONS, RANGES, DEFAULT_FILTERS, emptyMessage } from '@/lib/echo/home-feed';
import { NEWSLETTER_CONSENT_TEXT } from '@/lib/newsletter/config';
import './echo-home.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SECTION_SHORT = Object.fromEntries(SECTIONS.map((s) => [s.id, s.short]));
const fmtReads = (n) => `${Number(n || 0).toLocaleString('en-US')} READS`;

/**
 * @param {object}   props
 * @param {object}   [props.hero]          { id, title, dek, kicker, section, date, mins, image, imageAlt, href }
 * @param {Array}    props.mostRead        stories, up to 5, with `views`
 * @param {Array}    props.stories         the visible (filtered, paged) stories, in order
 * @param {object}   [props.chart]         Chart of the Week (page 1 only)
 * @param {object}   props.filters         { section, region, range, q }
 * @param {Function} props.onFiltersChange (patch) => void
 * @param {boolean}  props.hasMore
 * @param {Function} props.onLoadMore
 * @param {'loading'|'ready'|'error'} props.status
 * @param {Function} props.onRetry
 * @param {Function} props.onSubscribe     async (email, consentText) => void, throws on failure
 * @param {boolean}  props.searchOpen
 * @param {Function} props.onSearchOpenChange
 * @param {boolean}  [props.isAdmin]
 * @param {Function} [props.onArchive]     (articleId) => void
 * @param {string}   [props.archivingId]
 */
export default function EchoHome({
  hero,
  mostRead = [],
  stories = [],
  chart = null,
  filters = DEFAULT_FILTERS,
  onFiltersChange,
  hasMore = false,
  onLoadMore,
  status = 'ready',
  onRetry,
  onSubscribe,
  searchOpen = false,
  onSearchOpenChange,
  isAdmin = false,
  onArchive,
  archivingId = null,
}) {
  const tiles = useMemo(() => packTiles(stories, { chart }), [stories, chart]);

  // Load more: focus moves to the first new tile's link.
  const gridRef = useRef(null);
  const prevCount = useRef(0);
  const pendingFocus = useRef(false);
  useEffect(() => {
    if (pendingFocus.current && tiles.length > prevCount.current && gridRef.current) {
      const links = gridRef.current.querySelectorAll('.ech-tile__link');
      links[prevCount.current]?.focus();
    }
    pendingFocus.current = false;
    prevCount.current = tiles.length;
  }, [tiles.length]);

  const loadMore = () => {
    pendingFocus.current = true;
    onLoadMore?.();
  };

  const searchRef = useRef(null);
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  const showSearch = searchOpen || Boolean(filters.q);

  return (
    <main className="ech-page">
      {hero ? <Hero hero={hero} /> : status === 'loading' ? <HeroSkeleton /> : null}

      {status === 'loading' ? <MostReadSkeleton /> : <MostRead items={mostRead} />}

      <section className="ech-latest" id="latest" aria-labelledby="ech-latest-h">
        <div className="ech-latest__row">
          <h2 id="ech-latest-h" className="ech-latest__title">
            Latest
          </h2>
          <div className="ech-latest__controls">
            {showSearch && (
              <div className="ech-search">
                <label htmlFor="ech-search" className="ech-sr">
                  Search Echo
                </label>
                <i className="bi bi-search" aria-hidden="true" />
                <input
                  ref={searchRef}
                  id="ech-search"
                  type="search"
                  placeholder="Search stories, tickers, topics"
                  value={filters.q}
                  maxLength={80}
                  onChange={(e) => onFiltersChange?.({ q: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      onFiltersChange?.({ q: '' });
                      onSearchOpenChange?.(false);
                    }
                  }}
                />
              </div>
            )}
            <RegionMenu
              value={filters.region}
              onChange={(region) => onFiltersChange?.({ region })}
            />
            <Segmented
              label="Time range"
              mono
              options={RANGES.map((r) => ({ value: r.id, label: r.label }))}
              value={filters.range}
              onChange={(range) => onFiltersChange?.({ range })}
            />
          </div>
        </div>
        <Segmented
          className="ech-tabs"
          label="Section"
          options={[
            { value: '', label: 'All' },
            ...SECTIONS.map((s) => ({ value: s.id, label: s.label })),
          ]}
          value={filters.section}
          onChange={(section) => onFiltersChange?.({ section })}
        />
      </section>

      {status === 'loading' && <BentoSkeleton />}
      {status === 'error' && (
        <div className="ech-state" role="alert">
          <p>Stories didn&rsquo;t load. Try again.</p>
          <button type="button" className="ech-btn ech-btn--outline" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
      {status === 'ready' && tiles.length === 0 && (
        <div className="ech-state" role="status">
          <p>{emptyMessage(filters)}</p>
          <button
            type="button"
            className="ech-btn ech-btn--outline"
            onClick={() => onFiltersChange?.({ ...DEFAULT_FILTERS })}
          >
            Reset filters
          </button>
        </div>
      )}
      {status === 'ready' && tiles.length > 0 && (
        <div className="ech-bento" ref={gridRef}>
          {tiles.map((t) => (
            <Tile
              key={t.key}
              tile={t}
              isAdmin={isAdmin}
              onArchive={onArchive}
              archiving={t.story && archivingId === t.story.id}
            />
          ))}
        </div>
      )}

      {status === 'ready' && hasMore && (
        <div className="ech-more">
          <button type="button" className="ech-btn ech-btn--outline" onClick={loadMore}>
            Load more stories <i className="bi bi-chevron-down" aria-hidden="true" />
          </button>
        </div>
      )}

      <EveningBrief onSubscribe={onSubscribe} />

      <footer className="ech-footer">
        <span>Ezana Echo is published by Ezana Finance. Nothing here is investment advice.</span>
        <nav aria-label="Ezana Echo">
          <Link href="/ezana-echo#latest" onClick={() => onFiltersChange?.({ ...DEFAULT_FILTERS })}>
            All stories
          </Link>
          <a href="/auth/partner/apply">Write for Echo</a>
        </nav>
      </footer>
    </main>
  );
}

/* ---------- Hero ---------- */
function Hero({ hero }) {
  const short = (SECTION_SHORT[hero.section] || '').toUpperCase();
  const inset = Boolean(hero.imageInset && hero.image);
  const text = (
    <>
      <span className="ech-kicker">{hero.kicker}</span>
      <span className="ech-hero__title">{hero.title}</span>
      {hero.dek ? <span className="ech-hero__dek">{hero.dek}</span> : null}
      <span className="ech-hero__meta">
        <span className="ech-mono">
          {[short, hero.date, `${hero.mins} MIN READ`].filter(Boolean).join(' · ')}
        </span>
        <span className="ech-hero__go" aria-hidden="true">
          <i className="bi bi-arrow-right" />
        </span>
      </span>
    </>
  );

  /* Inset: the photo sits inside the card beside the text, on a quiet
     emerald ground, instead of stretching across the whole banner. */
  if (inset) {
    return (
      <Link className="ech-hero ech-hero--inset" href={hero.href}>
        <span className="ech-hero__card">
          <span className="ech-hero__body">{text}</span>
          <Picture
            src={hero.image}
            className="ech-hero__inset"
            alt={hero.imageAlt || ''}
            position={hero.imagePosition}
            sizes="(max-width: 640px) 100vw, 640px"
            eager
          />
        </span>
      </Link>
    );
  }

  return (
    <Link className="ech-hero" href={hero.href}>
      <Picture
        src={hero.image}
        className="ech-hero__img"
        alt={hero.imageAlt || ''}
        position={hero.imagePosition}
        sizes="(max-width: 640px) 100vw, 1440px"
        eager
      />
      <span className="ech-hero__card">{text}</span>
    </Link>
  );
}

function HeroSkeleton() {
  return (
    <div className="ech-hero ech-hero--skel" aria-hidden="true">
      <span className="ech-hero__card">
        <span className="ech-skel ech-skel--line" style={{ width: '40%' }} />
        <span className="ech-skel ech-skel--head" />
        <span className="ech-skel ech-skel--head" style={{ width: '70%' }} />
        <span className="ech-skel ech-skel--line" style={{ width: '85%' }} />
      </span>
    </div>
  );
}

/* ---------- Most read ---------- */
function MostRead({ items }) {
  if (!items.length) return null;
  return (
    <section className="ech-most" aria-labelledby="ech-most-h">
      <h2 id="ech-most-h" className="ech-most__title">
        <i className="bi bi-graph-up-arrow" aria-hidden="true" /> Most read
      </h2>
      <ol className="ech-most__strip">
        {items.slice(0, 5).map((m, i) => (
          <li key={m.id} className="ech-most__cell">
            <Link
              href={m.href}
              aria-label={`${i + 1}. ${m.title}, ${Number(m.views || 0).toLocaleString('en-US')} reads`}
            >
              <span className={`ech-most__rank${i === 0 ? ' is-first' : ''}`} aria-hidden="true">
                {i + 1}
              </span>
              <span className="ech-most__text" aria-hidden="true">
                {m.title}
              </span>
              <span className="ech-mono ech-most__reads" aria-hidden="true">
                {fmtReads(m.views)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MostReadSkeleton() {
  return (
    <div className="ech-most" aria-hidden="true">
      <span className="ech-skel ech-skel--line" style={{ width: 180 }} />
      <div className="ech-most__strip">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="ech-most__cell ech-most__cell--skel">
            <span className="ech-skel ech-skel--rank" />
            <span className="ech-skel ech-skel--line" />
            <span className="ech-skel ech-skel--line" style={{ width: '70%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Controls ---------- */
function Segmented({ options, value, onChange, label, mono = false, className = '' }) {
  const refs = useRef([]);
  const onKey = (e, i) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % options.length;
    if (e.key === 'ArrowLeft') n = (i - 1 + options.length) % options.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = options.length - 1;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`ech-seg${mono ? ' ech-seg--mono' : ''}${className ? ` ${className}` : ''}`}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value || 'all'}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className={`ech-seg__opt${on ? ' is-on' : ''}`}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function RegionMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef(null);
  const btn = useRef(null);
  const opts = useRef([]);
  const current = REGIONS.find((r) => r.slug === value) || REGIONS[0];

  const openMenu = () => {
    const i = Math.max(
      0,
      REGIONS.findIndex((r) => r.slug === value),
    );
    setActive(i);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  };
  const choose = (slug) => {
    onChange(slug);
    close();
  };

  useEffect(() => {
    if (open) opts.current[active]?.focus();
  }, [open, active]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) close(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const onListKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % REGIONS.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + REGIONS.length) % REGIONS.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(REGIONS.length - 1);
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  return (
    <div className="ech-menu" ref={wrap}>
      <button
        ref={btn}
        type="button"
        className="ech-menu__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Region: ${current.label}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            openMenu();
          }
        }}
      >
        <i className="bi bi-globe2" aria-hidden="true" /> {current.label}{' '}
        <i className="bi bi-chevron-down" aria-hidden="true" />
      </button>
      {open && (
        <ul className="ech-menu__list" role="listbox" aria-label="Region" onKeyDown={onListKey}>
          {REGIONS.map((r, i) => (
            <li
              key={r.slug || 'all'}
              ref={(el) => {
                opts.current[i] = el;
              }}
              role="option"
              tabIndex={i === active ? 0 : -1}
              aria-selected={r.slug === value}
              className="ech-menu__opt"
              onClick={() => choose(r.slug)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  choose(r.slug);
                }
              }}
            >
              {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Bento tiles ---------- */
function Meta({ story, dark = false }) {
  const tag = (story.tag || SECTION_SHORT[story.section] || '').toUpperCase();
  return (
    <span className={`ech-meta${dark ? ' ech-meta--dark' : ''}`}>
      {tag ? <span className="ech-meta__tag">{tag}</span> : null}
      {story.date ? <span>{story.date}</span> : null}
      <span aria-hidden="true">&middot;</span>
      <span>{story.mins} MIN</span>
    </span>
  );
}

function Tile({ tile, isAdmin, onArchive, archiving }) {
  const cls = `ech-tile ech-tile--${tile.kind}${tile.tone ? ` ech-tile--${tile.tone}` : ''}`;

  if (tile.kind === 'chart') {
    const c = tile.chart;
    return (
      <div className={cls}>
        <Link className="ech-tile__link" href={c.href}>
          <span className="ech-chart__text">
            <span className="ech-kicker ech-kicker--sm">CHART OF THE WEEK</span>
            <span className="ech-chart__takeaway">{c.takeaway}</span>
            <span className="ech-mono ech-chart__src">FROM: {c.sourceTitle.toUpperCase()}</span>
          </span>
          <MiniChart series={c.series} independent={c.independent} label={c.takeaway} />
        </Link>
      </div>
    );
  }

  const s = tile.story;
  const dark = tile.kind === 'dark';
  const pictured = tile.kind === 'feature' || tile.kind === 'image';
  return (
    <div className={cls}>
      <Link className="ech-tile__link" href={s.href}>
        {pictured ? (
          <Picture
            src={s.image}
            className="ech-tile__img"
            alt={s.imageAlt || ''}
            position={s.imagePosition}
            sizes={
              tile.kind === 'feature'
                ? '(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 720px'
                : '(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 360px'
            }
          />
        ) : null}
        <Meta story={s} dark={dark} />
        <span className="ech-tile__title">{s.title}</span>
        {!pictured && s.dek ? <span className="ech-tile__dek">{s.dek}</span> : null}
        {!pictured ? (
          <span className="ech-tile__read">
            Read <i className="bi bi-arrow-right" aria-hidden="true" />
          </span>
        ) : null}
      </Link>
      {isAdmin && onArchive ? (
        <button
          type="button"
          className="ech-tile__archive"
          onClick={(e) => onArchive(s.id, e)}
          disabled={archiving}
          aria-label={`Archive ${s.title}`}
          title="Archive"
        >
          <i
            className={`bi ${archiving ? 'bi-hourglass-split' : 'bi-archive'}`}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </div>
  );
}

function MiniChart({ series = [], independent = false, label }) {
  const W = 220;
  const H = 110;
  const pad = 6;
  const all = series.flatMap((s) => s.points);
  if (!all.length) return null;
  const range = (pts) => {
    const max = Math.max(...pts);
    const min = Math.min(0, ...pts);
    return [min, max - min || 1];
  };
  const shared = range(all);
  const path = (pts) => {
    const [min, span] = independent ? range(pts) : shared;
    return pts
      .map((v, i) => {
        const x = pad + (i * (W - pad * 2)) / Math.max(1, pts.length - 1);
        const y = H - pad - ((v - min) / span) * (H - pad * 2);
        return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };
  return (
    <svg className="ech-chart__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <path d={`M0 ${H - 0.5}H${W}`} className="ech-chart__base" />
      {series.map((s) => (
        <path
          key={`${s.kind}-${s.label}`}
          d={path(s.points)}
          className={s.kind === 'main' ? 'ech-chart__main' : 'ech-chart__cmp'}
        />
      ))}
    </svg>
  );
}

/* Article images go through next/image, so the optimiser serves AVIF/WebP at
   the rendered size instead of the original multi-megabyte files. The wrapper
   span keeps the old box rules; the image fills it, object-fit cover. Remote
   images (none today) skip the optimiser so an unlisted host cannot break
   the page. */
function Picture({ src, className, alt, eager = false, sizes, position = null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed)
    return <span className={`${className} ech-img-fallback`} aria-hidden="true" />;
  return (
    <span className={`${className} ech-img-box`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={eager}
        quality={70}
        style={position ? { objectPosition: position } : undefined}
        unoptimized={/^https?:/.test(src)}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

function BentoSkeleton() {
  const kinds = [
    'feature',
    'image',
    'text',
    'chart',
    'image',
    'image',
    'image',
    'text',
    'dark',
    'image',
    'image',
  ];
  return (
    <div className="ech-bento" aria-hidden="true">
      {kinds.map((k, i) => (
        <span key={i} className={`ech-tile ech-tile--${k} ech-skel`} />
      ))}
    </div>
  );
}

/* ---------- The Evening Brief ---------- */
function EveningBrief({ onSubscribe }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  // idle | submitting | success | error | invalid | consent
  const [state, setState] = useState('idle');
  const submit = async (e) => {
    e.preventDefault();
    const v = email.trim();
    if (!EMAIL_RE.test(v)) {
      setState('invalid');
      return;
    }
    // Express consent: an unticked box the reader ticks, never implied.
    if (!consent) {
      setState('consent');
      return;
    }
    setState('submitting');
    try {
      await onSubscribe(v, NEWSLETTER_CONSENT_TEXT);
      setState('success');
    } catch {
      setState('error');
    }
  };
  const errored = state === 'invalid' || state === 'error' || state === 'consent';
  return (
    <section className="ech-brief" aria-labelledby="ech-brief-h">
      <div className="ech-brief__copy">
        <span className="ech-kicker ech-kicker--deep">THE EVENING BRIEF</span>
        <h2 id="ech-brief-h" className="ech-brief__title">
          Wall Street intelligence, in your inbox by 6pm.
        </h2>
        <p className="ech-brief__body">
          One email a day: the signals that moved markets, the disclosures that didn&rsquo;t make
          the wire, and the one chart worth your morning.
        </p>
      </div>
      {state === 'success' ? (
        <p className="ech-brief__done" role="status">
          Almost there. Check your inbox and confirm your address to start the Evening Brief.
        </p>
      ) : (
        <form className="ech-brief__form" onSubmit={submit} noValidate>
          <div className="ech-brief__row">
            <label htmlFor="ech-brief-email" className="ech-sr">
              Email address
            </label>
            <input
              id="ech-brief-email"
              type="email"
              autoComplete="email"
              placeholder="you@firm.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errored) setState('idle');
              }}
              aria-invalid={state === 'invalid'}
              aria-describedby="ech-brief-note"
            />
            <button
              type="submit"
              className="ech-btn ech-btn--primary"
              disabled={state === 'submitting'}
              aria-busy={state === 'submitting'}
            >
              {state === 'submitting' ? <span className="ech-spinner" aria-hidden="true" /> : null}
              Subscribe
            </button>
          </div>
          <label className="ech-brief__consent" htmlFor="ech-brief-consent">
            <input
              id="ech-brief-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (state === 'consent') setState('idle');
              }}
            />
            <span>{NEWSLETTER_CONSENT_TEXT}</span>
          </label>
          <span
            id="ech-brief-note"
            className={`ech-brief__note${errored ? ' is-error' : ''}`}
            role={errored ? 'alert' : undefined}
          >
            {state === 'invalid'
              ? 'Enter a valid email address.'
              : state === 'consent'
                ? 'Tick the box above to subscribe.'
                : state === 'error'
                  ? 'That didn’t go through. Check the address and try again.'
                  : 'Free. We send a confirmation email first.'}
          </span>
        </form>
      )}
    </section>
  );
}
