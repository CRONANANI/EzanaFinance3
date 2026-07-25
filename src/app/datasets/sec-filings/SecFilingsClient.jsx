'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, X, Loader2 } from 'lucide-react';
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
function fmtUSD(v) {
  const n = Number(v) || 0;
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtInt(v) {
  return v == null ? '—' : (Number(v) || 0).toLocaleString('en-US');
}

function LiveFeed({ rows, family, onOpen }) {
  const hasDetail = family === 'institutional' || family === 'activist';
  return (
    <div className="mkt-ds-table-wrap">
      <table className="mkt-ds-table secf-table">
        <thead>
          <tr>
            <th>Filer</th>
            <th>Form</th>
            <th>Subject</th>
            <th>Filed</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.accession_no}>
              <td className="mkt-ds-entity">
                {hasDetail ? (
                  <button type="button" className="secf-rowbtn" onClick={() => onOpen(r)}>
                    {r.filer_name}
                  </button>
                ) : (
                  r.filer_name
                )}
              </td>
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

/* Detail card fetched on open. 13F → holdings table (sortable by value);
   13D/13G → subject + percent-of-class. Parsed rows come from Supabase, never
   fabricated — an unparsed filing shows an honest "not parsed yet" state. */
function SecDetailModal({ filing, onClose }) {
  const [state, setState] = useState('loading'); // loading | error | ready
  const [holdings, setHoldings] = useState([]);
  const [position, setPosition] = useState(null);
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    setState('loading');
    (async () => {
      try {
        const res = await fetch(
          `/api/sec-filings/detail?accession=${encodeURIComponent(filing.accession_no)}`,
        );
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) {
          setState('error');
          return;
        }
        setHoldings(Array.isArray(json.holdings) ? json.holdings : []);
        setPosition(json.position || null);
        setState('ready');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [filing.accession_no]);

  const sorted = [...holdings].sort((a, b) =>
    sortDesc ? b.value_usd - a.value_usd : a.value_usd - b.value_usd,
  );
  const is13F = filing.form_family === 'institutional';

  return (
    <div className="secf-modal-backdrop" onClick={onClose}>
      <div className="secf-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="secf-modal-head">
          <div>
            <div className="secf-modal-eyebrow">
              <span className="secf-form">{filing.form_type}</span> · filed {fmtFiled(filing.filed_at)}
            </div>
            <h2 className="secf-modal-title">{filing.filer_name}</h2>
          </div>
          <button type="button" className="secf-modal-x" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {state === 'loading' && (
          <div className="secf-empty">
            <Loader2 size={16} className="secf-spin" aria-hidden="true" /> Loading detail…
          </div>
        )}
        {state === 'error' && <div className="secf-empty">Detail is unavailable right now.</div>}

        {state === 'ready' && is13F && (
          sorted.length ? (
            <div className="mkt-ds-table-wrap">
              <table className="mkt-ds-table secf-table">
                <thead>
                  <tr>
                    <th>Issuer</th>
                    <th>Ticker</th>
                    <th
                      className="secf-sortable"
                      onClick={() => setSortDesc((d) => !d)}
                      aria-sort={sortDesc ? 'descending' : 'ascending'}
                    >
                      Value {sortDesc ? '▼' : '▲'}
                    </th>
                    <th style={{ textAlign: 'right' }}>Shares</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((h, i) => (
                    <tr key={`${h.cusip || h.name_of_issuer}-${i}`}>
                      <td className="mkt-ds-entity">{h.name_of_issuer}</td>
                      <td>
                        {h.ticker ? <Ticker symbol={h.ticker} /> : <span className="secf-muted">—</span>}
                      </td>
                      <td className="gcx-mono secf-mono">{fmtUSD(h.value_usd)}</td>
                      <td className="gcx-mono secf-mono" style={{ textAlign: 'right' }}>
                        {fmtInt(h.shares)}
                        {h.put_call ? ` (${h.put_call})` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="secf-empty">
              Holdings not parsed yet — the positions table appears after the next holdings sync.
            </div>
          )
        )}

        {state === 'ready' && !is13F && (
          position ? (
            <div className="secf-position">
              <div className="secf-fact">
                <div className="secf-fact-k">Subject</div>
                <div className="secf-fact-v">{position.subject_name || '—'}</div>
              </div>
              <div className="secf-fact">
                <div className="secf-fact-k">Percent of class</div>
                <div className="secf-fact-v gcx-mono">
                  {position.percent_of_class != null ? `${position.percent_of_class}%` : '—'}
                </div>
              </div>
              <div className="secf-fact">
                <div className="secf-fact-k">Shares</div>
                <div className="secf-fact-v gcx-mono">{fmtInt(position.shares)}</div>
              </div>
            </div>
          ) : (
            <div className="secf-empty">
              Stake not parsed yet — subject and percent-of-class appear after the next holdings sync.
            </div>
          )
        )}

        <div className="secf-modal-foot">
          {filing.primary_doc_url ? (
            <a
              className="secf-link"
              href={filing.primary_doc_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View filing on SEC.gov <ExternalLink size={12} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
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
  const [detail, setDetail] = useState(null);
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
            <LiveFeed rows={rows} family={tab} onOpen={setDetail} />
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

      {detail && <SecDetailModal filing={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
