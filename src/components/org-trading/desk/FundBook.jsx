'use client';

import { useMemo, useState } from 'react';
import {
  CHART_RANGES,
  NA,
  benchmarkInfo,
  fmtMoney,
  fmtSignedPct,
  toneOf,
} from '@/lib/org-command-center';
import { allocationSlices, fmtShare } from '@/lib/org-trading-desk';
import { stripDemoLabel } from '@/lib/org-display';
import {
  ArrowLink,
  Empty,
  Section,
  SectionError,
  Skel,
  TextToggle,
} from '@/components/org/command-center/parts';
import { FundChart } from '@/components/org/command-center/FundPerformance';

const R = 76;
const STROKE = 18;
const SIZE = 180;
const CIRC = 2 * Math.PI * R;

/**
 * Allocation by sector team. A donut with its total in the middle and its
 * legend beneath (branding guide, section 10). Each slice is also a legend
 * row with its name, value and share in words, so colour is never the only
 * signal. Shares of the fund are unsigned.
 */
function AllocationDonut({ slices, total }) {
  let acc = 0;
  return (
    <div className="otd-donut">
      <div className="otd-donut__ring">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={`Allocation by sector team. ${slices
            .map((s) => `${s.name} ${fmtShare(s.pct)}`)
            .join(', ')}.`}
        >
          <circle
            className="otd-donut__track"
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
          />
          {slices.map((s) => {
            const seg = total > 0 ? (s.value / total) * CIRC : 0;
            /* A hairline of ground between slices, so neighbours never merge. */
            const gap = slices.length > 1 ? Math.min(2, seg / 2) : 0;
            const el = (
              <circle
                key={s.id}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                strokeWidth={STROKE}
                stroke={s.color}
                strokeDasharray={`${Math.max(0, seg - gap)} ${CIRC - Math.max(0, seg - gap)}`}
                strokeDashoffset={-acc}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              >
                <title>{`${s.name}: ${fmtMoney(s.value)}, ${fmtShare(s.pct)} of the book`}</title>
              </circle>
            );
            acc += seg;
            return el;
          })}
        </svg>
        <div className="otd-donut__center">
          <span className="otd-donut__total tcc-mono">{fmtMoney(total)}</span>
          <span className="otd-donut__label">Book value</span>
        </div>
      </div>
      <ul className="otd-donut__legend">
        {slices.map((s) => (
          <li key={s.id}>
            <span className="otd-dot" style={{ background: s.color }} aria-hidden="true" />
            <span className="otd-donut__name" title={s.name}>
              {s.name}
            </span>
            <span className="tcc-mono otd-donut__value">{fmtMoney(s.value)}</span>
            <span className="tcc-mono otd-donut__pct">{fmtShare(s.pct)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectorTable({ sectors, unassigned }) {
  return (
    <div className="otd-scroll">
      <table className="otd-table otd-table--teams">
        <thead>
          <tr>
            <th scope="col" className="otd-rank">
              #
            </th>
            <th scope="col">Team</th>
            <th scope="col" className="otd-num">
              Value
            </th>
            <th scope="col" className="otd-num">
              Return on cost
            </th>
            <th scope="col">Top three holdings</th>
          </tr>
        </thead>
        <tbody>
          {sectors.map((s, i) => (
            <tr key={s.teamId}>
              <td className="otd-rank tcc-mono">{i + 1}</td>
              <td role="rowheader" className="otd-strong">
                {stripDemoLabel(s.name)}
              </td>
              <td className="otd-num tcc-mono">{fmtMoney(s.value)}</td>
              <td className={`otd-num tcc-mono tcc-${toneOf(s.roiPct)}`}>
                {fmtSignedPct(s.roiPct)}
              </td>
              <td className="tcc-mono otd-tickers">
                {s.tickers?.length ? s.tickers.join('  ') : NA}
              </td>
            </tr>
          ))}
          {unassigned > 0 && (
            <tr>
              <td className="otd-rank tcc-mono" />
              <td role="rowheader" className="otd-strong">
                Unassigned
              </td>
              <td className="otd-num tcc-mono">{fmtMoney(unassigned)}</td>
              <td className="otd-num tcc-mono tcc-na">{NA}</td>
              <td className="tcc-mono otd-tickers tcc-na">{NA}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Fund book: where the fund's money sits (by sector team), how its value has
 * moved against the benchmark, and each team's return on cost. Fund-level, so
 * it reads the same for every role, as it does on the Command Center.
 */
export function FundBook({ summary, book, onRetry, canAdd, onAdd }) {
  const [range, setRange] = useState('YTD');
  const loading = summary.status === 'loading' || book.status === 'loading';
  const failed = summary.status === 'error' || book.status === 'error';
  const perf = summary.data?.performance || null;
  const bench = benchmarkInfo(perf);
  const benchLabel = bench.estimated
    ? 'Same cost at the pitch benchmark (est.)'
    : bench.label === NA
      ? 'Same cost in the benchmark'
      : `Same cost in ${bench.label}`;

  const alloc = useMemo(
    () => allocationSlices(summary.data?.sectors, book.data?.positions),
    [summary.data, book.data],
  );
  const ranked = (summary.data?.sectors || []).filter((s) => Number(s.value) > 0);
  const unassigned = alloc.slices.find((s) => s.id === 'unassigned')?.value || 0;
  const empty = !loading && !failed && (book.data?.positions || []).length === 0;

  return (
    <Section id="otd-fund" title="Fund book" className="otd-fund">
      {failed ? (
        <SectionError message="Could not load the fund book." onRetry={onRetry} />
      ) : empty ? (
        <Empty action={canAdd ? 'Add position' : null} onAction={canAdd ? onAdd : null}>
          No positions are recorded yet. The fund book fills in once holdings are added or imported.
        </Empty>
      ) : (
        <div aria-busy={loading || undefined}>
          <div className="otd-fund__top">
            <div className="otd-fund__alloc">
              <h3 className="otd-sub">Allocation by sector team</h3>
              {loading ? (
                <div className="otd-donut">
                  <Skel w={SIZE} h={SIZE} className="otd-skel--ring" />
                  <Skel h={72} />
                </div>
              ) : (
                <AllocationDonut slices={alloc.slices} total={alloc.total} />
              )}
            </div>
            <div className="otd-fund__chart">
              <div className="otd-subhead">
                <h3 className="otd-sub">Fund value and benchmark</h3>
                <div className="tcc-toggles" role="group" aria-label="Chart period">
                  {CHART_RANGES.map((r) => (
                    <TextToggle key={r} mono pressed={range === r} onClick={() => setRange(r)}>
                      {r}
                    </TextToggle>
                  ))}
                </div>
              </div>
              {loading ? (
                <Skel h={216} />
              ) : (
                <FundChart
                  snapshots={summary.data?.snapshots || []}
                  benchLabel={benchLabel}
                  range={range}
                />
              )}
            </div>
          </div>

          <div className="otd-subhead otd-subhead--spaced">
            <h3 className="otd-sub">Sector teams ranked by return</h3>
            <ArrowLink href="/org-team-hub/fund-analytics">Open fund analytics</ArrowLink>
          </div>
          {loading ? (
            <div className="otd-skelrows">
              {[0, 1, 2, 3].map((i) => (
                <Skel key={i} h={14} />
              ))}
            </div>
          ) : ranked.length === 0 && !unassigned ? (
            <Empty href="/org-team-hub/org-chart" action="Open org chart">
              No sector team holds a position yet.
            </Empty>
          ) : (
            <SectorTable sectors={ranked} unassigned={unassigned} />
          )}
        </div>
      )}
    </Section>
  );
}
