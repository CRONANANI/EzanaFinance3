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
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { columnAlign, formatCell } from '@/lib/ezanaql/grid-format';
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

/**
 * @param {object} props
 * @param {string|null} [props.datasetScope]  catalog dataset the page is about
 * @param {string} [props.seedQuery]           query the bar opens with
 * @param {(result: object) => void} [props.onResult]  take the result instead of rendering it
 * @param {'stack'|'split'} [props.layout]     'split': once a result is in, the bar
 *   widens to its container and the query sits left, the table right
 * @param {(row: object, ctx: { window: object|null, keys: string[] }) => void} [props.onRowClick]
 *   makes result rows clickable; the page decides what a row opens
 * @param {(row: object) => boolean} [props.rowClickable]  which rows (default: those with a ticker)
 */
export default function EzanaQLBar({
  datasetScope = null,
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

  const generate = useCallback(async () => {
    if (!prompt.trim() || busy) return;
    setBusy('gen');
    setError(null);
    setNote(null);
    try {
      const res = await post('/api/ezanaql/generate', { prompt, datasetScope });
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
  }, [prompt, datasetScope, busy, post]);

  const run = useCallback(async () => {
    if (!code.trim() || busy) return;
    setBusy('run');
    setError(null);
    setNote(null);
    setResult(null);
    try {
      const res = await post('/api/ezanaql/run', { query: code, format: 'table' });
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
  }, [code, busy, post, onResult]);

  const exportAs = useCallback(
    async (format) => {
      if (!code.trim() || busy) return;
      setBusy(format);
      setError(null);
      setNote(null);
      try {
        const res = await post('/api/ezanaql/export', { query: code, format });
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
    [code, busy, post],
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
          <button type="button" className="eqb-go" onClick={generate} disabled={busy === 'gen'}>
            {busy === 'gen' ? (
              'Generating'
            ) : (
              <>
                Generate<span className="eqb-go-long"> EzanaQL</span>
              </>
            )}
          </button>
          <span className="eqb-actions" role="group" aria-label="Query actions">
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
              aria-label="Export CSV"
            >
              <i className="bi bi-filetype-csv" aria-hidden="true" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              className="eqb-act"
              onClick={() => exportAs('json')}
              disabled={busy === 'json'}
              aria-label="Export JSON"
            >
              <i className="bi bi-filetype-json" aria-hidden="true" />
              <span>JSON</span>
            </button>
          </span>
        </div>

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
          <p className="eqb-hint">Queries can span any live dataset, not just this page&apos;s.</p>
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

        {error ? (
          <p className="eqb-msg" role="status">
            {error}
          </p>
        ) : null}
        {note ? <p className="eqb-note">{note}</p> : null}
      </div>

      {resultsPanel}
    </div>
  );
}
