'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Input, Modal, Select, Textarea } from '@/components/ds';
import { stripDemoLabel } from '@/lib/org-display';
import {
  BADGE_TYPES,
  WEIGHT_ROLE_LABELS,
  badgeOf,
  categoryLabel,
  termOf,
} from '@/lib/org-recognition-model';
import { Skel, SectionError, TextToggle } from '@/components/org/command-center/parts';

const ROLE_WORD = {
  analyst: 'Analyst',
  portfolio_manager: 'Portfolio manager',
  executive: 'Executive',
};

function failText(res, what) {
  if (res?.status === 403) return 'You do not have permission to do this. Nothing was saved.';
  return res?.error ? `${what} ${res.error}` : `${what} Try again.`;
}

/** Award a badge or a gold award to an active member of the council. */
export function AwardDialog({ baseStatus, members, onRetry, sample, act, onClose, onDone }) {
  const active = useMemo(
    () =>
      (members || [])
        .filter((m) => m.is_active !== false)
        .sort((a, b) => String(a.display_name).localeCompare(String(b.display_name))),
    [members],
  );
  const [form, setForm] = useState({
    recipient_id: '',
    badge_type: 'analyst_of_month',
    period: termOf().label,
    title: badgeOf('analyst_of_month').label,
    reason: '',
    is_award: false,
  });
  const [titleEdited, setTitleEdited] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e?.preventDefault();
    const found = {};
    if (!form.recipient_id) found.recipient_id = 'Choose who receives it.';
    if (!form.title.trim()) found.title = 'Give it a title.';
    setErrors(found);
    setError(null);
    if (Object.keys(found).length) {
      document.getElementById(found.recipient_id ? 'orc-award-to' : 'orc-award-title')?.focus();
      return;
    }
    setSaving(true);
    const res = await act({
      type: 'award',
      form: {
        recipient_id: form.recipient_id,
        badge_type: form.badge_type,
        title: form.title.trim(),
        reason: form.reason.trim() || null,
        period: form.period.trim() || null,
        is_award: form.is_award,
      },
    });
    if (res.ok) {
      const who = active.find((m) => m.user_id === form.recipient_id);
      onDone?.(
        `${form.is_award ? 'Gold award' : 'Badge'} "${form.title.trim()}" given to ${stripDemoLabel(who?.display_name || 'the member')}.${sample ? ' Sample content: it is not saved.' : ''}`,
      );
      onClose();
      return;
    }
    setSaving(false);
    setError(failText(res, 'The award was not saved.'));
  };

  const loading = baseStatus === 'loading';
  const failed = baseStatus === 'error' && !members?.length;

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title="Award a badge"
      size={540}
      className="orc-dialog"
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
            form="orc-award-form"
            disabled={loading || failed || active.length === 0}
          >
            Award badge
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="tcc-form" aria-busy="true">
          <Skel w="60%" h={14} />
          <Skel w="100%" h={34} />
          <Skel w="100%" h={34} />
          <Skel w="100%" h={64} />
        </div>
      ) : failed ? (
        <SectionError message="The member list could not be loaded." onRetry={onRetry} />
      ) : active.length === 0 ? (
        <p className="tcc-state">No active members to award yet.</p>
      ) : (
        <form id="orc-award-form" className="tcc-form" onSubmit={submit} noValidate>
          {sample && (
            <p className="tcc-form__note">
              Sample content is showing. The award is applied to the page only and is not saved.
            </p>
          )}
          <div className="tcc-form__pair">
            <Select
              id="orc-award-to"
              label="Recipient"
              value={form.recipient_id}
              error={errors.recipient_id}
              options={[
                { value: '', label: 'Choose a member' },
                ...active.map((m) => ({
                  value: m.user_id,
                  label: `${stripDemoLabel(m.display_name || 'Member')} (${
                    m.sub_role === 'Faculty Advisor'
                      ? 'Faculty advisor'
                      : ROLE_WORD[m.role] || 'Member'
                  })`,
                })),
              ]}
              onChange={(e) => {
                set({ recipient_id: e.target.value });
                if (e.target.value) setErrors((x) => ({ ...x, recipient_id: null }));
              }}
            />
            <Input
              id="orc-award-period"
              label="Period"
              value={form.period}
              maxLength={40}
              hint="Free text, for example Fall 2026 or October 2026"
              onChange={(e) => set({ period: e.target.value })}
            />
          </div>
          <fieldset className="orc-fieldset">
            <legend className="ds-field-label">Badge type</legend>
            <div className="tcc-toggles orc-badgepick">
              {BADGE_TYPES.map((b) => (
                <TextToggle
                  key={b.key}
                  pressed={form.badge_type === b.key}
                  onClick={() =>
                    set({ badge_type: b.key, ...(titleEdited ? {} : { title: b.label }) })
                  }
                >
                  <i className={`bi ${b.icon}`} aria-hidden="true" />
                  {b.label}
                </TextToggle>
              ))}
            </div>
          </fieldset>
          <Input
            id="orc-award-title"
            label="Title"
            value={form.title}
            maxLength={120}
            required
            error={errors.title}
            onChange={(e) => {
              setTitleEdited(true);
              set({ title: e.target.value });
              if (e.target.value.trim()) setErrors((x) => ({ ...x, title: null }));
            }}
          />
          <Textarea
            id="orc-award-reason"
            label="Reason"
            value={form.reason}
            maxLength={600}
            rows={3}
            hint="Shown with the award on the page and on the member's scorecard"
            onChange={(e) => set({ reason: e.target.value })}
          />
          <Checkbox
            label="Gold award (shown in gold, distinct from a standard badge)"
            checked={form.is_award}
            onChange={(e) => set({ is_award: e.target.checked })}
          />
          {error && (
            <p className="orc-formerror" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </Modal>
  );
}

/** Display weights per role: a council override over the platform defaults. */
export function WeightsDialog({ load, act, sample, onClose, onDone }) {
  const [state, setState] = useState({ status: 'loading', data: null });
  const [role, setRole] = useState('analyst');
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchWeights = async () => {
    setState({ status: 'loading', data: null });
    const res = await load();
    if (!res.ok) {
      setState({ status: 'error', data: null });
      return;
    }
    const d = {};
    for (const r of res.data.roles || []) {
      d[r.role] = Object.fromEntries(r.categories.map((c) => [c.category, String(c.weight)]));
    }
    setDraft(d);
    setState({ status: 'ready', data: res.data });
  };
  useEffect(() => {
    fetchWeights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleData = state.data?.roles?.find((r) => r.role === role) || null;
  const values = draft[role] || {};
  const total = Object.values(values).reduce((s, v) => s + (Number(v) || 0), 0);
  const invalid = Object.entries(values).find(([, v]) => {
    const n = Number(v);
    return v === '' || !Number.isFinite(n) || n < 0 || n > 100;
  });

  const save = async () => {
    if (invalid) {
      setError(`${categoryLabel(invalid[0])} must be a number from 0 to 100.`);
      return;
    }
    setSaving(true);
    setError(null);
    const res = await act({
      type: 'weights',
      role,
      weights: Object.entries(values).map(([category, weight]) => ({
        category,
        weight: Number(weight),
      })),
    });
    setSaving(false);
    if (!res.ok) {
      setError(failText(res, 'The weights were not saved.'));
      return;
    }
    onDone?.(
      `${WEIGHT_ROLE_LABELS[role]} display weights saved.${sample ? ' Sample content: they are not saved.' : ''}`,
    );
    onClose();
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title="Display weights"
      size={540}
      className="orc-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <Button
            variant="primary"
            className="tcc-flatbtn"
            loading={saving}
            onClick={save}
            disabled={state.status !== 'ready'}
          >
            Save {WEIGHT_ROLE_LABELS[role].toLowerCase()} weights
          </Button>
        </>
      }
    >
      <div className="tcc-form">
        <p className="tcc-form__note">
          These weights set the percentages shown beside each category in the rating breakdown. They
          do not change the Ezana Rating, which moves only with scored pitches and decay. They apply
          to this council only; the platform defaults stay as they are.
        </p>
        <div className="tcc-toggles" role="group" aria-label="Role">
          {Object.entries(WEIGHT_ROLE_LABELS).map(([k, label]) => (
            <TextToggle key={k} pressed={role === k} onClick={() => setRole(k)}>
              {label}
            </TextToggle>
          ))}
        </div>
        {state.status === 'loading' ? (
          <div className="tcc-form" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skel key={i} w="100%" h={28} />
            ))}
          </div>
        ) : state.status === 'error' ? (
          <SectionError message="The weights could not be loaded." onRetry={fetchWeights} />
        ) : !roleData || roleData.categories.length === 0 ? (
          <p className="tcc-state">No weights are set for this role.</p>
        ) : (
          <>
            <ul className="orc-weights">
              {roleData.categories.map((c) => (
                <li key={c.category}>
                  <label htmlFor={`orc-w-${c.category}`}>{categoryLabel(c.category)}</label>
                  <span className="tcc-mono tcc-meta">default {c.default_weight}%</span>
                  <Input
                    id={`orc-w-${c.category}`}
                    type="number"
                    min={0}
                    max={100}
                    inputMode="numeric"
                    className="orc-weights__input tcc-mono"
                    value={values[c.category] ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        [role]: { ...d[role], [c.category]: e.target.value },
                      }))
                    }
                  />
                </li>
              ))}
            </ul>
            <div className="orc-weights__foot">
              <span>
                Total{' '}
                <span className={`tcc-mono ${Math.round(total) === 100 ? '' : 'tcc-warn'}`}>
                  {Math.round(total)}%
                </span>
                {Math.round(total) !== 100 && (
                  <span className="tcc-meta"> (shown as entered; it need not add to 100)</span>
                )}
              </span>
              <button
                type="button"
                className="tcc-textbtn"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    [role]: Object.fromEntries(
                      roleData.categories.map((c) => [c.category, String(c.default_weight)]),
                    ),
                  }))
                }
              >
                Reset to defaults
              </button>
            </div>
          </>
        )}
        {error && (
          <p className="orc-formerror" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

const CONFIRM = {
  recompute: {
    title: 'Recompute ratings',
    action: 'Recompute',
    body: 'Rebuilds every member’s Ezana Rating from their scored pitches, dates each change on the day its pitch was scored, and refreshes the category scores. Ratings do not update on their own when a pitch is scored, so run this after new outcomes come in. It can be run again at any time.',
  },
  auto: {
    title: 'Auto-award',
    action: 'Run auto-award',
    body: 'Gives Best Call to the analyst whose pitch scored this quarter has the highest positive excess return over the market, and Most Accurate to the analyst with the highest share of pitches that beat the market, among analysts with at least three pitches scored this quarter. Each badge is given once per quarter; running it again adds nothing new. Awards cannot be edited or removed afterwards.',
  },
};

/** Confirmation for Recompute ratings and Auto-award. */
export function ConfirmDialog({ kind, sample, act, onClose, onDone }) {
  const c = CONFIRM[kind];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    const res = await act({ type: kind });
    setBusy(false);
    if (!res.ok) {
      setError(failText(res, `${c.title} did not finish.`));
      return;
    }
    onDone?.(`${res.message || 'Done.'}${sample ? ' Sample content: nothing is saved.' : ''}`);
    onClose();
  };
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={c.title}
      size={480}
      className="orc-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <Button variant="primary" className="tcc-flatbtn" loading={busy} onClick={run}>
            {c.action}
          </Button>
        </>
      }
    >
      <p className="orc-dialog__body">{c.body}</p>
      {error && (
        <p className="orc-formerror" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
