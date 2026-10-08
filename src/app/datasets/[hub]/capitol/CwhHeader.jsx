'use client';

/**
 * The hub header: title and the EzanaQL bar on the left, the result
 * card on the right. The bar opens with the hub's seed query already run, so
 * the card is never empty. Tickers open the company card; members open the
 * drawer. Save, CSV, JSON and Watchlist belong to an account.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EzanaQLBar from '@/components/ezanaql/EzanaQLBar';
import { addTickersToWatchlist, WATCHLIST_BATCH } from '@/components/ezanaql/watchlist-add';
import { HUB_QUERIES } from '@/lib/datasets/hub-queries';
import { useCwh } from './CwhProvider';
import { DASH, money, monthDay, partyClass, range } from './cwh-format';

const SEED = HUB_QUERIES.capitolHubSeed();
const SEED_LABEL = 'Members who bought stock in the last 90 days';

/* "Open full table": the dataset page for the dataset the query reads. */
const FULL_TABLE = {
  'capitol.congress_trades': '/datasets/politician-tracker',
  'capitol.holdings': '/datasets/politician-tracker',
  'house.trades': '/datasets/politician-tracker',
  'house.filings': '/datasets/politician-tracker',
  'gov.contracts': '/datasets/government/contracts',
  'capitol.lobbying': '/datasets/government/lobbying',
  'capitol.campaign_finance': '/datasets/campaignfinancerecords',
  'capitol.committee_seats': '/datasets/committees',
};
const fromOf = (q) => (/\bFROM\s+([a-z_]+\.[a-z_0-9]+)/i.exec(q || '') || [])[1]?.toLowerCase();

/* The first line of a query, when nothing better titles its result. */
const firstLine = (q) =>
  String(q || '')
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean)
    ?.slice(0, 120) || 'EzanaQL query';

/* A joined result names its columns by dataset (congress_trades.ticker). */
const field = (row, k) => row[k] ?? row[`congress_trades.${k}`];
const PROMPTS = [
  'Top 10 contractors by award value this fiscal year',
  'Members who raised the most money this cycle',
  'Who holds LMT?',
];

/* Columns the card hides: ids that only route a click. */
const HIDDEN = new Set(['bioguide_id', 'congress_trades.bioguide_id']);
const LABEL = {
  politician: 'Member',
  transaction_type: 'Type',
  transaction_date: 'Traded',
  amount_low: 'Amount, disclosed',
};

const isDateKey = (k) => /(_date|_on|date)$/.test(k) || k === 'last_trade';
const isMoneyKey = (k) => /(amount|value|receipts|spend|award|cash)/.test(k);

function Cell({ k, row, onTicker, onMember }) {
  const v = row[k];
  const base = k.replace(/^congress_trades\./, '');
  if (base === 'ticker' && v) {
    return (
      <button
        type="button"
        className="cwh-rc-tk"
        onClick={() => onTicker(row)}
        aria-label={`Open ${v} company card`}
      >
        {String(v).toUpperCase()}
      </button>
    );
  }
  if (base === 'politician' && v) {
    const bio = field(row, 'bioguide_id');
    return bio ? (
      <button type="button" className="cwh-rc-who" onClick={() => onMember(bio)}>
        {v}
      </button>
    ) : (
      <span className="cwh-rc-who">{v}</span>
    );
  }
  if (k === 'party')
    return v ? <span className={`cwh-party ${partyClass(v)}`}>{v}</span> : <span>{DASH}</span>;
  if (k === 'transaction_type') {
    const sell = /^s/i.test(String(v || ''));
    return (
      <span className={`cwh-side ${sell ? 'is-sell' : 'is-buy'}`}>{sell ? 'SELL' : 'BUY'}</span>
    );
  }
  if (k === 'amount_low')
    return <span className="cwh-mono">{range(row.amount_low, row.amount_high)}</span>;
  if (v == null || v === '') return <span className="cwh-faint">{DASH}</span>;
  if (isDateKey(k)) return <span className="cwh-mono">{monthDay(v)}</span>;
  if (typeof v === 'number' && isMoneyKey(k)) return <span className="cwh-mono">{money(v)}</span>;
  if (typeof v === 'number') return <span className="cwh-mono">{v.toLocaleString('en-US')}</span>;
  return <span>{String(v)}</span>;
}

