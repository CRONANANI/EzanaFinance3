'use client';

/**
 * Card 10, Disclosures: the filings themselves. Three modes, issue chips
 * (three plus a count), View opens the filing modal. CSV for signed-in users.
 */
import { useState } from 'react';
import { filingsCsv } from '@/lib/lobbying/page-model';
import { fmtCount, fmtDate, fmtSpend } from '@/lib/lobbying/page-format';
import { Card, Segmented, SkelRows, Tick } from './ui';

const MODES = [
  { value: 'public', label: 'Public companies' },
  { value: 'largest', label: 'Largest' },
  { value: 'recent', label: 'Most recent' },
];
const CSV_PAGES = 5;

function Issues({ list }) {
  const shown = (list || []).slice(0, 3);
  const more = (list || []).length - shown.length;
  return (
    <span className="lbx-issue-chips">
      {shown.map((i) => (
        <span key={i} className="lbx-ichip" title={i}>
          {i}
        </span>
      ))}
      {more > 0 ? <span className="lbx-mono lbx-faint">+{more}</span> : null}
    </span>
  );
}

export default function DisclosuresCard({
  view,
  mode,
  setMode,
  page,
  setPage,
  baseQuery,
  signedIn,
  sub,
  empty,
  onReset,
  onOpenFiling,
}) {
  const [exporting, setExporting] = useState(false);
  const rows = view.data?.rows || [];
  const total = Number(view.data?.count) || 0;
  const from = rows.length ? (page - 1) * 25 + 1 : 0;
  const to = (page - 1) * 25 + rows.length;
  const isEmpty = view.status === 'ready' && !rows.length;

  async function exportCsv() {
    setExporting(true);
    try {
      const all = [];
      for (let p = 1; p <= CSV_PAGES; p += 1) {
        const r = await fetch(`/api/lobbying/page?${baseQuery}&page=${p}&pageSize=100`);
        const j = await r.json();
        const batch = j?.data?.rows || [];
        all.push(...batch);
        if (batch.length < 100) break;
      }
      const url = URL.createObjectURL(new Blob([filingsCsv(all)], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `lobbying-disclosures-${mode}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* the link stays usable; nothing to clean up */
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card
      id="lbx-table"
      title="Disclosures"
      sub={sub}
      right={
        <div className="lbx-table-tools">
          <Segmented label="Table mode" value={mode} options={MODES} onChange={setMode} />
          {signedIn ? (
            <button type="button" className="lbx-link" onClick={exportCsv} disabled={exporting}>
              <i className="bi bi-download" aria-hidden="true" />{' '}
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          ) : (
            <span
              className="lbx-link is-disabled"
              title="Sign in to export CSV"
              aria-disabled="true"
            >
              <i className="bi bi-download" aria-hidden="true" /> Export CSV
              <span className="lbx-sr"> (sign in to export)</span>
            </span>
          )}
        </div>
      }
      status={view.status}
      onRetry={view.retry}
      empty={isEmpty ? empty : null}
      onReset={onReset}
      skeleton={<SkelRows n={10} h={49} gap={2} />}
      footer={
        <>
          <span className="lbx-pager">
            <span className="lbx-mono">
              {fmtCount(from)} to {fmtCount(to)} of {fmtCount(total)}
            </span>
            <button
              type="button"
              className="lbx-icon-btn"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="lbx-icon-btn"
              aria-label="Next page"
              disabled={to >= total}
              onClick={() => setPage(page + 1)}
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </span>
          <span>Amounts are as reported by filers. Registrations carry no amount.</span>
        </>
      }
    >
      <div className="lbx-table-wrap">
        <table className="lbx-table">
          <thead>
            <tr>
              <th scope="col">Posted</th>
              <th scope="col">Client</th>
              <th scope="col">Firm</th>
              <th scope="col" className="num">
                Amount
              </th>
              <th scope="col">Issues</th>
              <th scope="col" className="num">
                Lobbyists
              </th>
              <th scope="col">
                <span className="lbx-sr">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.uuid}>
                <td className="lbx-mono lbx-td-date" data-label="Posted">
                  {fmtDate(r.posted)}
                </td>
                <td className="lbx-td-client" data-label="Client">
                  <span className="lbx-ellipsis" title={r.client}>
                    {r.client}
                  </span>
                  <Tick ticker={r.ticker} verified={r.verified} />
                </td>
                <td className="lbx-td-firm" data-label="Firm">
                  <span className="lbx-ellipsis" title={r.firm}>
                    {r.firm}
                  </span>
                </td>
                <td className="num lbx-td-amt" data-label="Amount">
                  {r.amount != null ? fmtSpend(r.amount) : r.isRegistration ? 'Registration' : '·'}
                </td>
                <td data-label="Issues">
                  <Issues list={r.issues} />
                </td>
                <td className="num lbx-mono" data-label="Lobbyists">
                  {fmtCount(r.lobbyists)}
                </td>
                <td className="lbx-td-view">
                  <button type="button" className="lbx-link" onClick={() => onOpenFiling(r.uuid)}>
                    View<span className="lbx-sr"> filing for {r.client}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
