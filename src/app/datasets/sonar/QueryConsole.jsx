'use client';

/**
 * The query console: one worked question with the EzanaQL behind it, the
 * datasets it joins, and a preview of the real result, then the reader's own.
 *
 * The worked example's result comes from the server (data.js runs the pinned
 * query through runEzanaQL, cached 15 minutes). Everything after that is live:
 *   Ask Sonar  POST /api/ezanaql/generate, then /api/ezanaql/run
 *   Edit, Run  the query block becomes editable; Run re-executes it
 *   CSV        signed in: /api/ezanaql/run as csv; signed out: account gate
 *   Open full  expands the preview to every row returned
 * EzanaQL runs one dimension at a time, so the bar names the dimension a
 * question is asked in. Every chip names a dimension with live data.
 */
import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { formatCell, formatDate, columnAlign } from '@/lib/ezanaql/grid-format';
import { compactUsd, MIDDOT } from './derive';
import { columnHead, joinedDatasets } from './worked-example';
import { emit } from './SonarSelection';

const PREVIEW_ROWS = 3;
const PREVIEW_COLS = 4;

function cell(value, type) {
  if (value == null || value === '') return MIDDOT;
  if (type === 'money') return compactUsd(value) ?? MIDDOT;
  if (type === 'date')
    return formatDate(value)
      .replace(/, \d{4}$/, '')
      .toUpperCase();
  return formatCell(value, type);
}