function ResultCard({ state, result, query, question, ms }) {
  const { openCompany, openMember, gate, isAuthenticated, authLoading, bumpSaved } = useCwh();
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState({});
  const [note, setNote] = useState('');
  /* A new result can be saved and added afresh. */
  useEffect(() => {
    setDone({});
    setNote('');
  }, [result]);
  const guest = !authLoading && !isAuthenticated;
  const rows = useMemo(() => result?.rows || [], [result]);
  const keys = (result?.keys || result?.columns || []).filter(
    (k) => !HIDDEN.has(k) && k !== 'amount_high',
  );
  const tickers = useMemo(() => {
    const s = new Set();
    for (const r of rows) {
      const t = String(field(r, 'ticker') || '')
        .trim()
        .toUpperCase();
      if (/^[A-Z.-]{1,10}$/.test(t)) s.add(t);
      if (s.size >= 25) break;
    }
    return [...s];
  }, [rows]);

  const needs = (action) => {
    if (authLoading) return true;
    if (!isAuthenticated) {
      gate(action);
      return true;
    }
    return false;
  };

  const act = async (kind) => {
    if (!query || busy) return;
    if (needs(kind === 'watch' ? 'watchlist' : kind)) return;
    setBusy(kind);
    setNote('');
    try {
      if (kind === 'csv' || kind === 'json') {
        const res = await fetch('/api/ezanaql/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, dimension: 'capitol', format: kind }),
        });
        if (res.status === 401) return gate(kind);
        if (!res.ok) throw new Error('export');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `capitol-watch.${kind}`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (kind === 'save') {
        const res = await fetch('/api/ezanaql/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: question.slice(0, 120),
            query,
            dimension: 'capitol',
            rowCount: rows.length,
          }),
        });
        if (res.status === 401) return gate('save');
        const d = await res.json().catch(() => ({}));
        if (!res.ok || !d.ok) throw new Error(d.error || 'save');
        setDone((m) => ({ ...m, save: true }));
        setNote('Saved to your reports for this hub');
        bumpSaved();
      } else if (kind === 'watch') {
        if (!tickers.length) return;
        const r = await addTickersToWatchlist(tickers);
        if (r === 'auth') return gate('watchlist');
        setDone((m) => ({ ...m, watch: true }));
        setNote(
          tickers.length > WATCHLIST_BATCH
            ? `First ${WATCHLIST_BATCH} tickers added to your watchlist`
            : `${tickers.length} tickers added to your watchlist`,
        );
      }
    } catch (e) {
      setNote(
        e?.message && !['export', 'save'].includes(e.message)
          ? e.message
          : 'That did not go through. Try again.',
      );
    } finally {
      setBusy(null);
    }
  };

  const lock = guest ? <i className="bi bi-lock cwh-lock" aria-hidden="true" /> : null;
  const fullHref = FULL_TABLE[fromOf(query)] || '/datasets/politician-tracker';

  return (
    <section className="cwh-card cwh-rc" aria-labelledby="cwh-rc-q" aria-busy={state === 'running'}>
      <div className="cwh-rc-head">
        <i className="bi bi-stars cwh-rc-spark" aria-hidden="true" />
        <span className="cwh-label cwh-rc-label">Result</span>
        <h2 className="cwh-rc-q" id="cwh-rc-q">
          {question}
        </h2>
        <span className="cwh-rc-meta">
          {state === 'done' && result
            ? `${rows.length} ROWS${ms != null ? ` · ${(ms / 1000).toFixed(1)}S` : ''}`
            : state === 'running'
              ? 'RUNNING'
              : ''}
        </span>
      </div>
      <div className="cwh-rc-body" tabIndex={0} aria-label="Query results">
        {state === 'running' || state === 'idle' ? (
          <div className="cwh-rc-skel" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="cwh-skel" />
            ))}
          </div>
        ) : state === 'error' ? (
          <p className="cwh-empty">This query could not run just now. Check it or try again.</p>
        ) : !rows.length ? (
          <p className="cwh-empty">No rows match this query.</p>
        ) : (
          <table className="cwh-rc-table">
            <thead>
              <tr>
                {keys.map((k) => (
                  <th key={k} scope="col" className={`is-${k}`}>
                    {(LABEL[k] || k.replace(/_/g, ' ')).toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r, i) => (
                <tr key={i}>
                  {keys.map((k) => (
                    <td key={k} className={`is-${k}`}>
                      <Cell
                        k={k}
                        row={r}
                        onTicker={(row) =>
                          openCompany({
                            ticker: field(row, 'ticker'),
                            name: row.parent || row.recipient || row.asset_name || null,
                            since: result?.window?.since || null,
                          })
                        }
                        onMember={openMember}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="cwh-rc-foot">
        <p className="cwh-rc-hint">
          Select a ticker for its company card: federal contracts and which members hold it.
        </p>
        <div className="cwh-rc-acts">
          <button
            type="button"
            className="cwh-btn"
            onClick={() => act('save')}
            disabled={!query || busy === 'save' || done.save}
          >
            {done.save ? 'Saved' : 'Save'}
            {lock}
          </button>
          <button
            type="button"
            className="cwh-btn"
            onClick={() => act('csv')}
            disabled={!query || busy === 'csv'}
          >
            CSV{lock}
          </button>
          <button
            type="button"
            className="cwh-btn"
            onClick={() => act('json')}
            disabled={!query || busy === 'json'}
          >
            JSON{lock}
          </button>
          <button
            type="button"
            className="cwh-btn"
            onClick={() => act('watch')}
            disabled={!tickers.length || busy === 'watch' || done.watch}
          >
            {done.watch ? 'On watchlist' : 'Watchlist'}
            {lock}
          </button>
          <a className="cwh-btn cwh-btn--ink" href={fullHref}>
            Open full table <i className="bi bi-arrow-right" aria-hidden="true" />
          </a>
        </div>
        <p className="cwh-sr" role="status" aria-live="polite">
          {note}
        </p>
        {note ? <p className="cwh-rc-note">{note}</p> : null}
      </div>
    </section>
  );
}

export default function CwhHeader({ intro }) {
  const { runRequest, savedVersion } = useCwh();
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);
  const [query, setQuery] = useState(SEED);
  const [question, setQuestion] = useState(SEED_LABEL);
  const [ms, setMs] = useState(null);
  const started = useRef(0);

  const onRunState = useCallback((s) => {
    if (s === 'running') {
      started.current = performance.now();
      setState('running');
    } else if (s === 'error') setState('error');
  }, []);

  const onResult = useCallback((r, meta) => {
    setMs(Math.round(performance.now() - started.current));
    setResult(r);
    setState('done');
    const q = meta?.query || SEED;
    setQuery(q);
    /* The prompt, the row's title, the seed's question, or the query itself. */
    setQuestion(meta?.label || (q.trim() === SEED.trim() ? SEED_LABEL : firstLine(q)));
  }, []);

  return (
    <header className="cwh-head">
      <div className="cwh-head-left">
        {intro}
        <div id="hub-ezanaql" className="cwh-query">
          <EzanaQLBar
            dimension="capitol"
            seedQuery={SEED}
            examplePrompts={PROMPTS}
            runRequest={runRequest}
            onResult={onResult}
            onRunState={onRunState}
            queryBlock
            autoRun
            runOnGenerate
            savedVersion={savedVersion}
          />
        </div>
      </div>
      <ResultCard state={state} result={result} query={query} question={question} ms={ms} />
    </header>
  );
}
