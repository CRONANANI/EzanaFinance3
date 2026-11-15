'use client';

/**
 * Watchlist: Market Monitor 2.0 (Nov 2026) plus Smart Watchlists.
 *
 * Everything on the page is the user's own data: the active watchlist's items
 * per asset class with live quotes, the pulse row, the selected asset's
 * panel (chart, holders), one securities table, signals computed from the
 * visible items, the latest 'watchlist' notifications, and the smart
 * watchlist rules with their auto-adds. No page title: the list selector in
 * the command bar is the control.
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
import { useOrg } from '@/contexts/OrgContext';
import { useWatchlists } from '@/hooks/useWatchlists';
import { useWatchlistNotes } from '@/hooks/useWatchlistNotes';
import { useSmartExplain, useWatchlistCatalysts } from '@/hooks/useWatchlistCatalysts';
import { appendCatalyst } from '@/lib/watchlist/notes';
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
  itemsForClass,
  pulseSummary,
  readUrlState,
  writeUrlState,
} from '@/lib/watchlist/watchlist-view';
import { ClassTabs } from '@/components/watchlist/monitor/MonitorParts';
import { CommandBar } from '@/components/watchlist/monitor/CommandBar';
import { PulseRow } from '@/components/watchlist/monitor/PulseRow';
import { SecuritiesTable } from '@/components/watchlist/monitor/SecuritiesTable';
import { MonitoringNote, NoteModal } from '@/components/watchlist/monitor/MonitoringNote';
import { SignalExplainer } from '@/components/watchlist/monitor/SignalExplainer';
import { CatalystPanel, catalystLine } from '@/components/watchlist/monitor/CatalystPanel';
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
import { markChecklistView } from '@/lib/onboarding/markView';

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
  const {
    watchlists,
    loading,
    addItem,
    removeItem,
    moveItem,
    createList,
    renameList,
    deleteList,
    refresh,
    toggleStar,
    authedFetch,
  } = useWatchlists();
  const smart = useSmartWatchlists(authedFetch);
  const alerts = useWatchlistAlerts(3);
  const { toast, show: notify, hide: hideToast } = useToast();

  const [newListOpen, setNewListOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [smartDialog, setSmartDialog] = useState({ open: false, rule: null });
  const [sendTicker, setSendTicker] = useState(null);
  /* The table's smart-only filter (set from the pulse row and the smart card). */
  const [smartOnly, setSmartOnly] = useState(false);
  /* Why I'm watching: the note modal, optionally opened with a catalyst added. */
  const [noteModal, setNoteModal] = useState({ open: false, prefill: null });
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
  const { quotes, updatedAt: quotesAt } = useQuotes(pricedSymbols);
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
  /* Lists an enabled smart rule fills. */
  const smartListIds = useMemo(
    () => new Set((smart.rules || []).filter((r) => r.enabled).map((r) => r.listId)),
    [smart.rules],
  );
  const pulse = useMemo(
    () =>
      activeList
        ? pulseSummary({
            list: activeList,
            classId,
            items,
            smartWeekCount: smart.weekCounts?.[activeList.id],
            unreadAlerts: alerts.unread,
            politicians,
          })
        : null,
    [activeList, classId, items, smart.weekCounts, alerts.unread, politicians],
  );
  /* Getting Started checklist: the table's Sector column shows how the list is spread. */
  useEffect(() => {
    if (items.length) markChecklistView('watchlist.sector_exposure');
  }, [items.length]);

  const selected = useMemo(
    () => items.find((i) => String(i.ticker).toUpperCase() === url.symbol) || items[0] || null,
    [items, url.symbol],
  );
  const selectedKey = selected ? itemKey(selected) : null;
  const inst = useInstitutions(selected?.type === 'stock' ? selected.ticker : null);

  /* Research features for the selected row: its note, the smart rule and the
     event that added it, the live re-check and related catalysts. Each one
     fails quietly; the rest of the page keeps working. */
  const notes = useWatchlistNotes(authedFetch, activeList?.id);
  const selectedNote = notes.noteFor(selected);
  const activeRule = useMemo(
    () => (smart.rules || []).find((r) => r.listId === activeList?.id && r.enabled) || null,
    [smart.rules, activeList?.id],
  );
  const selectedEvent = useMemo(() => {
    if (!selected || !activeList) return null;
    const t = String(selected.ticker).toUpperCase();
    return (
      (smart.events || []).find(
        (e) =>
          e.listId === activeList.id &&
          e.type === selected.type &&
          String(e.ticker).toUpperCase() === t,
      ) || null
    );
  }, [smart.events, selected, activeList]);
  const explain = useSmartExplain(
    authedFetch,
    selected?.addedBy === 'smart' ? activeRule?.id || null : null,
    selected,
  );
  const catalysts = useWatchlistCatalysts(selected);

  const existing = useMemo(() => new Set((activeList?.stocks || []).map(itemKey)), [activeList]);

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
    setSmartOnly(false);
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
      /* Undo puts the row back as it was: its star and, for a smart add, why it was added. */
      const was = r?.removed || item;
      notify(
        `Removed ${item.type === 'politician' ? item.name : item.ticker} from ${activeList.label}`,
        {
          label: 'Undo',
          run: () =>
            addItem(listId, {
              ...payloadOf(item),
              restore: {
                starred: !!was.starredAt,
                addedBy: was.addedBy === 'smart' ? 'smart' : 'user',
                addedReason: was.addedReason || null,
              },
            }),
        },
      );
    },
    [activeList, removeItem, addItem, notify],
  );

  const move = useCallback(
    async (item, toId) => {
      if (!activeList) return;
      const target = watchlists.find((w) => w.id === toId);
      /* One server call: the row moves with its star and provenance. */
      const r = await moveItem(activeList.id, toId, { type: item.type, ticker: item.ticker });
      if (!r.ok) {
        notify(
          r.status === 409
            ? `${target?.label || 'That list'} already has it.`
            : 'Could not move it. Try again.',
        );
        return;
      }
      notify(`Moved to ${target?.label || 'watchlist'}`);
    },
    [activeList, watchlists, moveItem, notify],
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

  const alertsFor = (listId) => !!prefs[listId]?.alertsEnabled;
  const setListAlerts = (listId, on) => {
    const list = watchlists.find((w) => w.id === listId);
    const next = {
      ...readPrefs(),
      [listId]: { ...(readPrefs()[listId] || {}), alertsEnabled: on },
    };
    writePrefs(next);
    setPrefs(next);
    notify(
      on
        ? `Big-move alerts on for ${list?.label || 'this list'}`
        : `Big-move alerts off for ${list?.label || 'this list'}`,
    );
  };

  const rename = async (listId, label) => {
    const r = await renameList(listId, label);
    if (r && r.ok !== false) notify(`Renamed to ${label}`);
    return r;
  };
  const removeList = async (list) => {
    const r = await deleteList(list.id);
    if (r && r.ok === false) {
      notify('Could not delete the list. Try again.');
      return;
    }
    notify(`Deleted ${list.label}`);
    if (list.id === activeList?.id) {
      const next = watchlists.find((w) => w.id !== list.id);
      setUrl({ listId: next?.id || null, symbol: null });
    }
  };

  const afterSmartChange = useCallback(async () => {
    await Promise.all([refresh?.({ force: true }), alerts.reload()]);
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

      <CommandBar
        lists={watchlists}
        activeList={activeList}
        smartActive={!!activeList && smartListIds.has(activeList.id)}
        onListChange={changeList}
        onCreateList={() => setNewListOpen(true)}
        onAddAsset={() => setAddOpen(true)}
        onCreateRule={() => setSmartDialog({ open: true, rule: null })}
      />

      <div className="wlm-grid">
        <div className="wlm-main">
          <ClassTabs value={classId} counts={counts} onChange={changeClass} />
          <PulseRow
            pulse={pulse}
            loading={loading}
            smartOnly={smartOnly}
            onSmartOnly={setSmartOnly}
          />

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
              onMove={move}
              lists={watchlists}
              activeListId={activeList?.id}
              updatedAt={quotesAt}
              onSendToTeam={canSend ? (it) => setSendTicker(it.ticker) : null}
            >
              <MonitoringNote
                note={selectedNote}
                status={notes.status}
                onEdit={() => setNoteModal({ open: true, prefill: null })}
              />
            </AssetDetail>
          ) : loading ? (
            <section className="wl-chart-panel wlm-detail" aria-hidden="true">
              <span className="wlm-skel wlm-skel--head" />
              <span className="wlm-skel wlm-skel--chart" />
            </section>
          ) : (
            <section className="wl-chart-panel wlm-detail wlm-detail--empty">
              <p className="wlm-sm wlm-muted">
                Pick a row in the table to see its chart and details here.
              </p>
            </section>
          )}

          <SecuritiesTable
            cls={cls}
            items={items}
            listEmpty={!loading && (activeList?.stocks || []).length === 0}
            loading={loading}
            sparks={sparks}
            politicians={politicians}
            selectedKey={selectedKey}
            lists={watchlists}
            activeListId={activeList?.id}
            smartOnly={smartOnly}
            onSmartOnly={setSmartOnly}
            onSelect={select}
            onStar={star}
            onMove={move}
            onRemove={remove}
            onAdd={() => setAddOpen(true)}
            onCreateRule={() => setSmartDialog({ open: true, rule: null })}
          />
        </div>

        <aside className="wl-side wlm-side" aria-label="Watchlists">
          <MyWatchlistsCard
            lists={watchlists}
            activeList={activeList}
            smartListIds={smartListIds}
            onListChange={changeList}
            onNewList={() => setNewListOpen(true)}
            onRename={rename}
            onDelete={removeList}
            alertsFor={alertsFor}
            onAlertsChange={setListAlerts}
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
            onViewMatches={(listId) => {
              const rule = smart.rules.find((r) => r.listId === listId);
              setUrl({
                listId,
                symbol: null,
                classId: rule ? classIdOfType(rule.assetClass) : classId,
              });
              setSmartOnly(true);
            }}
            onChanged={afterSmartChange}
          />
          <SignalExplainer
            item={selected}
            rule={activeRule}
            event={selectedEvent}
            explain={explain}
            note={selectedNote}
            onNote={() => setNoteModal({ open: true, prefill: null })}
            onEditRule={(rule) => setSmartDialog({ open: true, rule })}
          />
          <CatalystPanel
            item={selected}
            catalysts={catalysts}
            onAddToNote={(c) =>
              setNoteModal({
                open: true,
                prefill: {
                  catalysts: appendCatalyst(selectedNote?.catalysts || '', catalystLine(c)),
                },
              })
            }
          />
        </aside>
      </div>

      <NoteModal
        open={noteModal.open}
        item={selected}
        note={selectedNote}
        prefill={noteModal.prefill}
        onClose={() => setNoteModal({ open: false, prefill: null })}
        onSave={async (n) => {
          const r = await notes.save(n);
          if (r.ok) notify('Note saved');
          return r;
        }}
        onDelete={async () => {
          const r = await notes.remove({ type: selected.type, ticker: selected.ticker });
          if (r.ok) notify('Note deleted');
          return r;
        }}
      />
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
