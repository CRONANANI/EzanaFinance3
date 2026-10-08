'use client';

/**
 * The client half of a dimension hub: the EzanaQL bar scoped to the hub's
 * dimension, and the per-row actions on its linkage cards. "Query this" on a
 * row reaches the bar through HubQueryProvider: it fills the editor with the
 * row's query and runs it.
 */
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/components/AuthProvider';
import EzanaQLBar, { AccountGate } from '@/components/ezanaql/EzanaQLBar';
import CompanyCard from '@/components/ezanaql/CompanyCard';
import { addTickersToWatchlist } from '@/components/ezanaql/watchlist-add';
import ShareButton from '@/components/native/ShareButton';

const HubQuery = createContext({ runRequest: null, requestRun: () => {} });

/** The hub's "Query this" channel: { runRequest, requestRun(query, label) }. */
export const useHubQuery = () => useContext(HubQuery);

export function HubQueryProvider({ children }) {
  const [runRequest, setRunRequest] = useState(null);
  const seq = useRef(0);
  /* label: what the run answers (a row's title), for a page that titles results. */
  const requestRun = useCallback((query, label = null) => {
    seq.current += 1;
    setRunRequest({ id: seq.current, query, label });
    const bar = document.getElementById('hub-ezanaql');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    bar?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  }, []);
  return <HubQuery.Provider value={{ runRequest, requestRun }}>{children}</HubQuery.Provider>;
}

export function HubBar({ dimension, seedQuery, examplePrompts }) {
  const { runRequest } = useContext(HubQuery);
  const [company, setCompany] = useState(null);
  /* Capitol result rows with a ticker open the company card (contracts and
     member holders), as they did on the contracts page. */
  const companyRows = dimension === 'capitol';
  return (
    <div id="hub-ezanaql" className="hub-bar">
      <EzanaQLBar
        dimension={dimension}
        seedQuery={seedQuery}
        examplePrompts={examplePrompts}
        runRequest={runRequest}
        onRowClick={
          companyRows
            ? (row, ctx) =>
                setCompany({
                  ticker: String(row.ticker).toUpperCase(),
                  name: row.parent || row.recipient || row.asset_name || null,
                  since: ctx.window?.since || null,
                })
            : undefined
        }
      />
      {company ? (
        <CompanyCard
          ticker={company.ticker}
          name={company.name}
          since={company.since}
          onClose={() => setCompany(null)}
        />
      ) : null}
    </div>
  );
}

/* The account prompt, centred over the page on an opaque card with a scrim. */
export function GateModal({ action, onClose }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  if (!mounted) return null;
  return createPortal(
    <div className="hub-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="hub-modal-card">
        <AccountGate action={action} onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}

async function saveRowToResearch({ query, dimension, label, ticker }) {
  const res = await fetch('/api/ezanaql/saved', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: [label, ticker].filter(Boolean).join(' · ').slice(0, 120),
      query,
      dimension,
    }),
  });
  if (res.status === 401) return 'auth';
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.ok) throw new Error(d.error || 'save failed');
  return 'done';
}

/**
 * Watchlist / Save (account only), Query this and Share, on one linkage row.
 * Watchlist / Save opens a small menu: add the ticker to the watchlist, or
 * keep the row's query in the reader's saved research for this hub.
 */
export function RowActions({ ticker, query, label, dimension = null, shareUrl = null }) {
  const { requestRun } = useContext(HubQuery);
  const { isAuthenticated, loading } = useAuth() || {};
  const [open, setOpen] = useState(false);
  const [watch, setWatch] = useState('idle'); // idle | busy | done | error
  const [save, setSave] = useState('idle');
  const [note, setNote] = useState('');
  const [gate, setGate] = useState(false);
  const closeGate = useCallback(() => setGate(false), []);
  const wrap = useRef(null);
  const menuId = useId();
  const canSave = Boolean(query && dimension);
  const hasMenu = Boolean(ticker || canSave);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const needsAccount = () => {
    if (loading) return true;
    if (!isAuthenticated) {
      setOpen(false);
      setGate(true);
      return true;
    }
    return false;
  };

  const addToWatchlist = async () => {
    if (needsAccount() || watch === 'busy' || watch === 'done') return;
    setWatch('busy');
    try {
      const r = await addTickersToWatchlist([ticker]);
      if (r === 'auth') {
        setWatch('idle');
        setGate(true);
      } else {
        setWatch('done');
        setNote(`${ticker} added to your watchlist`);
      }
    } catch {
      setWatch('error');
      setNote('That ticker could not be added. Try again.');
    }
  };

  const saveToResearch = async () => {
    if (needsAccount() || save === 'busy' || save === 'done') return;
    setSave('busy');
    try {
      const r = await saveRowToResearch({ query, dimension, label, ticker });
      if (r === 'auth') {
        setSave('idle');
        setGate(true);
      } else {
        setSave('done');
        setNote('Saved to your research');
      }
    } catch (e) {
      setSave('error');
      setNote(
        e.message && e.message !== 'save failed'
          ? e.message
          : 'That could not be saved. Try again.',
      );
    }
  };

  const doneAll = (!ticker || watch === 'done') && (!canSave || save === 'done');

  return (
    <div className="hub-row-acts" ref={wrap}>
      {hasMenu ? (
        <div className="hub-save">
          <button
            type="button"
            className="hub-act"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            data-haptic
          >
            <i className={`bi ${doneAll ? 'bi-check2' : 'bi-bookmark-plus'}`} aria-hidden="true" />
            <span>Watchlist / Save</span>
            {!loading && !isAuthenticated ? (
              <i className="bi bi-lock-fill hub-lock" aria-hidden="true" />
            ) : (
              <i className="bi bi-chevron-down hub-caret" aria-hidden="true" />
            )}
          </button>
          {open ? (
            <ul className="hub-menu" id={menuId} role="menu" aria-label={`Save ${label}`}>
              {ticker ? (
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="hub-menu-item"
                    onClick={addToWatchlist}
                    disabled={watch === 'busy' || watch === 'done'}
                  >
                    <i
                      className={`bi ${watch === 'done' ? 'bi-check2' : 'bi-bookmark-plus'}`}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>
                        {watch === 'done'
                          ? 'On your watchlist'
                          : watch === 'busy'
                            ? 'Adding'
                            : `Add ${ticker} to watchlist`}
                      </strong>
                      <small>Track the stock on your dashboard</small>
                    </span>
                  </button>
                </li>
              ) : null}
              {canSave ? (
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="hub-menu-item"
                    onClick={saveToResearch}
                    disabled={save === 'busy' || save === 'done'}
                  >
                    <i
                      className={`bi ${save === 'done' ? 'bi-check2' : 'bi-archive'}`}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>
                        {save === 'done'
                          ? 'Saved to your research'
                          : save === 'busy'
                            ? 'Saving'
                            : 'Save to my research'}
                      </strong>
                      <small>Keep this signal in your saved reports for this hub</small>
                    </span>
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}
      {query ? (
        <button
          type="button"
          className="hub-act"
          onClick={() => requestRun(query, label)}
          aria-label={`Query this: ${label}`}
        >
          <i className="bi bi-terminal" aria-hidden="true" />
          <span>Query this</span>
        </button>
      ) : null}
      <ShareButton className="hub-act" title={label} url={shareUrl || undefined} />
      <p className="hub-sr" role="status" aria-live="polite">
        {note}
      </p>
      {gate ? <GateModal action="hub-save" onClose={closeGate} /> : null}
    </div>
  );
}
