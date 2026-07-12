'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Search, Paperclip, Check } from 'lucide-react';
import { TYPE_META } from './AssignmentCard';

const TYPE_ORDER = ['pitch', 'research', 'coverage', 'reading', 'model', 'meeting_prep', 'other'];
const TARGET_MODES = [
  { key: 'member', label: 'Members' },
  { key: 'team', label: 'Team' },
  { key: 'cohort', label: 'Cohort' },
  { key: 'role', label: 'Role' },
  { key: 'org', label: 'Whole org' },
];

const emptyForm = {
  type: 'pitch',
  title: '',
  instructions: '',
  ticker: '',
  sector: '',
  due_date: '',
  require_upload: false,
  recurring: null,
  save_as_template: false,
  template_name: '',
};

function Switch({ on, onClick, label }) {
  return (
    <div className="asg2-toggle-row">
      <span className="asg2-toggle-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`asg2-switch${on ? ' is-on' : ''}`}
        onClick={onClick}
      />
    </div>
  );
}

/* Create/assign drawer. Type preset changes the fields; assign to members, a
   team, a cohort, a role, or the whole org; recurring + save-as-template. */
export function AssignmentDrawer({
  open,
  onClose,
  onCreated,
  roster,
  teams,
  cohorts,
  roles,
  templates,
  viewer,
}) {
  const [form, setForm] = useState(emptyForm);
  const [targets, setTargets] = useState([]); // {target_type, target_id?, target_role?, label}
  const [mode, setMode] = useState('member');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(emptyForm);
      setTargets([]);
      setMode('member');
      setQuery('');
      setError('');
    }
  }, [open]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const filteredRoster = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (roster || []).filter((m) => !q || (m.display_name || '').toLowerCase().includes(q));
  }, [roster, query]);

  const hasTarget = (t) =>
    targets.some(
      (x) =>
        x.target_type === t.target_type &&
        x.target_id === t.target_id &&
        x.target_role === t.target_role,
    );

  const toggleTarget = (t) => {
    setTargets((prev) => {
      const exists = prev.some(
        (x) =>
          x.target_type === t.target_type &&
          x.target_id === t.target_id &&
          x.target_role === t.target_role,
      );
      if (exists) {
        return prev.filter(
          (x) =>
            !(
              x.target_type === t.target_type &&
              x.target_id === t.target_id &&
              x.target_role === t.target_role
            ),
        );
      }
      // 'org' is exclusive — clearing others keeps intent honest.
      if (t.target_type === 'org') return [t];
      return [...prev.filter((x) => x.target_type !== 'org'), t];
    });
  };

  const removeTarget = (t) =>
    setTargets((prev) =>
      prev.filter(
        (x) =>
          !(
            x.target_type === t.target_type &&
            x.target_id === t.target_id &&
            x.target_role === t.target_role
          ),
      ),
    );

  const applyTemplate = (tpl) => {
    if (!tpl) return;
    set({
      type: TYPE_META[tpl.assignment_type] ? tpl.assignment_type : 'other',
      title: tpl.title || tpl.name || '',
      instructions: tpl.instructions || '',
      sector: tpl.sector || '',
      require_upload: !!tpl.require_upload,
    });
  };

  const submit = async () => {
    setError('');
    if (!form.title.trim()) return setError('A title is required.');
    if (targets.length === 0) return setError('Pick at least one assignee target.');
    setBusy(true);
    try {
      const res = await fetch('/api/org/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          instructions: form.instructions.trim() || null,
          assignment_type: form.type,
          ticker: form.type === 'pitch' ? form.ticker.trim() || null : null,
          sector: ['pitch', 'coverage'].includes(form.type) ? form.sector.trim() || null : null,
          due_date: form.due_date || null,
          require_upload: form.require_upload,
          recurring: form.recurring,
          save_as_template: form.save_as_template,
          template_name: form.template_name.trim() || null,
          assignees: targets.map(({ target_type, target_id, target_role }) => ({
            target_type,
            target_id: target_id || null,
            target_role: target_role || null,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not create the assignment.');
        return;
      }
      onCreated?.();
      onClose?.();
    } catch {
      setError('Could not connect.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  const showSector = ['pitch', 'coverage'].includes(form.type);
  const showTicker = form.type === 'pitch';

  return (
    <div
      className="asg2-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="New assignment"
      onClick={onClose}
    >
      <div className="asg2-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="asg2-drawer-head">
          <h2 className="asg2-modal-title">New assignment</h2>
          <button type="button" className="asg2-icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Type presets */}
        <div className="asg2-field">
          <span className="asg2-label">Type</span>
          <div className="asg2-presets">
            {TYPE_ORDER.map((t) => {
              const { label, Icon } = TYPE_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  data-type={t}
                  className={`asg2-preset${form.type === t ? ' is-active' : ''}`}
                  onClick={() => set({ type: t })}
                >
                  <Icon size={13} aria-hidden="true" /> {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates (one-click prefill) */}
        {(templates || []).length > 0 && (
          <div className="asg2-field">
            <label className="asg2-label" htmlFor="asg2-tpl">
              Start from template
            </label>
            <select
              id="asg2-tpl"
              className="asg2-select"
              defaultValue=""
              onChange={(e) =>
                applyTemplate((templates || []).find((x) => x.id === e.target.value))
              }
            >
              <option value="">— none —</option>
              {(templates || []).map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="asg2-field">
          <label className="asg2-label" htmlFor="asg2-title">
            Title
          </label>
          <input
            id="asg2-title"
            className="asg2-input"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="e.g. Pitch a healthcare name"
          />
        </div>

        {(showTicker || showSector) && (
          <div className="asg2-row2">
            {showTicker && (
              <div className="asg2-field">
                <label className="asg2-label" htmlFor="asg2-ticker">
                  Ticker
                </label>
                <input
                  id="asg2-ticker"
                  className="asg2-input"
                  value={form.ticker}
                  onChange={(e) => set({ ticker: e.target.value.toUpperCase() })}
                  placeholder="AAPL"
                />
              </div>
            )}
            {showSector && (
              <div className="asg2-field">
                <label className="asg2-label" htmlFor="asg2-sector">
                  Sector
                </label>
                <input
                  id="asg2-sector"
                  className="asg2-input"
                  value={form.sector}
                  onChange={(e) => set({ sector: e.target.value })}
                  placeholder="Healthcare"
                />
              </div>
            )}
          </div>
        )}

        <div className="asg2-field">
          <label className="asg2-label" htmlFor="asg2-instr">
            Instructions
          </label>
          <textarea
            id="asg2-instr"
            className="asg2-textarea"
            value={form.instructions}
            onChange={(e) => set({ instructions: e.target.value })}
            placeholder="The brief — what to deliver, format, expectations…"
          />
        </div>

        <div className="asg2-field">
          <label className="asg2-label" htmlFor="asg2-due">
            Due date
          </label>
          <input
            id="asg2-due"
            className="asg2-input"
            type="date"
            value={form.due_date}
            onChange={(e) => set({ due_date: e.target.value })}
          />
        </div>

        {/* Assign to */}
        <div className="asg2-field">
          <span className="asg2-label">Assign to</span>
          <div className="asg2-target-modes">
            {TARGET_MODES.map((tm) => (
              <button
                key={tm.key}
                type="button"
                className={`asg2-chip-toggle${mode === tm.key ? ' is-active' : ''}`}
                onClick={() => setMode(tm.key)}
              >
                {tm.label}
              </button>
            ))}
          </div>

          {mode === 'member' && (
            <>
              <div style={{ position: 'relative', marginBottom: '0.4rem' }}>
                <Search
                  size={14}
                  style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }}
                  aria-hidden="true"
                />
                <input
                  className="asg2-input"
                  style={{ paddingLeft: 30 }}
                  placeholder="Search members…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="asg2-picklist">
                {filteredRoster.length === 0 ? (
                  <div className="asg2-hint" style={{ padding: '0.4rem' }}>
                    No members match.
                  </div>
                ) : (
                  filteredRoster.map((m) => {
                    const t = {
                      target_type: 'member',
                      target_id: m.member_id,
                      target_role: null,
                      label: m.display_name,
                    };
                    const sel = hasTarget(t);
                    return (
                      <button
                        key={m.member_id}
                        type="button"
                        className={`asg2-pickitem${sel ? ' is-selected' : ''}`}
                        onClick={() => toggleTarget(t)}
                      >
                        <span>
                          {m.display_name}
                          <span style={{ color: 'var(--text-muted)' }}>
                            {' '}
                            · {(m.role || '').replace('_', ' ')}
                          </span>
                        </span>
                        {sel && <Check size={14} aria-hidden="true" />}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}

          {mode === 'team' && (
            <div className="asg2-picklist">
              {(teams || []).length === 0 ? (
                <div className="asg2-hint" style={{ padding: '0.4rem' }}>
                  No teams yet.
                </div>
              ) : (
                (teams || []).map((t) => {
                  const tgt = {
                    target_type: 'team',
                    target_id: t.id,
                    target_role: null,
                    label: t.name,
                  };
                  const sel = hasTarget(tgt);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`asg2-pickitem${sel ? ' is-selected' : ''}`}
                      onClick={() => toggleTarget(tgt)}
                    >
                      <span>{t.name}</span>
                      {sel && <Check size={14} aria-hidden="true" />}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {mode === 'cohort' && (
            <div className="asg2-picklist">
              {(cohorts || []).length === 0 ? (
                <div className="asg2-hint" style={{ padding: '0.4rem' }}>
                  No cohorts yet.
                </div>
              ) : (
                (cohorts || []).map((c) => {
                  const tgt = {
                    target_type: 'cohort',
                    target_id: c.id,
                    target_role: null,
                    label: c.name,
                  };
                  const sel = hasTarget(tgt);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`asg2-pickitem${sel ? ' is-selected' : ''}`}
                      onClick={() => toggleTarget(tgt)}
                    >
                      <span>
                        {c.name}
                        {c.is_current && (
                          <span style={{ color: 'var(--emerald-text)' }}> · current</span>
                        )}
                      </span>
                      {sel && <Check size={14} aria-hidden="true" />}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {mode === 'role' && (
            <div className="asg2-picklist">
              {(roles || []).length === 0 ? (
                <div className="asg2-hint" style={{ padding: '0.4rem' }}>
                  No named roles on the roster yet.
                </div>
              ) : (
                (roles || []).map((r) => {
                  const tgt = { target_type: 'role', target_id: null, target_role: r, label: r };
                  const sel = hasTarget(tgt);
                  return (
                    <button
                      key={r}
                      type="button"
                      className={`asg2-pickitem${sel ? ' is-selected' : ''}`}
                      onClick={() => toggleTarget(tgt)}
                    >
                      <span>{r}</span>
                      {sel && <Check size={14} aria-hidden="true" />}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {mode === 'org' && (
            <Switch
              on={hasTarget({ target_type: 'org', target_id: null, target_role: null })}
              onClick={() =>
                toggleTarget({
                  target_type: 'org',
                  target_id: null,
                  target_role: null,
                  label: 'Whole org',
                })
              }
              label="Assign to the whole organization"
            />
          )}

          {targets.length > 0 && (
            <div className="asg2-selected">
              {targets.map((t) => (
                <span
                  key={`${t.target_type}-${t.target_id}-${t.target_role}`}
                  className="asg2-token"
                >
                  {t.label}
                  <button
                    type="button"
                    onClick={() => removeTarget(t)}
                    aria-label={`Remove ${t.label}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Deliverable + cadence */}
        <Switch
          on={form.require_upload}
          onClick={() => set({ require_upload: !form.require_upload })}
          label="Require deliverable upload"
        />
        {form.require_upload && (
          <div className="asg2-hint asg2-hint--disabled">
            <Paperclip size={13} aria-hidden="true" /> Assignees attach their deliverable from the
            assignment view after it&apos;s created.
          </div>
        )}

        <Switch
          on={!!form.recurring}
          onClick={() => set({ recurring: form.recurring ? null : 'weekly' })}
          label="Recurring"
        />
        {form.recurring && (
          <div className="asg2-field">
            <select
              className="asg2-select"
              value={form.recurring}
              onChange={(e) => set({ recurring: e.target.value })}
              aria-label="Recurrence cadence"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        )}

        <Switch
          on={form.save_as_template}
          onClick={() => set({ save_as_template: !form.save_as_template })}
          label="Save as template"
        />
        {form.save_as_template && (
          <div className="asg2-field">
            <input
              className="asg2-input"
              placeholder="Template name"
              value={form.template_name}
              onChange={(e) => set({ template_name: e.target.value })}
            />
          </div>
        )}

        {error && <div className="asg2-form-error">{error}</div>}

        <div className="asg2-drawer-actions">
          <button type="button" className="asg2-btn asg2-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="asg2-btn asg2-btn--primary"
            onClick={submit}
            disabled={busy}
          >
            {busy ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}
