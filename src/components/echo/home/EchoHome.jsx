'use client';

/**
 * Ezana Echo home: a newspaper-style front page (echo-home-redesign handoff,
 * Oct 2026). Presentational: the route (src/app/(dashboard)/ezana-echo/page.js
 * and EchoHomeClient) owns data, URL filters, paging, the Article of the Month
 * pick and admin actions, and passes them in. Grid tiles come only from
 * packTiles().
 *
 * Order: Article of the Month, Most read, Latest header and controls, story
 * grid, Load more, The Evening Brief, footer. The masthead stays in the route.
 *
 * Image rule this layout exists for: no photo renders wider than 640px. Every
 * image box has a fixed aspect ratio, a max-width cap in echo-home.css and a
 * `sizes` string that matches the cap, so next/image never fetches or
 * upscales past it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { packTiles } from '@/lib/echo/bento-layout';
import { SECTIONS, REGIONS, RANGES, DEFAULT_FILTERS, emptyMessage } from '@/lib/echo/home-feed';
import { NEWSLETTER_CONSENT_TEXT } from '@/lib/newsletter/config';
import './echo-home.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SECTION_SHORT = Object.fromEntries(SECTIONS.map((s) => [s.id, s.short]));
const fmtReads = (n) => `${Number(n || 0).toLocaleString('en-US')} READS`;

/* `sizes` per image box; keep in step with the max-width caps in the CSS. */
const SIZES = {
  aotm: '(max-width: 640px) calc(100vw - 32px), (max-width: 1023px) 640px, 560px',
  lead: '(max-width: 640px) calc(100vw - 32px), (max-width: 1023px) 320px, 384px',
  standard: '(max-width: 640px) 96px, (max-width: 1023px) 240px, 300px',
};

