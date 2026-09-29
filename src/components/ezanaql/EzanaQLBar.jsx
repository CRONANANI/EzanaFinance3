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
import DatasetPicker from './DatasetPicker';
import './ezanaql-bar.css';

const MAX_EDITOR_LINES = 8;

export default function EzanaQLBar({ datasetScope = null, seedQuery = '', onResult }) {
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
  const promptRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (dirty) return;
    setCode(seedQuery);
  }, [seedQuery, dirty]);

  useEffect(() => {
    if (editing) editorRef.current?.focus();
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
      const data = await res.json();
      if (!data.ok) {
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
      if (res.status === 401) {
        /* The engine's own answer, not a euphemism: running needs an account. */
        setError('Running a query needs a free account.');
        return;
      }
      if (!data.ok) {
        setError(data.error || 'That query did not run.');
        return;
      }
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
        if (res.status === 401) {
          setError('Exporting needs a free account.');
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

  const pick = (name) => {
    setDirty(true);
    setCode((c) =>
      c.trim() ? `FROM ${name}\n${c.replace(/^FROM\s+\S+\s*/i, '')}` : `FROM ${name} `,
    );
    setEditing(true);
  };

  const rows = result?.rows || [];
  const columns = result?.columns || [];
  const keys = result?.keys || columns;
  const shown = rows.slice(0, 50);

  return (
    <div className="eqb">
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
          {busy === 'gen' ? 'Generating' : 'Generate EzanaQL'}
        </button>
      </div>

      <div className="eqb-line">
        <code className={`eqb-query${swapping ? ' is-swapping' : ''}`}>{code}</code>
        <span className="eqb-links">
          <button type="button" className="eqb-link" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Close' : 'Edit'}
          </button>
          <button type="button" className="eqb-link" onClick={run} disabled={busy === 'run'}>
            {busy === 'run' ? 'Running' : 'Run'}
          </button>
          <button
            type="button"
            className="eqb-link"
            onClick={() => exportAs('csv')}
            disabled={busy === 'csv'}
          >
            CSV
          </button>
          <button
            type="button"
            className="eqb-link"
            onClick={() => exportAs('json')}
            disabled={busy === 'json'}
          >
            JSON
          </button>
          <DatasetPicker onPick={pick} />
        </span>
      </div>

      {/* Only while the prompt has focus: true everywhere, and noise until
          someone is actually about to type. */}
      {focused ? (
        <p className="eqb-hint">Queries can span any live dataset, not just this page&apos;s.</p>
      ) : null}

      {editing ? (
        <textarea
          ref={editorRef}
          className="eqb-editor"
          rows={Math.min(MAX_EDITOR_LINES, Math.max(3, code.split('\n').length))}
          value={code}
          spellCheck={false}
          aria-label="EzanaQL query"
          onChange={(e) => {
            setDirty(true);
            setCode(e.target.value);
          }}
          onKeyDown={onEditorKey}
        />
      ) : null}

      {error ? (
        <p className="eqb-msg" role="status">
          {error}
          {/^(Running|Exporting)/.test(error) ? (
            <>
              {' '}
              <a href="/auth/signup">Create one</a>.
            </>
          ) : null}
        </p>
      ) : null}
      {note ? <p className="eqb-note">{note}</p> : null}

      {result ? (
        <div className="eqb-results">
          <div className="eqb-results-head">
            <span>
              {rows.length > 50 ? `Showing 50 of ${rows.length} rows` : `${rows.length} rows`}
            </span>
            <button type="button" className="eqb-results-x" onClick={() => setResult(null)}>
              Hide
            </button>
          </div>
          <div className="eqb-scroll">
            <table className="eqb-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={i}>
                    {keys.map((k) => (
                      <td key={k}>{r[k] == null ? '·' : String(r[k])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
