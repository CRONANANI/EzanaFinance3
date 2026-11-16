'use client';

/**
 * Research Library (/org-team-hub/research-library): the council's written
 * memory. An analyst checks what the council has already written on a name
 * and whether their own document is ready to publish. A portfolio manager,
 * executive or faculty advisor sees what waits on their review and which
 * coverage has gone stale.
 *
 * One layout for every role. Who sees which control follows the existing
 * routes and row policies (src/lib/org-research-library-model.js mirrors
 * them); the server checks every request again.
 *
 * The page renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Dropdown, MenuItem, VisuallyHidden } from '@/components/ds';
import { useOrg } from '@/contexts/OrgContext';
import {
  NA,
  addressQuery,
  emptyFilters,
  exportRows,
  fmtDate,
  hasFilters,
  isManagerRole,
  quickDossierTicker,
  searchQuery,
  staleTickers,
  toCsv,
} from '@/lib/org-research-library-model';
import { Skel, TextToggle } from '@/components/org/command-center/parts';
import { useResearchData } from './useResearchData';
import {
  Exemplars,
  FilterRow,
  LibraryTable,
  ReviewShelf,
  SearchLine,
  SetSummary,
} from './LibraryView';
import { SideColumn } from './SideColumn';
import { TickerView } from './TickerView';
import { HandoffDialog, LineageView } from './LineageView';
import { DocumentPanel } from './DocumentPanel';
import { EditorDialog } from './EditorDialog';
import { ActionMessage } from './parts';
import '@/components/org/command-center/command-center.css';
import './research-library.css';
import '@/styles/home-canvas.css';

function Kpi({ icon, label, loading, tone, title, children }) {
  return (
    <div className="tcc-kpi" role="listitem" title={title}>
      <i className={`bi ${icon} tcc-kpi__icon${tone ? ` tcc-${tone}` : ''}`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${tone ? ` tcc-${tone}` : ''}`}>
        {loading ? <Skel w={40} h={16} /> : children}
      </span>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="dashboard-page-inset ez-canvas tcc-page orl-page">
      <VisuallyHidden>
        <h1>Research Library</h1>
      </VisuallyHidden>
      <p className="tcc-state" role="status">
        {children}
      </p>
    </div>
  );
}

/** Keep the view, search, filters and the open document in the page address. */
function writeAddress(state) {
  if (typeof window === 'undefined') return;
  const qs = addressQuery(state);
  const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    try {
      window.history.replaceState(window.history.state, '', next);
    } catch {
      /* The address could not be updated; the page itself is unaffected. */
    }
  }
}

function roleNote(viewer) {
  if (viewer.role === 'executive')
    return 'Executive: you review, publish any document, pin and mark exemplars.';
  if (viewer.role === 'portfolio_manager')
    return viewer.canApprove
      ? 'Portfolio manager: you review, publish, pin and mark exemplars.'
      : 'Portfolio manager: you review, pin and mark exemplars. Publishing others’ work needs the approval right.';
  return 'Analyst: you write, submit for review and publish your own work.';
}

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

