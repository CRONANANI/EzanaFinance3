'use client';

/**
 * /admin/sonar-model-bench: runs the Sonar model-quality benchmark in production,
 * one step per request (availability, freeze evidence, replay each cell, optional
 * blind judge), then shows the side-by-side table. Every step is a row in
 * sonar_research_evaluations, so a closed tab loses nothing: reload the suite id.
 * Admins only; /api/admin/sonar/model-bench is the real gate.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useIsAdmin } from '@/lib/admin-helpers-client';
import { supabase } from '@/lib/supabase-browser';
import './model-bench-admin.css';

const API = '/api/admin/sonar/model-bench';

async function headers() {
  const { data } = await supabase.auth.getSession();
  const t = data?.session?.access_token;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

async function call(method, body, query = '') {
  const res = await fetch(`${API}${query}`, {
    method,
    headers: await headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
  return d;
}

const pct = (v) => (v == null ? '' : `${Math.round(v * 100)}%`);
const usd = (v) => (v == null ? '' : `$${v < 0.01 ? v.toFixed(4) : v.toFixed(3)}`);
const sec = (v) => (v == null ? '' : `${(v / 1000).toFixed(1)}s`);

const COLUMNS = [
  ['label', 'Cell', (r) => r.label],
  ['runs', 'Runs', (r) => r.runs],
  ['completionRate', 'Completed', (r) => pct(r.completionRate)],
  ['timeoutRate', 'Timeouts', (r) => pct(r.timeoutRate)],
  ['partialRate', 'Partial', (r) => pct(r.partialRate)],
  ['objectiveCompletion', 'Objectives', (r) => pct(r.objectiveCompletion)],
  ['caveatRate', 'Caveats', (r) => pct(r.caveatRate)],
  ['citationValidity', 'Cite valid', (r) => pct(r.citationValidity)],
  ['citationCoverage', 'Cite cover', (r) => pct(r.citationCoverage)],
  ['numericFidelity', 'Numbers traced', (r) => pct(r.numericFidelity)],
  ['unsupportedPerRun', 'Unsupported/run', (r) => r.unsupportedPerRun],
  ['forbiddenHits', 'Forbidden', (r) => r.forbiddenHits],
  ['judgeOverall', 'Judge (1-5)', (r) => r.judgeOverall ?? ''],
  ['latencyP50Ms', 'p50', (r) => sec(r.latencyP50Ms)],
  ['latencyP90Ms', 'p90', (r) => sec(r.latencyP90Ms)],
  ['usdPerRun', '$/run', (r) => usd(r.usdPerRun)],
  ['synthesisUsdPerRun', 'LLM synth $/run', (r) => usd(r.synthesisUsdPerRun)],
  ['inputTokensPerRun', 'In tok', (r) => Math.round(r.inputTokensPerRun || 0)],
  ['outputTokensPerRun', 'Out tok', (r) => Math.round(r.outputTokensPerRun || 0)],
  ['modelMismatches', 'Served≠asked', (r) => r.modelMismatches],
];

function Table({ rows }) {
  if (!rows?.length) return null;
  return (
    <div className="smb-table-wrap">
      <table className="smb-table">
        <thead>
          <tr>
            {COLUMNS.map(([k, label]) => (
              <th key={k}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.cellId}>
              {COLUMNS.map(([k, , f]) => (
                <td key={k}>{f(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ModelBenchAdmin() {
  const { user, loading } = useAuth() || {};
  const { isAdmin: allowed, checking } = useIsAdmin(user);
  const [plan, setPlan] = useState(null);
  const [suite, setSuite] = useState('');
  const [trials, setTrials] = useState(1);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);
  const [results, setResults] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [error, setError] = useState(null);
  const stop = useRef(false);

  const note = (s) => setLog((l) => [...l, `${new Date().toLocaleTimeString()}  ${s}`]);

  const loadPlan = useCallback(async () => {
    try {
      setPlan(await call('GET', null, '?action=plan'));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (allowed) loadPlan();
  }, [allowed, loadPlan]);

  const loadResults = useCallback(async (id) => {
    if (!id) return;
    try {
      setResults(await call('GET', null, `?action=results&suite=${encodeURIComponent(id)}`));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const step = async (label, fn) => {
    try {
      const out = await fn();
      note(`${label}: ${JSON.stringify(out).slice(0, 220)}`);
      return out;
    } catch (e) {
      note(`${label}: FAILED ${e.message}`);
      return null;
    }
  };

  const checkAvailability = async () => {
    setBusy(true);
    const out = await step('availability', () => call('POST', { action: 'availability' }));
    setAvailability(out);
    setBusy(false);
  };

  const captureAll = async () => {
    setBusy(true);
    stop.current = false;
    for (const c of plan?.cases || []) {
      if (stop.current) break;
      // eslint-disable-next-line no-await-in-loop
      await step(`capture ${c.id}`, () => call('POST', { action: 'capture', caseId: c.id }));
    }
    await loadPlan();
    setBusy(false);
  };

  const runAll = async () => {
    const id = suite || `model-bench-${new Date().toISOString().slice(0, 16)}`;
    setSuite(id);
    setBusy(true);
    stop.current = false;
    for (let t = 1; t <= trials; t += 1)
      for (const c of plan?.cases || []) {
        if (!c.capturedAt) {
          note(`skip ${c.id}: no frozen evidence yet`);
          continue;
        }
        for (const cell of c.cells) {
          if (stop.current) break;
          // eslint-disable-next-line no-await-in-loop
          await step(`run ${c.id} × ${cell.id} (trial ${t})`, () =>
            call('POST', { action: 'run', caseId: c.id, cellId: cell.id, suite: id, trial: t }),
          );
        }
      }
    await loadResults(id);
    setBusy(false);
  };

  const judgeAll = async () => {
    if (!results?.rows?.length) return;
    setBusy(true);
    stop.current = false;
    for (const r of results.rows) {
      if (stop.current) break;
      if (r.judge) continue;
      // eslint-disable-next-line no-await-in-loop
      await step(`judge ${r.caseId} × ${r.cellId}`, () =>
        call('POST', { action: 'judge', rowId: r.id }),
      );
    }
    await loadResults(suite);
    setBusy(false);
  };

  const download = () => {
    const blob = new Blob([JSON.stringify({ availability, results }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${suite || 'model-bench'}.json`;
    a.click();
  };

  if (loading || checking) return <main className="smb-page">Loading</main>;
  if (!allowed) return <main className="smb-page">Admins only.</main>;

  const totalCells = (plan?.cases || []).reduce((a, c) => a + c.cells.length, 0);

  return (
    <main className="smb-page">
      <h1 className="smb-title">Sonar model benchmark</h1>
      <p className="smb-sub">
        Same frozen evidence for every model. Production routing is unchanged by anything on this
        page. {plan ? `${plan.cases.length} cases, ${totalCells} cells per trial.` : ''}
      </p>

      <div className="smb-row">
        <button type="button" onClick={checkAvailability} disabled={busy}>
          1. Check model availability
        </button>
        <button type="button" onClick={captureAll} disabled={busy || !plan}>
          2. Freeze evidence (all cases)
        </button>
        <label>
          Trials{' '}
          <input
            type="number"
            min={1}
            max={5}
            value={trials}
            onChange={(e) => setTrials(Number(e.target.value) || 1)}
            style={{ width: 64 }}
          />
        </label>
        <input
          placeholder="suite id (blank = new)"
          value={suite}
          onChange={(e) => setSuite(e.target.value)}
        />
        <button type="button" className="smb-primary" onClick={runAll} disabled={busy || !plan}>
          3. Run all cells
        </button>
        <button type="button" onClick={judgeAll} disabled={busy || !results?.rows?.length}>
          4. Blind judge (optional)
        </button>
        <button type="button" onClick={() => loadResults(suite)} disabled={busy || !suite}>
          Load results
        </button>
        <button type="button" onClick={download} disabled={!results}>
          Download JSON
        </button>
        <button type="button" onClick={() => (stop.current = true)} disabled={!busy}>
          Stop
        </button>
      </div>
      {error ? <p className="smb-error">{error}</p> : null}

      {availability ? (
        <>
          <h2 className="smb-h2">Availability</h2>
          <div className="smb-table-wrap">
            <table className="smb-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Available</th>
                  <th>Served</th>
                  <th>Status</th>
                  <th>ms</th>
                </tr>
              </thead>
              <tbody>
                {availability.models.map((m) => (
                  <tr key={m.model}>
                    <td>{m.model}</td>
                    <td>{m.available ? 'yes' : 'NO'}</td>
                    <td>{m.served || ''}</td>
                    <td>{m.status ?? ''}</td>
                    <td>{m.ms ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {plan ? (
        <>
          <h2 className="smb-h2">Cases</h2>
          <div className="smb-table-wrap">
            <table className="smb-table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Depth</th>
                  <th>Cells</th>
                  <th>Evidence frozen</th>
                </tr>
              </thead>
              <tbody>
                {plan.cases.map((c) => (
                  <tr key={c.id}>
                    <td>{c.category}</td>
                    <td>{c.depth}</td>
                    <td>{c.cells.length}</td>
                    <td>{c.capturedAt ? new Date(c.capturedAt).toLocaleString() : 'no'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {results ? (
        <>
          <h2 className="smb-h2">Side by side, all cases</h2>
          <Table rows={results.overall} />
          {Object.entries(results.perCase || {}).map(([caseId, rows]) => (
            <div key={caseId}>
              <h2 className="smb-h2">
                {plan?.cases.find((c) => c.id === caseId)?.category || caseId}
              </h2>
              <Table rows={rows} />
            </div>
          ))}
        </>
      ) : null}

      <h2 className="smb-h2">Log</h2>
      <div className="smb-log">{log.join('\n') || 'Nothing run yet.'}</div>
    </main>
  );
}
