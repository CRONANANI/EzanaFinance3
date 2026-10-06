'use client';

/**
 * The one EzanaQL query bar. One implementation of generate, run and export
 * for the whole app.
 *
 * Two builders existed before this. The disclosures pages had the design
 * (a light pill and one grey mono line) with nothing behind it: the input had
 * no state and Generate, Edit, Run, CSV and JSON had no handlers. It was a
 * picture of a builder. The contracts page had the behaviour, in an older
 * teaser-plus-dark-panel shape. This is the first with both.
 *
 * It never becomes a dark panel. Edit, results and every message expand in
 * place on the same white ground, so the data stays the focal point.
 *
 * Access: generating, running and viewing results are open to everyone.
 * CSV / JSON export, adding result tickers to the watchlist, saving a report
 * and the Saved list need an account; a guest who tries one gets an in-place
 * gate pointing to the waitlist or sign in. The export route enforces its
 * own 401; the saved-reports routes are session-only.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { columnAlign, formatCell } from '@/lib/ezanaql/grid-format';
import { DIMENSION_LABELS } from '@/lib/ezanaql/catalog';
import { addTickersToWatchlist as addToWatchlist } from './watchlist-add';
import './ezanaql-bar.css';

const MAX_EDITOR_LINES = 8;
/* Phones get a taller editor: a query is several clauses long, and typing
   into a three-line box under a keyboard is guesswork. Mirrors the 760px
   breakpoint in ezanaql-bar.css. */
const MOBILE_QUERY = '(max-width: 760px)';
const MOBILE_EDITOR_LINES = 10;

/* Every keyword the parser (src/lib/ezanaql/parser.js) knows. */
const EQB_KW =
  /^(SELECT|FROM|JOIN|ON|WHERE|AND|OR|NOT|IN|IS|NULL|TRUE|FALSE|AS|ORDER|GROUP|BY|HAVING|ASC|DESC|LIMIT|OFFSET|BETWEEN|LIKE|CONTAINS|STARTS|ENDS|WITH|DISTINCT|CASE|WHEN|THEN|ELSE|END|LAST|YTD)$/i;

/* Display-only highlighting. The query string itself is never altered, so
   Run and Export send exactly what the visitor sees. */
function QueryTokens({ code }) {
  const parts = code.split(/('(?:[^']|'')*'|\b\d+(?:\.\d+)?\b|\s+|[A-Za-z_.]+)/).filter(Boolean);
  return parts.map((p, i) => {
    let cls = null;
    if (p.startsWith("'")) cls = 'eqb-tok-str';
    else if (/^\d/.test(p)) cls = 'eqb-tok-num';
    else if (EQB_KW.test(p)) cls = 'eqb-tok-kw';
    return cls ? (
      <span key={i} className={cls}>
        {p}
      </span>
    ) : (
      p
    );
  });
}

const GATE_WHAT = {
  csv: 'export this report as CSV',
  json: 'export this report as JSON',
  watchlist: 'add these tickers to your watchlist',
  save: 'save this report to your research',
};

