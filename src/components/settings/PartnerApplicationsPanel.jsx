'use client';

import { useCallback, useEffect, useState } from 'react';
import './partner-management-panel.css';
import './partner-applications-panel.css';

/* Admin review queue for partner applications (QA PAR-2). Renders nothing
   for non-admins: the list route answers 403 and the panel stays hidden. */

const STATUS_TABS = [
  { key: 'under_review', label: 'Under review' },
  { key: 'pending_documents', label: 'Awaiting documents' },
  { key: 'pending_verification', label: 'Awaiting email' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_LABEL = Object.fromEntries(STATUS_TABS.map((t) => [t.key, t.label]));

function fmtDate(v) {
  if (!v) return '';
  return new Date(v).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function Fact({ label, value }) {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
    </div>
  );
}

function ApplicationCard({ app, onDecide, busy }) {
  const [note, setNote] = useState('');
  const decided = app.application_status === 'approved' || app.application_status === 'rejected';
  const canApprove = app.application_status === 'under_review';

  return (
    <li className="pap-card">
      <div className="pap-card-head">
        <div className="pmp-user-text">
          <div className="pmp-user-name">{app.full_name}</div>
          <div className="pmp-user-meta">
            {app.email} · applied {fmtDate(app.created_at)}
          </div>
        </div>
        <span className={`pap-status pap-status--${app.application_status}`}>
          {STATUS_LABEL[app.application_status] || app.application_status}
        </span>
      </div>

      <dl className="pap-facts">
        <Fact label="Partner type" value={app.partner_type} />
        <Fact label="Location" value={[app.city, app.country].filter(Boolean).join(', ')} />
        <Fact label="Role" value={app.current_role} />
        <Fact label="Company" value={app.company_name} />
        <Fact label="Years of experience" value={app.years_experience} />
        <Fact label="Assets under management" value={app.assets_under_management} />
        <Fact label="Trading style" value={app.trading_style} />
        <Fact label="Markets" value={app.markets_traded} />
        <Fact label="Certifications" value={app.certifications} />
        <Fact label="LinkedIn" value={app.linkedin_url} />
        <Fact label="Website" value={app.website_url} />
        <Fact label="Referral" value={app.referral_source} />
      </dl>

      {app.why_partner ? <p className="pap-text">{app.why_partner}</p> : null}
      {app.content_plan ? <p className="pap-text">{app.content_plan}</p> : null}

      <div className="pap-docs">
        {app.id_document_signed_url ? (
          <a
            className="pap-link"
            href={app.id_document_signed_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="bi bi-person-vcard" aria-hidden /> ID document
          </a>
        ) : (
          <span className="pap-missing">No ID document</span>
        )}
        {app.financial_document_signed_url ? (
          <a
            className="pap-link"
            href={app.financial_document_signed_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <i className="bi bi-file-earmark-text" aria-hidden /> Financial document
          </a>
        ) : (
          <span className="pap-missing">No financial document</span>
        )}
      </div>

      {decided ? (
        <p className="pap-notice">
          {STATUS_LABEL[app.application_status]} {fmtDate(app.reviewed_at)}
          {app.reviewer_notes ? `: ${app.reviewer_notes}` : ''}
        </p>
      ) : (
        <>
          <label className="pmp-user-meta" htmlFor={`pap-note-${app.id}`}>
            Note (kept with the decision, not sent to the applicant)
          </label>
          <textarea
            id={`pap-note-${app.id}`}
            className="pap-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
          />
          <div className="pap-actions">
            <button
              type="button"
              className="settings-btn-primary"
              onClick={() => onDecide(app, 'approve', note)}
              disabled={busy || !canApprove}
              title={canApprove ? undefined : 'Documents must be submitted before approval'}
            >
              <i className="bi bi-check2-circle" aria-hidden /> Approve
            </button>
            <button
              type="button"
              className="settings-btn-secondary"
              onClick={() => onDecide(app, 'reject', note)}
              disabled={busy}
            >
              <i className="bi bi-x-circle" aria-hidden /> Reject
            </button>
          </div>
        </>
      )}
    </li>
  );
}

export function PartnerApplicationsPanel() {
  const [allowed, setAllowed] = useState(null); // null = checking
  const [status, setStatus] = useState('under_review');
  const [apps, setApps] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async (s) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/partner-applications?status=${encodeURIComponent(s)}`, {
        cache: 'no-store',
      });
      if (res.status === 401 || res.status === 403) {
        setAllowed(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load partner applications');
      setAllowed(true);
      setApps(data.applications || []);
      setCounts(data.counts || {});
    } catch (e) {
      setAllowed((a) => (a === null ? true : a));
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  const decide = async (app, action, note) => {
    const verb = action === 'approve' ? 'Approve' : 'Reject';
    if (!window.confirm(`${verb} the application from ${app.full_name}?`)) return;
    setBusyId(app.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/partner-applications/${app.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `${verb} failed`);
      setNotice(
        data.warning ||
          (action === 'approve'
            ? `${app.full_name} is now a partner${data.invited ? ' and was sent an account invite' : ''}.`
            : `${app.full_name} was notified of the decision.`),
      );
      await load(status);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (allowed === false) return null;

  return (
    <section className="pmp-panel pap-panel" aria-labelledby="pap-title">
      <header className="pmp-header">
        <h2 className="pmp-title" id="pap-title">
          Partner applications
        </h2>
        <p className="pmp-subtitle">
          Review applications, open the uploaded documents (links last 10 minutes), and approve or
          reject. Approving creates the partner account and emails the applicant.
        </p>
      </header>

      <div className="pap-tabs" role="group" aria-label="Filter by status">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className="pap-tab"
            aria-pressed={status === t.key}
            onClick={() => setStatus(t.key)}
          >
            {t.label}
            <span className="pap-count">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="pmp-error" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <p className="pap-notice" role="status">
          {notice}
        </p>
      ) : null}

      {loading ? <div className="pmp-empty">Loading…</div> : null}
      {!loading && apps.length === 0 ? (
        <div className="pmp-empty">No applications in this state.</div>
      ) : null}
      {!loading && apps.length > 0 ? (
        <ul className="pmp-list">
          {apps.map((app) => (
            <ApplicationCard key={app.id} app={app} onDecide={decide} busy={busyId === app.id} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
