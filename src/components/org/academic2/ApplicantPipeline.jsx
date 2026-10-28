'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { orgRequest } from '@/lib/org-request';
import { NA } from '@/lib/org-display';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import './cohort2.css';

const BOARD_STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'screened', label: 'Screened' },
  { key: 'interview', label: 'Interview' },
  { key: 'pitch', label: 'Pitch' },
  { key: 'offer', label: 'Offer' },
  { key: 'accepted', label: 'Accepted' },
];
const NEXT_STAGE = {
  applied: 'screened',
  screened: 'interview',
  interview: 'pitch',
  pitch: 'offer',
  offer: 'accepted',
};
const CRITERION_LABEL = {
  technical: 'Technical',
  communication: 'Communication',
  culture_fit: 'Culture fit',
  prior_experience: 'Prior experience',
};

function StatStrip({ stats }) {
  const tiles = [
    { label: 'Applicants', value: stats?.applicants ?? NA },
    { label: 'Interviewed', value: stats?.interviewed ?? NA },
    { label: 'Offers', value: stats?.offers ?? NA },
    { label: 'Yield', value: stats?.yield_pct == null ? NA : `${stats.yield_pct}%` },
  ];
  return (
    <div className="c2-stats">
      {tiles.map((t) => (
        <div key={t.label} className="c2-stat">
          <div className="c2-stat-value">{t.value}</div>
          <div className="c2-stat-label">{t.label}</div>
        </div>
      ))}
    </div>
  );
}

