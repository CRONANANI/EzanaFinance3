'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plus,
  GraduationCap,
  Archive,
  ChevronDown,
  Check,
  Users,
  ClipboardList,
  ListChecks,
  Award,
} from 'lucide-react';
import { ApplicantPipeline } from './ApplicantPipeline';
import { CohortRoster } from './CohortRoster';
import { OnboardingChecklist } from './OnboardingChecklist';
import { AlumniDirectory } from './AlumniDirectory';
import { CohortArchiveView } from './CohortArchiveView';
import './cohort2.css';

const TABS = [
  { key: 'roster', label: 'Roster', icon: Users },
  { key: 'recruitment', label: 'Recruitment', icon: ClipboardList },
  { key: 'onboarding', label: 'Onboarding', icon: ListChecks },
  { key: 'alumni', label: 'Alumni', icon: Award },
];

const STATUS_SUFFIX = {
  recruiting: 'Recruiting',
  active: 'Active',
  graduating: 'Graduating',
  alumni: 'Alumni',
  archived: 'Archived',
};

// Landing tab. Roster is the primary view, so the page opens on it and — via
// defaultCohortId below — on the active (is_current) cohort, not the recruiting
// one. Keep the initial tab and the seeded cohort derived from the SAME value.
const INITIAL_TAB = 'roster';

// The default cohort. Recruitment concerns the cohort you're recruiting INTO
// (status='recruiting'), not the one currently running (is_current). Only the
// default changes — a manual selection still sticks.
function defaultCohortId(list, tab) {
  if (!list?.length) return null;
  if (tab === 'recruitment') {
    const recruiting = list.find((c) => c.status === 'recruiting');
    if (recruiting) return recruiting.id;
  }
  return list.find((c) => c.is_current)?.id || list[0]?.id || null;
}