/* Explains why an account action did not happen, in place under the bar. */
export function AccountGate({ action, onClose }) {
  const ref = useRef(null);
  const [here, setHere] = useState('/datasets');
  useEffect(() => {
    setHere(`${window.location.pathname}${window.location.search}`);
    ref.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const r = encodeURIComponent(here);
  return (
    <div
      className="eqb-gate"
      role="dialog"
      aria-labelledby="eqb-gate-title"
      tabIndex={-1}
      ref={ref}
    >
      <span className="eqb-gate-ic" aria-hidden="true">
        <i className="bi bi-lock" />
      </span>
      <div className="eqb-gate-text">
        <p id="eqb-gate-title" className="eqb-gate-title">
          Create an account to {GATE_WHAT[action]}
        </p>
        <p className="eqb-gate-sub">
          Running reports stays free without one. Ezana is opening access in waves: join the
          waitlist and we will email you an invite.
        </p>
      </div>
      <div className="eqb-gate-actions">
        <a className="eqb-gate-btn eqb-gate-btn--primary" href={`/auth/signup?redirect=${r}`}>
          Join the waitlist
        </a>
        <a className="eqb-gate-btn" href={`/auth/signin?redirect=${r}`}>
          Sign in
        </a>
      </div>
      <button type="button" className="eqb-gate-x" onClick={onClose} aria-label="Dismiss">
        <i className="bi bi-x-lg" aria-hidden="true" />
      </button>
    </div>
  );
}

function relativeDate(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(t).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Lives on the dimension hubs only. Every call carries the hub's dimension and
 * the server refuses datasets outside it.
 *
 * @param {object} props
 * @param {string} props.dimension             dataset dimension id (capitol, titans, ...)
 * @param {string|null} [props.datasetScope]  catalog dataset to prefer when generating
 * @param {string[]} [props.examplePrompts]   example prompts shown as chips
 * @param {{ id: number, query: string }|null} [props.runRequest]  a new id fills the
 *   editor with `query` and runs it (the hub's "Query this")
 * @param {string} [props.seedQuery]           query the bar opens with
 * @param {(result: object) => void} [props.onResult]  take the result instead of rendering it
 * @param {'stack'|'split'} [props.layout]     'split': once a result is in, the bar
 *   widens to its container and the query sits left, the table right
 * @param {(row: object, ctx: { window: object|null, keys: string[] }) => void} [props.onRowClick]
 *   makes result rows clickable; the page decides what a row opens
 * @param {(row: object) => boolean} [props.rowClickable]  which rows (default: those with a ticker)
 */
export default function EzanaQLBar({
  dimension,
  datasetScope = null,
  examplePrompts = [],
  runRequest = null,
  seedQuery = '',
  onResult,
  layout = 'stack',
  onRowClick,
  rowClickable = (row) => row.ticker != null && row.ticker !== '',
}) {
  const [prompt, setPrompt] = useState('');
  const [focused, setFocused] = useState(false);
  const [code, setCode] = useState(seedQuery);
  /* Once the visitor edits by hand, the page's filters stop overwriting the
     query. Re-seeding over their edit would silently discard it. */
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [busy, setBusy] = useState(null); // 'gen' | 'run' | 'csv' | 'json'
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [result, setResult] = useState(null);
  const [mobile, setMobile] = useState(false);
  const promptRef = useRef(null);
  const editorRef = useRef(null);
  const { isAuthenticated, loading: authLoading } = useAuth() || {};
  const [gate, setGate] = useState(null); // null | 'csv' | 'json' | 'watchlist' | 'save'
  const [saved, setSaved] = useState(null); // list once loaded
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedState, setSavedState] = useState('idle'); // idle | busy | error
  const [saveState, setSaveState] = useState('idle'); // idle | busy | done | error
  const [watchState, setWatchState] = useState('idle'); // idle | busy | done | error
  /* An account action clicked before the session has resolved waits here,
     then runs (or opens the gate) once we know who this is. */
  const pendingRef = useRef(null);
  const actionsRef = useRef({});
  /* Lock icons only once we know the visitor is a guest. */
  const isGuest = !authLoading && !isAuthenticated;

  useEffect(() => {
    const mq = window.matchMedia?.(MOBILE_QUERY);
    if (!mq) return undefined;
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (dirty) return;
    setCode(seedQuery);
  }, [seedQuery, dirty]);

  useEffect(() => {
    if (!editing) return;
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    /* On a phone the keyboard takes half the screen; keep the editor and its
       Run button in view above it. */
    el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [editing]);

  const post = useCallback(async (path, body) => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res;
  }, []);

  const generate = useCallback(
    async (override) => {
      const text = typeof override === 'string' ? override : prompt;
      if (!text.trim() || busy) return;
      setBusy('gen');
      setError(null);
      setNote(null);
      try {
        const res = await post('/api/ezanaql/generate', {
          prompt: text,
          dimension,
          datasetScope,
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError(
            'Too many requests to the report model from this connection; try again in a minute.',
          );
        } else if (!data.ok) {
          setError(data.error || 'That request could not be turned into a query.');
        } else {
          /* The line animates to its new text rather than snapping, so it is
           visible that the query changed. */
          setSwapping(true);
          setDirty(true);
          setCode(data.query);
          window.setTimeout(() => setSwapping(false), 160);
          if (!data.valid && data.validationError) {
            setError(`The generated query needs a fix: ${data.validationError}`);
          }
        }
      } catch {
        setError('Could not reach the report model.');
      } finally {
        setBusy(null);
      }
    },
    [prompt, dimension, datasetScope, busy, post],
  );

  /* Generate, Run and viewing results are open to everyone. Exports, the
     watchlist and saved reports belong to an account. */
  const needsAccount = useCallback(
    (action) => {
      if (authLoading) {
        pendingRef.current = action;
        return true;
      }
      if (isAuthenticated) return false;
      setGate(action);
      return true;
    },
    [isAuthenticated, authLoading],
  );

  useEffect(() => {
    if (isAuthenticated) setGate(null);
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading || !pendingRef.current) return;
    const action = pendingRef.current;
    pendingRef.current = null;
    actionsRef.current[action]?.();
  }, [authLoading]);

  const runQuery = useCallback(
    async (q = code) => {
      if (!q.trim() || busy) return;
      setBusy('run');
      setError(null);
      setNote(null);
      setResult(null);
      setSaveState('idle');
      setWatchState('idle');
      try {
        const res = await post('/api/ezanaql/run', { query: q, dimension, format: 'table' });
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError('Too many queries from this connection just now; try again in a minute.');
          return;
        }
        if (!data.ok) {
          setError(data.error || 'That query did not run.');
          return;
        }
        /* Engine notes (a row cap hit, a JOIN that multiplied a sum) are part
           of the answer: shown with it, never swallowed. */
        if (Array.isArray(data.notes) && data.notes.length) setNote(data.notes.join(' '));
        if (typeof onResult === 'function') onResult(data.result);
        else setResult(data.result);
      } catch {
        setError('Could not reach the query engine.');
      } finally {
        setBusy(null);
      }
    },
    [code, busy, post, onResult, dimension],
  );
  const run = useCallback(() => runQuery(), [runQuery]);

  /* The hub's "Query this": a new request id fills the editor and runs. */
  const lastRunRequest = useRef(null);
  useEffect(() => {
    if (!runRequest || busy || runRequest.id === lastRunRequest.current) return;
    lastRunRequest.current = runRequest.id;
    setDirty(true);
    setCode(runRequest.query);
    runQuery(runRequest.query);
  }, [runRequest, runQuery, busy]);

  const exportAs = useCallback(
    async (format) => {
      if (!code.trim() || busy) return;
      if (needsAccount(format)) return;
      setBusy(format);
      setError(null);
      setNote(null);
      try {
        const res = await post('/api/ezanaql/export', { query: code, dimension, format });
        if (res.status === 401) {
          setGate(format);
          return;
        }
        if (res.status === 429) {
          setError('Too many exports from this connection just now; try again in a minute.');
          return;
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error || 'That export did not run.');
          return;
        }
        /* If the engine ever caps a guest export it says so in a header; the
           note is rendered only when one actually arrives, never assumed. */
        const capped = res.headers.get('X-Ezana-Row-Cap');
        if (capped) setNote(`This export was limited to ${capped} rows.`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ezanaql-report.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setError('That export did not run.');
      } finally {
        setBusy(null);
      }
    },
    [code, busy, post, needsAccount, dimension],
  );

  const onEditorKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(false);
    }
  };

  const rows = result?.rows || [];
  const columns = result?.columns || [];
  const keys = result?.keys || columns;
  const types = result?.columnTypes || keys.map(() => null);
  const aligns = keys.map((k, i) => columnAlign(types[i], rows, k));
  const shown = rows.slice(0, 50);
  const split = layout === 'split' && !!result;
  const clickable = typeof onRowClick === 'function';

  /* Unique listed tickers in the result, capped so one click never floods a list. */
  const tickers = useMemo(() => {
    const seen = new Set();
    for (const r of result?.rows || []) {
      const raw = r.ticker ?? r.symbol;
      const t = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
      if (t && /^[A-Z.-]{1,10}$/.test(t)) seen.add(t);
      if (seen.size >= 25) break;
    }
    return [...seen];
  }, [result]);

  const addTickersToWatchlist = async () => {
    if (!tickers.length || needsAccount('watchlist')) return;
    setWatchState('busy');
    try {
      if ((await addToWatchlist(tickers)) === 'auth') {
        setGate('watchlist');
        setWatchState('idle');
        return;
      }
      setWatchState('done');
    } catch {
      setWatchState('error');
      setError('Some tickers could not be added to your watchlist. Try again.');
    }
  };

  const saveReport = async () => {
    if (!code.trim() || needsAccount('save')) return;
    setSaveState('busy');
    try {
      const res = await post('/api/ezanaql/saved', {
        title: (prompt.trim() || code.trim()).slice(0, 120),
        prompt: prompt.trim() || null,
        query: code,
        dimension,
        rowCount: rows.length,
      });
      if (res.status === 401) {
        setGate('save');
        setSaveState('idle');
        return;
      }
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(d.error || 'save failed');
      setSaveState('done');
      setSaved((list) => (list ? [d.report, ...list] : list));
    } catch (e) {
      setSaveState('error');
      setError(
        e.message && e.message !== 'save failed' ? e.message : 'That report could not be saved.',
      );
    }
  };

  const toggleSaved = async () => {
    const next = !savedOpen;
    setSavedOpen(next);
    if (!next || saved) return;
    setSavedState('busy');
    try {
      const res = await fetch(`/api/ezanaql/saved?dimension=${encodeURIComponent(dimension)}`);
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error('load failed');
      setSaved(d.reports || []);
      setSavedState('idle');
    } catch {
      setSavedState('error');
    }
  };

  const openSaved = (report) => {
    setDirty(true);
    setCode(report.query);
    setSavedOpen(false);
    runQuery(report.query);
  };

  const deleteSaved = async (id) => {
    try {
      const res = await fetch(`/api/ezanaql/saved/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error('delete failed');
      setSaved((list) => (list ? list.filter((r) => r.id !== id) : list));
    } catch {
      setError('That saved report could not be deleted.');
    }
  };

  /* Latest handlers for an action that waited on the session. */
  actionsRef.current = {
    csv: () => exportAs('csv'),
    json: () => exportAs('json'),
    watchlist: addTickersToWatchlist,
    save: saveReport,
  };

  const closeGate = useCallback(() => setGate(null), []);

  const lock = isGuest ? <i className="bi bi-lock-fill eqb-lock" aria-hidden="true" /> : null;

  const openRow = (r) => {
    if (!clickable || !rowClickable(r)) return;
    onRowClick(r, { window: result?.window || null, keys });
  };

  const resultsPanel = result ? (
    <div className="eqb-results">
      <div className="eqb-results-head">
        <span>
          {rows.length > 50 ? `Showing 50 of ${rows.length} rows` : `${rows.length} rows`}
        </span>
        {clickable && rows.some(rowClickable) ? (
          <span className="eqb-results-hint">Click a company for its contracts and holders</span>
        ) : null}
        <span className="eqb-results-acts">
          {tickers.length ? (
            <button
              type="button"
              className="eqb-ract"
              onClick={addTickersToWatchlist}
              data-haptic
              disabled={watchState === 'busy' || watchState === 'done'}
              title={isGuest ? 'Requires an account' : undefined}
            >
              <i
                className={`bi ${watchState === 'done' ? 'bi-check2' : 'bi-bookmark-plus'}`}
                aria-hidden="true"
              />
              {watchState === 'done'
                ? `Added ${tickers.length}`
                : watchState === 'busy'
                  ? 'Adding'
                  : `Add ${tickers.length} to watchlist`}
              {lock}
            </button>
          ) : null}
          <button
            type="button"
            className="eqb-ract"
            onClick={saveReport}
            disabled={saveState === 'busy' || saveState === 'done'}
            title={isGuest ? 'Requires an account' : undefined}
          >
            <i
              className={`bi ${saveState === 'done' ? 'bi-check2' : 'bi-journal-plus'}`}
              aria-hidden="true"
            />
            {saveState === 'done' ? 'Saved' : saveState === 'busy' ? 'Saving' : 'Save report'}
            {lock}
          </button>
        </span>
        <button type="button" className="eqb-results-x" onClick={() => setResult(null)}>
          Hide
        </button>
      </div>
      <div className="eqb-scroll">
        <table className="eqb-table">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={c} className={aligns[i] === 'right' ? 'eqb-num' : undefined}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => {
              const can = clickable && rowClickable(r);
              return (
                <tr
                  key={i}
                  className={can ? 'eqb-row--link' : undefined}
                  tabIndex={can ? 0 : undefined}
                  role={can ? 'button' : undefined}
                  aria-label={can ? `Open ${r.parent || r.recipient || r.ticker}` : undefined}
                  onClick={can ? () => openRow(r) : undefined}
                  onKeyDown={
                    can
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openRow(r);
                          }
                        }
                      : undefined
                  }
                >
                  {keys.map((k, j) => (
                    <td key={k} className={aligns[j] === 'right' ? 'eqb-num' : undefined}>
                      {formatCell(r[k], types[j])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  ) : null;

  /* The four query actions. Desktop: inside the pill, after Generate.
     Phones: on their own row with the EzanaQL label, so the prompt keeps the
     whole pill. Both copies render; CSS shows one (display:none also takes
     the other out of the accessibility tree), so nothing shifts on load. */
  const actionsFor = (where) => (
    <span className={`eqb-actions eqb-actions--${where}`} role="group" aria-label="Query actions">
      <button
        type="button"
        className="eqb-act"
        onClick={() => setEditing((v) => !v)}
        aria-pressed={editing}
        aria-label={editing ? 'Close editor' : 'Edit query'}
      >
        <i className="bi bi-pencil" aria-hidden="true" />
        <span>{editing ? 'Close' : 'Edit'}</span>
      </button>
      <button
        type="button"
        className="eqb-act"
        onClick={run}
        disabled={busy === 'run'}
        aria-label={busy === 'run' ? 'Running query' : 'Run query'}
      >
        <i className="bi bi-play-fill" aria-hidden="true" />
        <span>{busy === 'run' ? 'Running' : 'Run'}</span>
      </button>
      <button
        type="button"
        className="eqb-act"
        onClick={() => exportAs('csv')}
        disabled={busy === 'csv'}
        aria-label={isGuest ? 'Export CSV (requires an account)' : 'Export CSV'}
        title={isGuest ? 'Requires an account' : undefined}
      >
        <i className="bi bi-filetype-csv" aria-hidden="true" />
        <span>CSV</span>
        {lock}
      </button>
      <button
        type="button"
        className="eqb-act"
        onClick={() => exportAs('json')}
        disabled={busy === 'json'}
        aria-label={isGuest ? 'Export JSON (requires an account)' : 'Export JSON'}
        title={isGuest ? 'Requires an account' : undefined}
      >
        <i className="bi bi-filetype-json" aria-hidden="true" />
        <span>JSON</span>
        {lock}
      </button>
      {isAuthenticated ? (
        <button
          type="button"
          className="eqb-act"
          onClick={toggleSaved}
          aria-expanded={savedOpen}
          aria-label="Saved reports"
        >
          <i className="bi bi-journal-bookmark" aria-hidden="true" />
          <span>Saved</span>
        </button>
      ) : null}
    </span>
  );

  return (
    <div className={`eqb${split ? ' eqb--split' : ''}`}>
      <div className="eqb-main">
        <div className="eqb-pill">
          <span className="eqb-mark">
            <i className="bi bi-stars" aria-hidden="true" />
            <span>Ezana AI</span>
          </span>
          <span className="eqb-div" aria-hidden="true" />
          <input
            ref={promptRef}
            className="eqb-input"
            placeholder="Describe a report in plain English"
            aria-label="Describe a report in plain English"
            enterKeyHint="go"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                generate();
              }
            }}
          />
          <button
            type="button"
            className="eqb-go"
            onClick={() => generate()}
            disabled={busy === 'gen'}
            aria-label={busy === 'gen' ? 'Generating query' : 'Generate EzanaQL query'}
          >
            <i
              className={`bi ${busy === 'gen' ? 'bi-hourglass-split' : 'bi-arrow-up'} eqb-go-ic`}
              aria-hidden="true"
            />
            <span className="eqb-go-txt" aria-hidden="true">
              {busy === 'gen' ? (
                'Generating'
              ) : (
                <>
                  Generate<span className="eqb-go-long"> EzanaQL</span>
                </>
              )}
            </span>
          </button>
          {actionsFor('pill')}
        </div>

        {/* Phones only (CSS): the EzanaQL label and the four actions on one
            row under the prompt. */}
        <div className="eqb-tools">
          <span className="eqb-code-tag">EzanaQL</span>
          {actionsFor('row')}
        </div>

        {examplePrompts.length ? (
          <div className="eqb-chips" role="group" aria-label="Example prompts">
            {examplePrompts.map((p) => (
              <button
                key={p}
                type="button"
                className="eqb-chip"
                disabled={busy === 'gen'}
                onClick={() => {
                  setPrompt(p);
                  generate(p);
                }}
              >
                {p}
              </button>
            ))}
          </div>
        ) : null}

        {code.trim() ? (
          /* The query itself opens the editor: on a phone the pencil is a
           small target, the query is the obvious one. */
          <button
            type="button"
            className="eqb-code"
            onClick={() => setEditing(true)}
            aria-label="Edit this EzanaQL query"
            aria-expanded={editing}
          >
            <span className="eqb-code-tag">EzanaQL</span>
            <code className={`eqb-query${swapping ? ' is-swapping' : ''}`}>
              <QueryTokens code={code} />
            </code>
          </button>
        ) : null}

        {/* Only while the prompt has focus: true everywhere, and noise until
          someone is actually about to type. */}
        {focused ? (
          <p className="eqb-hint">
            Queries can span every live {DIMENSION_LABELS[dimension] || 'hub'} dataset.
          </p>
        ) : null}

        {editing ? (
          <div className="eqb-edit">
            <textarea
              ref={editorRef}
              className="eqb-editor"
              rows={
                mobile
                  ? MOBILE_EDITOR_LINES
                  : Math.min(MAX_EDITOR_LINES, Math.max(3, code.split('\n').length))
              }
              value={code}
              placeholder='FROM capitol.congress_trades WHERE ticker = "NVDA" LIMIT 50'
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              aria-label="EzanaQL query"
              onChange={(e) => {
                setDirty(true);
                setCode(e.target.value);
              }}
              onKeyDown={onEditorKey}
            />
            {/* Run sits under the editor too: the pill's Run is off screen once
              a phone keyboard is up. */}
            <div className="eqb-edit-bar">
              <span className="eqb-edit-hint">Ctrl or Cmd + Enter to run</span>
              <button type="button" className="eqb-edit-close" onClick={() => setEditing(false)}>
                Close
              </button>
              <button
                type="button"
                className="eqb-edit-run"
                onClick={run}
                disabled={busy === 'run' || !code.trim()}
              >
                <i className="bi bi-play-fill" aria-hidden="true" />
                {busy === 'run' ? 'Running' : 'Run query'}
              </button>
            </div>
          </div>
        ) : null}

        {savedOpen && isAuthenticated ? (
          <div className="eqb-saved" aria-label="Saved reports">
            {savedState === 'busy' ? (
              <p className="eqb-saved-empty">Loading saved reports</p>
            ) : savedState === 'error' ? (
              <p className="eqb-saved-empty">Saved reports could not be loaded.</p>
            ) : !saved || !saved.length ? (
              <p className="eqb-saved-empty">
                No saved reports yet. Run a report and choose Save report.
              </p>
            ) : (
              <ul className="eqb-saved-list">
                {saved.map((r) => (
                  <li key={r.id} className="eqb-saved-row">
                    <button type="button" className="eqb-saved-open" onClick={() => openSaved(r)}>
                      <span className="eqb-saved-title">{r.title}</span>
                      <span className="eqb-saved-meta">
                        {relativeDate(r.created_at)}
                        {r.row_count != null ? ` · ${r.row_count} rows` : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="eqb-saved-del"
                      onClick={() => deleteSaved(r.id)}
                      aria-label="Delete saved report"
                    >
                      <i className="bi bi-trash" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {error ? (
          <p className="eqb-msg" role="status">
            {error}
          </p>
        ) : null}
        {note ? <p className="eqb-note">{note}</p> : null}
        {gate ? <AccountGate action={gate} onClose={closeGate} /> : null}
      </div>

      {resultsPanel}
    </div>
  );
}