export function ApplicantPipeline({ cohortId, canManage, onCount }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null); // active applicant id
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [funnelOpen, setFunnelOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [blindError, setBlindError] = useState('');
  const funnelRef = useRef(null);
  const formRef = useRef(null);

  // Toolbar Funnel / Form-builder buttons reveal the existing panels below and
  // scroll them into view (they are not re-implemented — just made visible).
  const reveal = (ref, setOpen) => {
    setOpen(true);
    requestAnimationFrame(() =>
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  const load = useCallback(async () => {
    if (!cohortId) return;
    try {
      const res = await fetch(`/api/org/applicants?cohort_id=${cohortId}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Failed to load applicants.');
        return;
      }
      setData(json);
      setError('');
      onCount?.(json.applicants?.length || 0);
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, [cohortId, onCount]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const toggleBlind = async () => {
    // Blind screening is a property of the cohort's application form.
    if (busy) return;
    setBusy(true);
    setBlindError('');
    try {
      const fjson = await orgRequest(`/api/org/cohorts/${cohortId}/forms`, { cache: 'no-store' });
      const form = (fjson.forms || [])[0];
      const next = !data?.blind;
      if (form) {
        await orgRequest(`/api/org/cohorts/${cohortId}/forms`, {
          method: 'PATCH',
          json: { form_id: form.id, blind_screening: next },
        });
      } else {
        await orgRequest(`/api/org/cohorts/${cohortId}/forms`, {
          method: 'POST',
          json: { blind_screening: next },
        });
      }
      await load();
    } catch (e) {
      setBlindError(e.message);
      // Switch reflects server data (data.blind); refetch so it matches reality.
      await load();
    } finally {
      setBusy(false);
    }
  };

  const applicants = data?.applicants || [];
  const byStage = useMemo(() => {
    const map = {};
    for (const s of BOARD_STAGES) map[s.key] = [];
    map.rejected = [];
    map.declined = [];
    for (const a of applicants) (map[a.stage] || (map[a.stage] = [])).push(a);
    return map;
  }, [applicants]);

  if (loading) return <div className="c2-state">Loading pipeline…</div>;
  if (error) return <div className="c2-state c2-error">{error}</div>;

  const activeApplicant = applicants.find((a) => a.id === active) || null;
  // Representative applicant for the rubric summary — derived from real data
  // (prefer one with panel activity, else the first applicant). No hardcoded pick.
  const sampleApplicant = applicants.find((a) => a.interviewer_count > 0) || applicants[0] || null;

  return (
    <div>
      <StatStrip stats={data?.stats} />

      <div className="c2-toolbar">
        <div className="c2-blind">
          <button
            type="button"
            role="switch"
            aria-checked={!!data?.blind}
            aria-label="Blind screening"
            className={`c2-switch ${data?.blind ? 'is-on' : ''}`}
            onClick={toggleBlind}
            disabled={!canManage || busy}
            title={canManage ? 'Toggle blind screening' : 'Managers only'}
          />
          <div className="c2-blind-text">
            <span className="c2-blind-title">
              {data?.blind ? (
                <i className="bi bi-eye-slash" aria-hidden="true" />
              ) : (
                <i className="bi bi-eye" aria-hidden="true" />
              )}{' '}
              Blind screening {data?.blind ? 'ON' : 'OFF'}
            </span>
            <span className="c2-blind-sub">Names, schools &amp; photos hidden until Interview</span>
            {blindError && (
              <p className="org-inline-error" role="alert">
                {blindError}
              </p>
            )}
          </div>
        </div>
        <div className="c2-spacer" />
        <button type="button" className="c2-btn" onClick={() => reveal(funnelRef, setFunnelOpen)}>
          <i className="bi bi-graph-up-arrow" aria-hidden="true" /> Funnel
        </button>
        <button type="button" className="c2-btn" onClick={() => reveal(formRef, setFormOpen)}>
          <i className="bi bi-clipboard-data" aria-hidden="true" /> Form builder
        </button>
        {canManage && (
          <button type="button" className="c2-btn c2-btn--primary" onClick={() => setAdding(true)}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> Add applicant
          </button>
        )}
      </div>

      {applicants.length === 0 ? (
        <div className="c2-empty">
          <i className="bi bi-clipboard-data c2-empty-icon" aria-hidden="true" />
          <p>No applicants yet.</p>
          <p style={{ fontSize: '0.82rem' }}>
            Open an application form below, or add applicants manually to start the pipeline.
          </p>
        </div>
      ) : (
        <>
          <div className="c2-board">
            {BOARD_STAGES.map((s) => (
              <div key={s.key} className="c2-col">
                <div className="c2-col-head">
                  <span>{s.label}</span>
                  <span className="c2-col-count">{(byStage[s.key] || []).length}</span>
                </div>
                {(byStage[s.key] || []).map((a) => (
                  <ApplicantCard key={a.id} a={a} onOpen={() => setActive(a.id)} />
                ))}
              </div>
            ))}
          </div>

          <div className="c2-lanes">
            <ArchiveLane title="Rejected" items={byStage.rejected} onOpen={setActive} />
            <ArchiveLane title="Declined" items={byStage.declined} onOpen={setActive} />
          </div>
        </>
      )}

      <div className="c2-bottom-row">
        <div ref={funnelRef} className="c2-bottom-cell">
          <FunnelSection cohortId={cohortId} open={funnelOpen} onToggle={setFunnelOpen} />
        </div>
        <div className="c2-bottom-cell">
          <RubricSummaryCard applicant={sampleApplicant} />
        </div>
      </div>
      <div ref={formRef}>
        <FormBuilder
          cohortId={cohortId}
          canManage={canManage}
          open={formOpen}
          onToggle={setFormOpen}
        />
      </div>

      {activeApplicant && (
        <ApplicantModal
          applicant={activeApplicant}
          canManage={canManage}
          onClose={() => setActive(null)}
          onChanged={load}
        />
      )}
      {adding && (
        <AddApplicantModal
          cohortId={cohortId}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ApplicantCard({ a, onOpen }) {
  const name = a.blinded ? a.initials : a.full_name;
  return (
    <div
      className="c2-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="c2-avatar">{a.initials}</span>
        <div>
          <div className="c2-card-name">{a.blinded ? `Applicant ${a.initials}` : name}</div>
          <div className="c2-card-meta">
            {[a.program, a.year].filter(Boolean).join(' · ') ||
              (a.blinded ? 'Blind screening' : NA)}
          </div>
        </div>
      </div>
      <div className="c2-card-row">
        {a.aggregate_star != null && (
          <span className="c2-star">
            <i className="bi bi-star" aria-hidden="true" />{' '}
            <span className="org-num">{a.aggregate_star.toFixed(2)}</span>
          </span>
        )}
        {a.has_resume && (
          <span className="c2-chip">
            <i className="bi bi-file-earmark-text" aria-hidden="true" /> Resume
          </span>
        )}
        {a.has_sample_pitch && (
          <span className="c2-chip">
            <i className="bi bi-file-earmark-text" aria-hidden="true" /> Pitch
          </span>
        )}
        {a.interviewer_count > 0 && (
          <span className="c2-progress-mini">
            {a.scores_in} of {a.interviewer_count} in
          </span>
        )}
      </div>
    </div>
  );
}

function ArchiveLane({ title, items, onOpen }) {
  return (
    <details className="c2-lane">
      <summary>
        {title} · {items.length}
      </summary>
      {items.length === 0 ? (
        <div className="c2-lane-item" style={{ color: 'var(--text-muted)' }}>
          None.
        </div>
      ) : (
        items.map((a) => (
          <div
            key={a.id}
            className="c2-lane-item"
            role="button"
            tabIndex={0}
            onClick={() => onOpen(a.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen(a.id);
              }
            }}
          >
            <div className="c2-card-name" style={{ fontSize: '0.85rem' }}>
              {a.blinded ? `Applicant ${a.initials}` : a.full_name}
            </div>
            {a.rejected_reason && <div className="c2-reason">{a.rejected_reason}</div>}
          </div>
        ))
      )}
    </details>
  );
}

/* ── Applicant modal with rubric ─────────────────────────────────────────── */
function ApplicantModal({ applicant, canManage, onClose, onChanged }) {
  const a = applicant;
  const titleId = useId();
  const dialogRef = useDialogA11y(true, onClose);
  const [scoreData, setScoreData] = useState(null);
  const [myScores, setMyScores] = useState({});
  const [saving, setSaving] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadScores = useCallback(async () => {
    const res = await fetch(`/api/org/applicants/${a.id}/scores`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setScoreData(json);
      const mine = {};
      for (const r of json.my?.rows || [])
        mine[r.criterion] = { score: r.score, notes: r.notes || '' };
      setMyScores(mine);
    }
  }, [a.id]);

  useEffect(() => {
    loadScores();
  }, [loadScores]);

  const setCrit = (crit, patch) =>
    setMyScores((m) => ({ ...m, [crit]: { score: 0, notes: '', ...m[crit], ...patch } }));

  const saveScores = async (submit) => {
    const criteria = scoreData?.criteria || [];
    const scores = criteria
      .filter((c) => myScores[c] && myScores[c].score != null)
      .map((c) => ({ criterion: c, score: myScores[c].score, notes: myScores[c].notes }));
    if (scores.length === 0 || saving) return;
    setSaving(true);
    setActionError('');
    try {
      await orgRequest(`/api/org/applicants/${a.id}/scores`, {
        method: 'POST',
        json: { scores, submit },
      });
      await loadScores();
      onChanged?.();
    } catch (e) {
      setActionError(e.message);
      // Rubric reflects server data; refetch so it matches what persisted.
      await loadScores();
    } finally {
      setSaving(false);
    }
  };

  const advance = async (stage, reason) => {
    if (saving) return;
    setSaving(true);
    setActionError('');
    try {
      const body = { stage };
      if (reason != null) body.rejected_reason = reason;
      await orgRequest(`/api/org/applicants/${a.id}`, {
        method: 'PATCH',
        json: body,
      });
      await onChanged?.();
      onClose();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const reject = () => {
    const reason = window.prompt('Reason for rejection (shown in the archive lane):', '');
    if (reason === null) return;
    advance('rejected', reason);
  };
  const decline = () => {
    const reason = window.prompt('Reason the applicant declined:', '');
    if (reason === null) return;
    advance('declined', reason);
  };

  return (
    <div className="c2-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="c2-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h2 id={titleId} className="c2-modal-title">
              {a.blinded ? `Applicant ${a.initials}` : a.full_name}
              {scoreData?.aggregate_star != null && (
                <span className="c2-star">
                  <i className="bi bi-star" aria-hidden="true" />{' '}
                  {scoreData.aggregate_star.toFixed(2)}
                </span>
              )}
            </h2>
            <p className="c2-sub" style={{ marginTop: 0 }}>
              {[a.program, a.year, a.source && `via ${a.source}`].filter(Boolean).join(' · ') || NA}
            </p>
          </div>
          <button type="button" className="c2-btn c2-btn--sm" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        {a.blinded && (
          <div className="c2-note">
            <i className="bi bi-eye-slash" style={{ verticalAlign: 'middle' }} aria-hidden="true" />{' '}
            Blind screening on: identity is hidden until the interview stage (redacted server-side).
          </div>
        )}

        {(a.has_resume || a.has_sample_pitch) && (
          <div className="c2-card-row">
            {a.resume_url && (
              <a className="c2-chip" href={a.resume_url} target="_blank" rel="noreferrer">
                <i className="bi bi-file-earmark-text" aria-hidden="true" /> Resume
              </a>
            )}
            {a.sample_pitch_url && (
              <a className="c2-chip" href={a.sample_pitch_url} target="_blank" rel="noreferrer">
                <i className="bi bi-file-earmark-text" aria-hidden="true" /> Sample pitch
              </a>
            )}
          </div>
        )}

        {a.responses && Object.keys(a.responses).length > 0 && (
          <>
            <div className="c2-label">Responses</div>
            {Object.entries(a.responses).map(([k, v]) => (
              <div key={k} style={{ marginBottom: '0.4rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{k}</div>
                <div style={{ fontSize: '0.85rem' }}>{String(v)}</div>
              </div>
            ))}
          </>
        )}

        {/* ── Rubric ── */}
        <div className="c2-label">Your rubric (scored independently)</div>
        {(scoreData?.criteria || []).map((crit) => (
          <div key={crit} className="c2-rubric-row">
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {CRITERION_LABEL[crit] || crit}
              </div>
              <div className="c2-scorebtns" style={{ marginTop: '0.35rem' }}>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`c2-scorebtn ${myScores[crit]?.score === n ? 'is-on' : ''}`}
                    disabled={scoreData?.my?.submitted}
                    onClick={() => setCrit(crit, { score: n })}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="c2-input"
              rows={2}
              aria-label={`Notes for ${CRITERION_LABEL[crit] || crit}`}
              placeholder="Private notes (hidden from peers until you submit)"
              value={myScores[crit]?.notes || ''}
              disabled={scoreData?.my?.submitted}
              onChange={(e) => setCrit(crit, { notes: e.target.value })}
            />
          </div>
        ))}
        {scoreData?.my?.submitted ? (
          <div className="c2-note" style={{ marginTop: '0.6rem' }}>
            <i className="bi bi-check-lg" style={{ verticalAlign: 'middle' }} aria-hidden="true" />{' '}
            Your scores are submitted.
          </div>
        ) : (
          <div className="c2-modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button
              type="button"
              className="c2-btn"
              onClick={() => saveScores(false)}
              disabled={saving}
            >
              Save draft
            </button>
            <button
              type="button"
              className="c2-btn c2-btn--primary"
              onClick={() => saveScores(true)}
              disabled={saving}
            >
              Submit scores
            </button>
          </div>
        )}

        {actionError && (
          <p className="org-inline-error" role="alert">
            {actionError}
          </p>
        )}

        {/* ── Other interviewers (anti-anchoring) ── */}
        <div className="c2-label">
          Panel · {scoreData?.scores_in ?? 0} of {scoreData?.interviewer_count ?? 0} submitted
        </div>
        {(scoreData?.others || []).length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            No other interviewers yet.
          </div>
        ) : (
          (scoreData.others || []).map((o) => (
            <div key={o.interviewer_id} className="c2-panel" style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <b style={{ color: 'var(--text-primary)' }}>{o.interviewer_name}</b>
                <span className="c2-progress-mini">{o.submitted ? 'submitted' : 'pending'}</span>
              </div>
              {o.locked ? (
                <div className="c2-locked" style={{ marginTop: '0.35rem' }}>
                  <i className="bi bi-lock" aria-hidden="true" /> Notes hidden until you submit your
                  own scores.
                </div>
              ) : (
                o.rows.map((r) => (
                  <div key={r.criterion} style={{ marginTop: '0.35rem', fontSize: '0.82rem' }}>
                    <span className="c2-star">
                      <i className="bi bi-star" aria-hidden="true" /> {r.score}
                    </span>{' '}
                    <span style={{ color: 'var(--text-muted)' }}>
                      {CRITERION_LABEL[r.criterion]}
                    </span>
                    {r.notes && <div style={{ color: 'var(--text-secondary)' }}>{r.notes}</div>}
                  </div>
                ))
              )}
            </div>
          ))
        )}

        {/* ── Actions ── */}
        {canManage && (
          <div className="c2-modal-actions">
            {a.stage !== 'rejected' && a.stage !== 'declined' && a.stage !== 'accepted' && (
              <>
                <button
                  type="button"
                  className="c2-btn c2-btn--danger"
                  onClick={reject}
                  disabled={saving}
                >
                  <i className="bi bi-slash-circle" aria-hidden="true" /> Reject
                </button>
                <button type="button" className="c2-btn" onClick={decline} disabled={saving}>
                  Declined
                </button>
                {a.stage === 'applied' && (
                  <button
                    type="button"
                    className="c2-btn"
                    onClick={() => advance('interview')}
                    disabled={saving}
                  >
                    <i className="bi bi-clock" aria-hidden="true" /> Schedule interview
                  </button>
                )}
                {NEXT_STAGE[a.stage] && a.stage !== 'offer' && a.stage !== 'pitch' && (
                  <button
                    type="button"
                    className="c2-btn"
                    onClick={() => advance(NEXT_STAGE[a.stage])}
                    disabled={saving}
                  >
                    Advance →
                  </button>
                )}
                {a.stage === 'pitch' && (
                  <button
                    type="button"
                    className="c2-btn"
                    onClick={() => advance('offer')}
                    disabled={saving}
                  >
                    Send offer
                  </button>
                )}
                {a.stage === 'offer' && (
                  <button
                    type="button"
                    className="c2-btn c2-btn--primary"
                    onClick={() => setProvisioning(true)}
                    disabled={saving}
                  >
                    <i className="bi bi-person-plus" aria-hidden="true" /> Accept &amp; provision
                  </button>
                )}
              </>
            )}
            {a.stage === 'accepted' && a.provisioned_member_id && (
              <span className="c2-pill c2-pill--active">
                <i className="bi bi-check-lg" aria-hidden="true" /> Provisioned
              </span>
            )}
          </div>
        )}

        {provisioning && (
          <ProvisionModal
            applicant={a}
            onClose={() => setProvisioning(false)}
            onDone={() => {
              setProvisioning(false);
              onChanged?.();
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ── Accept → provision (the payoff): one confirmation. ─────────────────── */
function ProvisionModal({ applicant, onClose, onDone }) {
  const titleId = useId();
  const uid = useId();
  const dialogRef = useDialogA11y(true, onClose);
  const [members, setMembers] = useState([]);
  const [title, setTitle] = useState('Junior Analyst');
  const [reportsTo, setReportsTo] = useState('');
  const [mentor, setMentor] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch('/api/org/chart', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setMembers(j.members || []))
      .catch(() => {});
  }, []);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      const j = await orgRequest(`/api/org/applicants/${applicant.id}/provision`, {
        method: 'POST',
        json: {
          title,
          reports_to: reportsTo || null,
          mentor_member_id: mentor || null,
          role: 'analyst',
        },
      });
      if (j && j.emailSent === false) {
        // Account was created, but the welcome email failed. Keep the drawer
        // open with a notice so the manager can share the sign-in link by hand.
        setNotice(
          'Account created. The welcome email could not be sent; share the sign-in link manually.',
        );
        return;
      }
      onDone();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="c2-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="c2-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ maxWidth: 460 }}
      >
        <h2 id={titleId} className="c2-modal-title">
          <i className="bi bi-person-plus" aria-hidden="true" /> Provision member
        </h2>
        <p className="c2-sub" style={{ marginTop: 0 }}>
          Creates the account, the org-chart row (onboarding), pairs a mentor, and links it back to{' '}
          {applicant.full_name}. One step.
        </p>
        <label className="c2-label" htmlFor={`${uid}-title`} style={{ display: 'block' }}>
          Title in the chart
        </label>
        <input
          id={`${uid}-title`}
          className="c2-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%' }}
        />
        <label className="c2-label" htmlFor={`${uid}-reports`} style={{ display: 'block' }}>
          Reports to
        </label>
        <select
          id={`${uid}-reports`}
          className="c2-select"
          value={reportsTo}
          onChange={(e) => setReportsTo(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="">none</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name} {m.title ? `· ${m.title}` : ''}
            </option>
          ))}
        </select>
        <label className="c2-label" htmlFor={`${uid}-mentor`} style={{ display: 'block' }}>
          Mentor
        </label>
        <select
          id={`${uid}-mentor`}
          className="c2-select"
          value={mentor}
          onChange={(e) => setMentor(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="">none</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name}
            </option>
          ))}
        </select>
        <div className="c2-note" style={{ marginTop: '0.6rem' }}>
          Team assignment happens in the Org Chart after provisioning.
        </div>
        {notice ? (
          <>
            <div className="c2-note c2-note--warn" role="alert">
              {notice}
            </div>
            <div className="c2-modal-actions">
              <button type="button" className="c2-btn c2-btn--primary" onClick={onDone}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            {err && (
              <div className="c2-note c2-note--warn" role="alert">
                {err}
              </div>
            )}
            <div className="c2-modal-actions">
              <button type="button" className="c2-btn" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button
                type="button"
                className="c2-btn c2-btn--primary"
                onClick={submit}
                disabled={busy}
              >
                {busy ? 'Provisioning…' : 'Confirm & provision'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AddApplicantModal({ cohortId, onClose, onAdded }) {
  const titleId = useId();
  const uid = useId();
  const dialogRef = useDialogA11y(true, onClose);
  const [f, setF] = useState({ full_name: '', email: '', program: '', year: '', source: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    if (!f.full_name.trim()) {
      setErr('Name is required');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/org/applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohort_id: cohortId, ...f }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j?.error || 'Failed');
        return;
      }
      onAdded();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="c2-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="c2-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ maxWidth: 460 }}
      >
        <h2 id={titleId} className="c2-modal-title">
          Add applicant
        </h2>
        {[
          ['full_name', 'Full name'],
          ['email', 'Email'],
          ['program', 'Program / school'],
          ['year', 'Year'],
          ['source', 'Source (e.g. Info session, Referral)'],
        ].map(([k, label]) => (
          <div key={k}>
            <label className="c2-label" htmlFor={`${uid}-${k}`} style={{ display: 'block' }}>
              {label}
            </label>
            <input
              id={`${uid}-${k}`}
              className="c2-input"
              style={{ width: '100%' }}
              value={f[k]}
              onChange={(e) => set(k, e.target.value)}
            />
          </div>
        ))}
        {err && <div className="c2-note c2-note--warn">{err}</div>}
        <div className="c2-modal-actions">
          <button type="button" className="c2-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="c2-btn c2-btn--primary" onClick={submit} disabled={busy}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function FunnelSection({ cohortId, open, onToggle }) {
  const [f, setF] = useState(null);
  useEffect(() => {
    fetch(`/api/org/applicants/funnel?cohort_id=${cohortId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(setF)
      .catch(() => {});
  }, [cohortId]);
  if (!f || f.total === 0) return null;
  const max = f.funnel[0]?.count || 1;
  return (
    <details className="c2-panel" open={open} onToggle={(e) => onToggle?.(e.currentTarget.open)}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text-primary)' }}>
        <i
          className="bi bi-graph-up-arrow"
          style={{ verticalAlign: 'middle' }}
          aria-hidden="true"
        />{' '}
        Funnel &amp; sources · {f.conversion_pct == null ? NA : `${f.conversion_pct}%`} accepted
      </summary>
      <div style={{ marginTop: '0.8rem' }}>
        {f.funnel.map((row) => (
          <div key={row.stage} className="c2-funnel-bar">
            <span className="c2-funnel-label" style={{ textTransform: 'capitalize' }}>
              {row.stage}
            </span>
            <div className="c2-funnel-track">
              <div className="c2-funnel-fill" style={{ width: `${(row.count / max) * 100}%` }} />
            </div>
            <span className="c2-funnel-val">
              {row.count} · {row.conversion_pct ?? 0}%
            </span>
          </div>
        ))}
      </div>
      {f.sources.length > 0 && (
        <>
          <div className="c2-label">By source</div>
          <div className="c2-table-wrap">
            <table className="c2-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Applied</th>
                  <th>Accepted</th>
                  <th>Conversion</th>
                </tr>
              </thead>
              <tbody>
                {f.sources.map((s) => (
                  <tr key={s.source}>
                    <td>{s.source}</td>
                    <td className="c2-num">{s.total}</td>
                    <td className="c2-num">{s.accepted}</td>
                    <td className="c2-num">{s.conversion_pct ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </details>
  );
}

/* ── Rubric summary (Δ6) — read-only projection of the SAME scores endpoint the
   applicant modal uses (not a fork of the interactive scorer). Anti-anchoring is
   enforced server-side: unrevealed / unsubmitted interviewer cells arrive empty
   and render as "—". Aggregate ★ = weighted mean of SUBMITTED scores only. ── */
function RubricSummaryCard({ applicant }) {
  const [scoreData, setScoreData] = useState(null);

  useEffect(() => {
    if (!applicant?.id) {
      setScoreData(null);
      return;
    }
    let alive = true;
    fetch(`/api/org/applicants/${applicant.id}/scores`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => alive && setScoreData(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [applicant?.id]);

  // One column per interviewer (own scores first if present), labelled I1·I2·I3…
  const cols = useMemo(() => {
    if (!scoreData) return [];
    const list = [];
    if ((scoreData.my?.rows || []).length) list.push({ key: 'me', rows: scoreData.my.rows });
    for (const o of scoreData.others || [])
      list.push({ key: o.interviewer_id, rows: o.rows || [] });
    return list.map((c, i) => ({ ...c, label: `I${i + 1}` }));
  }, [scoreData]);

  const cellScore = (col, crit) => {
    const row = (col.rows || []).find((r) => r.criterion === crit);
    return row ? Number(row.score) : null;
  };
  // Per-criterion aggregate: weighted mean of the SUBMITTED (visible) scores.
  const critAggregate = (crit) => {
    let w = 0;
    let wx = 0;
    for (const col of cols) {
      const row = (col.rows || []).find((r) => r.criterion === crit);
      if (row) {
        const ww = Number(row.weight) || 1;
        w += ww;
        wx += ww * Number(row.score);
      }
    }
    return w ? Math.round((wx / w) * 100) / 100 : null;
  };

  const name = applicant
    ? applicant.blinded
      ? `Applicant ${applicant.initials}`
      : applicant.full_name
    : null;
  const meta = applicant
    ? [applicant.program, applicant.year].filter(Boolean).join(' · ') ||
      (applicant.blinded ? 'Blind screening' : NA)
    : '';

  return (
    <div className="c2-panel c2-rubric-sum">
      <div className="c2-rubric-sum-head">
        <div>
          <div className="c2-rubric-sum-title">
            <i className="bi bi-clipboard-data" aria-hidden="true" /> Rubric summary
          </div>
          <div className="c2-card-meta">
            {applicant ? `${name} · ${meta}` : 'No scored applicant yet.'}
          </div>
        </div>
        <span className="c2-star">
          <i className="bi bi-star" aria-hidden="true" />{' '}
          {scoreData?.aggregate_star != null ? scoreData.aggregate_star.toFixed(2) : NA}
        </span>
      </div>

      {!applicant ? (
        <p className="c2-rubric-sum-empty">
          Scores appear here once interviewers submit their rubric.
        </p>
      ) : (
        <>
          <div className="c2-table-wrap">
            <table className="c2-table c2-rubric-matrix">
              <thead>
                <tr>
                  <th>Criterion</th>
                  {cols.map((c) => (
                    <th key={c.key} className="c2-num">
                      {c.label}
                    </th>
                  ))}
                  <th className="c2-num">★</th>
                </tr>
              </thead>
              <tbody>
                {(scoreData?.criteria || []).map((crit) => (
                  <tr key={crit}>
                    <td>{CRITERION_LABEL[crit] || crit}</td>
                    {cols.map((c) => {
                      const s = cellScore(c, crit);
                      return (
                        <td key={c.key} className="c2-num">
                          {s == null ? NA : s}
                        </td>
                      );
                    })}
                    <td className="c2-num c2-rubric-agg">
                      {critAggregate(crit) == null ? NA : critAggregate(crit).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="c2-rubric-sum-foot">
            Panel · {scoreData?.scores_in ?? 0} of {scoreData?.interviewer_count ?? 0} submitted ·
            unsubmitted shown as {NA}
          </div>
        </>
      )}
    </div>
  );
}

const FIELD_KINDS = [
  { kind: 'short_text', label: 'Short text' },
  { kind: 'long_text', label: 'Long text' },
  { kind: 'dropdown', label: 'Dropdown' },
  { kind: 'file', label: 'File upload' },
  { kind: 'ticker', label: 'Ticker picker' },
];

function FormBuilder({ cohortId, canManage, open, onToggle }) {
  const [forms, setForms] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/org/cohorts/${cohortId}/forms`, { cache: 'no-store' });
    const j = await res.json().catch(() => ({}));
    setForms(j.forms || []);
    setForm((j.forms || [])[0] || null);
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

  const createForm = async () => {
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      await orgRequest(`/api/org/cohorts/${cohortId}/forms`, {
        method: 'POST',
        json: { fields: [], is_open: false },
      });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const patch = async (payload) => {
    if (!form || busy) return;
    setBusy(true);
    setErr('');
    try {
      await orgRequest(`/api/org/cohorts/${cohortId}/forms`, {
        method: 'PATCH',
        json: { form_id: form.id, ...payload },
      });
      await load();
    } catch (e) {
      setErr(e.message);
      // Toggles and the field list are driven by server data; refetch to sync.
      await load();
    } finally {
      setBusy(false);
    }
  };

  const addField = (kind) => {
    const fields = [
      ...(form.fields || []),
      { kind, label: `New ${kind} field`, required: false, options: [] },
    ];
    patch({ fields });
  };
  const removeField = (i) => {
    const fields = (form.fields || []).filter((_, idx) => idx !== i);
    patch({ fields });
  };

  return (
    <details
      className="c2-panel"
      style={{ marginTop: '1rem' }}
      open={open}
      onToggle={(e) => onToggle?.(e.currentTarget.open)}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text-primary)' }}>
        <i
          className="bi bi-clipboard-data"
          style={{ verticalAlign: 'middle' }}
          aria-hidden="true"
        />{' '}
        Application form builder
      </summary>
      {err && (
        <p className="org-inline-error" role="alert">
          {err}
        </p>
      )}
      {!form ? (
        <div style={{ marginTop: '0.8rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No form for this cohort yet.
          </p>
          {canManage && (
            <button
              type="button"
              className="c2-btn c2-btn--primary"
              onClick={createForm}
              disabled={busy}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" /> Create form
            </button>
          )}
        </div>
      ) : (
        <div style={{ marginTop: '0.8rem' }}>
          <div className="c2-toolbar">
            <button
              type="button"
              className={`c2-btn ${form.is_open ? 'c2-btn--primary' : ''}`}
              onClick={() => patch({ is_open: !form.is_open })}
              disabled={!canManage || busy}
            >
              {form.is_open ? 'Open for applications' : 'Closed'}
            </button>
            <button
              type="button"
              className={`c2-btn ${form.blind_screening ? 'c2-btn--gold' : ''}`}
              onClick={() => patch({ blind_screening: !form.blind_screening })}
              disabled={!canManage || busy}
            >
              {form.blind_screening ? (
                <i className="bi bi-eye-slash" aria-hidden="true" />
              ) : (
                <i className="bi bi-eye" aria-hidden="true" />
              )}{' '}
              Blind screening
            </button>
          </div>

          {form.public_slug && (
            <div className="c2-note">
              <i
                className="bi bi-link-45deg"
                style={{ verticalAlign: 'middle' }}
                aria-hidden="true"
              />{' '}
              Public link (informational): <code className="c2-num">/apply/{form.public_slug}</code>
              {!form.is_open && ' (currently closed)'}
            </div>
          )}

          <div className="c2-label">Fields</div>
          {(form.fields || []).length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No custom fields yet.</p>
          )}
          {(form.fields || []).map((fl, i) => (
            <div
              key={i}
              className="c2-card-row"
              style={{
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-primary)',
                paddingBottom: '0.4rem',
              }}
            >
              <span>
                <span className="c2-chip">{fl.kind}</span> {fl.label}
                {fl.required ? ' *' : ''}
              </span>
              {canManage && (
                <button
                  type="button"
                  className="c2-btn c2-btn--sm"
                  onClick={() => removeField(i)}
                  disabled={busy}
                  aria-label={`Remove ${fl.label} field`}
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}

          {canManage && (
            <div className="c2-toolbar" style={{ marginTop: '0.6rem' }}>
              {FIELD_KINDS.map((k) => (
                <button
                  key={k.kind}
                  type="button"
                  className="c2-btn c2-btn--sm"
                  onClick={() => addField(k.kind)}
                  disabled={busy}
                >
                  <i className="bi bi-plus-lg" aria-hidden="true" /> {k.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </details>
  );
}
