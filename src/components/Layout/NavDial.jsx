'use client';

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import { isBetaLockedRoute } from '@/lib/beta-locked-routes';
import './nav-dial.css';

/* Signed-in navigation dial (Nov 2026).
   -----------------------------------------------------------------------
   The top bar no longer carries a row of section buttons. The Ezana mark sits
   in the middle of the bar and opens a radial menu whose hub is the same
   mark: one wedge per section. A section with pages of its own (Research,
   Trading) swaps the ring for its pages, and the hub then steps back.

   Geometry is drawn at one design size and scaled to fit the viewport, so the
   wedge maths never changes. Plain React, framer-motion and Bootstrap Icons:
   no new dependency. */

const SIZE = 360;
const R = SIZE / 2;
const RING_OUTER = R;
const RING_INNER = RING_OUTER - 8;
const WEDGE_OUTER = RING_INNER - 6;
const WEDGE_INNER = WEDGE_OUTER - 98;
const HUB_R = WEDGE_INNER - 8;
const ITEM_R = (WEDGE_OUTER + WEDGE_INNER) / 2;
const START_ANGLE = -90;

function polar(radius, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

/* One annular slice, centred on its item's angle. */
function slicePath(index, total, outer, inner) {
  if (total <= 0) return '';
  if (total === 1) {
    return [
      `M ${outer} 0`,
      `A ${outer} ${outer} 0 1 1 ${-outer} 0`,
      `A ${outer} ${outer} 0 1 1 ${outer} 0`,
      `M ${inner} 0`,
      `A ${inner} ${inner} 0 1 0 ${-inner} 0`,
      `A ${inner} ${inner} 0 1 0 ${inner} 0`,
    ].join(' ');
  }
  const step = 360 / total;
  const mid = START_ANGLE + step * index;
  const a = mid - step / 2;
  const b = mid + step / 2;
  const o1 = polar(outer, a);
  const o2 = polar(outer, b);
  const i1 = polar(inner, a);
  const i2 = polar(inner, b);
  const large = step > 180 ? 1 : 0;
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${i1.x} ${i1.y}`,
    'Z',
  ].join(' ');
}

/* The page the visitor is on, among one ring's items: the longest matching
   url wins, so /trading/mock lights Mock Portfolio and not Brokerage Account. */
function currentIndex(list, pathname) {
  let best = -1;
  let bestLen = 0;
  list.forEach((it, i) => {
    if (it.items) {
      if (it.isActive && bestLen === 0) best = i;
      return;
    }
    const url = it.url;
    if (!url || url === '#' || !pathname) return;
    const hit = it.isActive ?? (pathname === url || pathname.startsWith(`${url}/`));
    if (hit && url.length > bestLen) {
      best = i;
      bestLen = url.length;
    }
  });
  return best;
}

/* Three small wedges hanging under the bar's logo, pointing down: the
   slices the dial opens into. Drawn from the same slice maths as the dial. */
function TriggerWedges() {
  return (
    <svg className="nd-wedges" viewBox="-17 7 34 15" aria-hidden="true" focusable="false">
      {[60, 90, 120].map((deg) => {
        const half = 13;
        const o1 = polar(20, deg - half);
        const o2 = polar(20, deg + half);
        const i1 = polar(12, deg - half);
        const i2 = polar(12, deg + half);
        return (
          <path
            key={deg}
            d={`M ${o1.x} ${o1.y} A 20 20 0 0 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A 12 12 0 0 0 ${i1.x} ${i1.y} Z`}
          />
        );
      })}
    </svg>
  );
}

export function NavDial({
  items,
  pathname,
  homeHref = '/home',
  hasFullBetaAccess = false,
  sonar = false,
}) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  /* The wedge whose page is loading: the dial stays up, that wedge marked,
     until the route changes, so a click always visibly lands. */
  const [pending, setPending] = useState(null);
  const pendingTimer = useRef(null);
  const [open, setOpen] = useState(false);
  const [parentId, setParentId] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);
  const [place, setPlace] = useState(null);
  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const itemRefs = useRef([]);
  /* Which item takes focus once a ring has rendered. */
  const focusOnRender = useRef(null);

  const parent = useMemo(
    () => (parentId == null ? null : items.find((it) => it.id === parentId) || null),
    [items, parentId],
  );
  const ring = parent?.items || items;
  const current = useMemo(() => currentIndex(ring, pathname), [ring, pathname]);

  const measure = useCallback(() => {
    const t = triggerRef.current;
    if (!t) return;
    const box = t.getBoundingClientRect();
    const nav = t.closest('nav')?.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const top = Math.round((nav ? nav.bottom : box.bottom) + 12);
    /* 72px below the dial is the caption. */
    const scale = Math.max(0.6, Math.min(1, (vw - 24) / SIZE, (vh - top - 72) / SIZE));
    const half = (SIZE * scale) / 2;
    const cx = Math.min(Math.max(box.left + box.width / 2, half + 12), vw - half - 12);
    setPlace({ cx: Math.round(cx), top, scale });
  }, []);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setParentId(null);
    setActiveIndex(null);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const openDial = useCallback(() => {
    measure();
    setParentId(null);
    focusOnRender.current = 'current';
    setOpen(true);
  }, [measure]);

  /* Navigating puts the dial away. */
  useEffect(() => {
    setOpen(false);
    setParentId(null);
    setActiveIndex(null);
    setPending(null);
    clearTimeout(pendingTimer.current);
  }, [pathname]);

  useEffect(() => () => clearTimeout(pendingTimer.current), []);

  /* Warm every page the open ring can reach, so one click is enough. */
  useEffect(() => {
    if (!open) return;
    const urls = new Set();
    const walk = (list) =>
      list.forEach((it) => {
        if (it.items) walk(it.items);
        else if (it.url && it.url !== '#') urls.add(it.url);
      });
    walk(items);
    urls.forEach((u) => {
      try {
        router.prefetch(u);
      } catch {
        /* prefetch is a hint only */
      }
    });
  }, [open, items, router]);

  /* One click navigates: the link's own default is replaced by a router
     push, and repeat clicks while it loads are ignored. */
  const go = useCallback(
    (e, url, index) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
      e.preventDefault();
      if (pending != null) return;
      if (!url || url === pathname) {
        close(false);
        return;
      }
      setPending(index);
      clearTimeout(pendingTimer.current);
      pendingTimer.current = setTimeout(() => setPending(null), 10000);
      startTransition(() => router.push(url));
    },
    [pending, pathname, close, router],
  );

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, measure]);

  /* Move focus into each ring as it appears. */
  useEffect(() => {
    if (!open || focusOnRender.current == null) return undefined;
    const want = focusOnRender.current;
    focusOnRender.current = null;
    const index = want === 'current' ? Math.max(current, 0) : want;
    const raf = requestAnimationFrame(() => {
      setActiveIndex(index);
      itemRefs.current[index]?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, parentId, current]);

  const focusItem = (index) => {
    const n = ring.length;
    const next = ((index % n) + n) % n;
    setActiveIndex(next);
    itemRefs.current[next]?.focus({ preventScroll: true });
  };

  const stepBack = () => {
    const at = items.findIndex((it) => it.id === parentId);
    focusOnRender.current = Math.max(at, 0);
    setParentId(null);
  };

  const onKeyDown = (e) => {
    const from = activeIndex ?? -1;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (parent) stepBack();
      else close();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusItem(from + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusItem(from <= 0 ? ring.length - 1 : from - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusItem(ring.length - 1);
    } else if (e.key === 'Tab') {
      /* Keep focus inside the dial: the ring's items, then the hub. */
      const stops = Array.from(popRef.current?.querySelectorAll('[data-nd-stop]') || []);
      if (!stops.length) return;
      e.preventDefault();
      const at = stops.indexOf(document.activeElement);
      const to = (at + (e.shiftKey ? -1 : 1) + stops.length) % stops.length;
      stops[to].focus({ preventScroll: true });
    }
  };

  const active = activeIndex != null ? ring[activeIndex] : null;
  /* The wedge already shows its name, so the caption carries only what it
     does. */
  const caption = active
    ? active.description || (active.items ? 'Open section' : '')
    : parent
      ? 'Select the logo to go back'
      : 'Choose a section, or the logo for Home';
  const captionLocked = active && isBetaLockedRoute(active.url) && !hasFullBetaAccess;

  const scale = place?.scale ?? 1;
  const fade = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.94 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.94 },
      };

  const dial =
    open && place ? (
      <div className={`nd-layer${sonar ? ' nd-layer--sonar' : ''}`}>
        <div className="nd-backdrop" aria-hidden="true" onClick={() => close(false)} />
        <motion.div
          ref={popRef}
          className={`nd-pop${pending != null ? ' is-busy' : ''}`}
          role="menu"
          aria-label={parent ? parent.title : 'Main menu'}
          style={{ left: place.cx, top: place.top, x: '-50%' }}
          transition={{ type: 'tween', ease: 'easeOut', duration: 0.18 }}
          onKeyDown={onKeyDown}
          {...fade}
        >
          <div className="nd-stage" style={{ width: SIZE * scale, height: SIZE * scale }}>
            <div
              className="nd-dial"
              style={{ width: SIZE, height: SIZE, transform: `scale(${scale})` }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <svg
                className="nd-svg"
                viewBox={`${-R} ${-R} ${SIZE} ${SIZE}`}
                aria-hidden="true"
                focusable="false"
              >
                <circle className="nd-ground" cx={0} cy={0} r={R} />
                {ring.map((item, index) => {
                  const cls = [
                    'nd-slice',
                    activeIndex === index ? 'is-active' : '',
                    current === index ? 'is-current' : '',
                    pending === index ? 'is-pending' : '',
                    item.variant === 'sonar' ? 'nd-slice--sonar' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <g
                      key={`${parentId ?? 'root'}-${item.id}`}
                      className={cls}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => itemRefs.current[index]?.click()}
                    >
                      <path
                        className="nd-rim"
                        d={slicePath(index, ring.length, RING_OUTER, RING_INNER)}
                      />
                      <path
                        className="nd-wedge"
                        d={slicePath(index, ring.length, WEDGE_OUTER, WEDGE_INNER)}
                      />
                    </g>
                  );
                })}
              </svg>

              {ring.map((item, index) => {
                const step = 360 / ring.length;
                const { x, y } = polar(ITEM_R, START_ANGLE + step * index);
                const locked = isBetaLockedRoute(item.url) && !hasFullBetaAccess;
                const cls = [
                  'nd-item',
                  activeIndex === index ? 'is-active' : '',
                  current === index ? 'is-current' : '',
                  pending === index ? 'is-pending' : '',
                  item.variant ? `nd-item--${item.variant}` : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                const shared = {
                  ref: (el) => {
                    itemRefs.current[index] = el;
                  },
                  role: 'menuitem',
                  className: cls,
                  style: { left: R + x, top: R + y },
                  'data-nd-stop': '',
                  'aria-label': [item.title, item.description, locked ? 'coming in v1.0' : '']
                    .filter(Boolean)
                    .join(', '),
                  onMouseEnter: () => setActiveIndex(index),
                  onFocus: () => setActiveIndex(index),
                };
                const body = (
                  <>
                    <i className={`bi ${item.icon}`} aria-hidden="true" />
                    <span className="nd-item-label">{item.short || item.title}</span>
                  </>
                );
                if (item.items) {
                  return (
                    <button
                      key={`${parentId ?? 'root'}-${item.id}`}
                      type="button"
                      aria-haspopup="menu"
                      {...shared}
                      onClick={() => {
                        focusOnRender.current = 'current';
                        setActiveIndex(null);
                        setParentId(item.id);
                      }}
                    >
                      {body}
                    </button>
                  );
                }
                return (
                  <Link
                    key={`${parentId ?? 'root'}-${item.id}`}
                    href={item.url}
                    aria-current={current === index ? 'page' : undefined}
                    aria-busy={pending === index || undefined}
                    {...shared}
                    onClick={(e) => go(e, item.url, index)}
                  >
                    {body}
                  </Link>
                );
              })}

              {parent ? (
                <button
                  type="button"
                  className="nd-hub"
                  style={{ width: HUB_R * 2, height: HUB_R * 2 }}
                  data-nd-stop=""
                  aria-label="Back to all sections"
                  onClick={stepBack}
                  onMouseEnter={() => setActiveIndex(null)}
                >
                  <EzanaNavLogo className="nav-logo-img nd-hub-logo" />
                  <i className="bi bi-arrow-left nd-hub-back" aria-hidden="true" />
                </button>
              ) : (
                <Link
                  href={homeHref}
                  className="nd-hub"
                  style={{ width: HUB_R * 2, height: HUB_R * 2 }}
                  data-nd-stop=""
                  aria-label="Home"
                  onClick={(e) => go(e, homeHref, -1)}
                  onMouseEnter={() => setActiveIndex(null)}
                >
                  <EzanaNavLogo className="nav-logo-img nd-hub-logo" />
                </Link>
              )}
            </div>
          </div>

          {caption ? (
            <p className="nd-caption" aria-hidden="true">
              <span className="nd-caption-pattern" />
              <span className="nd-caption-text">{caption}</span>
              {captionLocked ? <span className="nd-caption-tag">v1.0</span> : null}
            </p>
          ) : null}
        </motion.div>
      </div>
    ) : null;

  return (
    <div className="nd-anchor">
      <button
        ref={triggerRef}
        type="button"
        className={`nav-brand nd-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open the main menu"
        title="Menu"
        onClick={() => (open ? close() : openDial())}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!open) openDial();
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            openDial();
          }
        }}
      >
        <EzanaNavLogo />
        <TriggerWedges />
      </button>
      {typeof document !== 'undefined'
        ? createPortal(<AnimatePresence>{dial}</AnimatePresence>, document.body)
        : null}
    </div>
  );
}
