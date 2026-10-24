'use client';

/**
 * /admin/industries: sourced data for the Sonar Industry Layout. Review
 * queue (default), Metrics, Facilities, Awards, Risks and Runs. Admins only:
 * everyone else gets the 404 page, and /api/admin/industries is the real
 * gate (it 404s too). Every row needs a source URL, an as-of date, a scope
 * and a measure type; new rows start pending and reach Sonar only once
 * approved. Plain text fields only.
 */
import { useCallback, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useIsAdmin } from '@/lib/admin-helpers-client';
import { supabase } from '@/lib/supabase-browser';
import {
  FACILITY_STATUSES,
  KNOWN_METRICS,
  MEASURE_TYPES,
  RISK_CONFIDENCE,
  SCOPE_SUGGESTIONS,
  SIA_GUARD,
  UNITS,
} from '@/lib/industry-admin/validate';
import { usdCompact } from '@/lib/sonar/industry-layout-model';
import { US_TILES } from '@/components/sonar/industry/us-tiles';
import './industries-admin.css';

const TABS = [
  { id: 'queue', label: 'Review queue' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'facilities', label: 'Facilities' },
  { id: 'awards', label: 'Awards' },
  { id: 'risks', label: 'Risks' },
  { id: 'runs', label: 'Runs' },
];
const KIND_LABEL = {
  unmatched_recipient: 'Unmatched recipient',
  unmatched_facility: 'Unmatched facility',
  amount_conflict: 'Amount conflict',
  status_conflict: 'Status conflict',
  manual_submission: 'Manual submission',
};

async function headers() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function post(payload) {
  const res = await fetch('/api/admin/industries', {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify(payload),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.ok) throw new Error(d.error || 'That did not work.');
  return d;
}

const Status = ({ s }) => <span className={`ina-pill ina-pill--${s}`}>{s}</span>;
const Src = ({ url, label = 'Source' }) =>
  url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="ina-link">
      {label} <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
    </a>
  ) : null;

function Field({ label, required, children, hint }) {
  return (
    <label className="ina-field">
      <span className="ina-field-label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="ina-hint">{hint}</span> : null}
    </label>
  );
}

function useForm(initial) {
  const [f, setF] = useState(initial);
  const bind = (k) => ({
    value: f[k] ?? '',
    onChange: (e) => setF((p) => ({ ...p, [k]: e.target.value })),
  });
  return [f, setF, bind];
}

