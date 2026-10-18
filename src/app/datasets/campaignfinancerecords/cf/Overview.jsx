'use client';

/**
 * 02 The money behind Congress: MoneyMap, FundingComposition,
 * PartyComparison, ChamberComparison.
 */
import { useState } from 'react';
import { int, money, pct, share } from './format';
import { Bar, CardFoot, CFCardState, Kpi, Pills } from './ui';

const MEASURES = [
  { key: 'raised', label: 'Raised' },
  { key: 'cash', label: 'Cash on hand' },
  { key: 'spent', label: 'Spent' },
  { key: 'debt', label: 'Debt' },
];

export function MoneyMap({ data, updated }) {
  const t = data?.totals || {};
  const rows = [
    { key: 'raised', label: 'Raised', value: t.raised },
    { key: 'spent', label: 'Spent', value: t.spent },
    { key: 'cash', label: 'Cash on hand', value: t.cash },
    { key: 'debt', label: 'Debt', value: t.debt, tone: 'amber' },
    { key: 'pac', label: 'PAC money', value: t.pac },
  ];
  const n = data?.coverage?.members ?? 0;
  return (
    <CFCardState
      span={8}
      title="Congressional money map"
      sub={`Five measures across ${n} campaign committees, each drawn on the same ruler`}
      state={data?.ready ? 'ready' : 'unavailable'}
      bodyHeight={260}
      footer={<CardFoot updated={updated} covered={n} />}
    >
      <div className="cfi-kpis cfi-kpis--5">
        {rows.map((r) => (
          <Kpi key={r.key} label={r.label} value={money(r.value)} tone={r.tone} />
        ))}
      </div>
      <p className="cfi-eyebrow cfi-mt">Relative size, scaled to receipts</p>
      <ul className="cfi-bars">
        {rows.map((r) => (
          <li key={r.key}>
            <span>{r.label}</span>
            <Bar
              value={share(r.value, t.raised)}
              tone={r.tone || 'emerald'}
              label={`${r.label} ${pct(r.value, t.raised) || ''} of receipts`}
            />
            <span className="cfi-mono r">{pct(r.value, t.raised) ?? 'n/a'}</span>
          </li>
        ))}
      </ul>
      <p className="cfi-note">
        Each measure is reported on its own. Receipts minus spending will not equal cash on hand,
        because cash carries over between cycles and transfers, refunds and loans move money in and
        out.
      </p>
    </CFCardState>
  );
}

const COMP_LABELS = {
  itemized: 'Itemized individual',
  pac: 'PAC',
  other: 'All other receipts',
};

export function FundingComposition({ data, updated }) {
  const comp = data?.composition || null;
  const total = comp ? comp.reduce((s, c) => s + (c.amount || 0), 0) : 0;
  return (
    <CFCardState
      span={4}
      title="Funding composition"
      sub="What congressional receipts are made of"
      state={comp ? 'ready' : 'unavailable'}
      bodyHeight={260}
      footer={<CardFoot updated={updated} />}
    >
      {comp ? <CompositionBody comp={comp} total={total} /> : null}
    </CFCardState>
  );
}

