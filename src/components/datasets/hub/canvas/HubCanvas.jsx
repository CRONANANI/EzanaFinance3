'use client';

/**
 * HubCanvas: the arrangeable body of a dataset hub page.
 *
 * Everything below the hub header (the EzanaQL editor and its result table,
 * which stay fixed at the top) is a card on a 12-column canvas. A visitor can:
 *   - drag a card by its grip to a new position (pointer or keyboard),
 *   - resize it from its corner (width snaps to columns, height to 10px),
 *   - remove it, and add any card back from the side drawer.
 *
 * The canvas opens empty for every visitor: only the header, the editor and
 * its result table. Under the empty canvas a few of the hub's cards show
 * through a veil as a teaser, beside a call to open the drawer.
 *
 * Signed-out visitors may keep GUEST_LIMIT (3) cards, drawn from the hub's
 * guest set; every other card is visible in the drawer behind a lock, and
 * reaching for one opens the waitlist gate. Members can place every card.
 *
 * The cards themselves are server-rendered by the hub page and handed in as
 * React nodes, each inside its own Suspense boundary, so nothing about how a
 * card loads its data changes. This component only decides which are placed,
 * in what order, at what size.
 *
 * The first render is the empty default for everyone, so the server HTML and
 * the first client render agree. The saved layout (localStorage, per hub and
 * per signed-in state) is applied once auth has settled, and the teaser waits
 * for that too, so a returning visitor never sees it flash.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/auth-context';
import HubCardDrawer from './HubCardDrawer';
import HubCanvasGate from './HubCanvasGate';
import {
  COLS,
  GUEST_LIMIT,
  addCard,
  canAdd,
  clearStored,
  defaultLayout,
  moveCard,
  previewCards,
  readStored,
  removeCard,
  resizeCard,
  sanitizeLayout,
  writeStored,
} from './layout-model';
import './hub-canvas.css';

const FLIP_MS = 240;
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {{
 *   hubId: string,
 *   label?: string,
 *   cards: Array<{ id: string, title: string, icon?: string, blurb?: string,
 *                  node: React.ReactNode, w?: number, minW?: number, guest?: boolean }>
 * }} props
 */