/* ── Review queue ── */
function Queue({ data, industry, reload, setToast }) {
  const groups = {};
  for (const r of data.rows) (groups[r.kind] ||= []).push(r);
  const fac = (id) => data.facilities?.find((x) => x.id === id);
  const award = (id) => data.awards?.find((x) => x.id === id);
  const [notes, setNotes] = useState({});
  const [picks, setPicks] = useState({});
  const run = async (payload, msg) => {
    try {
      await post({ industry_id: industry, ...payload });
      setToast(msg);
      reload();
    } catch (e) {
      setToast(e.message);
    }
  };
  if (!data.rows.length) return <p className="ina-empty">The queue is empty.</p>;
  return Object.entries(groups).map(([kind, rows]) => (
    <section key={kind} className="ina-group">
      <h2 className="ina-h2">
        {KIND_LABEL[kind] || kind} <span className="ina-mono ina-muted">{rows.length}</span>
      </h2>
      <ul className="ina-list">
        {rows.map((q) => {
          const d = q.details || {};
          return (
            <li key={q.id} className="ina-card">
              {kind === 'unmatched_recipient' ? (
                <>
                  <p className="ina-strong">{d.recipient_name}</p>
                  <p className="ina-muted ina-mono">
                    {d.normalized}
                    {d.uei ? ` · UEI ${d.uei}` : ''}
                  </p>
                  <div className="ina-row">
                    <select
                      aria-label="Company"
                      value={picks[q.id] || ''}
                      onChange={(e) => setPicks((p) => ({ ...p, [q.id]: e.target.value }))}
                    >
                      <option value="">Pick a company</option>
                      {(d.suggestions || []).map((s) => (
                        <option
                          key={`s-${s.company_name}`}
                          value={`${s.company_name}|${s.ticker || ''}`}
                        >
                          {s.company_name} (suggested)
                        </option>
                      ))}
                      {data.meta.companies.map((c) => (
                        <option
                          key={`${c.stage_id}-${c.company_name}`}
                          value={`${c.company_name}|${c.ticker || ''}`}
                        >
                          {c.company_name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="ina-btn ina-btn--primary"
                      disabled={!picks[q.id]}
                      onClick={() => {
                        const [company_name, ticker] = picks[q.id].split('|');
                        run(
                          { action: 'confirm_alias', queue_id: q.id, company_name, ticker },
                          'Alias confirmed; awards re-matched.',
                        );
                      }}
                    >
                      Confirm alias
                    </button>
                  </div>
                </>
              ) : null}
              {kind === 'unmatched_facility' ||
              (kind === 'manual_submission' && q.ref_table === 'industry_facilities') ? (
                <FacilityApprove
                  row={fac(q.ref_id)}
                  details={d}
                  onDone={(m) => {
                    setToast(m);
                    reload();
                  }}
                />
              ) : null}
              {kind === 'amount_conflict' || kind === 'status_conflict' ? (
                <>
                  <div className="ina-compare">
                    {kind === 'amount_conflict' ? (
                      <>
                        <div>
                          <p className="ina-muted">Announced (NIST, {d.announced?.status})</p>
                          <p className="ina-mono ina-strong">
                            {usdCompact(d.announced?.amount_usd)}
                          </p>
                          <Src url={d.announced?.source_url} />
                        </div>
                        <div>
                          <p className="ina-muted">Obligated (USAspending)</p>
                          <p className="ina-mono ina-strong">
                            {usdCompact(d.obligated?.amount_usd)}
                          </p>
                          <Src url={d.obligated?.source_url} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="ina-muted">Before</p>
                          <p className="ina-mono">
                            {d.before?.status} ·{' '}
                            {d.before?.amount_text || usdCompact(d.before?.amount_usd)}
                          </p>
                        </div>
                        <div>
                          <p className="ina-muted">Now</p>
                          <p className="ina-mono">
                            {d.after?.status} ·{' '}
                            {d.after?.amount_text || usdCompact(d.after?.amount_usd)}
                          </p>
                          <Src url={d.source_url} />
                        </div>
                      </>
                    )}
                  </div>
                  <p className="ina-muted">{award(q.ref_id)?.recipient_name}</p>
                  <div className="ina-row">
                    <input
                      aria-label="Resolution note"
                      placeholder="Note (required)"
                      value={notes[q.id] || ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="ina-btn ina-btn--primary"
                      disabled={!notes[q.id]?.trim()}
                      onClick={() =>
                        run(
                          { action: 'resolve_queue', queue_id: q.id, note: notes[q.id] },
                          'Accepted.',
                        )
                      }
                    >
                      Accept
                    </button>
                  </div>
                </>
              ) : null}
              {kind === 'manual_submission' && q.ref_table !== 'industry_facilities' ? (
                <>
                  <p className="ina-strong">{q.ref_table.replace('industry_', '')}</p>
                  <p className="ina-mono ina-muted">{JSON.stringify(d)}</p>
                  <div className="ina-row">
                    <button
                      type="button"
                      className="ina-btn ina-btn--primary"
                      onClick={() =>
                        run(
                          {
                            action: 'approve_row',
                            table: q.ref_table.replace('industry_', ''),
                            id: q.ref_id,
                          },
                          'Approved.',
                        )
                      }
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="ina-btn"
                      onClick={() =>
                        run(
                          {
                            action: 'reject_row',
                            table: q.ref_table.replace('industry_', ''),
                            id: q.ref_id,
                          },
                          'Rejected.',
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  ));
}

function FacilityApprove({ row, details, onDone }) {
  const [f, , bind] = useForm({
    status: row?.status || 'announced',
    activity: row?.activity || '',
    project_group: row?.project_group || '',
    city: row?.city || details?.city || '',
    state_code: row?.state_code || details?.state_code || '',
    source_url: row?.source_url || '',
    as_of: row?.as_of || '',
  });
  if (!row) return <p className="ina-muted">Facility not found.</p>;
  return (
    <form
      className="ina-form ina-form--inline"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await post({ action: 'approve_row', table: 'facilities', id: row.id, patch: f });
          onDone('Facility approved.');
        } catch (err) {
          onDone(err.message);
        }
      }}
    >
      <p className="ina-strong">{row.company_name}</p>
      <Field label="City">
        <input {...bind('city')} />
      </Field>
      <Field label="State">
        <input {...bind('state_code')} maxLength={2} />
      </Field>
      <Field label="Status">
        <select {...bind('status')}>
          {FACILITY_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Activity">
        <input {...bind('activity')} />
      </Field>
      <Field label="Project group" required>
        <input {...bind('project_group')} required />
      </Field>
      <Field label="Source URL" required>
        <input {...bind('source_url')} type="url" required />
      </Field>
      <Field label="As of" required>
        <input {...bind('as_of')} type="date" required />
      </Field>
      <button type="submit" className="ina-btn ina-btn--primary">
        Approve
      </button>
    </form>
  );
}

/* ── Metrics ── */
function Metrics({ data, industry, reload, setToast }) {
  const blank = {
    metric: 'industry_sales',
    metric_other: '',
    dimension: '',
    value: '',
    unit: 'usd',
    measure_type: '',
    scope: '',
    period: '',
    source_name: '',
    source_url: '',
    source_page: '',
    as_of: '',
  };
  const [f, setF, bind] = useForm(blank);
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null);
  const supersededBy = (id) =>
    data.rows.find((r) => r.supersedes === id && r.review_status === 'approved');
  return (
    <>
      <p className="ina-guard" role="note">
        <i className="bi bi-info-circle" aria-hidden="true" /> {SIA_GUARD}
      </p>
      <form
        className="ina-form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await post({ action: 'create_metric', industry_id: industry, row: f });
            setToast('Metric saved as pending.');
            setF(blank);
            reload();
          } catch (err) {
            setToast(err.message);
          }
        }}
      >
        <Field label="Metric" required>
          <select {...bind('metric')}>
            {KNOWN_METRICS.map((m) => (
              <option key={m}>{m}</option>
            ))}
            <option value="other">other</option>
          </select>
        </Field>
        {f.metric === 'other' ? (
          <Field label="Metric id" required>
            <input {...bind('metric_other')} required />
          </Field>
        ) : null}
        <Field label="Dimension" hint="key=value; key=value">
          <input {...bind('dimension')} />
        </Field>
        <Field label="Value" required>
          <input {...bind('value')} inputMode="decimal" required />
        </Field>
        <Field label="Unit" required>
          <select {...bind('unit')}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label="Measure type" required>
          <select {...bind('measure_type')} required>
            <option value="">Choose</option>
            {MEASURE_TYPES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Scope" required>
          <input {...bind('scope')} list="ina-scopes" required />
          <datalist id="ina-scopes">
            {SCOPE_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label="Period">
          <input {...bind('period')} placeholder="2025" />
        </Field>
        <Field label="Source name" required>
          <input {...bind('source_name')} required />
        </Field>
        <Field label="Source URL" required>
          <input {...bind('source_url')} type="url" required />
        </Field>
        <Field label="Source page" required>
          <input {...bind('source_page')} required />
        </Field>
        <Field label="As of" required>
          <input {...bind('as_of')} type="date" required />
        </Field>
        <button type="submit" className="ina-btn ina-btn--primary">
          Save metric
        </button>
      </form>

      <details className="ina-details">
        <summary>Bulk CSV upload</summary>
        <p className="ina-hint">
          Columns: metric, dimension, value, unit, measure_type, scope, period, source_name,
          source_url, source_page, as_of
        </p>
        <textarea
          aria-label="Metrics CSV"
          rows={6}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <div className="ina-row">
          <button
            type="button"
            className="ina-btn"
            onClick={async () => {
              try {
                setPreview(await post({ action: 'bulk_metrics', industry_id: industry, csv }));
              } catch (err) {
                setToast(err.message);
              }
            }}
          >
            Preview
          </button>
          <button
            type="button"
            className="ina-btn ina-btn--primary"
            disabled={!preview?.preview?.length}
            onClick={async () => {
              try {
                const d = await post({
                  action: 'bulk_metrics',
                  industry_id: industry,
                  csv,
                  commit: true,
                });
                setToast(`${d.inserted} rows saved as pending.`);
                setPreview(null);
                setCsv('');
                reload();
              } catch (err) {
                setToast(err.message);
              }
            }}
          >
            Commit {preview?.preview?.length || 0} rows
          </button>
        </div>
        {preview?.rejected?.length ? (
          <ul className="ina-errors">
            {preview.rejected.map((r) => (
              <li key={r.line}>
                Line {r.line}: {r.errors.join('; ')}
              </li>
            ))}
          </ul>
        ) : null}
      </details>

      <Table
        cols={['Metric', 'Dimension', 'Value', 'Type', 'Scope', 'As of', 'Status', '']}
        rows={data.rows.map((m) => [
          m.metric,
          Object.entries(m.dimension || {})
            .map(([k, v]) => `${k}=${v}`)
            .join('; '),
          <span key="v" className="ina-mono">
            {m.value} {m.unit}
          </span>,
          m.measure_type,
          m.scope,
          <span key="a" className="ina-mono">
            {m.as_of}
          </span>,
          supersededBy(m.id) ? (
            `Superseded on ${supersededBy(m.id).as_of}`
          ) : (
            <Status key="s" s={m.review_status} />
          ),
          <Src key="u" url={m.source_url} />,
        ])}
      />
    </>
  );
}

/* ── Facilities ── */
function Facilities({ data, industry, reload, setToast }) {
  const blank = {
    company_name: '',
    ticker: '',
    stage_id: '',
    project_group: '',
    city: '',
    state_code: '',
    activity: '',
    status: 'announced',
    announced_investment_usd: '',
    source_url: '',
    source_page: '',
    as_of: '',
  };
  const [f, setF, bind] = useForm(blank);
  const [filter, setFilter] = useState({ state: '', status: '', review: '' });
  const rows = data.rows.filter(
    (r) =>
      (!filter.state || r.state_code === filter.state) &&
      (!filter.status || r.status === filter.status) &&
      (!filter.review || r.review_status === filter.review),
  );
  const counts = {};
  for (const r of rows) if (r.state_code) counts[r.state_code] = (counts[r.state_code] || 0) + 1;
  const groups = [...new Set(data.rows.map((r) => r.project_group).filter(Boolean))];
  return (
    <>
      {(data.warnings || []).map((w) => (
        <p key={w} className="ina-warn" role="note">
          {w}
        </p>
      ))}
      <div className="ina-row">
        <select
          aria-label="State"
          value={filter.state}
          onChange={(e) => setFilter((x) => ({ ...x, state: e.target.value }))}
        >
          <option value="">All states</option>
          {US_TILES.map(([c]) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Status"
          value={filter.status}
          onChange={(e) => setFilter((x) => ({ ...x, status: e.target.value }))}
        >
          <option value="">Any status</option>
          {FACILITY_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Review"
          value={filter.review}
          onChange={(e) => setFilter((x) => ({ ...x, review: e.target.value }))}
        >
          <option value="">Any review</option>
          <option>pending</option>
          <option>approved</option>
        </select>
      </div>
      <svg className="ina-map" viewBox="0 0 12 8" role="img" aria-label="Facilities by state">
        {US_TILES.map(([code, x, y]) => (
          <g key={code} className={counts[code] ? 'has-n' : ''}>
            <rect x={x + 0.05} y={y + 0.05} width={0.9} height={0.9} rx={0.12} />
            <text x={x + 0.5} y={y + 0.58} textAnchor="middle">
              {code}
            </text>
          </g>
        ))}
      </svg>
      <Table
        cols={['Company', 'Location', 'Group', 'Status', 'Investment', 'As of', 'Review', '']}
        rows={rows.map((r) => [
          r.company_name,
          [r.city, r.state_code].filter(Boolean).join(', '),
          r.project_group || '',
          r.status || '',
          <span key="i" className="ina-mono">
            {usdCompact(r.announced_investment_usd) || ''}
          </span>,
          <span key="a" className="ina-mono">
            {r.as_of}
          </span>,
          <Status key="s" s={r.review_status} />,
          <Src key="u" url={r.source_url} />,
        ])}
      />
      <details className="ina-details">
        <summary>Add a facility</summary>
        <form
          className="ina-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const d = await post({ action: 'save_facility', industry_id: industry, row: f });
              setToast(d.warnings?.length ? d.warnings.join(' ') : 'Facility saved as pending.');
              setF(blank);
              reload();
            } catch (err) {
              setToast(err.message);
            }
          }}
        >
          <Field label="Company" required>
            <input {...bind('company_name')} list="ina-companies" required />
          </Field>
          <datalist id="ina-companies">
            {data.meta.companies.map((c) => (
              <option key={`${c.stage_id}${c.company_name}`} value={c.company_name} />
            ))}
          </datalist>
          <Field label="Ticker">
            <input {...bind('ticker')} />
          </Field>
          <Field label="Stage">
            <select {...bind('stage_id')}>
              <option value="">None</option>
              {data.meta.stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project group" required>
            <input {...bind('project_group')} list="ina-groups" required />
            <datalist id="ina-groups">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </Field>
          <Field label="City">
            <input {...bind('city')} />
          </Field>
          <Field label="State">
            <input {...bind('state_code')} maxLength={2} />
          </Field>
          <Field label="Activity">
            <input {...bind('activity')} />
          </Field>
          <Field label="Status">
            <select {...bind('status')}>
              {FACILITY_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Announced investment (USD)">
            <input {...bind('announced_investment_usd')} inputMode="decimal" />
          </Field>
          <Field label="Source URL" required>
            <input {...bind('source_url')} type="url" required />
          </Field>
          <Field label="Source page">
            <input {...bind('source_page')} />
          </Field>
          <Field label="As of" required>
            <input {...bind('as_of')} type="date" required />
          </Field>
          <button type="submit" className="ina-btn ina-btn--primary">
            Save facility
          </button>
        </form>
      </details>
    </>
  );
}

/* ── Awards ── */
function Awards({ data, reload, setToast }) {
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null);
  const sites = (id) => (data.links || []).filter((l) => l.award_id === id).length;
  const [open, setOpen] = useState(null);
  return (
    <>
      <Table
        cols={['Recipient', 'Source', 'Status', 'Amount', 'Split', 'Sites', 'Location', '']}
        rows={data.rows.map((a) => [
          <button
            key="r"
            type="button"
            className="ina-linkbtn"
            onClick={() => setOpen(open === a.id ? null : a.id)}
          >
            {a.recipient_name}
          </button>,
          a.source,
          a.source === 'usaspending' ? 'obligated' : a.status,
          <span key="m" className="ina-mono">
            {usdCompact(a.amount_usd) || a.amount_text || ''}
          </span>,
          a.is_split_award ? 'yes' : '',
          <span key="n" className="ina-mono">
            {sites(a.id)}
          </span>,
          [a.city, a.state_code].filter(Boolean).join(', '),
          <Src key="u" url={a.source_url} />,
        ])}
      />
      {open ? (
        <pre className="ina-raw" aria-label="Raw record">
          {JSON.stringify(data.rows.find((a) => a.id === open)?.raw, null, 2)}
        </pre>
      ) : null}
      <details className="ina-details">
        <summary>NIST CSV import (fallback)</summary>
        <p className="ina-hint">
          Columns: company, state_code, city, label (Award Amount or Proposed Award Amount),
          amount_text, source_url. Optional sites as City|ST;City|ST.
        </p>
        <textarea
          aria-label="NIST CSV"
          rows={6}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <div className="ina-row">
          <button
            type="button"
            className="ina-btn"
            onClick={async () => {
              try {
                setPreview(await post({ action: 'import_nist_csv', csv }));
              } catch (err) {
                setToast(err.message);
              }
            }}
          >
            Preview
          </button>
          <button
            type="button"
            className="ina-btn ina-btn--primary"
            disabled={!preview?.preview?.length}
            onClick={async () => {
              try {
                const d = await post({ action: 'import_nist_csv', csv, commit: true });
                setToast(`Imported: ${d.inserted} new, ${d.updated} updated, ${d.queued} queued.`);
                setPreview(null);
                reload();
              } catch (err) {
                setToast(err.message);
              }
            }}
          >
            Import {preview?.preview?.length || 0}
          </button>
        </div>
      </details>
    </>
  );
}

/* ── Risks ── */
function Risks({ data, industry, reload, setToast }) {
  const blank = {
    stage_id: '',
    risk_type: '',
    title: '',
    evidence: '',
    exposure: '',
    substitutes: '',
    confidence: '',
    source_url: '',
    as_of: '',
  };
  const [f, setF, bind] = useForm(blank);
  return (
    <>
      <form
        className="ina-form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await post({ action: 'create_risk', industry_id: industry, row: f });
            setToast('Risk saved as pending.');
            setF(blank);
            reload();
          } catch (err) {
            setToast(err.message);
          }
        }}
      >
        <Field label="Stage">
          <select {...bind('stage_id')}>
            <option value="">None</option>
            {data.meta.stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Risk type">
          <input {...bind('risk_type')} placeholder="single source" />
        </Field>
        <Field label="Title" required>
          <input {...bind('title')} required />
        </Field>
        <Field label="Evidence" required>
          <textarea {...bind('evidence')} rows={3} required />
        </Field>
        <Field label="Exposure">
          <input {...bind('exposure')} />
        </Field>
        <Field label="Substitutes">
          <input {...bind('substitutes')} />
        </Field>
        <Field label="Confidence" required>
          <select {...bind('confidence')} required>
            <option value="">Choose</option>
            {RISK_CONFIDENCE.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Source URL" required>
          <input {...bind('source_url')} type="url" required />
        </Field>
        <Field label="As of" required>
          <input {...bind('as_of')} type="date" required />
        </Field>
        <button type="submit" className="ina-btn ina-btn--primary">
          Save risk
        </button>
      </form>
      <Table
        cols={['Title', 'Type', 'Confidence', 'As of', 'Review', '']}
        rows={data.rows.map((r) => [
          r.title,
          r.risk_type || '',
          r.confidence,
          <span key="a" className="ina-mono">
            {r.as_of}
          </span>,
          <Status key="s" s={r.review_status} />,
          <Src key="u" url={r.source_url} />,
        ])}
      />
    </>
  );
}

/* ── Runs ── */
function Runs({ data, reload, setToast }) {
  const [busy, setBusy] = useState(null);
  return (
    <>
      <div className="ina-row">
        {['chips_usaspending', 'chips_nist'].map((job) => (
          <button
            key={job}
            type="button"
            className="ina-btn"
            disabled={Boolean(busy)}
            onClick={async () => {
              setBusy(job);
              try {
                const d = await post({ action: 'run_job', job });
                setToast(`${job}: ${JSON.stringify(d.result)}`);
              } catch (err) {
                setToast(err.message);
              } finally {
                setBusy(null);
                reload();
              }
            }}
          >
            {busy === job ? 'Running...' : `Run ${job} now`}
          </button>
        ))}
      </div>
      <Table
        cols={['Job', 'Started', 'Status', 'Fetched', 'Inserted', 'Updated', 'Queued', 'Error']}
        rows={data.rows.map((r) => [
          r.job,
          <span key="t" className="ina-mono">
            {String(r.started_at).slice(0, 16).replace('T', ' ')}
          </span>,
          <Status key="s" s={r.status} />,
          <span key="f" className="ina-mono">
            {r.fetched}
          </span>,
          <span key="i" className="ina-mono">
            {r.inserted}
          </span>,
          <span key="u" className="ina-mono">
            {r.updated}
          </span>,
          <span key="q" className="ina-mono">
            {r.queued}
          </span>,
          r.error || '',
        ])}
      />
    </>
  );
}

function Table({ cols, rows }) {
  if (!rows.length) return <p className="ina-empty">Nothing here yet.</p>;
  return (
    <div className="ina-table-wrap">
      <table className="ina-table">
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function IndustriesAdminPage() {
  const { user, loading } = useAuth() || {};
  const { isAdmin, checking } = useIsAdmin(user);
  const [tab, setTab] = useState('queue');
  const [industry, setIndustry] = useState('semiconductors');
  const [data, setData] = useState(null);
  const [state, setState] = useState('idle');
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch(`/api/admin/industries?tab=${tab}&industry=${industry}`, {
        headers: await headers(),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error();
      setData(d);
      setState('idle');
    } catch {
      setState('error');
    }
  }, [tab, industry]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (loading || checking) return <main className="ina-page" aria-busy="true" />;
  if (!isAdmin) notFound();

  const props = { data, industry, reload: load, setToast };
  return (
    <main className="ina-page">
      <header className="ina-head">
        <h1 className="ina-title">Industries</h1>
        <p className="ina-sub">
          Sourced data for the Sonar Industry Layout. New rows start pending; only approved rows
          reach Sonar.
        </p>
        <label className="ina-field ina-field--inline">
          <span className="ina-field-label">Industry</span>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
            {(data?.meta?.industries?.length
              ? data.meta.industries
              : [{ id: 'semiconductors', label: 'Semiconductors' }]
            ).map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="ina-tabs" role="tablist" aria-label="Industry data">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`ina-tab${tab === t.id ? ' is-on' : ''}`}
            onClick={() => {
              setData(null);
              setTab(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {toast ? (
        <div className="ina-toast" role="status">
          <span>{toast}</span>
          <button
            type="button"
            className="ina-toast-x"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <div role="tabpanel" aria-busy={state === 'loading'}>
        {state === 'error' ? (
          <p className="ina-empty">Could not load. Has the industry data migration been applied?</p>
        ) : null}
        {data && data.tab === tab ? (
          <>
            {tab === 'queue' ? <Queue {...props} /> : null}
            {tab === 'metrics' ? <Metrics {...props} /> : null}
            {tab === 'facilities' ? <Facilities {...props} /> : null}
            {tab === 'awards' ? <Awards {...props} /> : null}
            {tab === 'risks' ? <Risks {...props} /> : null}
            {tab === 'runs' ? <Runs {...props} /> : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
