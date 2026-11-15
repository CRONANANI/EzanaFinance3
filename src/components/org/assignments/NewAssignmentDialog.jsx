'use client';

import { useMemo, useState } from 'react';
import { Button, Checkbox, Input, Modal, Select, Textarea } from '@/components/ds';
import { stripDemoLabel } from '@/lib/org-display';
import {
  ASSIGNMENT_TYPES,
  EMPTY_FORM,
  applyTemplate,
  hasTarget,
  toggleTarget,
  typeMeta,
  validateForm,
} from '@/lib/org-assignments-model';

const MODES = [
  { key: 'member', label: 'Members' },
  { key: 'team', label: 'Teams' },
  { key: 'cohort', label: 'Cohorts' },
  { key: 'role', label: 'Roles' },
  { key: 'org', label: 'Whole council' },
];
const ROLE_WORD = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio manager',
  analyst: 'Analyst',
};
const ORG_TARGET = {
  target_type: 'org',
  target_id: null,
  target_role: null,
  label: 'Whole council',
};

function Pick({ on, onClick, children }) {
  return (
    <li>
      <button
        type="button"
        className={`oas-pick${on ? ' is-on' : ''}`}
        aria-pressed={on}
        onClick={onClick}
      >
        <i className={`bi ${on ? 'bi-check-square' : 'bi-square'}`} aria-hidden="true" />
        <span className="oas-pick__text">{children}</span>
      </button>
    </li>
  );
}

/**
 * New assignment, for executives and portfolio managers. Saving uses the
 * council's existing route, which checks the role again. Only a title and at
 * least one assignee are required; due date and instructions are optional.
 * "Recurring" and "Ask for a file upload" are saved as labels and say so:
 * nothing repeats on its own and a submission is not checked for a file.
 */
