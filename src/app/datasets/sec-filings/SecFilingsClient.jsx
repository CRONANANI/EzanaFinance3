'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Ticker, EntityName, TxnBadge } from '@/components/marketing/DatasetTable';
import '../../marketing-explore.css';
import './sec-filings.css';

const TABS = [
  { id: 'insider', label: 'Insider (Form 4)' },
  { id: 'institutional', label: 'Institutional (13F)' },
  { id: 'activist', label: 'Activist (13D/13G)' },
];

const EMPTY_COPY = {
  insider: 'No live Form 4 filings yet.',
  institutional: 'No live 13F filings yet.',
  activist: 'No live 13D/13G filings yet.',
};

/* filed_at is an ISO timestamp; format stably (no locale/TZ hydration drift). */
function fmtFiled(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '—';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

function LiveFeed({ rows }) {
  return (
    <div className="mkt-ds-table-wrap">
      <table className="mkt-ds-table secf-table">
        <thead>
          <tr>
            <th>Filer</th>
            <th>Form</th>
            <th>Subject</th>
            <th>Filed</th>
            <th aria-label="Link" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.accession_no}>
              <td className="mkt-ds-entity">{r.filer_name}</td>
              <td>
                <span className="secf-form">{r.form_type}</span>
              </td>
              <td>{r.ticker ? <Ticker symbol={r.ticker} /> : <span className="secf-muted">—</span>}</td>
              <td className="gcx-mono secf-mono">{fmtFiled(r.filed_at)}</td>
              <td className="secf-link-cell">
                {r.primary_doc_url ? (
                  <a
                    className="secf-link"
                    href={r.primary_doc_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${r.filer_name} ${r.form_type} on SEC.gov`}
                  >
                    EDGAR <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Insider sample — shown ONLY when the live insider feed is empty, clearly
   labeled as sample data (the same honest-fallback pattern the contracts page
   uses). No sample exists for 13F/13D-G, so those show an empty state. */
function InsiderSample({ rows }) {
  return (
    <>
      <div className="secf-sample-note">
        Sample data — not live. The live Form 4 feed appears here after the next EDGAR sync.
      </div>
      <div className="mkt-ds-table-wrap">
        <table className="mkt-ds-table secf-table">
          <thead>
            <tr>
              <th>Insider</th>
              <th>Company</th>
              <th>Role</th>
              <th>Transaction</th>
              <th style={{ textAlign: 'right' }}>Shares</th>
              <th style={{ textAlign: 'right' }}>Value</th>
              <th>Filed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mkt-ds-entity">
                  <EntityName>{r.insider}</EntityName>
                </td>
                <td>
                  <Ticker symbol={r.ticker} />
                </td>
                <td>{r.role}</td>
                <td>
                  <TxnBadge type={r.transaction} />
                </td>
                <td className="gcx-mono secf-mono" style={{ textAlign: 'right' }}>
                  {r.shares}
                </td>
                <td className="gcx-mono secf-mono" style={{ textAlign: 'right' }}>
                  {r.value}
                </td>
                <td className="gcx-mono secf-mono">{fmtFiled(r.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function SecFilingsClient({ feeds, insiderSample = [] }) {
  const [tab, setTab] = useState('insider');
  const rows = feeds?.[tab] || [];

  return (
    <div className="mkt-page">
      <main className="mkt-main">
        <div className="mkt-hero">
          <p className="mkt-eyebrow">SEC · EDGAR</p>
          <h1 className="mkt-h1">SEC filings</h1>
          <p className="mkt-lead">
            Live filings straight from SEC EDGAR — insider transactions (Form 4), institutional
            holdings (13F), and activist stakes (13D/13G). Newest first, each linking to the filing
            on SEC.gov.
          </p>
        </div>

        <div className="secf-tabs" role="tablist" aria-label="Filing type">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`secf-tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <section className="mkt-ds-section" aria-live="polite">
          {rows.length > 0 ? (
            <LiveFeed rows={rows} />
          ) : tab === 'insider' && insiderSample.length ? (
            <InsiderSample rows={insiderSample} />
          ) : (
            <div className="secf-empty">{EMPTY_COPY[tab]}</div>
          )}
        </section>

        <section className="secf-source">
          <h2 className="secf-source-h">How we source it</h2>
          <p>
            Read directly from SEC EDGAR&apos;s free public services (efts full-text search and the
            submissions API), synced into Ezana on a schedule. Filings are shown as filed; the
            standard SEC disclosure lag between a transaction and its filing is inherent to the data,
            not Ezana processing.
          </p>
        </section>
      </main>
    </div>
  );
}
