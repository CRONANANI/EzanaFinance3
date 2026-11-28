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

const n2 = (v) => (v == null ? '' : Number(v).toFixed(2));
/* Research quality first; reliability, latency and cost after. */
const COLUMNS = [
  ['label', 'Cell', (r) => r.label],
  ['runs', 'Runs', (r) => r.runs],
  ['quality', 'Quality (0-100)', (r) => (r.quality == null ? '' : r.quality)],
  ['judgeObjective', 'Objective', (r) => n2(r.judgeObjective)],
  ['judgeFinancial', 'Financial', (r) => n2(r.judgeFinancial)],
  ['judgeInsight', 'Insight', (r) => n2(r.judgeInsight)],
  ['judgeEvidence', 'Evidence', (r) => n2(r.judgeEvidence)],
  ['judgeCorrectness', 'Correct', (r) => n2(r.judgeCorrectness)],
  ['judgeRelationships', 'Cross-data', (r) => n2(r.judgeRelationships)],
  ['objectiveCompletion', 'Objectives met', (r) => pct(r.objectiveCompletion)],
  ['citationValidity', 'Cite valid', (r) => pct(r.citationValidity)],
  ['numericFidelity', 'Numbers traced', (r) => pct(r.numericFidelity)],
  ['unsupportedPerRun', 'Unsupported/run', (r) => r.unsupportedPerRun],
  ['crossFindingShare', 'Cross findings', (r) => pct(r.crossFindingShare)],
  ['completionRate', 'Completed', (r) => pct(r.completionRate)],
  ['timeoutRate', 'Timeouts', (r) => pct(r.timeoutRate)],
  ['latencyP50Ms', 'p50', (r) => sec(r.latencyP50Ms)],
  ['latencyP90Ms', 'p90', (r) => sec(r.latencyP90Ms)],
  ['usdPerRun', '$/run', (r) => usd(r.usdPerRun)],
  ['modelMismatches', 'Served≠asked', (r) => r.modelMismatches],
];

const CRIT = [
  'objective',
  'financial',
  'insight',
  'evidence',
  'correctness',
  'relationships',
  'overall',
];

