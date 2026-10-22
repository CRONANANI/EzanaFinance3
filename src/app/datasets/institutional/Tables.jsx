'use client';

/**
 * The two search tables (managers by reported value, securities by holders)
 * and the "How we source it" method section. Spec: 04-SPEC sections 4
 * (row G) and the Main artboard's method block.
 */
import { useMemo, useState } from 'react';
import { filingDay } from '@/lib/titans/institutional-model';
import { int, shortDate, signedInt, usd } from '@/lib/titans/format';
import { Card, M } from './ui';

function TableSearch({ value, onChange, label }) {
  return (
    <label className="inst-tsearch">
      <i className="bi bi-search" aria-hidden="true" />
      <span className="inst-sr">{label}</span>
      <input
        type="search"
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function ManagersTable({ overview, chip, chipPartial, onManager, onSecurity }) {
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (overview?.topFilers || []).filter(
      (r) => !t || (r.filer || '').toLowerCase().includes(t) || String(r.cik || '').includes(t),
    );
  }, [overview, q]);
  return (
    <Card
      id="inst-managers"
      icon="bi-diagram-3"
      eyebrow="Managers · by reported value"
      title="Find a manager"
      chip={`${chip} · ${int(overview?.filers) ?? M} filers`}
      chipPartial={chipPartial}
      sourceExtra="Amendments folded in: one filing per manager per quarter."
    >
      <TableSearch value={q} onChange={setQ} label="Filter the top managers" />
      <div className="inst-table-wrap">
        <table className="inst-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Manager</th>
              <th scope="col" className="inst-num">
                Reported value
              </th>
              <th scope="col" className="inst-num">
                Positions
              </th>
              <th scope="col">Top holding</th>
              <th scope="col">Filed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const lagDays =
                r.filedAt && overview?.quarter ? filingDay(overview.quarter, r.filedAt) : null;
              return (
                <tr key={r.cik || i}>
                  <td className="inst-mono inst-muted">{i + 1}</td>
                  <td>
                    <button type="button" className="inst-link" onClick={() => onManager(r.cik)}>
                      {r.filer || r.cik}
                    </button>
                    <span className="inst-mono inst-rowmeta">CIK {r.cik}</span>
                  </td>
                  <td className="inst-mono inst-num">{usd(r.valueUsd) ?? M}</td>
                  <td className="inst-mono inst-num">{int(r.positions) ?? M}</td>
                  <td>
                    {r.topTicker ? (
                      <>
                        <button
                          type="button"
                          className="inst-link inst-mono"
                          onClick={() => onSecurity(r.topTicker)}
                        >
                          {r.topTicker}
                        </button>
                        {r.topWeight != null ? (
                          <span className="inst-mono inst-rowmeta">
                            {(r.topWeight * 100).toFixed(1)}%
                          </span>
                        ) : null}
                      </>
                    ) : (
                      M
                    )}
                  </td>
                  <td className="inst-mono">
                    {r.filedAt
                      ? `${shortDate(r.filedAt)?.replace(/, \d{4}$/, '')}${lagDays != null ? ` · ${lagDays}d` : ''}`
                      : M}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="inst-empty">
            No manager in the top {int(overview?.topFilers?.length || 0)} matches. The search covers
            the loaded table.
          </p>
        ) : null}
      </div>
    </Card>
  );
}

export function SecuritiesTable({ overview, chip, chipPartial, onSecurity }) {
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (overview?.widelyHeld || []).filter(
      (r) =>
        !t ||
        (r.ticker || '').toLowerCase().includes(t) ||
        (r.issuer || '').toLowerCase().includes(t) ||
        (r.cusip || '').toLowerCase().includes(t),
    );
  }, [overview, q]);
  return (
    <Card
      id="inst-securities"
      icon="bi-funnel"
      eyebrow="Securities · by holders"
      title="Find a security"
      chip={chip}
      chipPartial={chipPartial}
      sourceExtra="No ticker mapped: issuer name shown."
    >
      <TableSearch value={q} onChange={setQ} label="Filter by ticker, issuer or CUSIP" />
      <div className="inst-table-wrap">
        <table className="inst-table">
          <thead>
            <tr>
              <th scope="col">Security</th>
              <th scope="col" className="inst-num">
                Holders
              </th>
              <th scope="col" className="inst-num">
                Δ holders
              </th>
              <th scope="col" className="inst-num">
                Combined value
              </th>
              <th scope="col" className="inst-num">
                Shares
              </th>
              <th scope="col" className="inst-num">
                Net breadth
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const dHolders =
                r.holdersPrior != null && r.holders != null ? r.holders - r.holdersPrior : null;
              return (
                <tr key={r.cusip}>
                  <td>
                    <button
                      type="button"
                      className="inst-link"
                      onClick={() => onSecurity(r.ticker || r.cusip)}
                    >
                      {r.ticker ? (
                        <span className="inst-mono">{r.ticker}</span>
                      ) : (
                        <strong>{r.issuer}</strong>
                      )}
                    </button>
                    <span className="inst-mono inst-rowmeta">
                      {r.ticker
                        ? `${r.issuer || ''} · ${r.cusip}`
                        : `No ticker mapped · ${r.cusip}`}
                    </span>
                  </td>
                  <td className="inst-mono inst-num">{int(r.holders) ?? M}</td>
                  <td className="inst-mono inst-num">
                    {dHolders != null ? signedInt(dHolders) : M}
                  </td>
                  <td className="inst-mono inst-num">{usd(r.valueUsd) ?? M}</td>
                  <td className="inst-mono inst-num">{int(r.shares) ?? M}</td>
                  <td className="inst-mono inst-num">
                    {r.netBreadth != null ? signedInt(r.netBreadth) : M}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="inst-empty">No security in the loaded table matches.</p>
        ) : null}
      </div>
    </Card>
  );
}

const METHOD = [
  [
    'Lag',
    'A 13F covers a quarter end and can be filed up to 45 days later. Everything here is a snapshot that was already weeks old when it became public.',
  ],
  [
    'Long only',
    'Form 13F reports long positions in US-listed securities. Shorts, most bonds, private holdings and non-US listings are not in it.',
  ],
  [
    'Options are notional',
    'A put or call line reports the value of the underlying shares, not the premium paid, and can be one half of a hedged trade.',
  ],
  [
    'Value moves with price',
    'Reported value changes with the market even when a manager does nothing. Flow figures here are built from share counts to separate buying from price.',
  ],
  [
    'Coverage',
    'Managers above $100M in covered US equities must file. Smaller managers are absent by law, not by choice.',
  ],
  [
    'Amendments',
    'A manager can amend a filing. The latest filing of record per manager and quarter is used, so figures can move for a few weeks after the deadline.',
  ],
];

export function MethodSection() {
  return (
    <section id="method" className="inst-method" aria-labelledby="inst-method-h">
      <h2 id="inst-method-h" className="inst-h2">
        How we source it
      </h2>
      <div className="inst-method-grid">
        {METHOD.map(([title, body]) => (
          <div key={title}>
            <p className="inst-eyebrow">{title}</p>
            <p className="inst-note">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