export function CohortManager({ initialData = null }) {
  const [cohorts, setCohorts] = useState(initialData?.cohorts || []);
  const [viewer, setViewer] = useState(
    initialData?.viewer || { canManage: false, isExecutive: false },
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(() =>
    defaultCohortId(initialData?.cohorts || [], INITIAL_TAB),
  );
  const [tab, setTab] = useState(INITIAL_TAB);
  // True once the user manually chooses a cohort — after that, tab changes no
  // longer move the default cohort (their pick sticks).
  const userPickedRef = useRef(false);
  const [counts, setCounts] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [graduating, setGraduating] = useState(false);
  const [viewArchive, setViewArchive] = useState(null);

  const loadCohorts = useCallback(async () => {
    try {
      const res = await fetch('/api/org/cohorts', { cache: 'no-store' });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load cohorts.');
        return;
      }
      const list = data.cohorts || [];
      setCohorts(list);
      setViewer(data.viewer || {});
      setError('');
      setSelectedId((prev) => prev || defaultCohortId(list, INITIAL_TAB));
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Seeded from the server component → skip the mount fetch. When there's no
    // initialData (e.g. non-member 403 path) keep the client fetch as fallback.
    if (initialData) return;
    loadCohorts();
  }, [loadCohorts, initialData]);

  // The default cohort follows the active tab: Recruitment → the recruiting
  // cohort, every other tab → the active (is_current) cohort. A manual pick
  // overrides this for the rest of the session (userPickedRef).
  useEffect(() => {
    if (userPickedRef.current) return;
    const next = defaultCohortId(cohorts, tab);
    if (next && next !== selectedId) setSelectedId(next);
    // selectedId intentionally omitted — this only re-derives on tab/data change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, cohorts]);

  const setCount = useCallback(
    (key, n) => setCounts((c) => (c[key] === n ? c : { ...c, [key]: n })),
    [],
  );
  // Stable per-tab callbacks — inline arrows would change identity each render
  // and are in the tab components' fetch-effect deps (would loop).
  const onCountRecruit = useCallback((n) => setCount('recruitment', n), [setCount]);
  const onCountRoster = useCallback((n) => setCount('roster', n), [setCount]);
  const onCountOnboarding = useCallback((n) => setCount('onboarding', n), [setCount]);
  const onCountAlumni = useCallback((n) => setCount('alumni', n), [setCount]);
  const goRecruit = useCallback(() => setTab('recruitment'), []);

  if (loading) return <div className="c2-root c2-state">Loading cohorts…</div>;
  if (error) return <div className="c2-root c2-state c2-error">{error}</div>;

  const selected = cohorts.find((c) => c.id === selectedId) || null;
  const canManage = !!viewer.canManage;

  return (
    <div className="c2-root">
      <div className="c2-header">
        <div>
          <p className="c2-eyebrow">People</p>
          <h1 className="c2-title">Cohort</h1>
          <p className="c2-sub">
            The member lifecycle end to end — recruit, onboard, run, and graduate each class into
            the alumni record.
          </p>
        </div>
        <div className="c2-selector">
          {cohorts.length > 0 && (
            <div className="c2-cohort-select">
              <button
                type="button"
                className="c2-cohort-pill"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span className="c2-cohort-pill-name">{selected?.name || 'Select cohort'}</span>
                {selected?.status && (
                  <span className={`c2-pill c2-pill--${selected.status}`}>
                    {STATUS_SUFFIX[selected.status] || selected.status}
                  </span>
                )}
                <ChevronDown size={15} className="c2-cohort-chev" />
              </button>
              {menuOpen && (
                <>
                  <div className="c2-menu-backdrop" onClick={() => setMenuOpen(false)} />
                  <div className="c2-cohort-menu" role="menu">
                    <div className="c2-cohort-menu-list">
                      {cohorts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={c.id === selectedId}
                          className={`c2-cohort-menu-item ${c.id === selectedId ? 'is-active' : ''}`}
                          onClick={() => {
                            userPickedRef.current = true;
                            setSelectedId(c.id);
                            setMenuOpen(false);
                          }}
                        >
                          <span className="c2-cohort-menu-name">{c.name}</span>
                          {c.status && (
                            <span className={`c2-pill c2-pill--${c.status}`}>
                              {STATUS_SUFFIX[c.status] || c.status}
                            </span>
                          )}
                          {c.id === selectedId && (
                            <Check size={14} className="c2-cohort-menu-check" />
                          )}
                        </button>
                      ))}
                    </div>
                    {(viewer.isExecutive || selected?.archived) && (
                      <div className="c2-cohort-menu-actions">
                        {viewer.isExecutive && (
                          <button
                            type="button"
                            className="c2-cohort-menu-action"
                            onClick={() => {
                              setMenuOpen(false);
                              setCreating(true);
                            }}
                          >
                            <Plus size={15} /> New cohort
                          </button>
                        )}
                        {viewer.isExecutive && selected && !selected.archived && (
                          <button
                            type="button"
                            className="c2-cohort-menu-action c2-cohort-menu-action--gold"
                            onClick={() => {
                              setMenuOpen(false);
                              setGraduating(true);
                            }}
                          >
                            <GraduationCap size={15} /> Graduate {selected.name}
                          </button>
                        )}
                        {selected?.archived && (
                          <button
                            type="button"
                            className="c2-cohort-menu-action"
                            onClick={() => {
                              setMenuOpen(false);
                              setViewArchive(selected);
                            }}
                          >
                            <Archive size={15} /> Track record
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {cohorts.length === 0 ? (
        <div className="c2-empty">
          <Users size={30} />
          <p>No cohorts yet.</p>
          {viewer.isExecutive ? (
            <button
              type="button"
              className="c2-btn c2-btn--primary"
              onClick={() => setCreating(true)}
            >
              <Plus size={15} /> Create the first cohort
            </button>
          ) : (
            <p style={{ fontSize: '0.82rem' }}>An executive needs to create a cohort first.</p>
          )}
        </div>
      ) : (
        <>
          <div className="c2-tabs" role="tablist">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  className={`c2-tab ${tab === t.key ? 'c2-tab--active' : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  <Icon size={15} /> {t.label}
                  {counts[t.key] != null && <span className="c2-tab-count">{counts[t.key]}</span>}
                </button>
              );
            })}
          </div>

          {selected && (
            <div key={selected.id}>
              {tab === 'recruitment' && (
                <ApplicantPipeline
                  cohortId={selected.id}
                  canManage={canManage}
                  onCount={onCountRecruit}
                />
              )}
              {tab === 'roster' && (
                <CohortRoster
                  cohortId={selected.id}
                  canManage={canManage}
                  onCount={onCountRoster}
                  onGoRecruit={goRecruit}
                />
              )}
              {tab === 'onboarding' && (
                <OnboardingChecklist
                  cohortId={selected.id}
                  canManage={canManage}
                  onCount={onCountOnboarding}
                />
              )}
              {tab === 'alumni' && (
                <AlumniDirectory
                  cohortId={selected.id}
                  canManage={canManage}
                  onCount={onCountAlumni}
                />
              )}
            </div>
          )}
        </>
      )}

      {creating && (
        <CreateCohortModal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            userPickedRef.current = true;
            setSelectedId(id);
            loadCohorts();
          }}
        />
      )}
      {graduating && selected && (
        <GraduateModal
          cohort={selected}
          onClose={() => setGraduating(false)}
          onDone={() => (setGraduating(false), loadCohorts())}
        />
      )}
      {viewArchive && (
        <CohortArchiveView cohort={viewArchive} onClose={() => setViewArchive(null)} />
      )}
    </div>
  );
}

function CreateCohortModal({ onClose, onCreated }) {
  const [f, setF] = useState({
    name: '',
    term_type: 'year',
    entry_term: '',
    expected_grad_term: '',
    status: 'recruiting',
    onboarding_gate: true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    if (!f.name.trim()) {
      setErr('Name required');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/org/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, is_current: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j?.error || 'Failed');
        return;
      }
      onCreated(j.cohort?.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="c2-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="c2-modal" role="dialog" aria-modal="true" style={{ maxWidth: 460 }}>
        <h2 className="c2-modal-title">New cohort</h2>
        <div className="c2-label">Name</div>
        <input
          className="c2-input"
          style={{ width: '100%' }}
          placeholder="Class of 2028"
          value={f.name}
          onChange={(e) => set('name', e.target.value)}
        />
        <div className="c2-label">Term type</div>
        <select
          className="c2-select"
          style={{ width: '100%' }}
          value={f.term_type}
          onChange={(e) => set('term_type', e.target.value)}
        >
          <option value="semester">Semester</option>
          <option value="quarter">Quarter</option>
          <option value="year">Year</option>
        </select>
        <div className="c2-label">Entry term</div>
        <input
          className="c2-input"
          style={{ width: '100%' }}
          placeholder="Fall 2026"
          value={f.entry_term}
          onChange={(e) => set('entry_term', e.target.value)}
        />
        <div className="c2-label">Expected graduation</div>
        <input
          className="c2-input"
          style={{ width: '100%' }}
          placeholder="Spring 2028"
          value={f.expected_grad_term}
          onChange={(e) => set('expected_grad_term', e.target.value)}
        />
        <label
          style={{
            display: 'flex',
            gap: '0.4rem',
            alignItems: 'center',
            margin: '0.7rem 0',
            fontSize: '0.85rem',
          }}
        >
          <input
            type="checkbox"
            checked={f.onboarding_gate}
            onChange={(e) => set('onboarding_gate', e.target.checked)}
          />
          Onboarding gate (block live pitches until onboarding complete)
        </label>
        {err && <div className="c2-note c2-note--warn">{err}</div>}
        <div className="c2-modal-actions">
          <button type="button" className="c2-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="c2-btn c2-btn--primary" onClick={submit} disabled={busy}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function GraduateModal({ cohort, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState(null); // {required, published, missing[]}
  const [err, setErr] = useState('');

  const run = async (force) => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/org/cohorts/${cohort.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graduate: true, force }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 409 && j?.gate === 'handoff_docs') {
        setGate(j);
        return;
      }
      if (!res.ok) {
        setErr(j?.error || 'Failed');
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="c2-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="c2-modal" role="dialog" aria-modal="true" style={{ maxWidth: 500 }}>
        <h2 className="c2-modal-title">
          <GraduationCap size={18} /> Graduate {cohort.name}
        </h2>
        <p className="c2-sub" style={{ marginTop: 0 }}>
          Snapshots the fund track record, freezes graduating members into the alumni record (final
          rating from the Ezana Rating), and moves the cohort to alumni. Members flagged
          &quot;graduating&quot; in the roster are the ones who graduate.
        </p>

        {gate && (
          <div className="c2-note c2-note--warn">
            <b>
              Handoff docs incomplete — {gate.published} of {gate.required} published.
            </b>
            <div style={{ marginTop: '0.4rem' }}>
              Missing coverage handoffs:
              <ul style={{ margin: '0.3rem 0 0 1rem' }}>
                {gate.missing.map((m, i) => (
                  <li key={i}>
                    {m.member_name || 'Member'} · {m.sector}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {err && <div className="c2-note c2-note--warn">{err}</div>}

        <div className="c2-modal-actions">
          <button type="button" className="c2-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          {gate ? (
            <button
              type="button"
              className="c2-btn c2-btn--danger"
              onClick={() => run(true)}
              disabled={busy}
            >
              Graduate anyway
            </button>
          ) : (
            <button
              type="button"
              className="c2-btn c2-btn--gold"
              onClick={() => run(false)}
              disabled={busy}
            >
              {busy ? 'Working…' : 'Graduate cohort'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
