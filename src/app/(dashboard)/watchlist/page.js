'use client';

/**
 * Watchlist: the Market Monitor (Nov 2026 redesign) plus Smart Watchlists.
 *
 * Everything on the page is the user's own data: the active watchlist's items
 * per asset class with live quotes, the selected asset's chart and holders,
 * insights computed from the visible items, the latest 'watchlist'
 * notifications, and the smart watchlist rules with their auto-adds.
 *
 * URL state: ?list=<id>&class=stocks&symbol=AAPL&range=1M (defaults dropped).
 * Flat home canvas: root keeps `ez-canvas`, home-canvas.css stays the last
 * CSS import, and the shells check-home-canvas expects (.wl-chart-panel,
 * .wl-side, .wl-strip-card) stay in place.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useChecklist } from '@/hooks/useChecklist';
import { EducationTip } from '@/components/beginner/EducationTip';
import { getCoursesForWatchlistPreview } from '@/lib/learning-curriculum';
import { useOrg } from '@/contexts/OrgContext';
import { useWatchlists } from '@/hooks/useWatchlists';
import {
  useInstitutions,
  usePoliticians,
  useQuotes,
  useSmartWatchlists,
  useSparklines,
  useWatchlistAlerts,
} from '@/hooks/useWatchlistMonitor';
import { NewWatchlistDialog } from '@/components/watchlist/NewWatchlistDialog';
import { CLASS_BY_ID, classIdOfType, isPriced } from '@/lib/watchlist/asset-classes';
import {
  classCounts,
  computeInsights,
  itemsForClass,
  readUrlState,
  writeUrlState,
} from '@/lib/watchlist/watchlist-view';
import {
  AlsoInWatchlist,
  ClassTabs,
  CoursesCard,
  EmptyClass,
  InsightsCard,
  QuoteStrip,
  RecentAlertsCard,
} from '@/components/watchlist/monitor/MonitorParts';
import {
  AddAssetDialog,
  AssetDetail,
  MyWatchlistsCard,
} from '@/components/watchlist/monitor/MonitorPanels';
import {
  SmartWatchlistCard,
  SmartWatchlistDialog,
} from '@/components/watchlist/monitor/SmartWatchlist';
import './watchlist.css';
import '@/styles/home-canvas.css';

const OrgSendToTeamModal = dynamic(
  () =>
    import('@/components/org/OrgSendToTeamModal').then((m) => ({ default: m.OrgSendToTeamModal })),
  { ssr: false, loading: () => null },
);

const PREFS_KEY = 'ezana.watchlistPrefs';
const itemKey = (i) => `${i.type}:${i.ticker}`;

function readPrefs() {
  try {
    return JSON.parse(window.localStorage.getItem(PREFS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}
function writePrefs(prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage blocked: the toggle just will not persist */
  }
}

