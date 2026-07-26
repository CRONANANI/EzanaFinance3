'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, X, Loader2, Search } from 'lucide-react';
import { Ticker, EntityName } from '@/components/marketing/DatasetTable';
import CategoryBar from '@/components/datasets/CategoryBar';
import DatasetTicker from '@/components/datasets/DatasetTicker';
import { HOUSE_FILINGS_SAMPLE, HOUSE_TRADES_SAMPLE } from './house-disclosures-sample';
import '../../marketing-explore.css';
import './house-disclosures.css';

/* ── formatting ── */
function fmtFiled(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd || ''));
  if (!m) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}
/** Midpoint → subtle sort-aid estimate. NEVER shown as an exact amount. */
function fmtEst(mid) {
  const n = Number(mid) || 0;
  if (!n) return '';
  if (n >= 1e6) return `~$${(n / 1e6).toFixed(1)}M est.`;
  if (n >= 1e3) return `~$${Math.round(n / 1e3)}K est.`;
  return `~$${Math.round(n)} est.`;
}

const TX_LABEL = { P: 'Purchase', S: 'Sale', E: 'Exchange' };
const TX_TONE = { P: 'buy', S: 'sell', E: 'ind' };

function fullName(r) {
  return [r.prefix, r.first_name, r.last_name, r.suffix].filter(Boolean).join(' ');
}
function district(r) {
  return r.state_dst || [r.state, r.district].filter(Boolean).join('') || '—';
}

