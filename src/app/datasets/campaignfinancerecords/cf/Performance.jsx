'use client';

/**
 * 03 Campaign financial performance: FinancialTrajectory,
 * ContributionSizeFingerprint, SpendingFingerprint.
 */
import { useMemo, useState } from 'react';
import { SIZE_BUCKETS } from '@/lib/campaign-finance/aggregate';
import { longDate, money, pct, share } from './format';

const compactInt = (v) =>
  v
    ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
    : null;
import { Bar, CardFoot, CFCardState, Kpi, MemberPicker, Pills } from './ui';
import { useMemberDetail } from './useMember';

export function FinancialTrajectory({ data, updated }) {
  const t = data?.totals || {};
  const through = longDate(data?.latestPeriodEnd);
  return (
    <CFCardState
      span={12}
      title="Receipts, spending and cash trajectory"
      sub="The four measures at each reporting period, cumulative within each cycle"
      state={data?.ready ? 'ready' : 'unavailable'}
      bodyHeight={300}
      footer={<CardFoot updated={updated} />}
    >
      <div className="cfi-traj">
        <div className="cfi-traj-now">
          <p className="cfi-eyebrow">{through ? `Through ${through}` : 'Latest period'}</p>
          <div className="cfi-kpis cfi-kpis--stack">
            <Kpi label="Receipts" value={money(t.raised)} />
            <Kpi label="Spent" value={money(t.spent)} />
            <Kpi label="Cash on hand" value={money(t.cash)} />
            <Kpi label="Debt" value={money(t.debt)} tone="amber" />
          </div>
          <p className="cfi-note">
            Change against the same point in the previous cycle appears once earlier reporting
            periods are available.
          </p>
        </div>
        <div className="cfi-traj-chart" role="img" aria-label="Trajectory chart, not available yet">
          <p className="cfi-state-note">Not available yet</p>
          <p className="cfi-note">
            The cumulative chart needs every reporting period of this cycle and the two before it. A
            trend is never drawn from a single snapshot.
          </p>
        </div>
      </div>
    </CFCardState>
  );
}

const SEG = ['is-s1', 'is-s2', 'is-s3', 'is-s4', 'is-s5'];

function SizeRow({ label, sizes, mode, strong }) {
  if (!sizes || !sizes.dollars) {
    return (
      <li className="cfi-size-row">
        <span className={strong ? 'cfi-strong' : undefined}>{label}</span>
        <span className="cfi-muted">Not available yet</span>
        <span />
      </li>
    );
  }
  const vals = mode === 'count' ? sizes.counts.map((c) => c || 0) : sizes.dollars;
  const start = mode === 'count' ? 1 : 0;
  const total = vals.slice(start).reduce((s, v) => s + v, 0);
  const under = mode === 'count' ? compactInt(total) : pct(sizes.dollars[0], total);
  return (
    <li className="cfi-size-row">
      <span className={strong ? 'cfi-strong' : undefined}>{label}</span>
      <span
        className="cfi-stack cfi-stack--thin"
        role="img"
        aria-label={SIZE_BUCKETS.slice(start)
          .map((b, i) => `${b.label} ${pct(vals[i + start], total) || '0%'}`)
          .join(', ')}
      >
        {vals.slice(start).map((v, i) => (
          <span
            key={SIZE_BUCKETS[i + start].key}
            className={`cfi-stack-seg ${SEG[i + start]}`}
            style={{ width: `${(share(v, total) || 0) * 100}%` }}
            title={`${SIZE_BUCKETS[i + start].label}: ${
              mode === 'count' ? `${Math.round(v).toLocaleString('en-US')} contributions` : money(v)
            }`}
          />
        ))}
      </span>
      <span className="cfi-mono r cfi-accent">{under ?? 'n/a'}</span>
    </li>
  );
}