function PairsTable({ pairs }) {
  if (!pairs?.length) return null;
  return (
    <div className="smb-table-wrap">
      <table className="smb-table">
        <thead>
          <tr>
            <th>Head to head (right vs left)</th>
            <th>Judgments</th>
            {CRIT.map((k) => (
              <th key={k}>{k}</th>
            ))}
            <th>Order-consistent</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((p) => (
            <tr key={`${p.left}|${p.right}`}>
              <td>{p.label || `${p.right} vs ${p.left}`}</td>
              <td>{p.judgments}</td>
              {CRIT.map((k) => {
                const c = p.criteria[k];
                return (
                  <td key={k} title={`right ${c.right} / tie ${c.tie} / left ${c.left}`}>
                    {c.net == null ? '' : `${c.net > 0 ? '+' : ''}${c.net.toFixed(2)}`}
                  </td>
                );
              })}
              <td>{pct(p.orderConsistency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SideBySide({ data, caseId, pair, cases }) {
  if (!data || !pair) return null;
  const c = cases.find((x) => x.id === caseId);
  const find = (cellId) =>
    data.rows.find((r) => r.caseId === caseId && r.cellId === cellId && r.trial === 1);
  const L = find(pair.left);
  const R = find(pair.right);
  const verdicts = (data.pairVerdicts || []).filter(
    (v) => v.caseId === caseId && v.left === pair.left && v.right === pair.right && v.trial === 1,
  );
  const col = (row, label) => (
    <div className="smb-col">
      <h3 className="smb-h3">{label}</h3>
      {row ? (
        <>
          <p className="smb-meta">
            quality {row.quality ?? ''} · judge {row.judge?.overall ?? ''} ·{' '}
            {sec(row.score?.durationMs)} · {usd(row.usage?.total?.usd)}
          </p>
          <div className="smb-answer">{row.output?.text || '(no answer)'}</div>
        </>
      ) : (
        <p>Not run yet.</p>
      )}
    </div>
  );
  return (
    <>
      <p className="smb-sub">{c?.query}</p>
      <div className="smb-table-wrap">
        <table className="smb-table">
          <thead>
            <tr>
              <th>Judge, order</th>
              {CRIT.map((k) => (
                <th key={k}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {verdicts.map((v) => (
              <tr key={`${v.judge}|${v.xIs}`}>
                <td>
                  {v.judge.replace('claude-', '')}, {pair.left} shown{' '}
                  {v.xIs === 'left' ? 'first' : 'second'}
                </td>
                {CRIT.map((k) => (
                  <td key={k} title={v.verdict?.[k]?.reason || ''}>
                    {v.verdict?.[k]?.winner === 'tie'
                      ? 'tie'
                      : v.verdict?.[k]?.winner === 'left'
                        ? pair.left
                        : pair.right}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="smb-pair">
        {col(L, pair.left)}
        {col(R, pair.right)}
      </div>
    </>
  );
}

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
  const [textData, setTextData] = useState(null);
  const [sel, setSel] = useState({ caseId: '', pair: 0 });

  const note = (s) => setLog((l) => [...l, `${new Date().toLocaleTimeString()}  ${s}`]);

  const loadPlan = useCallback(async () => {
    try {
      const p = await call('GET', null, '?action=plan');
      setPlan(p);
      setSuite((cur) => cur || p.active?.suite || '');
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

  const loadText = async () => {
    try {
      setTextData(
        await call('GET', null, `?action=results&text=1&suite=${encodeURIComponent(suite)}`),
      );
    } catch (e) {
      setError(e.message);
    }
  };

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
    const id = suite || plan?.active?.suite;
    setSuite(id);
    setBusy(true);
    stop.current = false;
    for (let t = 1; t <= trials; t += 1)
      for (const c of plan?.cases || []) {
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

      {plan?.progress ? (
        <p className="smb-sub">
          Suite <strong>{plan.progress.suite}</strong>:{' '}
          {Object.entries(plan.progress.byPhase)
            .map(([ph, b]) => `phase ${ph} ${b.done}/${b.total}`)
            .join(' · ')}{' '}
          · spent {usd(plan.progress.spentUsd)} of ${plan.active?.maxUsd} cap. The worker runs this
          suite unattended until {plan.active?.until}.
        </p>
      ) : null}

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
                  <th>Pairs</th>
                </tr>
              </thead>
              <tbody>
                {plan.cases.map((c) => (
                  <tr key={c.id}>
                    <td>{c.category}</td>
                    <td>{c.depth}</td>
                    <td>{c.cells.length}</td>
                    <td>{c.pairs.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {results ? (
        <>
          <h2 className="smb-h2">Research quality, all cases</h2>
          <Table
            rows={[...results.overall].sort((a, b) => (b.quality ?? -1) - (a.quality ?? -1))}
          />
          <h2 className="smb-h2">Head to head, all cases</h2>
          <p className="smb-sub">
            Net win rate of the right-hand cell, from -1 to +1, across both judges and both answer
            orders.
          </p>
          <PairsTable pairs={results.pairs} />
          {Object.entries(results.perCase || {}).map(([caseId, rows]) => (
            <div key={caseId}>
              <h2 className="smb-h2">
                {plan?.cases.find((c) => c.id === caseId)?.category || caseId}
              </h2>
              <Table rows={rows} />
              <PairsTable pairs={results.pairsPerCase?.[caseId]} />
            </div>
          ))}

          <h2 className="smb-h2">Answers side by side</h2>
          <div className="smb-row">
            <select
              value={sel.caseId}
              onChange={(e) => setSel({ caseId: e.target.value, pair: 0 })}
              aria-label="Case"
            >
              <option value="">Choose a case</option>
              {(plan?.cases || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.category}
                </option>
              ))}
            </select>
            <select
              value={sel.pair}
              onChange={(e) => setSel((x) => ({ ...x, pair: Number(e.target.value) }))}
              aria-label="Comparison"
              disabled={!sel.caseId}
            >
              {(plan?.cases.find((c) => c.id === sel.caseId)?.pairs || []).map((p, i) => (
                <option key={`${p.left}|${p.right}`} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={loadText} disabled={!suite}>
              Load answers
            </button>
          </div>
          {sel.caseId ? (
            <SideBySide
              data={textData}
              caseId={sel.caseId}
              pair={plan?.cases.find((c) => c.id === sel.caseId)?.pairs[sel.pair]}
              cases={plan?.cases || []}
            />
          ) : null}

          {plan?.proposed?.length ? (
            <>
              <h2 className="smb-h2">Proposed next cases (not yet run)</h2>
              <div className="smb-table-wrap">
                <table className="smb-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Depth</th>
                      <th>Question</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.proposed.map((c) => (
                      <tr key={c.id}>
                        <td>{c.category}</td>
                        <td>{c.depth}</td>
                        <td className="smb-wrap">{c.query}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </>
      ) : null}

      <h2 className="smb-h2">Log</h2>
      <div className="smb-log">{log.join('\n') || 'Nothing run yet.'}</div>
    </main>
  );
}