function CompositionBody({ comp, total }) {
  return (
    <>
      <div
        className="cfi-stack"
        role="img"
        aria-label={comp.map((c) => `${COMP_LABELS[c.key]} ${pct(c.amount, total, 1)}`).join(', ')}
      >
        {comp.map((c) => (
          <span
            key={c.key}
            className={`cfi-stack-seg is-${c.key}`}
            style={{ width: `${(share(c.amount, total) || 0) * 100}%` }}
          />
        ))}
      </div>
      <table className="cfi-table cfi-table--compact">
        <tbody>
          {comp.map((c) => (
            <tr key={c.key}>
              <td>
                <i className={`cfi-key is-${c.key}`} aria-hidden="true" />
                {COMP_LABELS[c.key]}
              </td>
              <td className="cfi-mono r">{money(c.amount)}</td>
              <td className="cfi-mono r cfi-muted">{pct(c.amount, total, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="cfi-note">
        Itemized means donors giving more than $200 in aggregate; unitemized is everything below
        that. Unitemized individual money, party committees, transfers and other receipts are shown
        together until their split is available.
      </p>
    </>
  );
}

const STAT = { totals: 'total', median: 'median', average: 'average' };

export function PartyComparison({ data, updated }) {
  const [mode, setMode] = useState('totals');
  const byParty = data?.byParty || {};
  const parties = ['D', 'R', 'I'].filter((p) => byParty[p]?.n);
  const stat = STAT[mode];
  let max = 0;
  for (const m of MEASURES) {
    for (const p of parties) max = Math.max(max, byParty[p][m.key]?.[stat] || 0);
  }
  const label =
    mode === 'totals' ? 'Total' : mode === 'median' ? 'Median per member' : 'Average per member';
  return (
    <CFCardState
      span={6}
      title="Party financial comparison"
      sub="Totals and per member figures, so group size does not do the talking"
      actions={
        <Pills
          label="Measure"
          value={mode}
          onChange={setMode}
          size="sm"
          options={[
            { key: 'totals', label: 'Totals' },
            { key: 'median', label: 'Median per member' },
            { key: 'average', label: 'Average per member' },
          ]}
        />
      }
      state={data?.ready && parties.length ? 'ready' : 'unavailable'}
      bodyHeight={240}
      footer={<CardFoot updated={updated}>Bars share one scale across parties</CardFoot>}
    >
      <div className="cfi-table-wrap">
        <table className="cfi-table cfi-cmp">
          <thead>
            <tr>
              <th scope="col">{label}</th>
              {parties.map((p) => (
                <th key={p} scope="col">
                  <span
                    className={`cfi-party ${p === 'D' ? 'is-dem' : p === 'R' ? 'is-rep' : 'is-ind'}`}
                  >
                    <i className="cfi-dot" aria-hidden="true" />
                    {p === 'D' ? 'Democratic' : p === 'R' ? 'Republican' : 'Independent'}
                  </span>{' '}
                  <span className="cfi-mono cfi-muted">n={byParty[p].n}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEASURES.map((m) => (
              <tr key={m.key}>
                <th scope="row">{m.label}</th>
                {parties.map((p) => {
                  const v = byParty[p][m.key]?.[stat];
                  return (
                    <td key={p}>
                      <b className="cfi-mono">{money(v) ?? 'n/a'}</b>
                      <Bar
                        value={max ? (v || 0) / max : 0}
                        tone={p === 'D' ? 'dem' : p === 'R' ? 'rep' : 'ind'}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CFCardState>
  );
}

export function ChamberComparison({ data, updated }) {
  const byChamber = data?.byChamber || {};
  const chambers = [
    { key: 'H', name: 'House' },
    { key: 'S', name: 'Senate' },
  ].filter((c) => byChamber[c.key]?.n);
  return (
    <CFCardState
      span={6}
      title="House versus Senate"
      sub="Chamber totals with per member comparisons"
      state={data?.ready && chambers.length ? 'ready' : 'unavailable'}
      bodyHeight={240}
      footer={<CardFoot updated={updated} />}
    >
      <div className="cfi-chambers">
        {chambers.map((c) => (
          <div key={c.key} className="cfi-chamber">
            <h4>
              {c.name} <span className="cfi-mono cfi-muted">{int(byChamber[c.key].n)} members</span>
            </h4>
            <table className="cfi-table cfi-table--compact">
              <thead>
                <tr>
                  <th scope="col">Measure</th>
                  <th scope="col" className="r">
                    Total
                  </th>
                  <th scope="col" className="r">
                    Median
                  </th>
                </tr>
              </thead>
              <tbody>
                {MEASURES.map((m) => (
                  <tr key={m.key}>
                    <th scope="row">{m.label}</th>
                    <td className="cfi-mono r">
                      <b>{money(byChamber[c.key][m.key]?.total) ?? 'n/a'}</b>
                    </td>
                    <td className="cfi-mono r">
                      {money(byChamber[c.key][m.key]?.median) ?? 'n/a'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <p className="cfi-note">
        Both chambers report on the same two year cycle, but senators serve six year terms and many
        are not on this year&apos;s ballot.
      </p>
    </CFCardState>
  );
}