/**
 * @param {object}   props
 * @param {object}   [props.hero]          { id, title, dek, kicker, section, date, mins, image, imageAlt, href }
 * @param {Array}    [props.aotmOptions]   earlier Articles of the Month: [{ month, story }]
 * @param {string}   [props.aotmMonth]     the past month on show, null = current
 * @param {Function} [props.onAotmChange]  (month | null) => void
 * @param {Array}    props.mostRead        stories, up to 5, with `views`
 * @param {Array}    props.stories         the visible (filtered, paged) stories, in order
 * @param {object}   [props.chart]         Chart of the Week (page 1, default filters only)
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
  aotmOptions = [],
  aotmMonth = null,
  onAotmChange,
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

  // Load more: focus moves to the first new card's primary link.
  const gridRef = useRef(null);
  const prevCount = useRef(0);
  const pendingFocus = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    if (pendingFocus.current && tiles.length > prevCount.current && gridRef.current) {
      const links = gridRef.current.querySelectorAll('.ech-tile__link');
      links[prevCount.current]?.focus();
    }
    pendingFocus.current = false;
    prevCount.current = tiles.length;
    setLoadingMore(false);
  }, [tiles.length]);

  const loadMore = () => {
    pendingFocus.current = true;
    setLoadingMore(true);
    onLoadMore?.();
  };

  const searchRef = useRef(null);
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  const showSearch = searchOpen || Boolean(filters.q);
  const closeSearch = () => {
    onFiltersChange?.({ q: '' });
    onSearchOpenChange?.(false);
  };

  return (
    <main className="ech-page">
      {hero ? (
        <Hero hero={hero} options={aotmOptions} month={aotmMonth} onChange={onAotmChange} />
      ) : status === 'loading' ? (
        <HeroSkeleton />
      ) : null}

      {status === 'loading' ? <MostReadSkeleton /> : <MostRead items={mostRead} />}

      <section className="ech-latest" id="latest" aria-labelledby="ech-latest-h">
        <div className="ech-sechead">
          <h2 id="ech-latest-h" className="ech-sechead__title ech-sechead__title--lg">
            Latest
          </h2>
          <span className="ech-mono ech-sechead__note">NEWEST FIRST</span>
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
        <div className="ech-controls">
          <div className="ech-controls__left">
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
          {showSearch && (
            <div className="ech-controls__right">
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
                    if (e.key === 'Escape') closeSearch();
                  }}
                />
              </div>
              <button
                type="button"
                className="ech-iconbtn"
                aria-label="Close search"
                onClick={closeSearch}
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </section>

      {status === 'loading' && <GridSkeleton />}
      {status === 'error' && (
        <div className="ech-state ech-state--error" role="alert">
          <span className="ech-state__icon" aria-hidden="true">
            <i className="bi bi-exclamation-circle" />
          </span>
          <p className="ech-state__title">We couldn&rsquo;t load the latest stories</p>
          <p className="ech-state__body">Check your connection and try again.</p>
          <button type="button" className="ech-btn ech-btn--primary" onClick={onRetry}>
            <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Retry
          </button>
        </div>
      )}
      {status === 'ready' && tiles.length === 0 && (
        <div className="ech-state" role="status">
          <span className="ech-state__icon" aria-hidden="true">
            <i className="bi bi-globe2" />
          </span>
          <p className="ech-state__title">{emptyMessage(filters)}</p>
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
        <div className="ech-grid" ref={gridRef}>
          {tiles.map((t) => (
            <Card
              key={t.key}
              tile={t}
              isAdmin={isAdmin}
              onArchive={onArchive}
              archiving={Boolean(t.story && archivingId === t.story.id)}
            />
          ))}
        </div>
      )}

      {status === 'ready' && hasMore && (
        <div className="ech-more">
          <button
            type="button"
            className="ech-btn ech-btn--outline ech-btn--more"
            onClick={loadMore}
            disabled={loadingMore}
            aria-busy={loadingMore}
          >
            {loadingMore ? (
              <>
                <span className="ech-spinner" aria-hidden="true" /> Loading more stories
              </>
            ) : (
              <>
                Load more stories <i className="bi bi-chevron-down" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      )}

      <EveningBrief onSubscribe={onSubscribe} />

      <footer className="ech-footer">
        <div className="ech-footer__top">
          <span className="ech-footer__mark">
            Ezana <span>Echo</span>
          </span>
          <nav aria-label="Ezana Echo" className="ech-footer__nav">
            <Link
              href="/ezana-echo#latest"
              onClick={() => onFiltersChange?.({ ...DEFAULT_FILTERS })}
            >
              All stories
            </Link>
            <a href="/auth/partner/apply">Write for Echo</a>
          </nav>
        </div>
        <p className="ech-mono ech-footer__legal">
          Ezana Echo is published by Ezana Finance. Nothing here is investment advice.
        </p>
      </footer>
    </main>
  );
}

/* ---------- Article of the Month ---------- */
function Hero({ hero, options, month, onChange }) {
  const short = (SECTION_SHORT[hero.section] || '').toUpperCase();
  const image = Boolean(hero.image);
  return (
    <section className={`ech-aotm${image ? '' : ' is-noimg'}`} aria-labelledby="ech-aotm-title">
      <div className="ech-aotm__text">
        <div className="ech-aotm__top">
          <span className="ech-kicker">{hero.kicker}</span>
          {options.length >= 1 && onChange ? (
            <PastPicks options={options} month={month} onChange={onChange} />
          ) : null}
        </div>
        <h1 id="ech-aotm-title" className="ech-aotm__title">
          <Link href={hero.href}>{hero.title}</Link>
        </h1>
        {hero.dek ? <p className="ech-aotm__dek">{hero.dek}</p> : null}
        <div className="ech-aotm__meta">
          <span className="ech-mono">
            {[short, hero.date, `${hero.mins} MIN READ`].filter(Boolean).join(' · ')}
          </span>
          <Link
            href={hero.href}
            className="ech-aotm__go"
            aria-label="Read the Article of the Month"
          >
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </div>
      {image ? (
        <Picture
          src={hero.image}
          className="ech-aotm__img"
          alt={hero.imageAlt || ''}
          position={hero.imagePosition}
          sizes={SIZES.aotm}
          eager
        />
      ) : null}
    </section>
  );
}

