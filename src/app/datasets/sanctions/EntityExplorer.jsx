'use client';

/**
 * Entity explorer: the listings table upgraded into a research tool.
 *
 *   Search     Name or alias (OFAC's alternate names count), or Identifier
 *              (IMO, passport, tax and registry numbers, DOB...; letters and
 *              digits only, prefix match). The box says which it searches.
 *   Filters    type tabs, country and program (from the rest of the page),
 *              OFAC listing-date range, "secondary sanctions risk stated",
 *              "has linked parties", and "linked to <name>". Every active
 *              filter is a removable chip; "Clear all" resets them.
 *   Rows       expand inline (aliases, identifiers, links, dates) or open
 *              the full record in a side drawer.
 *   Export     the current filter as CSV, up to 5,000 rows, for signed-in
 *              users (same rule as EzanaQL exports).
 * Paging, counts and rows always come from one server query, so the count
 * and the rows can never disagree. Nothing is searched in the browser.
 */
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import RecordDetail from './RecordDetail';
import {
  NO_FILTER,
  ProgramChip,
  Seg,
  StateNote,
  TYPES,
  TypeTag,
  filterParams,
  fmt,
  shortDate,
} from './ui';

function DateField({ label, value, onChange, min, max, disabled }) {
  return (
    <label className="snx-xf-field">
      <span>{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export default function EntityExplorer({
  data,
  filter,
  setFilter,
  loading,
  error,
  summary,
  tableRef,
  onOpenRecord,
}) {
  const headingId = useId();
  const research = data?.research !== false;
  const [mode, setMode] = useState(filter.ident ? 'ident' : 'name');
  const [text, setText] = useState(filter.ident || filter.q || '');
  const [open, setOpen] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState(null);
  const lastWritten = useRef(text);

  /* A name or identifier set from elsewhere (the ticker, a linked record)
     switches the box to the matching mode. */
  useEffect(() => {
    if (filter.q && mode === 'ident') setMode('name');
    else if (filter.ident && mode === 'name') setMode('ident');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.q, filter.ident]);

  /* External filter changes (chips, Clear all, the ticker) rewrite the box. */
  useEffect(() => {
    const next = mode === 'ident' ? filter.ident : filter.q;
    if (next !== lastWritten.current) {
      lastWritten.current = next;
      setText(next);
    }
  }, [filter.q, filter.ident, mode]);

  /* The box debounces into the filter. */
  useEffect(() => {
    const t = setTimeout(() => {
      const v = text.trim();
      lastWritten.current = v;
      setFilter((f) => {
        const key = mode === 'ident' ? 'ident' : 'q';
        const other = mode === 'ident' ? 'q' : 'ident';
        if (f[key] === v && !f[other]) return f;
        return { ...f, [key]: v, [other]: '', page: 1 };
      });
    }, 300);
    return () => clearTimeout(t);
  }, [text, mode, setFilter]);

  useEffect(() => setOpen(null), [data]);

  const from = data.total ? (filter.page - 1) * data.pageSize + 1 : 0;
  const to = Math.min(data.total, filter.page * data.pageSize);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const set = (patch) => setFilter((f) => ({ ...f, ...patch, page: 1 }));

  const chips = [
    filter.country && { k: { country: '' }, label: `Based in ${filter.country}` },
    filter.program && { k: { program: '' }, label: `Program ${filter.program}` },
    filter.q && { k: { q: '' }, label: `Name or alias contains “${filter.q}”` },
    filter.ident && { k: { ident: '' }, label: `Identifier starts “${filter.ident}”` },
    (filter.from || filter.to) && {
      k: { from: '', to: '' },
      label: `Listed ${filter.from ? shortDate(filter.from) : 'any time'} to ${filter.to ? shortDate(filter.to) : 'today'}`,
    },
    filter.risk && { k: { risk: false }, label: 'Secondary sanctions risk stated' },
    filter.linked && { k: { linked: false }, label: 'Has linked parties' },
    filter.linkedTo && { k: { linkedTo: '' }, label: `Named or linked to “${filter.linkedTo}”` },
  ].filter(Boolean);

  async function doExport() {
    setExporting(true);
    setExportMsg(null);
    try {
      const res = await fetch(
        `/api/datasets/sanctions/export?${filterParams(filter, { withPage: false })}`,
      );
      if (res.status === 401) {
        setExportMsg({ auth: true });
        return;
      }
      if (!res.ok) {
        setExportMsg({
          text:
            res.status === 429
              ? 'Too many exports. Wait a minute.'
              : 'Export failed. Try again shortly.',
        });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ezana-ofac-sdn-listings.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportMsg({ text: `Exported ${fmt(Math.min(data.total, 5000))} rows.` });
    } catch {
      setExportMsg({ text: 'Export failed. Check your connection.' });
    } finally {
      setExporting(false);
    }
  }

  const typeTabs = [
    { key: '', label: 'All', n: summary.active },
    ...TYPES.map((t) => ({ key: t.key, label: t.label, n: summary.byType[t.key] })),
  ];

  return (
    <section className="snx-card snx-listings" ref={tableRef} aria-labelledby={headingId}>
      <div className="snx-card-head">
        <div>
          <h2 id={headingId} className="snx-card-title">
            Entity explorer
          </h2>
          <p className="snx-card-sub">
            Every active record on the OFAC SDN list, newest OFAC listing first. Expand a row or
            open the full record.
          </p>
        </div>
        <button
          type="button"
          className="snx-action-btn"
          onClick={doExport}
          disabled={exporting || !data.total}
        >
          {exporting ? 'Exporting…' : 'Export CSV'}{' '}
          <i className="bi bi-download" aria-hidden="true" />
        </button>
      </div>
      {exportMsg ? (
        <p className="snx-rail-note" role="status">
          {exportMsg.auth ? (
            <>
              Exports need an account.{' '}
              <Link href="/auth/signin?redirect=%2Fdatasets%2Fsanctions">Log in</Link> or{' '}
              <Link href="/auth/signup">join the waitlist</Link>.
            </>
          ) : (
            exportMsg.text
          )}
        </p>
      ) : null}

      <div className="snx-xsearch">
        <Seg
          label="Search by"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setText('');
            lastWritten.current = '';
            setFilter((f) => (f.q || f.ident ? { ...f, q: '', ident: '', page: 1 } : f));
          }}
          options={[
            { key: 'name', label: 'Name or alias' },
            { key: 'ident', label: 'Identifier', disabled: !research },
          ]}
        />
        <label className="snx-rail-search snx-xsearch-box">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              mode === 'ident' ? 'IMO, passport, tax ID, registration no.' : 'A name or an alias'
            }
            aria-label={mode === 'ident' ? 'Search by identifier' : 'Search by name or alias'}
          />
        </label>
      </div>

      <div className="snx-tabs" role="group" aria-label="Entry type">
        {typeTabs.map((t) => (
          <button
            key={t.key || 'all'}
            type="button"
            aria-pressed={filter.type === t.key}
            className={`snx-tab${filter.type === t.key ? ' is-on' : ''}`}
            onClick={() => set({ type: t.key })}
          >
            {t.label}
            <span className="snx-tab-n">{fmt(t.n)}</span>
          </button>
        ))}
      </div>

      <div className="snx-xfilters">
        <DateField
          label="Listed from"
          value={filter.from}
          max={filter.to || undefined}
          disabled={!research}
          onChange={(v) => set({ from: v })}
        />
        <DateField
          label="to"
          value={filter.to}
          min={filter.from || undefined}
          disabled={!research}
          onChange={(v) => set({ to: v })}
        />
        <label className="snx-xf-check">
          <input
            type="checkbox"
            checked={filter.risk}
            disabled={!research}
            onChange={(e) => set({ risk: e.target.checked })}
          />
          Secondary sanctions risk stated
        </label>
        <label className="snx-xf-check">
          <input
            type="checkbox"
            checked={filter.linked}
            disabled={!research}
            onChange={(e) => set({ linked: e.target.checked })}
          />
          Has linked parties
        </label>
      </div>
      {!research ? (
        <StateNote kind="unavailable">
          Alias, identifier, date and link filters switch on once the research data is loaded. Name
          search matches primary names only for now.
        </StateNote>
      ) : null}

      {chips.length ? (
        <div className="snx-active">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              className="snx-active-chip"
              onClick={() => set(c.k)}
              aria-label={`Remove filter: ${c.label}`}
            >
              {c.label}
              <i className="bi bi-x" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            className="snx-active-clear"
            onClick={() => setFilter({ ...NO_FILTER })}
          >
            Clear all
          </button>
        </div>
      ) : null}

      <p className="snx-count" aria-live="polite">
        {error
          ? error
          : data.total
            ? `${fmt(from)} to ${fmt(to)} of ${fmt(data.total)} records`
            : loading
              ? 'Loading…'
              : 'No records match these filters.'}
      </p>

      <div className={`snx-table-wrap${loading ? ' is-loading' : ''}`} aria-busy={loading}>
        <table className="snx-table snx-table--x">
          <thead>
            <tr>
              <th scope="col">
                <span className="snx-sr">Expand</span>
              </th>
              <th scope="col">Name</th>
              <th scope="col">Type</th>
              <th scope="col">Programs</th>
              <th scope="col">Based in</th>
              <th scope="col">Identifier</th>
              <th scope="col" className="snx-num">
                Listed
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const isOpen = open === r.id;
              return (
                <Fragment key={r.id}>
                  <tr className={isOpen ? 'is-open' : undefined}>
                    <td className="snx-td-toggle" data-label="">
                      <button
                        type="button"
                        className="snx-row-toggle"
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${r.name}`}
                        onClick={() => setOpen(isOpen ? null : r.id)}
                      >
                        <i
                          className={`bi bi-chevron-${isOpen ? 'down' : 'right'}`}
                          aria-hidden="true"
                        />
                      </button>
                    </td>
                    <td className="snx-td-name" data-label="Name">
                      <button
                        type="button"
                        className="snx-link snx-link--name"
                        onClick={() => onOpenRecord(r.id)}
                      >
                        {r.name}
                      </button>
                      {r.matchedAlias ? (
                        <span className="snx-td-alias">matched alias “{r.matchedAlias}”</span>
                      ) : null}
                      {r.secondaryRisk || r.linkCount ? (
                        <span className="snx-td-flags">
                          {r.secondaryRisk ? (
                            <span className="snx-flag">Secondary risk</span>
                          ) : null}
                          {r.linkCount ? (
                            <span className="snx-flag is-soft">{r.linkCount} linked</span>
                          ) : null}
                        </span>
                      ) : null}
                    </td>
                    <td data-label="Type">
                      <TypeTag type={r.type} />
                    </td>
                    <td data-label="Programs">
                      <span className="snx-chips">
                        {r.programs.slice(0, 3).map((p) => (
                          <ProgramChip
                            key={p}
                            code={p}
                            active={filter.program === p}
                            onPick={(code) => set({ program: code })}
                          />
                        ))}
                        {r.programs.length > 3 ? (
                          <span className="snx-chip-more">+{r.programs.length - 3}</span>
                        ) : null}
                      </span>
                    </td>
                    <td data-label="Based in" className="snx-td-country">
                      {r.countries.length ? (
                        <>
                          {r.countries[0]}
                          {r.countries.length > 1 ? (
                            <span className="snx-muted"> +{r.countries.length - 1}</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="snx-muted">Not stated</span>
                      )}
                    </td>
                    <td data-label="Identifier" className="snx-td-ident">
                      {r.ident ? (
                        <>
                          <span className="snx-muted">{r.ident.label}</span>{' '}
                          <span className="snx-mono">{r.ident.value}</span>
                        </>
                      ) : (
                        <span className="snx-muted">None extracted</span>
                      )}
                    </td>
                    <td data-label="Listed" className="snx-num snx-mono">
                      {r.listedOn ? (
                        shortDate(r.listedOn)
                      ) : (
                        <span className="snx-muted" title="OFAC listing date not available">
                          n/a
                        </span>
                      )}
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr className="snx-tr-detail">
                      <td colSpan={7}>
                        <RecordDetail
                          id={r.id}
                          compact
                          onOpen={onOpenRecord}
                          onFilter={(patch) => set(patch)}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="snx-pager">
        <button
          type="button"
          className="snx-pager-btn"
          disabled={filter.page <= 1 || loading}
          onClick={() => setFilter((f) => ({ ...f, page: f.page - 1 }))}
        >
          <i className="bi bi-chevron-left" aria-hidden="true" /> Previous
        </button>
        <span className="snx-pager-pos snx-mono">
          Page {fmt(filter.page)} of {fmt(pages)}
        </span>
        <button
          type="button"
          className="snx-pager-btn"
          disabled={filter.page >= pages || loading}
          onClick={() => setFilter((f) => ({ ...f, page: f.page + 1 }))}
        >
          Next <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      </div>
      <p className="snx-fine">
        Counts are listing records (one OFAC entry each); one real-world party can appear under
        related entries. Listed is OFAC&apos;s publication date; n/a means OFAC&apos;s date is not
        loaded for that record. Identifiers are extracted from OFAC&apos;s remarks by machine and
        are not independently verified.
      </p>
    </section>
  );
}
