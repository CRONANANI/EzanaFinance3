'use client';

/**
 * Shared dataset category bar for the dataset pages (Government Contracts,
 * Congressional trading, Datasets overview, …). One component, used on every
 * dataset page in the family — do NOT fork it.
 *
 * The categories ARE the shared DATASET_TAXONOMY (src/lib/datasets/taxonomy.js) —
 * the same 7 dimensions as the landing-page orbital map. Pass `active` (a
 * dimension id) to mark the current dimension, and `activeItem` (an item label)
 * to mark the current dataset:
 *   <CategoryBar active="capitol" activeItem="Government Contracts" />
 *
 * Roadmap items (live:false) show a muted "Soon" badge and route to the
 * dimension's overview rather than presenting as live data.
 *
 * The bar is also the only chrome the STANDALONE dataset routes draw (they opt
 * out of the marketing shell in src/app/datasets/layout.js), so it carries the
 * page's Home link and its auth actions. Three zones with equal fixed sides keep
 * the dimension group optically centred on the page, not merely centred in the
 * space the sides leave over.
 *
 * The dimension menus are PORTALLED to document.body and positioned from the
 * trigger's rect. They have to be: .dscat-center is the one-line scroller and
 * carries overflow-x: auto, and any overflow-x other than visible forces
 * overflow-y to clip as well, so an in-flow absolutely positioned menu was cut
 * off at the 40px-tall row's bottom edge and simply never appeared. Below 1024
 * the row also wears a -webkit-mask-image, which clips painting the same way.
 * No z-index can escape either, which is why the old `z-index: 40` did nothing.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  ChevronDown,
  Globe,
  Landmark,
  Radar,
  ScrollText,
  TrendingUp,
  Users,
} from 'lucide-react';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import { useAuth } from '@/components/auth-context';
import './category-bar.css';

/* One Lucide icon per dimension. This duplicates DIMENSION_ICON in
   src/components/Layout/Navbar.js on purpose, and it is a known drift risk:
   the map is a local const there, and lifting it into the shared taxonomy is
   the fix, but that edits Navbar.js, which this change deliberately leaves
   alone. Keep the two in step until then. */
const DIMENSION_ICON = {
  capitol: Landmark,
  titans: Building2,
  eyes: Radar,
  whispers: TrendingUp,
  hive: Users,
  lighthouse: Globe,
  regulatory: ScrollText,
};

/* Long enough for the pointer to cross the gap between a trigger and its
   panel; the landing nav uses the same 220ms for the same reason. */
const CLOSE_DELAY = 220;
/* Matches .dscat-panel's ::before bridge height in category-bar.css. Both are
   the corridor that belongs to neither the trigger nor the panel. */
const TRIGGER_GAP = 6;
const VIEWPORT_MARGIN = 12;

/**
 * Hover-intent + pinning for a set of sibling menus, one open at a time.
 *
 * The mechanics are the landing Datasets menu's, generalised from one menu to
 * seven: opening is immediate, closing waits out the corridor, and re-entering
 * either the trigger or the panel cancels it. `pinned` is a ref rather than
 * state because nothing renders from it and every reader (the close timer, the
 * click handler) needs the CURRENT value, not the one captured when the
 * callback was last rebuilt.
 */
function useHoverIntentMenu() {
  const [openId, setOpenId] = useState(null);
  const pinned = useRef(false);
  const timer = useRef(null);

  const cancelClose = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const open = useCallback(
    (id) => {
      cancelClose();
      setOpenId(id);
    },
    [cancelClose],
  );

  const scheduleClose = useCallback(() => {
    if (pinned.current) return;
    cancelClose();
    timer.current = setTimeout(() => {
      setOpenId(null);
      timer.current = null;
    }, CLOSE_DELAY);
  }, [cancelClose]);

  const close = useCallback(() => {
    cancelClose();
    pinned.current = false;
    setOpenId(null);
  }, [cancelClose]);

  /* A click on an already-PINNED menu closes it. A click on a menu that hover
     merely opened pins it instead — that is what stops the hover-then-click
     gesture from undoing itself, and what makes a touch tap (which fires an
     emulated mouseenter and a click from one gesture) open rather than
     flicker. A click on a DIFFERENT trigger always switches. */
  const toggle = useCallback(
    (id) => {
      cancelClose();
      setOpenId((curr) => {
        if (curr === id && pinned.current) {
          pinned.current = false;
          return null;
        }
        pinned.current = true;
        return id;
      });
    },
    [cancelClose],
  );

  const pin = useCallback(
    (id) => {
      cancelClose();
      pinned.current = true;
      setOpenId(id);
    },
    [cancelClose],
  );

  useEffect(() => () => cancelClose(), [cancelClose]);

  return { openId, open, scheduleClose, close, toggle, pin };
}

