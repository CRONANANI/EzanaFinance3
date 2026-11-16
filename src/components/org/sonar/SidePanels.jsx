'use client';

/**
 * The side column of Sonar Research: the fund's deep research budget, the
 * approved coverage that has gone stale, and research quality per member
 * (an analyst sees their own line only; the server decides).
 */
import { Empty, Section, SectionError } from '@/components/org/command-center/parts';
import {
  NA,
  STALE_DAYS,
  fmtDate,
  fmtMonth,
  fmtPct,
  resetDay,
  runAllowance,
  staleCoverage,
} from '@/lib/org-sonar-research-model';
import { TableSkeleton } from './parts';

export function BudgetSection({ state, onRetry, onSettings, id = 'osp-budget' }) {
  const b = state.data;
  const canManage = Boolean(b?.viewer?.canManage);
  const loading = state.status === 'loading';
  const allowance = runAllowance(b);
  const peak = Math.max(1, ...(b?.history || []).map((h) => h.runs));
  return (
    <Section
      id={id}
      title="Fund budget"
      aside={
        canManage && onSettings ? (
          <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onSettings}>
            Budget settings
          </button>
        ) : null
      }
    >
      {loading ? (
        <div aria-busy="true">
          <TableSkeleton rows={4} />
        </div>
      ) : state.status !== 'ready' ? (
        <SectionError message="Could not load the fund budget." onRetry={onRetry} />
      ) : (
        <>
          <dl className="tcc-pairs osp-pairs">
            <div className="tcc-pair">
              <dt>Deep runs left this month</dt>
              <dd className="tcc-mono">
                <span className={allowance.reason === 'pool' ? 'tcc-warn' : ''}>{b.remaining}</span>{' '}
                of {b.pool}
              </dd>
            </div>
            <div className="tcc-pair">
              <dt>Resets</dt>
              <dd className="tcc-mono">{resetDay(b)}</dd>
            </div>
            <div className="tcc-pair">
              <dt>Your runs this month</dt>
              <dd className="tcc-mono">
                <span className={allowance.reason === 'allocation' ? 'tcc-warn' : ''}>
                  {b.me?.deepRuns ?? NA}
                </span>
                {b.me?.allocation != null ? ` of ${b.me.allocation}` : ''}
              </dd>
            </div>
            <div className="tcc-pair">
              <dt>Your allocation</dt>
              <dd className={b.me?.allocation == null ? '' : 'tcc-mono'}>
                {b.me?.allocation == null ? 'Draws from the pool' : b.me.allocation}
              </dd>
            </div>
          </dl>
          <p className="osp-caption">Deep runs, last six months</p>
          <div className="osp-bars" role="list" aria-label="Deep research runs, last six months">
            {(b.history || []).map((h) => (
              <div
                key={h.month}
                className="osp-bar"
                role="listitem"
                aria-label={`${fmtMonth(h.month)}: ${h.runs} runs`}
              >
                <span className="osp-bar__val tcc-mono">{h.runs}</span>
                <span
                  className="osp-bar__fill"
                  style={{ height: `${Math.max(2, Math.round((h.runs / peak) * 56))}px` }}
                  aria-hidden="true"
                />
                <span className="osp-bar__month tcc-mono">{fmtMonth(h.month)}</span>
              </div>
            ))}
          </div>
          <p className="osp-caption">Standard research does not use the budget.</p>
        </>
      )}
    </Section>
  );
}

export function CoverageSection({ state, onRetry, onTicker }) {
  const loading = state.status === 'loading';
  const rows = state.status === 'ready' ? staleCoverage(state.data?.coverage) : [];
  return (
    <Section
      id="osp-stale"
      title="Coverage at risk"
      aside={
        state.status === 'ready' ? <span className="osp-aside tcc-mono">{rows.length}</span> : null
      }
    >
      <p className="osp-caption osp-caption--top">
        Approved research older than {STALE_DAYS} days.
      </p>
      {loading ? (
        <TableSkeleton rows={3} />
      ) : state.status !== 'ready' ? (
        <SectionError message="Could not load coverage." onRetry={onRetry} />
      ) : !rows.length ? (
        <Empty>No approved research is older than {STALE_DAYS} days.</Empty>
      ) : (
        <div className="osp-scroll">
          <table className="osp-table osp-table--side">
            <thead>
              <tr>
                <th scope="col">Ticker</th>
                <th scope="col">Last approved</th>
                <th scope="col" className="osp-num">
                  Days
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 6).map((c) => (
                <tr
                  key={`${c.sector}|${c.ticker}`}
                  onClick={c.ticker ? () => onTicker(c.ticker) : undefined}
                  className={c.ticker ? '' : 'osp-static'}
                >
                  <td>
                    {c.ticker ? (
                      <button
                        type="button"
                        className="osp-open"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTicker(c.ticker);
                        }}
                        title={`Show reports on ${c.ticker}`}
                      >
                        <i className="bi bi-exclamation-triangle tcc-warn" aria-hidden="true" />
                        <span className="tcc-ticker tcc-mono">{c.ticker}</span>
                        <span className="tcc-sr">stale</span>
                      </button>
                    ) : (
                      <span className="tcc-na">{c.sector}</span>
                    )}
                  </td>
                  <td className="tcc-mono">{fmtDate(c.lastApproved)}</td>
                  <td className="osp-num tcc-mono tcc-warn">{c.staleDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

export function QualitySection({ state, onRetry, onOpenAnalytics }) {
  const loading = state.status === 'loading';
  const seesEveryone = Boolean(state.data?.viewer?.seesEveryone);
  const rows = [...(state.data?.members || [])]
    .filter((m) => m.reports || m.deepRuns || !seesEveryone)
    .slice(0, 6);
  return (
    <Section
      id="osp-quality"
      title={seesEveryone || loading ? 'Research quality' : 'Your research quality'}
      aside={
        onOpenAnalytics ? (
          <button
            type="button"
            className="tcc-textbtn tcc-textbtn--accent"
            onClick={onOpenAnalytics}
          >
            Analytics
          </button>
        ) : null
      }
    >
      {loading ? (
        <TableSkeleton rows={4} />
      ) : state.status !== 'ready' ? (
        <SectionError message="Could not load research quality." onRetry={onRetry} />
      ) : !rows.length ? (
        <Empty>No research in this window yet.</Empty>
      ) : (
        <div className="osp-scroll">
          <table className="osp-table osp-table--side">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col" className="osp-num">
                  Approved
                </th>
                <th
                  scope="col"
                  className="osp-num"
                  title="Share of claims that passed Sonar's checks"
                >
                  Claims
                </th>
                <th scope="col" className="osp-num" title="Conclusions that held under challenge">
                  Held
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.userId} className="osp-static">
                  <td className="osp-wrap">{m.name}</td>
                  <td className="osp-num tcc-mono">{m.approved}</td>
                  <td
                    className={`osp-num tcc-mono${Number.isFinite(m.claimSupport) ? '' : ' tcc-na'}`}
                  >
                    {fmtPct(m.claimSupport)}
                  </td>
                  <td className={`osp-num tcc-mono${m.challengesFaced ? '' : ' tcc-na'}`}>
                    {m.challengesFaced ? fmtPct(m.heldRate) : NA}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