export function ContributionSizeFingerprint({ data, updated }) {
  const [mode, setMode] = useState('dollars');
  const members = useMemo(() => data?.members || [], [data]);
  const withSizes = useMemo(() => members.filter((m) => m.sizes), [members]);
  const defaultId = useMemo(
    () => [...withSizes].sort((a, b) => (b.raised || 0) - (a.raised || 0))[0]?.id || null,
    [withSizes],
  );
  const [picked, setPicked] = useState(null);
  const memberId = picked || defaultId;
  const member = members.find((m) => m.id === memberId) || null;
  const s = data?.sizes || {};
  return (
    <CFCardState
      span={6}
      title="Contribution size fingerprint"
      sub="How much arrives in small checks versus large ones"
      actions={
        <Pills
          label="Show"
          value={mode}
          onChange={setMode}
          size="sm"
          options={[
            { key: 'dollars', label: 'Dollars' },
            { key: 'count', label: 'Count' },
          ]}
        />
      }
      state={data?.ready && s.all?.n ? 'ready' : 'unavailable'}
      bodyHeight={280}
      footer={
        <CardFoot updated={updated} covered={s.all?.n ?? 0} label="members with size detail" />
      }
    >
      <ul className="cfi-sizes">
        <SizeRow label="All of Congress" sizes={s.all} mode={mode} strong />
        <SizeRow label="Democrats" sizes={s.D} mode={mode} />
        <SizeRow label="Republicans" sizes={s.R} mode={mode} />
        <SizeRow label="House" sizes={s.H} mode={mode} />
        <SizeRow label="Senate" sizes={s.S} mode={mode} />
        <SizeRow
          label={member?.name || 'Selected member'}
          sizes={member?.sizes}
          mode={mode}
          strong
        />
      </ul>
      <div className="cfi-row-split">
        <MemberPicker members={withSizes} value={memberId} onChange={setPicked} />
        <span className="cfi-legend">
          {SIZE_BUCKETS.map((b, i) =>
            mode === 'count' && i === 0 ? null : (
              <span key={b.key}>
                <i className={`cfi-key ${SEG[i]}`} aria-hidden="true" />
                {b.label}
              </span>
            ),
          )}
        </span>
      </div>
      <p className="cfi-note">
        {mode === 'count'
          ? 'Counts cover itemized contributions of $200 and up. Money under $200 is reported as a total only, so it is left out of the count view. Right column is the number of contributions.'
          : 'Right column is the under $200 share. Members without size detail are left out of each row, not counted as zero.'}
      </p>
    </CFCardState>
  );
}

function PurposeTable({ rows }) {
  const total = rows.reduce((s, r) => s + r.total, 0);
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <table className="cfi-table cfi-table--compact">
      <thead>
        <tr>
          <th scope="col">Purpose</th>
          <th scope="col" aria-label="Relative amount" />
          <th scope="col" className="r">
            Amount
          </th>
          <th scope="col" className="r">
            Share
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.code}>
            <td>{r.label}</td>
            <td className="cfi-bar-cell">
              <Bar value={r.total / max} />
            </td>
            <td className="cfi-mono r">{money(r.total)}</td>
            <td className="cfi-mono r cfi-muted">{pct(r.total, total, 1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SpendingFingerprint({ data, updated, cycle }) {
  const [memberId, setMemberId] = useState(null);
  const members = useMemo(() => (data?.members || []).filter((m) => m.hasPurposes), [data]);
  const detail = useMemberDetail(memberId, cycle);
  const congress = data?.purposes || [];
  let state = data?.ready && congress.length ? 'ready' : 'unavailable';
  let rows = congress;
  if (memberId) {
    if (detail.status === 'loading') state = 'loading';
    else if (detail.status === 'error') state = 'error';
    else rows = detail.member?.purposes || [];
    if (detail.status === 'ready' && !rows.length) state = 'empty';
  }
  return (
    <CFCardState
      span={6}
      title="Campaign spending fingerprint"
      sub="How campaigns spend their own money, by reported purpose"
      actions={
        <MemberPicker
          members={members}
          value={memberId}
          onChange={setMemberId}
          allLabel="All of Congress"
        />
      }
      state={state}
      onRetry={detail.retry}
      bodyHeight={280}
      footer={
        <CardFoot
          updated={updated}
          covered={data?.coverage?.purposes ?? 0}
          label="members with spending detail"
        />
      }
    >
      <PurposeTable rows={rows} />
      <p className="cfi-note">
        Other is shown in full. Campaigns report no finer split for it. Totals add each
        campaign&apos;s largest reported purposes.
      </p>
    </CFCardState>
  );
}