/** One toast at a time, with an optional action (Undo). */
function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((text, action) => {
    clearTimeout(timer.current);
    setToast({ text, action, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), action ? 6000 : 3500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, show, hide: () => setToast(null) };
}

function WatchlistMonitor() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = useMemo(() => readUrlState(searchParams), [searchParams]);

  const { completeTask } = useChecklist();
  const { isOrgUser, hasPermission } = useOrg();
  const { watchlists, loading, addItem, removeItem, createList, refresh, toggleStar, authedFetch } =
    useWatchlists();
  const smart = useSmartWatchlists(authedFetch);
  const alerts = useWatchlistAlerts(3);
  const { toast, show: notify, hide: hideToast } = useToast();

  const [newListOpen, setNewListOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [smartDialog, setSmartDialog] = useState({ open: false, rule: null });
  const [sendTicker, setSendTicker] = useState(null);
  const [prefs, setPrefs] = useState({});
  useEffect(() => setPrefs(readPrefs()), []);

  /* ---------------- URL state ---------------- */
  const setUrl = useCallback(
    (patch) => {
      const qs = writeUrlState(searchParams, { ...url, ...patch });
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, url],
  );

  const activeList = useMemo(
    () => watchlists.find((w) => w.id === url.listId) || watchlists[0] || null,
    [watchlists, url.listId],
  );
  const classId = url.classId;
  const cls = CLASS_BY_ID[classId];

  /* ---------------- data ---------------- */
  const pricedSymbols = useMemo(
    () =>
      (activeList?.stocks || [])
        .filter((i) => isPriced(i.type))
        .map((i) => String(i.ticker).toUpperCase()),
    [activeList],
  );
  const { quotes } = useQuotes(pricedSymbols);
  const sparks = useSparklines(pricedSymbols);
  const politicianIds = useMemo(
    () => (activeList?.stocks || []).filter((i) => i.type === 'politician').map((i) => i.ticker),
    [activeList],
  );
  const { byId: politicians } = usePoliticians(politicianIds);

  const items = useMemo(
    () => itemsForClass(activeList, classId, quotes),
    [activeList, classId, quotes],
  );
  const counts = useMemo(() => classCounts(activeList), [activeList]);
  const insights = useMemo(() => computeInsights(items, classId), [items, classId]);

  const selected = useMemo(
    () => items.find((i) => String(i.ticker).toUpperCase() === url.symbol) || items[0] || null,
    [items, url.symbol],
  );
  const selectedKey = selected ? itemKey(selected) : null;
  const inst = useInstitutions(selected?.type === 'stock' ? selected.ticker : null);

  const alsoIn = useMemo(() => {
    if (!activeList) return [];
    const others = ['stocks', 'bonds', 'commodities', 'crypto'].flatMap((c) =>
      itemsForClass(activeList, c, quotes),
    );
    return others.filter((i) => itemKey(i) !== selectedKey).slice(0, 6);
  }, [activeList, quotes, selectedKey]);

  const existing = useMemo(() => new Set((activeList?.stocks || []).map(itemKey)), [activeList]);

  /* ---------------- courses ---------------- */
  const courses = useMemo(() => getCoursesForWatchlistPreview(4), []);
  const [bookmarked, setBookmarked] = useState(() => new Set());
  useEffect(() => {
    let alive = true;
    authedFetch('/api/learning/bookmarks')
      .then((r) => (r.ok ? r.json() : { bookmarks: [] }))
      .then((d) => alive && setBookmarked(new Set((d.bookmarks || []).map((b) => b.course_id))))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [authedFetch]);
  const toggleBookmark = useCallback(
    async (courseId, add) => {
      setBookmarked((s) => {
        const n = new Set(s);
        if (add) n.add(courseId);
        else n.delete(courseId);
        return n;
      });
      const r = await authedFetch('/api/learning/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ courseId, action: add ? 'add' : 'remove' }),
      }).catch(() => null);
      if (!r?.ok) {
        setBookmarked((s) => {
          const n = new Set(s);
          if (add) n.delete(courseId);
          else n.add(courseId);
          return n;
        });
        notify('Could not update the bookmark.');
      }
    },
    [authedFetch, notify],
  );

  /* ---------------- actions ---------------- */
  const stockSelectedOnce = useRef(false);
  const select = useCallback(
    (item) => {
      setUrl({ symbol: String(item.ticker).toUpperCase() });
      if (item.type === 'stock' && !stockSelectedOnce.current) {
        stockSelectedOnce.current = true;
        completeTask('watchlist_1');
      }
    },
    [setUrl, completeTask],
  );

  const changeClass = (id) => setUrl({ classId: id, symbol: null });
  const changeList = (id) => {
    setUrl({ listId: id, symbol: null });
    completeTask('watchlist_2');
  };

  const star = useCallback(
    async (item, on) => {
      if (!activeList) return;
      const r = await toggleStar(activeList.id, { type: item.type, ticker: item.ticker }, on);
      if (r && r.ok === false) notify('Could not update the star.');
    },
    [activeList, toggleStar, notify],
  );

  const payloadOf = (item) => ({
    type: item.type,
    ticker: item.ticker,
    name: item.name,
    sector: item.sector,
    metadata: item.metadata,
  });

  const remove = useCallback(
    async (item) => {
      if (!activeList) return;
      const listId = activeList.id;
      const r = await removeItem(listId, { type: item.type, ticker: item.ticker });
      if (r && r.ok === false) {
        notify('Could not remove it. Try again.');
        return;
      }
      notify(
        `Removed ${item.type === 'politician' ? item.name : item.ticker} from ${activeList.label}`,
        {
          label: 'Undo',
          run: () => addItem(listId, payloadOf(item)),
        },
      );
    },
    [activeList, removeItem, addItem, notify],
  );

  const move = useCallback(
    async (item, toId) => {
      if (!activeList) return;
      const target = watchlists.find((w) => w.id === toId);
      const add = await addItem(toId, payloadOf(item));
      if (add && add.ok === false) {
        notify('Could not move it. Try again.');
        return;
      }
      await removeItem(activeList.id, { type: item.type, ticker: item.ticker });
      notify(`Moved to ${target?.label || 'watchlist'}`);
    },
    [activeList, watchlists, addItem, removeItem, notify],
  );

  const addAsset = useCallback(
    async (asset) => {
      if (!activeList) return;
      const r = await addItem(activeList.id, asset);
      if (r && r.ok === false) {
        notify(r.reason || 'Could not add it.');
        return;
      }
      notify(`Added ${asset.type === 'politician' ? asset.name : asset.ticker}`);
      if (asset.type === 'stock') completeTask('watchlist_1');
      const assetClass = classIdOfType(asset.type);
      if (assetClass !== classId)
        setUrl({ classId: assetClass, symbol: String(asset.ticker).toUpperCase() });
    },
    [activeList, addItem, notify, completeTask, classId, setUrl],
  );

  const alertsOn = !!(activeList && prefs[activeList.id]?.alertsEnabled);
  const setAlertsOn = (on) => {
    if (!activeList) return;
    const next = {
      ...readPrefs(),
      [activeList.id]: { ...(readPrefs()[activeList.id] || {}), alertsEnabled: on },
    };
    writePrefs(next);
    setPrefs(next);
    notify(
      on
        ? `Big-move alerts on for ${activeList.label}`
        : `Big-move alerts off for ${activeList.label}`,
    );
  };

  const afterSmartChange = useCallback(async () => {
    await Promise.all([refresh?.(), alerts.reload()]);
  }, [refresh, alerts]);

  const onSmartSaved = async (out, created) => {
    setSmartDialog({ open: false, rule: null });
    await smart.reload();
    await afterSmartChange();
    if (out?.removed) {
      notify('Smart rule turned off. The list and its items stay.');
      return;
    }
    const n = out?.added?.length || 0;
    if (created && out?.watchlist?.id)
      setUrl({
        listId: out.watchlist.id,
        symbol: null,
        classId: classIdOfType(out.rule.assetClass),
      });
    notify(
      n
        ? `Saved. ${n} added now; new matches will keep coming.`
        : 'Saved. Nothing matches yet; it checks every hour.',
    );
  };

  const canSend = isOrgUser && typeof hasPermission === 'function' && hasPermission('send_to_team');

  /* ---------------- render ---------------- */
  return (
    <div className="wl-page wlm-page dashboard-page-inset ez-canvas">
      <EducationTip topic="diversification" />

      <header className="wlm-top">
        <div className="wlm-top__titles">
          <span className="wlm-eyebrow">Market monitor</span>
          <h1 className="wlm-title">
            {activeList?.label || 'Watchlist'}
            {activeList?.smart ? (
              <span className="wlm-badge">
                <i className="bi bi-stars" aria-hidden="true" /> Smart
              </span>
            ) : null}
          </h1>
        </div>
        <ClassTabs value={classId} counts={counts} onChange={changeClass} />
      </header>

      <div className="wl-strip-card wlm-strip-card">
        {loading ? (
          <div className="wlm-strip" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="wlm-skel wlm-skel--card" />
            ))}
          </div>
        ) : items.length ? (
          <QuoteStrip
            items={items}
            selectedKey={selectedKey}
            sparks={sparks}
            politicians={politicians}
            onSelect={select}
          />
        ) : (
          <EmptyClass cls={cls} onAdd={() => setAddOpen(true)} />
        )}
      </div>

      <div className="wlm-grid">
        <div className="wlm-main">
          {selected ? (
            <AssetDetail
              item={selected}
              listLabel={activeList?.label || 'Watchlist'}
              politician={selected.type === 'politician' ? politicians[selected.ticker] : null}
              inst={inst}
              range={url.range}
              onRange={(range) => setUrl({ range })}
              onStar={star}
              onRemove={remove}
              onSendToTeam={canSend ? (it) => setSendTicker(it.ticker) : null}
            >
              <AlsoInWatchlist
                items={alsoIn}
                sparks={sparks}
                onSelect={(it) =>
                  setUrl({
                    classId: classIdOfType(it.type),
                    symbol: String(it.ticker).toUpperCase(),
                  })
                }
              />
            </AssetDetail>
          ) : (
            <section className="wl-chart-panel wlm-detail wlm-detail--empty">
              <i className="bi bi-binoculars" aria-hidden="true" />
              <p className="wlm-strong">Pick something to monitor</p>
              <p className="wlm-sm wlm-muted">
                Add {cls.label.toLowerCase()} to {activeList?.label || 'a watchlist'}, or let a
                smart watchlist find them for you.
              </p>
              <div className="wlm-row">
                <button
                  type="button"
                  className="wlm-btn wlm-btn--accent"
                  onClick={() => setAddOpen(true)}
                >
                  <i className="bi bi-plus-lg" aria-hidden="true" /> Add {cls.singular}
                </button>
                <button
                  type="button"
                  className="wlm-btn"
                  onClick={() => setSmartDialog({ open: true, rule: null })}
                >
                  <i className="bi bi-stars" aria-hidden="true" /> New smart watchlist
                </button>
              </div>
            </section>
          )}

          <div className="wlm-duo">
            <InsightsCard insights={insights} classId={classId} />
            <RecentAlertsCard alerts={alerts} />
          </div>
        </div>

        <aside className="wl-side wlm-side" aria-label="Watchlists">
          <MyWatchlistsCard
            lists={watchlists}
            activeList={activeList}
            onListChange={changeList}
            items={items}
            sparks={sparks}
            selectedKey={selectedKey}
            onSelect={select}
            onStar={star}
            onMove={move}
            onRemove={remove}
            onNewList={() => setNewListOpen(true)}
            onAdd={() => setAddOpen(true)}
            alertsOn={alertsOn}
            onAlertsChange={setAlertsOn}
            loading={loading}
          />
          <SmartWatchlistCard
            smart={smart}
            notify={notify}
            onCreate={() => setSmartDialog({ open: true, rule: null })}
            onEdit={(rule) => setSmartDialog({ open: true, rule })}
            onOpenList={(listId) => {
              const rule = smart.rules.find((r) => r.listId === listId);
              setUrl({
                listId,
                symbol: null,
                classId: rule ? classIdOfType(rule.assetClass) : classId,
              });
            }}
            onChanged={afterSmartChange}
          />
        </aside>
      </div>

      <CoursesCard courses={courses} bookmarked={bookmarked} onToggle={toggleBookmark} />

      <NewWatchlistDialog
        open={newListOpen}
        onOpenChange={setNewListOpen}
        createList={createList}
        addItem={addItem}
        onCreated={(id) => {
          setPrefs(readPrefs());
          if (id) setUrl({ listId: id, symbol: null });
        }}
      />
      <AddAssetDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        initialClass={classId}
        listLabel={activeList?.label}
        existing={existing}
        onAdd={addAsset}
      />
      <SmartWatchlistDialog
        open={smartDialog.open}
        rule={smartDialog.rule}
        smart={smart}
        onClose={() => setSmartDialog({ open: false, rule: null })}
        onSaved={onSmartSaved}
      />
      {sendTicker ? (
        <OrgSendToTeamModal
          onClose={() => setSendTicker(null)}
          attachment={{
            kind: 'watchlist_ticker',
            ref: JSON.stringify({ ticker: sendTicker }),
            label: `${sendTicker} (watchlist)`,
            meta: { page: 'watchlist' },
          }}
        />
      ) : null}

      <div className="wlm-toast-region" role="status" aria-live="polite">
        {toast ? (
          <div key={toast.id} className="wlm-toast">
            <span>{toast.text}</span>
            {toast.action ? (
              <button
                type="button"
                className="wlm-link"
                onClick={() => {
                  toast.action.run();
                  hideToast();
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              type="button"
              className="wlm-icon-btn wlm-icon-btn--sm"
              aria-label="Dismiss"
              onClick={hideToast}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* useSearchParams needs a Suspense boundary in the App Router. */
export default function WatchlistPage() {
  return (
    <Suspense
      fallback={
        <div className="wl-page wlm-page dashboard-page-inset ez-canvas" aria-busy="true" />
      }
    >
      <WatchlistMonitor />
    </Suspense>
  );
}
