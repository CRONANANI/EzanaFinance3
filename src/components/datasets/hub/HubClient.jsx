'use client';

/**
 * The client half of a dimension hub: the EzanaQL bar scoped to the hub's
 * dimension, and the per-row actions on its linkage cards. "Query this" on a
 * row reaches the bar through HubQueryProvider: it fills the editor with the
 * row's query and runs it.
 */
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import EzanaQLBar, { AccountGate } from '@/components/ezanaql/EzanaQLBar';
import CompanyCard from '@/components/ezanaql/CompanyCard';
import { addTickersToWatchlist } from '@/components/ezanaql/watchlist-add';

const HubQuery = createContext({ runRequest: null, requestRun: () => {} });

export function HubQueryProvider({ children }) {
  const [runRequest, setRunRequest] = useState(null);
  const seq = useRef(0);
  const requestRun = useCallback((query) => {
    seq.current += 1;
    setRunRequest({ id: seq.current, query });
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

/** Watchlist (ticker rows, account only) and Query this, on one linkage row. */
export function RowActions({ ticker, query, label }) {
  const { requestRun } = useContext(HubQuery);
  const { isAuthenticated, loading } = useAuth() || {};
  const [state, setState] = useState('idle'); // idle | busy | done | error
  const [gate, setGate] = useState(false);
  const closeGate = useCallback(() => setGate(false), []);

  const addToWatchlist = async () => {
    if (loading || state === 'busy' || state === 'done') return;
    if (!isAuthenticated) {
      setGate(true);
      return;
    }
    setState('busy');
    try {
      const r = await addTickersToWatchlist([ticker]);
      if (r === 'auth') {
        setGate(true);
        setState('idle');
      } else setState('done');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="hub-row-acts">
      {ticker ? (
        <button
          type="button"
          className="hub-act"
          onClick={addToWatchlist}
          disabled={state === 'busy' || state === 'done'}
          aria-label={`Add ${ticker} to watchlist`}
        >
          <i
            className={`bi ${state === 'done' ? 'bi-check2' : 'bi-bookmark-plus'}`}
            aria-hidden="true"
          />
          <span>
            {state === 'done'
              ? 'Added'
              : state === 'busy'
                ? 'Adding'
                : state === 'error'
                  ? 'Try again'
                  : 'Watchlist'}
          </span>
          {!loading && !isAuthenticated ? (
            <i className="bi bi-lock-fill hub-lock" aria-hidden="true" />
          ) : null}
        </button>
      ) : null}
      {query ? (
        <button
          type="button"
          className="hub-act"
          onClick={() => requestRun(query)}
          aria-label={`Query this: ${label}`}
        >
          <i className="bi bi-terminal" aria-hidden="true" />
          <span>Query this</span>
        </button>
      ) : null}
      {gate ? (
        <div className="hub-gate">
          <AccountGate action="watchlist" onClose={closeGate} />
        </div>
      ) : null}
    </div>
  );
}
