'use client';

/**
 * Budget settings (executives): the fund's monthly pool of deep research
 * runs, each member's runs this month and their monthly allocation. The
 * server checks the executive role, the pool's upper limit and every value
 * again. An empty allocation means the member draws from the pool.
 */
import { useEffect, useState } from 'react';
import { Modal } from '@/components/ds';
import { NA, fmtPct } from '@/lib/org-sonar-research-model';

const ROLE = { executive: 'Executive', portfolio_manager: 'Portfolio manager', analyst: 'Analyst' };

export function BudgetSettingsDialog({ open, budget, onClose, onSave, sampleActive }) {
  const [pool, setPool] = useState('');
  const [alloc, setAlloc] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !budget) return;
    setPool(String(budget.pool ?? ''));
    setAlloc(
      Object.fromEntries(
        (budget.members || []).map((m) => [
          m.userId,
          m.allocation == null ? '' : String(m.allocation),
        ]),
      ),
    );
    setError(null);
  }, [open, budget]);

  if (!open || !budget) return null;
  const max = budget.maxPool ?? 500;
  const members = budget.members || [];

  const whole = (v) => /^\d+$/.test(String(v).trim());
  const poolBad = !whole(pool) || Number(pool) > max;
  const badAlloc = members.find(
    (m) => alloc[m.userId] !== '' && (!whole(alloc[m.userId]) || Number(alloc[m.userId]) > max),
  );

  const save = async () => {
    if (poolBad) {
      setError(`The monthly pool is a whole number of runs, up to ${max}.`);
      return;
    }
    if (badAlloc) {
      setError(`An allocation is a whole number up to ${max}. Check ${badAlloc.name}.`);
      return;
    }
    const allocations = members
      .filter((m) => (m.allocation == null ? '' : String(m.allocation)) !== alloc[m.userId])
      .map((m) => ({
        userId: m.userId,
        monthlyDeepRuns: alloc[m.userId] === '' ? null : Number(alloc[m.userId]),
      }));
    const poolChanged = Number(pool) !== budget.pool || budget.isDefault;
    if (!poolChanged && !allocations.length) {
      onClose();
      return;
    }
    setBusy(true);
    setError(null);
    const res = await onSave({
      type: 'budget',
      pool: poolChanged ? Number(pool) : undefined,
      allocations,
    });
    setBusy(false);
    if (res.ok) onClose(res);
    else setError(res.error || 'The budget was not saved.');
  };

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      title="Budget settings"
      size={720}
      className="osp-dialog"
      footer={
        <div className="osp-dialog__footer">
          <button type="button" className="tcc-textbtn" onClick={() => onClose()}>
            Cancel
          </button>
          <button type="button" className="tcc-btn" onClick={save} disabled={busy}>
            {busy ? 'Saving' : 'Save budget'}
          </button>
        </div>
      }
    >
      <p className="osp-dialog__lead">
        Deep research for the whole fund draws on one monthly pool. Leave an allocation empty and
        the member draws from the pool until it is used.
        {sampleActive ? ' Sample content: changes stay on this page and are not saved.' : ''}
      </p>
      <label className="osp-field osp-field--inline">
        <span>Monthly pool (deep research runs, up to {max})</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={pool}
          onChange={(e) => setPool(e.target.value)}
          aria-invalid={poolBad || undefined}
        />
      </label>
      <div className="osp-scroll">
        <table className="osp-table osp-table--dialog">
          <thead>
            <tr>
              <th scope="col">Member</th>
              <th scope="col" className="osp-num">
                Runs this month
              </th>
              <th scope="col" className="osp-num">
                Share
              </th>
              <th scope="col" className="osp-num">
                Monthly allocation
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="osp-static">
                <td>
                  <span className="osp-two">
                    <span>{m.name}</span>
                    <span className="osp-sub">{ROLE[m.role] || NA}</span>
                  </span>
                </td>
                <td className="osp-num tcc-mono">{m.deepRuns}</td>
                <td className="osp-num tcc-mono">{fmtPct(m.share)}</td>
                <td className="osp-num">
                  {m.active ? (
                    <input
                      className="osp-alloc tcc-mono"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={max}
                      placeholder="Pool"
                      aria-label={`Monthly allocation for ${m.name}`}
                      value={alloc[m.userId] ?? ''}
                      onChange={(e) => setAlloc((a) => ({ ...a, [m.userId]: e.target.value }))}
                    />
                  ) : (
                    <span className="tcc-na">Not a member</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? (
        <p className="osp-error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
