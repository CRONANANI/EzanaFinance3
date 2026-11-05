'use client';

/**
 * SonarBudget: the fund's pooled deep research budget (Sonar Research >
 * Budget). Everyone sees the pool, what is used and left, when it resets
 * and their own runs. Executives also see every member's runs this month,
 * most used first, set the monthly pool and give members allocations.
 *
 * Tokens only (EZANA_BRANDING_GUIDE), Bootstrap Icons, prefix osr-.
 */
import { useCallback, useEffect, useState } from 'react';
import './org-sonar.css';

async function call(url, method = 'GET', body = null) {
  const r = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || 'That did not work. Try again.');
  return data;
}

const ROLE = { executive: 'Executive', portfolio_manager: 'Portfolio Manager', analyst: 'Analyst' };

export default function SonarBudget() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [pool, setPool] = useState('');
  const [alloc, setAlloc] = useState({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await call('/api/org/sonar-budget');
      setData(d);
      setPool(String(d.pool));
      setAlloc(
        Object.fromEntries(
          (d.members || []).map((m) => [
            m.userId,
            m.allocation == null ? '' : String(m.allocation),
          ]),
        ),
      );
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const allocations = (data.members || [])
        .filter((m) => (m.allocation == null ? '' : String(m.allocation)) !== alloc[m.userId])
        .map((m) => ({
          userId: m.userId,
          monthlyDeepRuns: alloc[m.userId] === '' ? null : Number(alloc[m.userId]),
        }));
      const body = {};
      if (Number(pool) !== data.pool || data.isDefault) body.monthlyDeepRuns = Number(pool);
      if (allocations.length) body.allocations = allocations;
      if (!Object.keys(body).length) {
        setBusy(false);
        return;
      }
      await call('/api/org/sonar-budget', 'PATCH', body);
      setSaved(true);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !data)
    return (
      <p className="osr-error" role="alert">
        {error}
      </p>
    );
  if (!data) return <p className="osr-muted">Loading the budget.</p>;

  const pct = data.pool ? Math.min(100, Math.round((data.used / data.pool) * 100)) : 100;
  const peak = Math.max(1, ...data.history.map((h) => h.runs));

  return (
    <div className="osr-budget">
      <section className="osr-meter-card" aria-label="This month">
        <div className="osr-meter-top">
          <div>
            <p className="osr-eyebrow">Deep research this month</p>
            <p className="osr-big">
              <span className="osr-mono">{data.used}</span>
              <span className="osr-muted"> of </span>
              <span className="osr-mono">{data.pool}</span>
            </p>
          </div>
          <div className="osr-meter-side">
            <p className="osr-mono osr-left">{data.remaining} left</p>
            <p className="osr-muted">Resets {data.resetsOn}</p>
          </div>
        </div>
        <div
          className="osr-meter"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={data.pool}
          aria-valuenow={data.used}
          aria-label="Deep research runs used"
        >
          <span
            className={`osr-meter-fill${pct >= 90 ? ' is-high' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="osr-muted">
          You have run <span className="osr-mono">{data.me.deepRuns}</span> this month
          {data.me.allocation != null ? (
            <>
              {' '}
              of your <span className="osr-mono">{data.me.allocation}</span>
            </>
          ) : null}
          . Standard and quick research do not use the budget.
        </p>
        <div className="osr-history" aria-label="Deep research runs, last six months">
          {data.history.map((h) => (
            <div key={h.month} className="osr-hist-col">
              <span
                className="osr-hist-bar"
                style={{ height: `${Math.max(4, (h.runs / peak) * 100)}%` }}
                title={`${h.month}: ${h.runs} runs`}
              />
              <span className="osr-hist-label osr-mono">{h.month.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      {data.viewer.canManage ? (
        <section className="osr-panel" aria-label="Budget settings">
          <p className="osr-h3">
            <i className="bi bi-sliders" aria-hidden="true" /> Budget and allocations
          </p>
          <label className="osr-field osr-field--inline">
            <span>Monthly pool (deep research runs, up to {data.maxPool})</span>
            <input
              type="number"
              min={0}
              max={data.maxPool}
              value={pool}
              onChange={(e) => setPool(e.target.value)}
            />
          </label>
          <div className="osr-table-wrap">
            <table className="osr-table">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Runs this month</th>
                  <th scope="col">Share</th>
                  <th scope="col">Monthly allocation</th>
                </tr>
              </thead>
              <tbody>
                {(data.members || []).map((m) => (
                  <tr key={m.userId}>
                    <td>
                      <span className="osr-name">{m.name}</span>
                      <span className="osr-muted"> {ROLE[m.role] || ''}</span>
                    </td>
                    <td className="osr-mono">{m.deepRuns}</td>
                    <td>
                      <span className="osr-share">
                        <span style={{ width: `${Math.round(m.share * 100)}%` }} />
                      </span>
                      <span className="osr-mono osr-muted"> {Math.round(m.share * 100)}%</span>
                    </td>
                    <td>
                      {m.active ? (
                        <input
                          type="number"
                          min={0}
                          max={data.maxPool}
                          placeholder="Pool"
                          aria-label={`Allocation for ${m.name}`}
                          value={alloc[m.userId] ?? ''}
                          onChange={(e) => setAlloc((a) => ({ ...a, [m.userId]: e.target.value }))}
                        />
                      ) : (
                        <span className="osr-muted">Not a member</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="osr-muted">
            Leave an allocation empty and the member draws from the pool until it is used.
          </p>
          {error ? (
            <p className="osr-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="osr-actions">
            <button
              type="button"
              className="osr-btn osr-btn--primary"
              disabled={busy}
              onClick={save}
            >
              Save budget
            </button>
            {saved ? <span className="osr-muted">Saved.</span> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