/* ── trade detail modal ── */
function TradesModal({ filing, isLive, onClose }) {
  const [state, setState] = useState('loading'); // loading | error | ready
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    if (!isLive) {
      setTrades(HOUSE_TRADES_SAMPLE[filing.doc_id] || []);
      setState('ready');
      return undefined;
    }
    setState('loading');
    (async () => {
      try {
        const res = await fetch(`/api/house-disclosures/trades?doc_id=${encodeURIComponent(filing.doc_id)}`);
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) {
          setState('error');
          return;
        }
        setTrades(Array.isArray(json.trades) ? json.trades : []);
        setState('ready');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [filing.doc_id, isLive]);

  return (
    <div className="hdx-modal-backdrop" onClick={onClose}>
      <div className="hdx-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="hdx-modal-head">
          <div>
            <div className="hdx-modal-eyebrow">
              <span className="hdx-type hdx-type--ptr">PTR</span> · filed {fmtFiled(filing.filing_date)}
            </div>
            <h2 className="hdx-modal-title">{fullName(filing)}</h2>
            <p className="hdx-modal-sub">{district(filing)}</p>
          </div>
          <button type="button" className="hdx-modal-x" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="hdx-bracket-note">
          Amounts are disclosed as ranges under the STOCK Act — the bracket is the reported figure. The
          <span className="hdx-muted"> ~est.</span> value is a midpoint used only for sorting, never an
          exact amount.
        </p>

        {state === 'loading' && (
          <div className="hdx-empty">
            <Loader2 size={16} className="hdx-spin" aria-hidden="true" /> Loading trades…
          </div>
        )}
        {state === 'error' && <div className="hdx-empty">Trade detail is unavailable right now.</div>}
        {state === 'ready' &&
          (trades.length ? (
            <div className="mkt-ds-table-wrap">
              <table className="mkt-ds-table hdx-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Ticker</th>
                    <th>Type</th>
                    <th>Transaction date</th>
                    <th>Amount (as filed)</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => (
                    <tr key={`${t.ticker || t.asset_name}-${i}`}>
                      <td className="mkt-ds-entity">{t.asset_name}</td>
                      <td>{t.ticker ? <Ticker symbol={t.ticker} /> : <span className="hdx-muted">—</span>}</td>
                      <td>
                        <span className={`hdx-tx hdx-tx--${TX_TONE[t.tx_type] || 'ind'}`}>
                          {TX_LABEL[t.tx_type] || t.tx_type || '—'}
                        </span>
                      </td>
                      <td className="gcx-mono hdx-mono">{fmtFiled(t.tx_date)}</td>
                      <td>
                        <span className="hdx-bracket">{t.amount_bracket_label || '—'}</span>
                        {t.amount_midpoint ? (
                          <span className="hdx-est gcx-mono"> {fmtEst(t.amount_midpoint)}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="hdx-empty">
              Trades not parsed yet — the transaction table appears after the next PTR parse
              {filing.is_electronic ? '' : ' (this is a scanned filing awaiting OCR)'}.
            </div>
          ))}

        <div className="hdx-modal-foot">
          {filing.pdf_url ? (
            <a className="hdx-link" href={filing.pdf_url} target="_blank" rel="noopener noreferrer">
              View source PDF on disclosures-clerk.house.gov <ExternalLink size={12} aria-hidden="true" />
            </a>
          ) : (
            <span className="hdx-muted">Source PDF link appears for live filings.</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function HouseDisclosuresClient({ filings }) {
  const isLive = Array.isArray(filings) && filings.length > 0;
  const rows = isLive ? filings : HOUSE_FILINGS_SAMPLE;

  const [q, setQ] = useState('');
  const [type, setType] = useState('all'); // 'all' | 'ptr' | a raw filing_type code
  const [year, setYear] = useState('all');
  const [detail, setDetail] = useState(null);

  const years = useMemo(() => {
    const s = new Set(rows.map((r) => r.filing_year).filter(Boolean));
    return [...s].sort((a, b) => b - a);
  }, [rows]);

  const types = useMemo(() => {
    const seen = [];
    for (const r of rows) {
      if (r.filing_type && !seen.some((t) => t.code === r.filing_type)) {
        seen.push({ code: r.filing_type, label: r.filing_type_label || r.filing_type });
      }
    }
    return seen.sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const view = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (type === 'ptr' && !r.is_ptr) return false;
      if (type !== 'all' && type !== 'ptr' && r.filing_type !== type) return false;
      if (year !== 'all' && r.filing_year !== Number(year)) return false;
      if (term) {
        const hay = `${fullName(r)} ${district(r)}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rows, q, type, year]);

  const tickerItems = useMemo(
    () =>
      rows
        .filter((r) => r.is_ptr)
        .slice(0, 20)
        .map((r) => ({
          id: r.doc_id,
          lead: 'PTR',
          main: fullName(r),
          value: fmtFiled(r.filing_date),
          _row: r,
        })),
    [rows],
  );

  return (
    <div className="mkt-page">
      <CategoryBar active="capitol" activeItem="US House Financial Disclosures" />
      <DatasetTicker
        items={tickerItems}
        ariaLabel="Recent House trade filings"
        onSelect={(it) => setDetail(it._row)}
      />

      <main className="mkt-main">
        <div className="mkt-hero">
          <p className="mkt-eyebrow">CAPITOL WATCH · HOUSE CLERK</p>
          <h1 className="mkt-h1">House financial disclosures</h1>
          <p className="mkt-lead">
            Every financial-disclosure filing from the U.S. House Clerk — periodic transaction reports
            (the trades), annual reports, candidate filings and more. Filter to trade reports and open
            one to see its parsed transactions, each linking to the source PDF.
          </p>
        </div>

        {!isLive && (
          <div className="hdx-sample-note">
            Sample data — not live. The filing index appears here after the next House Clerk sync; the
            trade tables inside each PTR are parsed from the source PDFs (Phase 2).
          </div>
        )}

        <div className="hdx-controls" role="group" aria-label="Filter House filings">
          <label className="hdx-control hdx-control--search">
            <span className="hdx-control-label">Search member</span>
            <span className="hdx-search-field">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                className="hdx-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name or state/district…"
                aria-label="Search by member name or district"
              />
            </span>
          </label>
          <label className="hdx-control">
            <span className="hdx-control-label">Filing type</span>
            <select className="hdx-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">All types</option>
              <option value="ptr">Trade reports (PTR)</option>
              {types.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="hdx-control">
            <span className="hdx-control-label">Year</span>
            <select className="hdx-select" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="all">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <span className="hdx-count gcx-mono">{view.length} filings</span>
        </div>

        <div className="mkt-ds-table-wrap" role="region" aria-label="House disclosure filings" tabIndex={0}>
          <table className="mkt-ds-table hdx-table">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Filing type</th>
                <th scope="col">District</th>
                <th scope="col">Filed</th>
                <th scope="col" aria-label="Source" />
              </tr>
            </thead>
            <tbody>
              {view.length === 0 ? (
                <tr>
                  <td className="mkt-ds-empty" colSpan={5}>
                    No filings match the current filters.
                  </td>
                </tr>
              ) : (
                view.map((r) => {
                  const clickable = r.is_ptr;
                  return (
                    <tr
                      key={r.doc_id}
                      className={clickable ? 'hdx-row-clickable' : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      role={clickable ? 'button' : undefined}
                      aria-label={clickable ? `View trades for ${fullName(r)}` : undefined}
                      onClick={clickable ? () => setDetail(r) : undefined}
                      onKeyDown={
                        clickable
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setDetail(r);
                              }
                            }
                          : undefined
                      }
                    >
                      <td>
                        <EntityName>{fullName(r)}</EntityName>
                      </td>
                      <td>
                        <span className={`hdx-type ${r.is_ptr ? 'hdx-type--ptr' : ''}`}>
                          {r.filing_type_label || r.filing_type}
                        </span>
                      </td>
                      <td className="gcx-mono hdx-mono">{district(r)}</td>
                      <td className="gcx-mono hdx-mono">{fmtFiled(r.filing_date)}</td>
                      <td className="hdx-link-cell">
                        {r.is_ptr && r.pdf_url ? (
                          <a
                            className="hdx-link"
                            href={r.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Open ${fullName(r)} PTR PDF on the House Clerk site`}
                          >
                            PDF <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <section className="mkt-ds-section">
          <h2 className="mkt-section-title">How we source it</h2>
          <div className="hdx-source">
            <p>
              This is the House Clerk&apos;s <strong>filing index</strong> — the yearly bulk file listing
              every disclosure filing by member, type, district and date. The index itself contains no
              transactions; trade-level detail (asset, ticker, amount) is parsed from each Periodic
              Transaction Report&apos;s source PDF and shown when you open a PTR.
            </p>
            <p>
              Members disclose trades within the STOCK Act&apos;s 30–45 day window, so a filing lags the
              trade it reports — a feature of the law, not Ezana processing. Amounts are disclosed as
              ranges; we show the filed bracket and never a single exact figure. Trade parsing currently
              covers electronically-filed PTRs; older scanned filings await an OCR pass.
            </p>
          </div>
        </section>
      </main>

      {detail && <TradesModal filing={detail} isLive={isLive} onClose={() => setDetail(null)} />}
    </div>
  );
}