export default function CategoryBar({ active, activeItem }) {
  const barRef = useRef(null);
  const panelRef = useRef(null);
  const activeRef = useRef(null);
  const triggerRefs = useRef({});
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { openId, open, scheduleClose, close, toggle, pin } = useHoverIntentMenu();
  const [pos, setPos] = useState(null);
  /* document.body does not exist during the server render, so the portal can
     only be created after mount. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Send the visitor back to the dataset page they were reading. usePathname is
  // deliberate over useSearchParams: the latter forces the whole bar (and so
  // every dataset page) into a Suspense boundary under the App Router.
  const signInHref = pathname ? `/signin?next=${encodeURIComponent(pathname)}` : '/signin';

  /* Left from the trigger, top from the whole GREEN BLOCK. Hanging the panel
     off the trigger's own bottom edge put it 4px inside the block (measured:
     trigger bottom 45, panel top 49, bar bottom 53), because the bar's 8px
     padding sits below the trigger. The block is the bar plus the ticker when
     a page publishes one, so the anchor is .dscat-chrome rather than the bar:
     off the bar alone the panel started at 59 and covered a 53-to-89 ticker.
     With no ticker the two edges coincide, so this is the same answer. The
     fallback keeps the bar usable if it is ever rendered outside the chrome.
     All seven panels land on one line either way. */
  const place = useCallback((id) => {
    const el = triggerRefs.current[id];
    const bar = barRef.current;
    if (!el || !bar) return;
    const block = bar.closest('.dscat-chrome') || bar;
    setPos({
      left: el.getBoundingClientRect().left,
      top: block.getBoundingClientRect().bottom + TRIGGER_GAP,
    });
  }, []);

  useLayoutEffect(() => {
    if (!openId) {
      setPos(null);
      return;
    }
    place(openId);
  }, [openId, place]);

  /* Follow the trigger. The capture phase is what makes one listener enough:
     scroll does not bubble, but a capturing window listener still sees the
     dimension row's own scroll on the way down, as well as the page's. */
  useEffect(() => {
    if (!openId) return undefined;
    const reposition = () => place(openId);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [openId, place]);

  /* Clamp after layout, against the panel's REAL width rather than a constant
     kept in sync with the stylesheet by hand. Written straight to the node:
     feeding a measured value back into state would re-render, re-measure and
     loop. */
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el || !pos) return undefined;
    const clamp = () => {
      const max = window.innerWidth - el.getBoundingClientRect().width - VIEWPORT_MARGIN;
      el.style.left = `${Math.max(VIEWPORT_MARGIN, Math.min(pos.left, max))}px`;
    };
    clamp();
    /* The panel's width is text-driven, so one pass is not enough: measured
       against the fallback face it came to 254px, and once the web font
       swapped in it was 266px, by which time the clamp had already been
       computed and the rightmost panel on a 390 viewport sat with its edge
       exactly ON the viewport edge instead of 12px inside it. Re-clamp on any
       width change rather than guessing at a delay — this also covers a
       switch to a longer-labelled dimension at the same left. */
    const ro = new ResizeObserver(clamp);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pos, openId]);

  /* Escape and outside click. The panel is a portal, so it is NOT inside the
     bar in the DOM and containment has to be tested against both. */
  useEffect(() => {
    if (!openId) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const id = openId;
      close();
      triggerRefs.current[id]?.focus();
    };
    const onDown = (e) => {
      if (barRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [openId, close]);

  // Any navigation closes and unpins.
  useEffect(() => {
    close();
  }, [pathname, close]);

  /* Below 1024 the seven dimensions scroll as one line rather than wrapping, so
     the current one has to be brought into view or it can sit off-screen. */
  useEffect(() => {
    const node = activeRef.current;
    if (!node || typeof node.scrollIntoView !== 'function') return;
    node.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [active]);

  const onTriggerKeyDown = (e, id) => {
    if (e.key !== 'ArrowDown') return;
    e.preventDefault();
    pin(id);
    /* The panel has not rendered yet on this frame. */
    requestAnimationFrame(() => {
      panelRef.current?.querySelector('.dscat-item:not([aria-disabled="true"])')?.focus();
    });
  };

  const openCat = openId ? DATASET_TAXONOMY.find((c) => c.id === openId) : null;
  const OpenIcon = openCat ? DIMENSION_ICON[openCat.id] : null;

  return (
    <nav className="dscat-bar" ref={barRef}>
      <div className="dscat-side dscat-side--start">
        <Link href="/" className="dscat-home">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          <span>Home</span>
        </Link>
      </div>

      <div className="dscat-center">
        {DATASET_TAXONOMY.map((cat) => (
          <div
            className="dscat"
            key={cat.id}
            onMouseEnter={() => open(cat.id)}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              className={`dscat-trigger ${cat.id === active ? 'is-active' : ''}`}
              /* No inline style for the active trigger any more. It used to
                 paint the dimension's own colour as ink and an underline, which
                 is unreadable on the green gradient the bar now wears — and an
                 inline style would have beaten the stylesheet's translucent
                 white pill. The dot still carries the dimension colour. */
              ref={(el) => {
                triggerRefs.current[cat.id] = el;
                if (cat.id === active) activeRef.current = el;
              }}
              aria-haspopup="true"
              aria-expanded={openId === cat.id}
              onClick={() => toggle(cat.id)}
              onKeyDown={(e) => onTriggerKeyDown(e, cat.id)}
            >
              <span className="dscat-dot" style={{ background: cat.color }} />
              {cat.label} <ChevronDown size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="dscat-side dscat-side--end">
        {isAuthenticated ? (
          <Link href="/home" className="dscat-btn dscat-btn--solid">
            Dashboard
          </Link>
        ) : (
          <>
            <Link href={signInHref} className="dscat-btn dscat-btn--ghost">
              Log in
            </Link>
            <Link href="/signup" className="dscat-btn dscat-btn--solid">
              Sign up
            </Link>
          </>
        )}
      </div>

      {mounted && openCat && pos
        ? createPortal(
            <div
              ref={panelRef}
              className="dscat-panel"
              style={{ left: pos.left, top: pos.top }}
              role="menu"
              aria-label={openCat.label}
              onMouseEnter={() => open(openCat.id)}
              onMouseLeave={scheduleClose}
            >
              <p className="dscat-panel-head">
                <span className="dscat-dot" style={{ background: openCat.color }} />
                {openCat.label}
                {OpenIcon ? (
                  <OpenIcon
                    size={14}
                    aria-hidden
                    className="dscat-panel-icon"
                    style={{ color: openCat.color }}
                  />
                ) : null}
              </p>
              {openCat.items.map((it) =>
                it.live ? (
                  <a
                    key={it.label}
                    href={it.href}
                    className={`dscat-item ${it.label === activeItem ? 'is-active' : ''}`}
                    style={{ '--dscat-item-color': openCat.color }}
                    role="menuitem"
                    onClick={close}
                  >
                    <span className="dscat-item-label">{it.label}</span>
                  </a>
                ) : (
                  // Non-live: a <span>, not an <a> — can't navigate; disabled to AT.
                  <span
                    key={it.label}
                    className="dscat-item dscat-item--soon"
                    role="menuitem"
                    aria-disabled="true"
                    tabIndex={-1}
                    title="Coming soon"
                  >
                    <span className="dscat-item-label">{it.label}</span>
                    <span className="dscat-soon">Soon</span>
                  </span>
                ),
              )}
            </div>,
            document.body,
          )
        : null}
    </nav>
  );
}
