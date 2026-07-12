'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Star,
  FileText,
  Plus,
  X,
  EyeOff,
  Eye,
  Lock,
  UserPlus,
  TrendingUp,
  Link2,
  ClipboardList,
  Check,
  Ban,
  Clock,
} from 'lucide-react';
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
    { label: 'Applicants', value: stats?.applicants ?? '—' },
    { label: 'Interviewed', value: stats?.interviewed ?? '—' },
    { label: 'Offers', value: stats?.offers ?? '—' },
    { label: 'Yield', value: stats?.yield_pct == null ? '—' : `${stats.yield_pct}%` },
  ];
  return (
    <div className="c2-stats">
      {tiles.map((t) => (
        <div key={t.label} className="c2-stat">
          <div className="c2-stat-label">{t.label}</div>
          <div className="c2-stat-value">{t.value}</div>
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
    setBusy(true);
    try {
      const fres = await fetch(`/api/org/cohorts/${cohortId}/forms`, { cache: 'no-store' });
      const fjson = await fres.json().catch(() => ({}));
      const form = (fjson.forms || [])[0];
      const next = !data?.blind;
      if (form) {
        await fetch(`/api/org/cohorts/${cohortId}/forms`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ form_id: form.id, blind_screening: next }),
        });
      } else {
        await fetch(`/api/org/cohorts/${cohortId}/forms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blind_screening: next }),
        });
      }
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

  return (
    <div>
      <StatStrip stats={data?.stats} />

      <div className="c2-toolbar">
        <button
          type="button"
          className={`c2-btn ${data?.blind ? 'c2-btn--gold' : ''}`}
          onClick={toggleBlind}
          disabled={!canManage || busy}
          title={
            canManage
              ? 'Hide name/school until the interview stage (redacted server-side)'
              : 'Managers only'
          }
        >
          {data?.blind ? <EyeOff size={15} /> : <Eye size={15} />}
          Blind screening {data?.blind ? 'ON' : 'OFF'}
        </button>
        <div className="c2-spacer" />
        {canManage && (
          <button type="button" className="c2-btn c2-btn--primary" onClick={() => setAdding(true)}>
            <Plus size={15} /> Add applicant
          </button>
        )}
      </div>

      {applicants.length === 0 ? (
        <div className="c2-empty">
          <ClipboardList size={28} />
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

      <FunnelSection cohortId={cohortId} />
      <FormBuilder cohortId={cohortId} canManage={canManage} />

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
              (a.blinded ? 'Blind screening' : '—')}
          </div>
        </div>
      </div>
      <div className="c2-card-row">
        {a.aggregate_star != null && (
          <span className="c2-star">
            <Star size={13} fill="currentColor" /> {a.aggregate_star.toFixed(2)}
          </span>
        )}
        {a.has_resume && (
          <span className="c2-chip">
            <FileText size={11} /> Resume
          </span>
        )}
        {a.has_sample_pitch && (
          <span className="c2-chip">
            <FileText size={11} /> Pitch
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
  const [scoreData, setScoreData] = useState(null);
  const [myScores, setMyScores] = useState({});
  const [saving, setSaving] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

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
    if (scores.length === 0) return;
    setSaving(true);
    try {
      await fetch(`/api/org/applicants/${a.id}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores, submit }),
      });
      await loadScores();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const advance = async (stage, reason) => {
    setSaving(true);
    try {
      const body = { stage };
      if (reason != null) body.rejected_reason = reason;
      const res = await fetch(`/api/org/applicants/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await onChanged?.();
        onClose();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || 'Failed');
      }
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
      <div className="c2-modal" role="dialog" aria-modal="true" aria-label="Applicant detail">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h2 className="c2-modal-title">
              {a.blinded ? `Applicant ${a.initials}` : a.full_name}
              {scoreData?.aggregate_star != null && (
                <span className="c2-star">
                  <Star size={15} fill="currentColor" /> {scoreData.aggregate_star.toFixed(2)}
                </span>
              )}
            </h2>
            <p className="c2-sub" style={{ marginTop: 0 }}>
              {[a.program, a.year, a.source && `via ${a.source}`].filter(Boolean).join(' · ') ||
                '—'}
            </p>
          </div>
          <button type="button" className="c2-btn c2-btn--sm" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        {a.blinded && (
          <div className="c2-note">
            <EyeOff size={14} style={{ verticalAlign: 'middle' }} /> Blind screening on — identity
            is hidden until the interview stage (redacted server-side).
          </div>
        )}

        {(a.has_resume || a.has_sample_pitch) && (
          <div className="c2-card-row">
            {a.resume_url && (
              <a className="c2-chip" href={a.resume_url} target="_blank" rel="noreferrer">
                <FileText size={12} /> Resume
              </a>
            )}
            {a.sample_pitch_url && (
              <a className="c2-chip" href={a.sample_pitch_url} target="_blank" rel="noreferrer">
                <FileText size={12} /> Sample pitch
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
              placeholder="Private notes (hidden from peers until you submit)"
              value={myScores[crit]?.notes || ''}
              disabled={scoreData?.my?.submitted}
              onChange={(e) => setCrit(crit, { notes: e.target.value })}
            />
          </div>
        ))}
        {scoreData?.my?.submitted ? (
          <div className="c2-note" style={{ marginTop: '0.6rem' }}>
            <Check size={14} style={{ verticalAlign: 'middle' }} /> Your scores are submitted.
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
                  <Lock size={13} /> Notes hidden until you submit your own scores.
                </div>
              ) : (
                o.rows.map((r) => (
                  <div key={r.criterion} style={{ marginTop: '0.35rem', fontSize: '0.82rem' }}>
                    <span className="c2-star">
                      <Star size={11} fill="currentColor" /> {r.score}
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
                  <Ban size={14} /> Reject
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
                    <Clock size={14} /> Schedule interview
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
                    <UserPlus size={14} /> Accept &amp; provision
                  </button>
                )}
              </>
            )}
            {a.stage === 'accepted' && a.provisioned_member_id && (
              <span className="c2-pill c2-pill--active">
                <Check size={12} /> Provisioned
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
  const [members, setMembers] = useState([]);
  const [title, setTitle] = useState('Junior Analyst');
  const [reportsTo, setReportsTo] = useState('');
  const [mentor, setMentor] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/org/chart', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setMembers(j.members || []))
      .catch(() => {});
  }, []);

  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/org/applicants/${applicant.id}/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          reports_to: reportsTo || null,
          mentor_member_id: mentor || null,
          role: 'analyst',
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j?.error || 'Provisioning failed');
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="c2-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="c2-modal" role="dialog" aria-modal="true" style={{ maxWidth: 460 }}>
        <h2 className="c2-modal-title">
          <UserPlus size={18} /> Provision member
        </h2>
        <p className="c2-sub" style={{ marginTop: 0 }}>
          Creates the account, the org-chart row (onboarding), pairs a mentor, and links it back to{' '}
          {applicant.full_name}. One step.
        </p>
        <div className="c2-label">Title in the chart</div>
        <input
          className="c2-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: '100%' }}
        />
        <div className="c2-label">Reports to</div>
        <select
          className="c2-select"
          value={reportsTo}
          onChange={(e) => setReportsTo(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="">— none —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name} {m.title ? `· ${m.title}` : ''}
            </option>
          ))}
        </select>
        <div className="c2-label">Mentor</div>
        <select
          className="c2-select"
          value={mentor}
          onChange={(e) => setMentor(e.target.value)}
          style={{ width: '100%' }}
        >
          <option value="">— none —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.display_name}
            </option>
          ))}
        </select>
        <div className="c2-note" style={{ marginTop: '0.6rem' }}>
          Team assignment happens in the Org Chart after provisioning.
        </div>
        {err && <div className="c2-note c2-note--warn">{err}</div>}
        <div className="c2-modal-actions">
          <button type="button" className="c2-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="c2-btn c2-btn--primary" onClick={submit} disabled={busy}>
            {busy ? 'Provisioning…' : 'Confirm & provision'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddApplicantModal({ cohortId, onClose, onAdded }) {
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
      <div className="c2-modal" role="dialog" aria-modal="true" style={{ maxWidth: 460 }}>
        <h2 className="c2-modal-title">Add applicant</h2>
        {[
          ['full_name', 'Full name'],
          ['email', 'Email'],
          ['program', 'Program / school'],
          ['year', 'Year'],
          ['source', 'Source (e.g. Info session, Referral)'],
        ].map(([k, label]) => (
          <div key={k}>
            <div className="c2-label">{label}</div>
            <input
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

function FunnelSection({ cohortId }) {
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
    <details className="c2-panel" style={{ marginTop: '1.25rem' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text-primary)' }}>
        <TrendingUp size={15} style={{ verticalAlign: 'middle' }} /> Funnel &amp; sources ·{' '}
        {f.conversion_pct == null ? '—' : `${f.conversion_pct}%`} accepted
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

const FIELD_KINDS = [
  { kind: 'short_text', label: 'Short text' },
  { kind: 'long_text', label: 'Long text' },
  { kind: 'dropdown', label: 'Dropdown' },
  { kind: 'file', label: 'File upload' },
  { kind: 'ticker', label: 'Ticker picker' },
];

function FormBuilder({ cohortId, canManage }) {
  const [forms, setForms] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    try {
      await fetch(`/api/org/cohorts/${cohortId}/forms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: [], is_open: false }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const patch = async (payload) => {
    if (!form) return;
    setBusy(true);
    try {
      await fetch(`/api/org/cohorts/${cohortId}/forms`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_id: form.id, ...payload }),
      });
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
    <details className="c2-panel" style={{ marginTop: '1rem' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text-primary)' }}>
        <ClipboardList size={15} style={{ verticalAlign: 'middle' }} /> Application form builder
      </summary>
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
              <Plus size={14} /> Create form
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
              {form.blind_screening ? <EyeOff size={14} /> : <Eye size={14} />} Blind screening
            </button>
          </div>

          {form.public_slug && (
            <div className="c2-note">
              <Link2 size={14} style={{ verticalAlign: 'middle' }} /> Public link (informational):{' '}
              <code className="c2-num">/apply/{form.public_slug}</code>
              {!form.is_open && ' — currently closed'}
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
                <button type="button" className="c2-btn c2-btn--sm" onClick={() => removeField(i)}>
                  <X size={13} />
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
                  <Plus size={12} /> {k.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </details>
  );
}