function ExportMenu({ notes, disabled }) {
  if (disabled) {
    return (
      <button type="button" className="tcc-textbtn" disabled>
        <i className="bi bi-box-arrow-up" aria-hidden="true" />
        Export
      </button>
    );
  }
  const csv = () => {
    const blob = new Blob([toCsv(exportRows(notes))], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-library-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const print = () => {
    const rows = exportRows(notes);
    const heads = rows.length ? Object.keys(rows[0]) : [];
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(
      `<!doctype html><title>Research library</title>` +
        `<style>body{font-family:sans-serif;padding:24px}h1{font-size:18px}` +
        `table{border-collapse:collapse;width:100%;font-size:11px}` +
        `th,td{border-bottom:1px solid silver;padding:5px 6px;text-align:left}</style>` +
        `<h1>Research library: ${esc(fmtDate(new Date().toISOString()))}</h1>` +
        `<table><thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>` +
        rows.map((r) => `<tr>${heads.map((h) => `<td>${esc(r[h])}</td>`).join('')}</tr>`).join('') +
        `</tbody></table>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };
  return (
    <Dropdown
      align="right"
      className="orl-export"
      trigger={
        <span className="tcc-textbtn">
          <i className="bi bi-box-arrow-up" aria-hidden="true" />
          Export
        </span>
      }
    >
      <MenuItem icon="bi-file-earmark-spreadsheet" onClick={csv}>
        Download CSV of the list
      </MenuItem>
      <MenuItem icon="bi-printer" onClick={print}>
        Print or save the list as PDF
      </MenuItem>
    </Dropdown>
  );
}

export function ResearchLibraryPage({ initialData = null, sampleViewer = false, initialAddress }) {
  const { isOrgUser, isLoading, orgRole } = useOrg();
  const enabled = Boolean(initialData) || Boolean(isOrgUser && !isLoading);
  const start = initialAddress || { view: 'library', q: '', filters: emptyFilters() };

  const [view, setView] = useState(start.view || 'library');
  const [q, setQ] = useState(start.q || '');
  const [debouncedQ, setDebouncedQ] = useState(start.q || '');
  const [filters, setFilters] = useState(start.filters || emptyFilters());
  const [open, setOpen] = useState(() => (start.open ? { id: start.open, tab: null } : null));
  const [symbol, setSymbol] = useState(start.symbol || null);
  const [chain, setChain] = useState(start.chain || null);
  const [editor, setEditor] = useState(() => (start.compose ? { note: null } : null)); // { note } while open
  const [handoff, setHandoff] = useState(null); // { ticker } while open
  const [notice, setNotice] = useState(null);
  const [setSum, setSetSum] = useState(null);
  const [autoSummary, setAutoSummary] = useState(false);
  const [lineageVersion, setLineageVersion] = useState(0);
  const [now] = useState(() => Date.now());
  const initialKey = useMemo(() => searchQuery(start.q || '', start.filters || emptyFilters()), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const data = useResearchData({
    enabled,
    initialData,
    sampleViewer,
    q: debouncedQ,
    filters,
    initialKey,
  });
  const { library, lineage, sonar, sampleActive } = data;

  useEffect(() => {
    writeAddress({ view, q: debouncedQ, filters, open: open?.id, symbol, chain });
  }, [view, debouncedQ, filters, open?.id, symbol, chain]);

  /* A new search or filter set drops the previous set summary. */
  useEffect(() => setSetSum(null), [debouncedQ, filters, sampleActive]);

  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(t);
  }, []);

  /* Switching between sample and council data starts the page over: a sample
     row does not exist in the council's records, and the other way round. */
  const toggleSample = () => {
    setNotice(null);
    setEditor(null);
    setHandoff(null);
    setOpen(null);
    setChain(null);
    setSymbol(null);
    data.setShowSample((v) => !v);
  };

  const lib = library.data;
  const viewer = useMemo(
    () =>
      lib?.viewer || {
        role: orgRole || null,
        canManage: isManagerRole(orgRole),
        canApprove: false,
        userId: null,
      },
    [lib, orgRole],
  );
  const isManager = isManagerRole(viewer.role) || Boolean(viewer.canManage);
  const notes = useMemo(() => lib?.notes || [], [lib]);
  const knownTickers = useMemo(() => Object.keys(lib?.facets?.ticker || {}).sort(), [lib]);
  const quickTicker = useMemo(() => quickDossierTicker(notes, filters), [notes, filters]);

  const openDoc = useCallback((id, tab = null) => setOpen({ id, tab }), []);
  const openTicker = useCallback((t) => {
    setOpen(null);
    setSymbol(t);
    setView('ticker');
  }, []);
  const openChain = useCallback((t) => {
    setChain(t);
    setView('lineage');
  }, []);
  const newNote = useCallback(() => setEditor({ note: null }), []);
  const clearAll = useCallback(() => {
    setQ('');
    setDebouncedQ('');
    setFilters(emptyFilters());
  }, []);

  const runSetSummary = async () => {
    if (sampleActive) {
      setSetSum({
        status: 'error',
        text: 'Sample content: summaries are only written for council documents.',
      });
      return;
    }
    setSetSum({ status: 'loading' });
    const out = await data.summarize({
      ids: notes.map((n) => n.id),
      label: debouncedQ || 'current view',
    });
    setSetSum(
      out.ok
        ? { status: 'ready', text: out.summary }
        : { status: 'error', text: 'The assistant could not write a summary.', retry: true },
    );
  };

  if (!initialData && isLoading) {
    return (
      <Notice>
        {slow ? (
          <>
            <span>The Research Library is taking longer than expected to load.</span>
            <button type="button" className="tcc-btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </>
        ) : (
          <span>Loading the Research Library</span>
        )}
      </Notice>
    );
  }
  if ((!initialData && !isOrgUser) || library.status === 'forbidden') {
    return (
      <Notice>
        <span>This page is for organizational members only.</span>
        <Link href="/home" className="tcc-link">
          Go to home <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </Notice>
    );
  }

  const loading = library.status === 'loading';
  const failed = library.status === 'error';
  const sum = lib?.summary || {};
  const num = (v) => (failed || v == null ? NA : String(v));
  const staleCount =
    lineage.status === 'ready' ? staleTickers(lineage.data?.tickers, now).length : null;
  const filtered = Boolean(debouncedQ) || hasFilters(filters);

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page orl-page">
      <VisuallyHidden>
        <h1>Research Library</h1>
      </VisuallyHidden>

      {/* Row 1: the five figures and the page actions */}
      <div className="tcc-top orl-top">
        <div className="tcc-kpis" aria-busy={loading || undefined}>
          <div className="tcc-kpistrip orl-kpis" role="list" aria-label="Library figures">
            <Kpi
              icon="bi-journal-check"
              label="Published"
              loading={loading}
              tone={failed ? 'na' : undefined}
              title="Published documents you can read"
            >
              {num(sum.published)}
            </Kpi>
            <Kpi
              icon="bi-hourglass-split"
              label="Under review"
              loading={loading}
              tone={failed ? 'na' : sum.underReview > 0 ? 'warn' : undefined}
              title="Documents submitted for review"
            >
              {num(sum.underReview)}
            </Kpi>
            <Kpi
              icon="bi-pencil-square"
              label="My drafts"
              loading={loading}
              tone={failed ? 'na' : undefined}
              title="Your own drafts"
            >
              {num(sum.myDrafts)}
            </Kpi>
            <Kpi
              icon="bi-exclamation-octagon"
              label="Open review blocks"
              loading={loading}
              tone={failed ? 'na' : sum.openBlocks > 0 ? 'warn' : undefined}
              title="Unresolved publish-blocking comments on drafts and documents under review"
            >
              {num(sum.openBlocks)}
            </Kpi>
            <Kpi
              icon="bi-clock-history"
              label="Stale tickers"
              loading={lineage.status === 'loading'}
              tone={staleCount == null ? 'na' : staleCount > 0 ? 'warn' : undefined}
              title="Covered tickers with no document in 90 days"
            >
              {staleCount == null ? NA : String(staleCount)}
            </Kpi>
          </div>
        </div>

        <div className="tcc-actions orl-actions">
          {(sampleActive || data.sampleAvailable) && (
            <div className="tcc-actions__context">
              {sampleActive && <span className="tcc-sample">Sample content</span>}
              {data.sampleAvailable && (
                <button type="button" className="tcc-textbtn" onClick={toggleSample}>
                  {sampleActive ? 'Show council data' : 'Show sample content'}
                </button>
              )}
            </div>
          )}
          <ExportMenu notes={notes} disabled={loading || failed || notes.length === 0} />
          <button type="button" className="tcc-btn" onClick={newNote}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            New note
          </button>
        </div>
      </div>

      <ActionMessage msg={notice} onDismiss={() => setNotice(null)} />

      {/* Row 2: the three views */}
      <div className="orl-tabsrow">
        <div className="tcc-toggles orl-tabs" role="tablist" aria-label="Library views">
          {[
            ['library', 'Library', 'bi-collection'],
            ['ticker', 'Ticker', 'bi-graph-up'],
            ['lineage', 'Lineage', 'bi-diagram-2'],
          ].map(([key, label, icon]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              className={`tcc-toggle orl-tab${view === key ? ' is-on' : ''}`}
              onClick={() => setView(key)}
            >
              <i className={`bi ${icon}`} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        {viewer.role && <p className="orl-rolenote">{roleNote(viewer)}</p>}
      </div>

      {view === 'library' && (
        <>
          <SearchLine value={q} onChange={setQ} />
          <FilterRow
            facets={lib?.facets}
            authorNames={lib?.authorNames}
            filters={filters}
            onFilters={setFilters}
            semantic={lib?.semantic}
          />
          <div className="orl-body">
            <div className="orl-main">
              <ReviewShelf
                status={library.status}
                shelves={lib?.shelves}
                isManager={isManager}
                onOpen={openDoc}
                onRetry={() => data.retryLibrary()}
                onNew={newNote}
              />
              <LibraryTable
                status={library.status}
                notes={notes}
                query={debouncedQ}
                filtered={filtered}
                truncated={Boolean(lib?.truncated)}
                onOpen={openDoc}
                onRetry={() => data.retryLibrary()}
                onNew={newNote}
                onClear={clearAll}
                summary={
                  library.status === 'ready' ? (
                    <SetSummary
                      state={setSum}
                      count={notes.length}
                      onRun={runSetSummary}
                      onClose={() => setSetSum(null)}
                    />
                  ) : null
                }
              />
              <Exemplars
                status={library.status}
                rows={lib?.shelves?.exemplars || []}
                canMark={isManager}
                onOpen={openDoc}
                onRetry={() => data.retryLibrary()}
              />
            </div>
            <span className="tcc-vrule orl-vrule" aria-hidden="true" />
            <SideColumn
              sonar={sonar}
              lineage={lineage}
              now={now}
              canRecord={isManager}
              quickTicker={library.status === 'ready' ? quickTicker : null}
              libraryStatus={library.status}
              loadDossier={data.loadDossier}
              sampleKey={`${sampleActive ? 's' : 'l'}${lineageVersion}`}
              onRetrySonar={data.retrySonar}
              onRetryLineage={data.retryLineage}
              onRecord={() => setHandoff({ ticker: quickTicker || '' })}
              onOpenChain={openChain}
              onOpenTicker={openTicker}
              onSummarizeTicker={(t) => {
                setAutoSummary(true);
                openTicker(t);
              }}
            />
          </div>
        </>
      )}

      {view === 'ticker' && (
        <TickerView
          key={sampleActive ? 's' : 'l'}
          symbol={symbol}
          knownTickers={knownTickers}
          loadDossier={data.loadDossier}
          summarize={data.summarize}
          sample={sampleActive}
          autoSummary={autoSummary}
          onAutoSummaryDone={() => setAutoSummary(false)}
          onSymbol={setSymbol}
          onOpen={openDoc}
        />
      )}

      {view === 'lineage' && (
        <LineageView
          lineage={lineage}
          onRetry={data.retryLineage}
          chain={chain}
          onChain={setChain}
          loadChain={data.loadChain}
          canRecord={isManager}
          onRecord={(t) => setHandoff({ ticker: t || '' })}
          onOpen={openDoc}
          version={lineageVersion}
        />
      )}

      {open && library.status !== 'loading' && (
        <DocumentPanel
          key={`${open.id}:${sampleActive ? 's' : 'l'}`}
          noteId={open.id}
          initialTab={open.tab}
          viewer={viewer}
          sample={sampleActive}
          data={data}
          onClose={() => setOpen(null)}
          onEdit={(note) => {
            setOpen(null);
            setEditor({ note });
          }}
          onOpenTicker={openTicker}
          onNotice={setNotice}
        />
      )}

      {editor && (
        <EditorDialog
          note={editor.note}
          viewer={viewer}
          sample={sampleActive}
          knownTickers={knownTickers}
          data={data}
          onClose={() => setEditor(null)}
          onSaved={({ id, text }) => {
            setEditor(null);
            setNotice({
              tone: 'ok',
              text: sampleActive ? `${text} Sample content: it is not saved.` : text,
            });
            if (id) setOpen({ id, tab: null });
          }}
        />
      )}

      {handoff && (
        <HandoffDialog
          ticker={handoff.ticker}
          notes={notes}
          knownTickers={knownTickers}
          data={data}
          sample={sampleActive}
          onClose={() => setHandoff(null)}
          onDone={(text) => {
            setHandoff(null);
            setLineageVersion((v) => v + 1);
            setNotice({ tone: 'ok', text });
          }}
        />
      )}
    </div>
  );
}
