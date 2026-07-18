'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';

/**
 * Server-paginated explorer over the FULL usaspending_contract_awards table.
 * Unlike the overview viz above (which aggregates a top-slice), this fetches
 * filtered/sorted PAGES from /api/datasets/contracts via .range() + exact count,
 * so it scales past the old ~200-row cap and exposes all 15 fiscal years. No
 * client-side loading of the whole table.
 */
const FALLBACK_FYS = Array.from({ length: 19 }, (_, i) => 2008 + i); // FY2008..FY2026
const PAGE_SIZE = 25;
const SORTS = [
  { key: 'amount', label: 'Award amount' },
  { key: 'date', label: 'Action date' },
  { key: 'recipient', label: 'Recipient' },
];

export default function ContractsExplorer({ coverage = null }) {
  const fyList = useMemo(() => {
    if (coverage && Array.isArray(coverage.fiscalYears) && coverage.fiscalYears.length) {
      return [...coverage.fiscalYears].sort((a, b) => b - a);
    }
    return [...FALLBACK_FYS].sort((a, b) => b - a);
  }, [coverage]);

  const [fiscalYear, setFiscalYear] = useState('all');
  const [agency, setAgency] = useState('');
  const [recipient, setRecipient] = useState('');
  const [sort, setSort] = useState('amount');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const reqId = useRef(0);

  // Debounce the free-text filters so we don't fetch on every keystroke.
  const [debAgency, setDebAgency] = useState('');
  const [debRecipient, setDebRecipient] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebAgency(agency.trim()), 350);
    return () => clearTimeout(t);
  }, [agency]);
  useEffect(() => {
    const t = setTimeout(() => setDebRecipient(recipient.trim()), 350);
    return () => clearTimeout(t);
  }, [recipient]);

  // Reset to page 1 whenever a filter/sort changes.
  useEffect(() => {
    setPage(1);
  }, [fiscalYear, debAgency, debRecipient, sort, order]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        sort,
        order,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (fiscalYear !== 'all') params.set('fiscalYear', String(fiscalYear));
      if (debAgency) params.set('agency', debAgency);
      if (debRecipient) params.set('recipient', debRecipient);

      const res = await fetch(`/api/datasets/contracts?${params.toString()}`);
      const data = await res.json();
      if (id !== reqId.current) return; // a newer request superseded this one
      if (!res.ok || data.error) {
        setError(data.error || 'Could not load contracts.');
        setRows([]);
        setTotal(0);
      } else {
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setTotal(Number(data.total) || 0);
      }
    } catch {
      if (id === reqId.current) {
        setError('Could not reach the contracts API.');
        setRows([]);
        setTotal(0);
      }
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [fiscalYear, debAgency, debRecipient, sort, order, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const toggleSort = (key) => {
    if (sort === key) setOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
    else {
      setSort(key);
      setOrder('desc');
    }
  };

  return (
    <section className="gcx-card gcx-exp">
      <div className="gcx-exp-head">
        <h2 className="gcx-hero-title">Explore all awards</h2>
        <span className="gcx-list-count">
          {total.toLocaleString()} matching{coverage?.total ? ` of ${coverage.total.toLocaleString()}` : ''}
        </span>
      </div>

      <div className="gcx-exp-filters">
        <label className="gcx-exp-field">
          <span>Fiscal year</span>
          <select value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} className="gcx-exp-select">
            <option value="all">All years</option>
            {fyList.map((y) => (
              <option key={y} value={y}>
                FY{y}
                {coverage?.counts?.[y] ? ` (${coverage.counts[y].toLocaleString()})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="gcx-exp-field gcx-exp-grow">
          <span>Recipient</span>
          <span className="gcx-exp-search">
            <Search size={14} />
            <input
              type="search"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. Lockheed Martin"
              className="gcx-exp-input"
            />
          </span>
        </label>

        <label className="gcx-exp-field gcx-exp-grow">
          <span>Awarding agency</span>
          <span className="gcx-exp-search">
            <Search size={14} />
            <input
              type="search"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              placeholder="e.g. Department of Defense"
              className="gcx-exp-input"
            />
          </span>
        </label>
      </div>

      <div className="gcx-exp-tablewrap">
        <table className="gcx-exp-table">
          <thead>
            <tr>
              <th>
                <button type="button" className="gcx-exp-sort" onClick={() => toggleSort('recipient')}>
                  Recipient {sort === 'recipient' ? (order === 'desc' ? '▾' : '▴') : ''}
                </button>
              </th>
              <th>Agency</th>
              <th>Ticker</th>
              <th className="gcx-exp-num">
                <button type="button" className="gcx-exp-sort" onClick={() => toggleSort('amount')}>
                  Amount {sort === 'amount' ? (order === 'desc' ? '▾' : '▴') : ''}
                </button>
              </th>
              <th>FY</th>
              <th>
                <button type="button" className="gcx-exp-sort" onClick={() => toggleSort('date')}>
                  Date {sort === 'date' ? (order === 'desc' ? '▾' : '▴') : ''}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="gcx-exp-state">
                  <Loader2 className="gcx-exp-spin" size={16} /> Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="gcx-exp-state">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="gcx-exp-state">
                  No awards match these filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="gcx-exp-recipient">{r.recipient}</td>
                  <td>{r.agency}</td>
                  <td className="gcx-mono">{r.ticker}</td>
                  <td className="gcx-exp-num gcx-mono">{r.amount}</td>
                  <td className="gcx-mono">{r.fiscalYear ? `FY${r.fiscalYear}` : '—'}</td>
                  <td>{r.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="gcx-exp-pager">
        <span className="gcx-exp-range">
          {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
        </span>
        <div className="gcx-exp-pagebtns">
          <button
            type="button"
            className="gcx-exp-pagebtn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="gcx-exp-pagenum">
            Page {page.toLocaleString()} of {totalPages.toLocaleString()}
          </span>
          <button
            type="button"
            className="gcx-exp-pagebtn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