function secs(ms) {
  if (!Number.isFinite(ms)) return null;
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}S`;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

export default function QueryConsole({ example, initial, chips, dims, pending = false }) {
  const { isAuthenticated } = useAuth() || {};
  const labelOf = useCallback((id) => dims.find((d) => d.id === id)?.label || id, [dims]);
  const hubOf = useCallback((id) => dims.find((d) => d.id === id)?.hubHref || '/datasets', [dims]);

  const [question, setQuestion] = useState(example.question);
  const [dimension, setDimension] = useState(example.dimension);
  const [query, setQuery] = useState(example.query);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [gate, setGate] = useState(false);
  const [run, setRun] = useState(() =>
    pending
      ? { status: 'loading' }
      : initial && !initial.error
        ? { status: 'done', ...initial }
        : { status: 'error' },
  );

  const execute = useCallback(async (q, dim) => {
    setRun({ status: 'running' });
    setExpanded(false);
    const started = performance.now();
    try {
      const { status, json } = await postJson('/api/ezanaql/run', {
        query: q,
        dimension: dim,
        format: 'table',
      });
      const ms = Math.round(performance.now() - started);
      if (json?.ok) {
        setRun({
          status: 'done',
          dataset: json.dataset,
          joined: json.joined,
          result: json.result,
          ms,
        });
      } else {
        setRun({
          status: 'error',
          message: status === 400 && json?.error ? json.error : null,
        });
      }
    } catch {
      setRun({ status: 'error' });
    }
  }, []);

  const ask = useCallback(
    async (text, dim, prefilled) => {
      const prompt = String(text || '').trim();
      if (!prompt) return;
      emit('dsx_console_ask', { prefilled: !!prefilled, dimension: dim });
      setQuestion(prompt);
      setDimension(dim);
      setEditing(false);
      setRun({ status: 'asking' });
      try {
        const { json } = await postJson('/api/ezanaql/generate', { prompt, dimension: dim });
        if (!json?.ok || !json.query) {
          setRun({ status: 'error', message: json?.error || null });
          return;
        }
        setQuery(json.query);
        if (json.valid === false) {
          setEditing(true);
          setRun({
            status: 'error',
            message: `Sonar wrote a query that does not run yet: ${json.validationError || 'invalid query'}. Edit it and run.`,
          });
          return;
        }
        await execute(json.query, dim);
      } catch {
        setRun({ status: 'error' });
      }
    },
    [execute],
  );

  const downloadCsv = useCallback(async () => {
    if (!isAuthenticated) {
      setGate(true);
      return;
    }
    const { json } = await postJson('/api/ezanaql/run', { query, dimension, format: 'csv' });
    const body = json?.ok ? json.result?.body : null;
    if (!body) {
      setRun((r) => ({ ...r, csvError: true }));
      return;
    }
    const url = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ezana-sonar-query.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [isAuthenticated, query, dimension]);

  const res = run.status === 'done' ? run.result : null;
  const keys = res?.keys || [];
  const types = res?.columnTypes || [];
  const shown = keys.slice(0, PREVIEW_COLS);
  const rows = res ? (expanded ? res.rows : res.rows.slice(0, PREVIEW_ROWS)) : [];
  const joins = useMemo(() => (run.status === 'done' ? joinedDatasets(run) : []), [run]);
  const datasetHref = useCallback(
    (label) => {
      for (const d of dims) {
        const hit = d.live.find((x) => x.label === label);
        if (hit) return hit.href;
      }
      return null;
    },
    [dims],
  );
  const busy = run.status === 'asking' || run.status === 'running' || run.status === 'loading';

  return (
    <section className="dso-console" aria-labelledby="dso-console-h">
      <h2 className="dso-console-title" id="dso-console-h">
        <i className="bi bi-stars dso-console-spark" aria-hidden="true" /> And you can ask it
        anything
      </h2>
      <p className="dso-console-sub">
        One question can reach across the datasets on the sonar. Sonar writes the EzanaQL, joins the
        datasets and shows its work.
      </p>

      <form
        className="dso-askbar"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question, dimension, false);
        }}
      >
        <span className="dso-askbar-scope" title={`Asked in ${labelOf(dimension)}`}>
          <i className="bi bi-stars" aria-hidden="true" /> {labelOf(dimension)}
        </span>
        <label className="dso-sr" htmlFor="dso-ask">
          Ask Sonar a question about {labelOf(dimension)}
        </label>
        <input
          id="dso-ask"
          className="dso-askbar-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={300}
          autoComplete="off"
        />
        <button type="submit" className="dso-askbar-go" disabled={busy}>
          {run.status === 'asking' ? 'Asking' : 'Ask Sonar'}
        </button>
      </form>

      <div className="dso-qblock">
        <div className="dso-qblock-top">
          <span className="dso-qblock-k dso-mono">EZANAQL</span>
          {editing ? (
            <>
              <label className="dso-sr" htmlFor="dso-q">
                EzanaQL query
              </label>
              <textarea
                id="dso-q"
                className="dso-qblock-edit dso-mono"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={6}
                spellCheck={false}
              />
            </>
          ) : (
            <pre className="dso-qblock-code dso-mono">{query}</pre>
          )}
        </div>
        {joins.length ? (
          <p className="dso-joins">
            <span className="dso-joins-k dso-mono">{joins.length > 1 ? 'JOINS' : 'READS'}</span>
            {joins.map((label, i) => {
              const href = datasetHref(label);
              return (
                <span key={label} className="dso-joins-item">
                  {i ? <i className="bi bi-link-45deg dso-joins-link" aria-hidden="true" /> : null}
                  {href ? (
                    <a className="dso-chip-ds dso-mono" href={href}>
                      {label}
                    </a>
                  ) : (
                    <span className="dso-chip-ds dso-mono">{label}</span>
                  )}
                </span>
              );
            })}
          </p>
        ) : null}
      </div>

      <div className="dso-preview" aria-live="polite" aria-busy={busy}>
        {busy ? (
          <div className="dso-preview-skel">
            {[0, 1, 2, 3].map((i) => (
              <span className="dso-skel" key={i} />
            ))}
          </div>
        ) : null}

        {run.status === 'error' ? (
          <p className="dso-preview-state">
            {run.message || (
              <>
                This query could not run just now.{' '}
                <a href={hubOf(dimension)}>Try it on the {labelOf(dimension)} hub.</a>
              </>
            )}
          </p>
        ) : null}

        {res && !res.rows.length ? <p className="dso-preview-state">No rows match.</p> : null}

        {res && res.rows.length ? (
          <div
            className={`dso-grid${expanded ? ' is-expanded' : ''}`}
            style={{
              '--dso-gcols': `minmax(0, 1.4fr) repeat(${Math.max(1, shown.length - 1)}, minmax(0, 1fr))`,
            }}
            role="table"
            aria-label={`Result: ${question}`}
          >
            <div className="dso-grid-row dso-grid-head" role="row">
              {shown.map((k, i) => (
                <span
                  key={k}
                  role="columnheader"
                  className={columnAlign(types[i], res.rows, k) === 'right' ? 'is-num' : ''}
                >
                  {columnHead(res.columns?.[i] || k)}
                </span>
              ))}
            </div>
            {rows.map((r, ri) => (
              <div className="dso-grid-row" role="row" key={ri}>
                {shown.map((k, i) => (
                  <span
                    key={k}
                    role="cell"
                    className={`${i === 0 ? 'dso-grid-lead' : 'dso-mono'}${
                      columnAlign(types[i], res.rows, k) === 'right' ? ' is-num' : ''
                    }`}
                  >
                    {cell(r[k], types[i])}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ) : null}

        <div className="dso-preview-foot">
          <span className="dso-meta dso-mono">
            {res
              ? [
                  `${res.rowCount} ROWS`,
                  `${joins.length} DATASET${joins.length === 1 ? '' : 'S'}`,
                  secs(run.ms),
                ]
                  .filter(Boolean)
                  .join(' · ')
              : ''}
          </span>
          <span className="dso-preview-acts">
            <button
              type="button"
              className="dso-btn"
              onClick={() => setEditing((e) => !e)}
              aria-pressed={editing}
            >
              {editing ? 'Done' : 'Edit'}
            </button>
            <button
              type="button"
              className="dso-btn"
              onClick={() => execute(query, dimension)}
              disabled={busy}
            >
              Run
            </button>
            <button
              type="button"
              className="dso-btn"
              onClick={downloadCsv}
              disabled={!res || !res.rows.length}
            >
              CSV
              {!isAuthenticated ? (
                <i className="bi bi-lock-fill" aria-label="needs an account" />
              ) : null}
            </button>
            {res && res.rows.length > PREVIEW_ROWS ? (
              <button
                type="button"
                className="dso-btn-ink dso-btn-ink--sm"
                onClick={() => setExpanded((x) => !x)}
                aria-expanded={expanded}
              >
                {expanded ? 'Show first three' : 'Open full result'}{' '}
                <i
                  className={`bi ${expanded ? 'bi-chevron-up' : 'bi-arrow-right'}`}
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </span>
        </div>

        {gate ? (
          <div className="dso-gate" role="dialog" aria-labelledby="dso-gate-t">
            <i className="bi bi-lock dso-gate-ic" aria-hidden="true" />
            <p className="dso-gate-text">
              <b id="dso-gate-t">Create an account to export this report as CSV</b>
              Running reports stays free without one. Ezana is opening access in waves: join the
              waitlist and we will email you an invite.
            </p>
            <span className="dso-gate-acts">
              <a className="dso-btn-ink dso-btn-ink--sm" href="/auth/signup?redirect=%2Fdatasets">
                Join the waitlist
              </a>
              <a className="dso-btn" href="/auth/signin?redirect=%2Fdatasets">
                Sign in
              </a>
              <button
                type="button"
                className="dso-gate-x"
                onClick={() => setGate(false)}
                aria-label="Dismiss"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </span>
          </div>
        ) : null}
        {run.csvError ? (
          <p className="dso-preview-state">The CSV could not be made just now.</p>
        ) : null}
      </div>

      <div className="dso-try">
        <span className="dso-try-k">Or try</span>
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            className="dso-try-chip"
            onClick={() => ask(c.question, c.dimension, true)}
            disabled={busy}
            title={`${c.question} (${labelOf(c.dimension)})`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="dso-console-note">
        Queries run on live datasets only; roadmap dimensions join in when they go live. Results
        name their sources. Export needs an account.
      </p>
    </section>
  );
}