export function NewAssignmentDialog({ open, template, board, sample, act, onClose, onCreated }) {
  const [form, setForm] = useState(() => applyTemplate(EMPTY_FORM, template));
  const [targets, setTargets] = useState([]);
  const [mode, setMode] = useState('member');
  const [query, setQuery] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const teams = board?.teams || [];
  const cohorts = board?.cohorts || [];
  const roles = board?.roles || [];
  const templates = board?.templates || [];
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const flip = (t) => {
    setTargets((prev) => toggleTarget(prev, t));
    setErrors((e) => ({ ...e, targets: null }));
  };

  const members = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (board?.roster || []).filter(
      (m) => !q || (m.display_name || '').toLowerCase().includes(q),
    );
  }, [board, query]);

  const showTicker = form.type === 'pitch';
  const showSector = ['pitch', 'coverage'].includes(form.type);
  const wholeCouncil = hasTarget(targets, ORG_TARGET);

  const submit = async (e) => {
    e?.preventDefault();
    const found = validateForm(form, targets);
    setErrors(found);
    setError(null);
    if (Object.keys(found).length) {
      const first = found.title ? 'oas-new-title' : null;
      if (first) document.getElementById(first)?.focus();
      return;
    }
    setSaving(true);
    const res = await act({ type: 'create', form, targets });
    if (res.ok) {
      onCreated?.(form.title.trim());
      onClose();
      return;
    }
    setSaving(false);
    setError('Could not assign this work. Nothing was saved. Try again.');
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="New assignment"
      size={560}
      className="oas-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <Button
            variant="primary"
            className="tcc-flatbtn"
            loading={saving}
            type="submit"
            form="oas-new"
          >
            Assign
          </Button>
        </>
      }
    >
      <form id="oas-new" className="tcc-form oas-form" onSubmit={submit} noValidate>
        {sample && (
          <p className="tcc-form__note">
            Sample content is showing. This assignment is added to the page only and is not saved.
          </p>
        )}

        <div className="tcc-form__pair">
          <Select
            id="oas-new-type"
            label="Type"
            value={form.type}
            options={ASSIGNMENT_TYPES.map((t) => ({ value: t, label: typeMeta(t).label }))}
            onChange={(e) => set({ type: e.target.value })}
          />
          {templates.length > 0 && (
            <Select
              id="oas-new-template"
              label="Start from template"
              value={form.template_id || ''}
              options={[
                { value: '', label: 'None' },
                ...templates.map((t) => ({ value: t.id, label: stripDemoLabel(t.name) })),
              ]}
              onChange={(e) =>
                setForm((f) =>
                  applyTemplate(
                    f,
                    templates.find((t) => t.id === e.target.value),
                  ),
                )
              }
            />
          )}
        </div>

        <Input
          id="oas-new-title"
          label="Title"
          value={form.title}
          maxLength={200}
          autoFocus
          required
          error={errors.title}
          onChange={(e) => {
            set({ title: e.target.value });
            if (errors.title && e.target.value.trim()) setErrors((x) => ({ ...x, title: null }));
          }}
        />
        <Textarea
          id="oas-new-instructions"
          label="Instructions (optional)"
          rows={3}
          maxLength={4000}
          value={form.instructions}
          onChange={(e) => set({ instructions: e.target.value })}
        />

        <div className={`oas-form__trio${showTicker || showSector ? '' : ' oas-form__trio--one'}`}>
          <Input
            id="oas-new-due"
            label="Due date (optional)"
            type="date"
            className="tcc-mono"
            value={form.due_date}
            onChange={(e) => set({ due_date: e.target.value })}
          />
          {showTicker && (
            <Input
              id="oas-new-ticker"
              label="Ticker"
              className="tcc-mono"
              maxLength={12}
              value={form.ticker}
              onChange={(e) => set({ ticker: e.target.value.toUpperCase() })}
              hint="Starts a draft in the Pitch Pipeline."
            />
          )}
          {showSector && (
            <Input
              id="oas-new-sector"
              label="Sector"
              maxLength={80}
              value={form.sector}
              onChange={(e) => set({ sector: e.target.value })}
            />
          )}
        </div>

        <fieldset className="oas-assign">
          <legend className="ds-field-label">Assign to</legend>
          <div className="tcc-toggles" role="group" aria-label="Choose by">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`tcc-toggle${mode === m.key ? ' is-on' : ''}`}
                aria-pressed={mode === m.key}
                onClick={() => setMode(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'member' && (
            <>
              <label className="oas-search oas-search--form" htmlFor="oas-new-search">
                <i className="bi bi-search" aria-hidden="true" />
                <span className="tcc-sr">Search members</span>
                <input
                  id="oas-new-search"
                  type="search"
                  className="oas-search__input"
                  placeholder="Search members"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                />
              </label>
              {members.length === 0 ? (
                <p className="oas-foot">No members match.</p>
              ) : (
                <ul className="oas-picks">
                  {members.map((m) => {
                    const t = {
                      target_type: 'member',
                      target_id: m.member_id,
                      target_role: null,
                      label: m.display_name,
                    };
                    return (
                      <Pick key={m.member_id} on={hasTarget(targets, t)} onClick={() => flip(t)}>
                        {m.display_name}
                        <span className="oas-pick__sub">
                          {m.title || ROLE_WORD[m.role] || 'Member'}
                        </span>
                      </Pick>
                    );
                  })}
                </ul>
              )}
            </>
          )}
          {mode === 'team' &&
            (teams.length === 0 ? (
              <p className="oas-foot">The council has no teams yet.</p>
            ) : (
              <ul className="oas-picks">
                {teams.map((t) => {
                  const tg = {
                    target_type: 'team',
                    target_id: t.id,
                    target_role: null,
                    label: `${t.name} (team)`,
                  };
                  return (
                    <Pick key={t.id} on={hasTarget(targets, tg)} onClick={() => flip(tg)}>
                      {t.name}
                    </Pick>
                  );
                })}
              </ul>
            ))}
          {mode === 'cohort' &&
            (cohorts.length === 0 ? (
              <p className="oas-foot">The council has no cohorts yet.</p>
            ) : (
              <ul className="oas-picks">
                {cohorts.map((c) => {
                  const tg = {
                    target_type: 'cohort',
                    target_id: c.id,
                    target_role: null,
                    label: `${c.name} (cohort)`,
                  };
                  return (
                    <Pick key={c.id} on={hasTarget(targets, tg)} onClick={() => flip(tg)}>
                      {c.name}
                      {c.is_current && <span className="oas-pick__sub">Current</span>}
                    </Pick>
                  );
                })}
              </ul>
            ))}
          {mode === 'role' &&
            (roles.length === 0 ? (
              <p className="oas-foot">No titles are set on the roster yet.</p>
            ) : (
              <ul className="oas-picks">
                {roles.map((r) => {
                  const tg = {
                    target_type: 'role',
                    target_id: null,
                    target_role: r,
                    label: `${r} (role)`,
                  };
                  return (
                    <Pick key={r} on={hasTarget(targets, tg)} onClick={() => flip(tg)}>
                      {r}
                    </Pick>
                  );
                })}
              </ul>
            ))}
          {mode === 'org' && (
            <ul className="oas-picks">
              <Pick on={wholeCouncil} onClick={() => flip(ORG_TARGET)}>
                Every active member of the council
                <span className="oas-pick__sub">Replaces any other choice</span>
              </Pick>
            </ul>
          )}

          {targets.length > 0 && (
            <ul className="oas-tokens" aria-label="Assigned to">
              {targets.map((t) => (
                <li key={`${t.target_type}-${t.target_id}-${t.target_role}`}>
                  {t.label}
                  <button
                    type="button"
                    className="tcc-textbtn oas-token__x"
                    onClick={() => flip(t)}
                    aria-label={`Remove ${t.label}`}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {errors.targets && (
            <p className="oas-fielderror" role="alert">
              {errors.targets}
            </p>
          )}
        </fieldset>

        <div className="oas-options">
          <Checkbox
            label="Ask for a file upload"
            checked={form.require_upload}
            onChange={(e) => set({ require_upload: e.target.checked })}
          />
          <p className="oas-foot oas-options__hint">
            Shown on the assignment as a label. A submission is not checked for a file.
          </p>
          <Checkbox
            label="Recurring"
            checked={Boolean(form.recurring)}
            onChange={(e) => set({ recurring: e.target.checked ? 'weekly' : null })}
          />
          {form.recurring ? (
            <Select
              id="oas-new-cadence"
              label="Cadence"
              value={form.recurring}
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
              onChange={(e) => set({ recurring: e.target.value })}
              hint="Saved as a label. The next one is not created automatically."
            />
          ) : (
            <p className="oas-foot oas-options__hint">
              Saved as a label. The next one is not created automatically.
            </p>
          )}
          <Checkbox
            label="Save as template"
            checked={form.save_as_template}
            onChange={(e) => set({ save_as_template: e.target.checked })}
          />
          {form.save_as_template && (
            <Input
              id="oas-new-tplname"
              label="Template name"
              maxLength={120}
              value={form.template_name}
              placeholder={form.title}
              error={errors.template_name}
              onChange={(e) => set({ template_name: e.target.value })}
            />
          )}
        </div>

        {error && (
          <p className="tcc-state tcc-state--error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </form>
    </Modal>
  );
}