function HeroSkeleton() {
  return (
    <div className="ech-aotm ech-aotm--skel" aria-hidden="true">
      <div className="ech-aotm__text">
        <span className="ech-skel ech-skel--line" style={{ width: '42%' }} />
        <span className="ech-skel ech-skel--head" />
        <span className="ech-skel ech-skel--head" style={{ width: '72%' }} />
        <span className="ech-skel ech-skel--line" style={{ width: '90%' }} />
        <span className="ech-skel ech-skel--line" style={{ width: '80%' }} />
        <div className="ech-aotm__meta">
          <span className="ech-skel ech-skel--line" style={{ width: 180 }} />
          <span className="ech-skel ech-skel--dot" />
        </div>
      </div>
      <span className="ech-aotm__img ech-skel" />
    </div>
  );
}

/* Earlier months' picks. Listed newest first; picking one swaps the card.
   While a past month is on show, "Back to current" leads the list. */
function PastPicks({ options, month, onChange }) {
  const items = [
    ...(month ? [{ key: '__current', value: null, label: 'Back to current' }] : []),
    ...options
      .filter((o) => o.month !== month)
      .map((o) => ({
        key: o.month,
        value: o.month,
        label: `${o.month}: ${o.story.title}`,
        content: (
          <>
            <span className="ech-mono ech-picks__month">{o.month.toUpperCase()}</span>
            <span className="ech-picks__title">{o.story.title}</span>
          </>
        ),
      })),
  ];
  return (
    <ListMenu
      className="ech-picks"
      listLabel="Past Articles of the Month"
      buttonLabel="Past picks"
      button={
        <>
          <i className="bi bi-clock-history" aria-hidden="true" /> Past picks{' '}
          <i className="bi bi-chevron-down" aria-hidden="true" />
        </>
      }
      items={items}
      selected={month || '__current'}
      onChoose={(v) => onChange(v)}
      align="right"
    />
  );
}