export default function HubCanvas({ hubId, label = 'Hub cards', cards }) {
  const { isAuthenticated, loading: authLoading } = useAuth() || {};
  const mode = isAuthenticated ? 'member' : 'guest';

  /* Card metadata without the nodes, for the model functions. */
  const meta = useMemo(
    () =>
      cards.map(({ id, title, icon, blurb, w, minW, guest }) => ({
        id,
        title,
        icon,
        blurb,
        w,
        minW,
        guest: Boolean(guest),
      })),
    [cards],
  );
  const nodeOf = useMemo(() => new Map(cards.map((c) => [c.id, c.node])), [cards]);
  /* The teaser under an empty canvas: a few of this hub's cards, veiled. */
  const preview = useMemo(() => previewCards(meta, 3), [meta]);

  const [layout, setLayout] = useState(() => defaultLayout(meta, 'guest'));
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [gate, setGate] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [resizingId, setResizingId] = useState(null);
  const [flashId, setFlashId] = useState(null);
  const [announce, setAnnounce] = useState('');

  const gridRef = useRef(null);
  const itemRefs = useRef(new Map());
  const prevRects = useRef(null);
  const drag = useRef(null);
  const loadedMode = useRef(null);
  /* The layout as of the last change, readable synchronously by pointer
     handlers that fire faster than React re-renders. Every write goes through
     place(), which updates the ref and the state together, so the two never
     disagree and no state updater has to carry a side effect. */
  const layoutRef = useRef(layout);
  const place = useCallback(
    (next, { persist = false } = {}) => {
      layoutRef.current = next;
      setLayout(next);
      if (persist) writeStored(hubId, mode, next);
    },
    [hubId, mode],
  );

  /* Load the saved layout once auth has settled, and again if the visitor
     signs in or out on this page. */
  useEffect(() => {
    if (authLoading || loadedMode.current === mode) return;
    loadedMode.current = mode;
    const stored = readStored(hubId, mode);
    place(stored ? sanitizeLayout(stored, meta, mode) : defaultLayout(meta, mode));
    setReady(true);
  }, [authLoading, mode, hubId, meta, place]);

  /* A change the visitor made: applied and saved. */
  const commit = useCallback((next) => place(next, { persist: true }), [place]);
  /* Stable, because the gate's focus effect depends on it. */
  const closeGate = useCallback(() => setGate(null), []);

  /* ── FLIP: other cards glide to their new slots after a reorder ─────────── */
  const snapshot = useCallback(() => {
    const m = new Map();
    itemRefs.current.forEach((el, id) => {
      if (el) m.set(id, el.getBoundingClientRect());
    });
    prevRects.current = m;
  }, []);

  useLayoutEffect(() => {
    const before = prevRects.current;
    prevRects.current = null;
    if (!before || reducedMotion()) {
      if (drag.current) applyDragTransform();
      return;
    }
    itemRefs.current.forEach((el, id) => {
      const was = before.get(id);
      if (!el || !was || id === drag.current?.id) return;
      const now = el.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.style.transition = 'none';
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      void el.offsetWidth;
      el.style.transition = `transform ${FLIP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      el.style.transform = '';
    });
    /* The dragged card's natural slot just moved; re-anchor it under the
       pointer in the same frame so it never visibly jumps. */
    if (drag.current) applyDragTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  /* ── drag ──────────────────────────────────────────────────────────────── */
  function applyDragTransform() {
    const d = drag.current;
    const el = d && itemRefs.current.get(d.id);
    if (!el) return;
    /* The card's natural position is its rect minus the transform we put on
       it; the pointer offset captured at grab time keeps the grab point under
       the pointer. */
    const r = el.getBoundingClientRect();
    const naturalLeft = r.left - d.tx;
    const naturalTop = r.top - d.ty;
    d.tx = d.px - d.ox - naturalLeft;
    d.ty = d.py - d.oy - naturalTop;
    el.style.transform = `translate3d(${d.tx}px, ${d.ty}px, 0)`;
  }

  const onGripPointerDown = (id, e) => {
    if (e.button !== 0) return;
    const el = itemRefs.current.get(id);
    if (!el) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const r = el.getBoundingClientRect();
    drag.current = {
      id,
      ox: e.clientX - r.left,
      oy: e.clientY - r.top,
      px: e.clientX,
      py: e.clientY,
      tx: 0,
      ty: 0,
      overId: null,
      lockUntil: 0,
    };
    el.style.transition = 'none';
    setDragId(id);
  };

  const onGripPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    d.px = e.clientX;
    d.py = e.clientY;
    applyDragTransform();

    /* The hit test walks every element under the pointer and takes the
       first card that is not the one being dragged (which is always topmost,
       since the pointer is on its grip). A short lock after each reorder
       stops two cards of different sizes trading places back and forth
       under a still pointer. */
    const now = performance.now();
    if (now < d.lockUntil) return;
    const under = document
      .elementsFromPoint(e.clientX, e.clientY)
      .map((n) => n.closest?.('[data-hcv-id]'))
      .find((n) => n && n.getAttribute('data-hcv-id') !== d.id);
    const overId = under?.getAttribute('data-hcv-id') || null;
    if (!overId) {
      d.overId = null;
      return;
    }
    if (overId === d.overId) return;
    d.overId = overId;
    const prev = layoutRef.current;
    const from = prev.findIndex((i) => i.id === d.id);
    const to = prev.findIndex((i) => i.id === overId);
    if (from < 0 || to < 0) return;
    snapshot();
    d.lockUntil = now + FLIP_MS;
    place(moveCard(prev, from, to));
  };

  const endDrag = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const el = itemRefs.current.get(d.id);
    if (el) {
      /* Settle into the slot rather than snapping. */
      el.style.transition = reducedMotion()
        ? 'none'
        : `transform ${FLIP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      el.style.transform = '';
    }
    setDragId(null);
    const now = layoutRef.current;
    writeStored(hubId, mode, now);
    const idx = now.findIndex((i) => i.id === d.id);
    const title = meta.find((c) => c.id === d.id)?.title || 'Card';
    setAnnounce(`${title} moved to position ${idx + 1} of ${now.length}.`);
  };

  /* Keyboard: arrows on the grip move the card one slot. */
  const onGripKeyDown = (id, e) => {
    const back = e.key === 'ArrowUp' || e.key === 'ArrowLeft';
    const fwd = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    if (!back && !fwd) return;
    e.preventDefault();
    const from = layout.findIndex((i) => i.id === id);
    const to = from + (fwd ? 1 : -1);
    if (from < 0 || to < 0 || to >= layout.length) return;
    snapshot();
    const next = moveCard(layout, from, to);
    commit(next);
    const title = meta.find((c) => c.id === id)?.title || 'Card';
    setAnnounce(`${title} moved to position ${to + 1} of ${next.length}.`);
    /* Keep focus on the grip that moved. */
    requestAnimationFrame(() =>
      itemRefs.current.get(id)?.querySelector('.hcv-grip')?.focus({ preventScroll: false }),
    );
  };

  /* ── resize ────────────────────────────────────────────────────────────── */
  const resize = useRef(null);
  const onResizePointerDown = (id, e) => {
    if (e.button !== 0) return;
    const el = itemRefs.current.get(id);
    const grid = gridRef.current;
    if (!el || !grid) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const r = el.getBoundingClientRect();
    const cs = window.getComputedStyle(grid);
    const gap = parseFloat(cs.columnGap || cs.gap || '16') || 16;
    const single = cs.gridTemplateColumns.split(' ').length < COLS;
    const colW = (grid.clientWidth - gap * (COLS - 1)) / COLS;
    resize.current = { id, x: e.clientX, y: e.clientY, w: r.width, h: r.height, gap, colW, single };
    setResizingId(id);
  };

  const rafResize = useRef(0);
  const onResizePointerMove = (e) => {
    const s = resize.current;
    if (!s) return;
    const px = e.clientX;
    const py = e.clientY;
    cancelAnimationFrame(rafResize.current);
    rafResize.current = requestAnimationFrame(() => {
      const width = s.w + (px - s.x);
      const w = s.single ? undefined : Math.round((width + s.gap) / (s.colW + s.gap));
      const h = Math.round((s.h + (py - s.y)) / 10) * 10;
      place(resizeCard(layoutRef.current, meta, s.id, { w, h }));
    });
  };

  const endResize = () => {
    const s = resize.current;
    if (!s) return;
    resize.current = null;
    cancelAnimationFrame(rafResize.current);
    setResizingId(null);
    writeStored(hubId, mode, layoutRef.current);
  };

  /* Keyboard resize: arrows on the corner handle. Left/right change the
     column span, up/down the height in 40px steps. */
  const onResizeKeyDown = (id, e) => {
    const item = layout.find((i) => i.id === id);
    const el = itemRefs.current.get(id);
    if (!item || !el) return;
    let patch = null;
    if (e.key === 'ArrowLeft') patch = { w: item.w - 1 };
    else if (e.key === 'ArrowRight') patch = { w: item.w + 1 };
    else if (e.key === 'ArrowUp')
      patch = { h: (item.h ?? Math.round(el.getBoundingClientRect().height)) - 40 };
    else if (e.key === 'ArrowDown')
      patch = { h: (item.h ?? Math.round(el.getBoundingClientRect().height)) + 40 };
    else if (e.key === 'Escape' || e.key === 'Delete') patch = { h: null };
    if (!patch) return;
    e.preventDefault();
    commit(resizeCard(layout, meta, id, patch));
  };

  /* ── add / remove / reset ──────────────────────────────────────────────── */
  const tryAdd = (id) => {
    const verdict = canAdd(layout, meta, mode, id);
    if (!verdict.ok) {
      if (verdict.reason === 'placed') {
        setDrawerOpen(false);
        focusCard(id);
        return;
      }
      setGate({ reason: verdict.reason, title: meta.find((c) => c.id === id)?.title || '' });
      return;
    }
    snapshot();
    commit(addCard(layout, meta, id));
    setDrawerOpen(false);
    focusCard(id);
  };

  const remove = (id) => {
    snapshot();
    commit(removeCard(layout, id));
    const title = meta.find((c) => c.id === id)?.title || 'Card';
    setAnnounce(`${title} removed. Add it back from the card drawer.`);
  };

  const reset = () => {
    clearStored(hubId, mode);
    snapshot();
    place(defaultLayout(meta, mode));
  };

  function focusCard(id) {
    /* After the commit paints: scroll the card into view and flash it so the
       eye finds what just arrived. */
    requestAnimationFrame(() => {
      const el = itemRefs.current.get(id);
      if (!el) return;
      el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
      setFlashId(id);
      window.setTimeout(() => setFlashId((f) => (f === id ? null : f)), 1400);
    });
  }

  const placed = new Set(layout.map((i) => i.id));

  return (
    <div className={`hcv-root${ready ? ' is-ready' : ''}`} data-mode={mode}>
      <div
        ref={gridRef}
        className={`hcv-grid${dragId ? ' is-dragging' : ''}${resizingId ? ' is-resizing' : ''}`}
        role="list"
        aria-label={label}
      >
        {layout.map((item, index) => {
          const card = meta.find((c) => c.id === item.id);
          if (!card) return null;
          const style = { '--hcv-span': item.w };
          if (item.h) style.height = `${item.h}px`;
          return (
            <div
              key={item.id}
              role="listitem"
              data-hcv-id={item.id}
              ref={(el) => {
                if (el) itemRefs.current.set(item.id, el);
                else itemRefs.current.delete(item.id);
              }}
              className={`hcv-item${item.h ? ' has-h' : ''}${dragId === item.id ? ' is-drag' : ''}${
                resizingId === item.id ? ' is-resize' : ''
              }${flashId === item.id ? ' is-flash' : ''}`}
              style={style}
            >
              <div className="hcv-bar">
                <button
                  type="button"
                  className="hcv-btn hcv-grip"
                  aria-label={`Move ${card.title}. Position ${index + 1} of ${layout.length}. Use arrow keys to move.`}
                  title="Drag to move"
                  onPointerDown={(e) => onGripPointerDown(item.id, e)}
                  onPointerMove={onGripPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onKeyDown={(e) => onGripKeyDown(item.id, e)}
                >
                  <i className="bi bi-grip-vertical" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="hcv-btn"
                  aria-label={`Remove ${card.title}`}
                  title="Remove card"
                  onClick={() => remove(item.id)}
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>

              <div className="hcv-body">{nodeOf.get(item.id)}</div>

              <button
                type="button"
                className="hcv-resize"
                aria-label={`Resize ${card.title}. Left and right change width, up and down change height, Escape restores the natural height.`}
                title="Drag to resize"
                onPointerDown={(e) => onResizePointerDown(item.id, e)}
                onPointerMove={onResizePointerMove}
                onPointerUp={endResize}
                onPointerCancel={endResize}
                onKeyDown={(e) => onResizeKeyDown(item.id, e)}
              >
                <i className="bi bi-arrows-angle-expand" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {ready && layout.length === 0 ? (
        <div className="hcv-teaser">
          {/* A look at what the drawer holds. Inert: not clickable, not
              focusable, hidden from assistive tech. */}
          <div className="hcv-preview" aria-hidden="true" inert="">
            {preview.map((c) => (
              <div key={c.id} className="hcv-preview-item" style={{ '--hcv-span': c.w }}>
                <div className="hcv-body">{nodeOf.get(c.id)}</div>
              </div>
            ))}
          </div>
          <div className="hcv-veil" aria-hidden="true" />
          <div className="hcv-empty">
            <i className="bi bi-layout-wtf hcv-empty-ic" aria-hidden="true" />
            <p className="hcv-empty-title">Your canvas is empty.</p>
            <p className="hcv-empty-sub">Add cards from the drawer to build this hub your way.</p>
            <button
              type="button"
              className="hcv-empty-btn is-throb"
              onClick={() => setDrawerOpen(true)}
            >
              <i className="bi bi-layout-sidebar-inset-reverse" aria-hidden="true" />
              Open the card drawer
            </button>
          </div>
        </div>
      ) : null}

      <p className="hcv-sr" aria-live="polite">
        {announce}
      </p>

      <HubCardDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        cards={meta}
        placed={placed}
        mode={mode}
        guestLimit={GUEST_LIMIT}
        onAdd={tryAdd}
        onRemove={remove}
        onReset={reset}
      />

      {gate ? (
        <HubCanvasGate reason={gate.reason} cardTitle={gate.title} onClose={closeGate} />
      ) : null}
    </div>
  );
}