/* ---------- Most read ---------- */
function MostRead({ items }) {
  if (!items.length) return null;
  return (
    <section className="ech-most" aria-labelledby="ech-most-h">
      <div className="ech-sechead">
        <h2 id="ech-most-h" className="ech-sechead__title">
          <i className="bi bi-graph-up-arrow" aria-hidden="true" /> Most read
        </h2>
      </div>
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
      <div className="ech-sechead">
        <span className="ech-skel ech-skel--line" style={{ width: 140 }} />
      </div>
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

/*
 * Menu button + listbox shared by the region filter and Past picks:
 * aria-haspopup, arrow keys, Home/End, Enter/Space to choose, Esc and outside
 * click close, focus returns to the button.
 * items: [{ key, value, label, content? }]; `selected` matches an item's key
 * or value.
 */
function ListMenu({
  className = '',
  listLabel,
  buttonLabel,
  button,
  items,
  selected,
  onChoose,
  align = 'left',
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef(null);
  const btn = useRef(null);
  const opts = useRef([]);

  const isSel = useCallback(
    (it) => it.key === selected || (it.value != null && it.value === selected),
    [selected],
  );
  const openMenu = () => {
    setActive(Math.max(0, items.findIndex(isSel)));
    setOpen(true);
  };
  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  }, []);
  const choose = (it) => {
    onChoose(it.value);
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
  }, [open, close]);

  const onListKey = (e) => {
    const n = items.length;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % n);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + n) % n);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(n - 1);
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  return (
    <div className={`ech-menu ${className}`} ref={wrap}>
      <button
        ref={btn}
        type="button"
        className="ech-menu__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={buttonLabel}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            openMenu();
          }
        }}
      >
        {button}
      </button>
      {open && (
        <ul
          className={`ech-menu__list${align === 'right' ? ' is-right' : ''}`}
          role="listbox"
          aria-label={listLabel}
          onKeyDown={onListKey}
        >
          {items.map((it, i) => (
            <li
              key={it.key}
              ref={(el) => {
                opts.current[i] = el;
              }}
              role="option"
              tabIndex={i === active ? 0 : -1}
              aria-selected={isSel(it)}
              aria-label={it.content ? it.label : undefined}
              className="ech-menu__opt"
              onClick={() => choose(it)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  choose(it);
                }
              }}
            >
              {it.content || it.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RegionMenu({ value, onChange }) {
  const current = REGIONS.find((r) => r.slug === value) || REGIONS[0];
  return (
    <ListMenu
      listLabel="Region"
      buttonLabel={`Region: ${current.label}`}
      button={
        <>
          <i className="bi bi-globe2" aria-hidden="true" /> {current.label}{' '}
          <i className="bi bi-chevron-down" aria-hidden="true" />
        </>
      }
      items={REGIONS.map((r) => ({ key: r.slug || 'all', value: r.slug, label: r.label }))}
      selected={value}
      onChoose={onChange}
    />
  );
}

/* ---------- Story grid ---------- */
function tagOf(story) {
  return (story.tag || SECTION_SHORT[story.section] || '').toUpperCase();
}

function Meta({ story }) {
  const short = (SECTION_SHORT[story.section] || '').toUpperCase();
  return (
    <span className="ech-mono ech-meta">
      {[short, story.date, `${story.mins} MIN READ`].filter(Boolean).join(' · ')}
    </span>
  );
}

function ArchiveButton({ story, onArchive, archiving }) {
  return (
    <button
      type="button"
      className="ech-card__archive"
      onClick={(e) => onArchive(story.id, e)}
      disabled={archiving}
      aria-label={`Archive ${story.title}`}
      title="Archive"
    >
      <i className={`bi ${archiving ? 'bi-hourglass-split' : 'bi-archive'}`} aria-hidden="true" />
    </button>
  );
}

function Card({ tile, isAdmin, onArchive, archiving }) {
  const admin = isAdmin && onArchive;
  if (tile.kind === 'chart') {
    const c = tile.chart;
    return (
      <article className="ech-card ech-card--chart">
        <div className="ech-chart">
          <span className="ech-kicker">CHART OF THE WEEK</span>
          <Link className="ech-tile__link ech-chart__takeaway" href={c.href}>
            {c.takeaway}
          </Link>
          <ChartSvg series={c.series} independent={c.independent} label={c.takeaway} />
          <ChartLegend series={c.series} />
          <Link className="ech-mono ech-chart__src" href={c.href}>
            FROM: {String(c.sourceTitle || '').toUpperCase()}
          </Link>
        </div>
      </article>
    );
  }

  const s = tile.story;
  const kind = tile.kind;
  const pictured = !tile.noImage && Boolean(s.image) && (kind === 'lead' || kind === 'standard');
  const cls = [
    'ech-card',
    `ech-card--${kind}`,
    tile.wide ? 'is-wide' : '',
    pictured ? 'has-img' : 'is-noimg',
    tile.tone ? `ech-card--${tile.tone}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={cls}>
      <Link className="ech-tile__link ech-card__link" href={s.href}>
        {pictured ? (
          <Picture
            src={s.image}
            className="ech-card__img"
            alt={s.imageAlt || ''}
            position={s.imagePosition}
            sizes={kind === 'lead' ? SIZES.lead : SIZES.standard}
          />
        ) : null}
        <span className="ech-card__body">
          {tagOf(s) ? <span className="ech-card__tag">{tagOf(s)}</span> : null}
          <h3 className="ech-card__title">{s.title}</h3>
          {s.dek && (kind !== 'standard' || !pictured) ? (
            <span className="ech-card__dek">{s.dek}</span>
          ) : null}
          {kind === 'text' || kind === 'dark' ? (
            <span className="ech-card__read">
              Read <i className="bi bi-arrow-right" aria-hidden="true" />
            </span>
          ) : (
            <Meta story={s} />
          )}
        </span>
      </Link>
      {admin ? <ArchiveButton story={s} onArchive={onArchive} archiving={archiving} /> : null}
    </article>
  );
}

/* Chart of the Week: main series emerald and solid; compare series differ in
   lightness and dash (not hue alone). `independent` scales each series on
   its own range, so the value axis is only labelled for a shared scale. */
function seriesClass(series, s) {
  if (s.kind === 'main') return 'ech-chart__main';
  const cmpIndex = series.filter((x) => x.kind !== 'main').indexOf(s);
  return cmpIndex <= 0 ? 'ech-chart__cmp1' : 'ech-chart__cmp2';
}

function ChartSvg({ series = [], independent = false, label }) {
  const W = 340;
  const H = 150;
  const padL = independent ? 6 : 30;
  const padR = 6;
  const padT = 8;
  const padB = 8;
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
        const x = padL + (i * (W - padL - padR)) / Math.max(1, pts.length - 1);
        const y = H - padB - ((v - min) / span) * (H - padT - padB);
        return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };
  const [gMin, gSpan] = shared;
  const ticks = [0, 1, 2, 3].map((k) => ({
    v: gMin + (gSpan * k) / 3,
    y: H - padB - (k / 3) * (H - padT - padB),
  }));
  const fmt = (v) => {
    if (Math.abs(v) >= 1000) return `${Math.round(v / 100) / 10}k`;
    if (Math.abs(v) >= 10) return String(Math.round(v));
    return String(Math.round(v * 10) / 10);
  };
  return (
    <svg className="ech-chart__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {ticks.map((t) => (
        <g key={t.y}>
          <path d={`M${padL} ${t.y.toFixed(1)}H${W - padR}`} className="ech-chart__grid" />
          {independent ? null : (
            <text x={padL - 6} y={t.y + 3} className="ech-chart__axis" textAnchor="end">
              {fmt(t.v)}
            </text>
          )}
        </g>
      ))}
      {series.map((s) => (
        <path key={`${s.kind}-${s.label}`} d={path(s.points)} className={seriesClass(series, s)} />
      ))}
    </svg>
  );
}

function ChartLegend({ series = [] }) {
  const named = series.filter((s) => s.label);
  if (named.length < 2) return null;
  return (
    <ul className="ech-chart__legend">
      {named.map((s) => (
        <li key={`${s.kind}-${s.label}`}>
          <svg width="22" height="8" aria-hidden="true">
            <path d="M1 4H21" className={seriesClass(series, s)} />
          </svg>
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/* Article images go through next/image, so the optimiser serves AVIF/WebP at
   the rendered size. The wrapper span carries the box (aspect ratio and
   max-width cap); the image fills it, object-fit cover. Remote images skip
   the optimiser so an unlisted host cannot break the page. */
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
        quality={75}
        style={position ? { objectPosition: position } : undefined}
        unoptimized={/^https?:/.test(src)}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

function GridSkeleton() {
  const kinds = ['lead', 'chart', 'standard', 'standard', 'standard', 'standard'];
  return (
    <div className="ech-grid" aria-hidden="true">
      {kinds.map((k, i) => (
        <div key={i} className={`ech-card ech-card--${k} has-img ech-card--skel`}>
          {k !== 'chart' ? <span className="ech-card__img ech-skel" /> : null}
          <span className="ech-card__body">
            <span className="ech-skel ech-skel--line" style={{ width: 70 }} />
            <span className="ech-skel ech-skel--line" />
            <span className="ech-skel ech-skel--line" style={{ width: '75%' }} />
          </span>
        </div>
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
        <span className="ech-kicker ech-brief__kicker">NEWSLETTER · WEEKDAYS, 6 PM ET</span>
        <h2 id="ech-brief-h" className="ech-brief__title">
          The Evening Brief
        </h2>
        <p className="ech-brief__body">
          The stories that moved markets, policy and capital today, and what to watch before
          tomorrow&rsquo;s open. One email, five minutes.
        </p>
      </div>
      {state === 'success' ? (
        <p className="ech-brief__done" role="status">
          <i className="bi bi-check-circle" aria-hidden="true" />
          <span>
            <strong>Almost there.</strong> Check your inbox and confirm your address to start the
            Evening Brief.
          </span>
        </p>
      ) : (
        <form className="ech-brief__form" onSubmit={submit} noValidate>
          <label htmlFor="ech-brief-email" className="ech-brief__label">
            Email address
          </label>
          <div className="ech-brief__row">
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
              className="ech-btn ech-btn--primary ech-brief__submit"
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
