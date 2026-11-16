'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Modal, Select } from '@/components/ds';
import { stripDemoLabel } from '@/lib/org-display';
import {
  CATEGORIES,
  DEFAULT_QUORUM_PCT,
  toLocalInput,
  validateMeetingForm,
} from '@/lib/org-meetings-model';

function initialForm(mode, meeting) {
  if (mode === 'edit' && meeting) {
    return {
      title: stripDemoLabel(meeting.title || ''),
      category: meeting.category || 'general',
      scheduled_at: toLocalInput(meeting.scheduled_at),
      location: meeting.location || '',
      quorum_pct: meeting.quorum_pct ?? '',
      pitch_id: meeting.pitch_id || '',
    };
  }
  return { title: '', category: 'general', scheduled_at: '', location: '', quorum_pct: '' };
}

/** New meeting and Edit details. Title is required; everything else is optional. */
export function MeetingFormDialog({ mode, meeting, pitches, sample, act, onClose, onSaved }) {
  const [form, setForm] = useState(() => initialForm(mode, meeting));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const isEdit = mode === 'edit';
  const ic = form.category === 'ic';

  const submit = async (e) => {
    e?.preventDefault();
    const found = validateMeetingForm(form);
    setErrors(found);
    setError(null);
    if (Object.keys(found).length) {
      document.getElementById(found.title ? 'omt-form-title' : 'omt-form-quorum')?.focus();
      return;
    }
    const payload = ic ? form : { ...form, quorum_pct: isEdit ? form.quorum_pct : '' };
    setSaving(true);
    const res = await act(
      isEdit
        ? { type: 'update', id: meeting.id, form: payload }
        : { type: 'create', form: payload },
    );
    if (res.ok) {
      onSaved?.(res.id, form.title.trim());
      onClose();
      return;
    }
    setSaving(false);
    setError(
      res.status === 403
        ? 'You do not have permission to do this. Nothing was saved.'
        : `${isEdit ? 'The changes were' : 'The meeting was'} not saved. Try again.`,
    );
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={isEdit ? 'Edit details' : 'New meeting'}
      size={520}
      className="omt-dialog"
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
            form="omt-form"
          >
            {isEdit ? 'Save changes' : 'Create meeting'}
          </Button>
        </>
      }
    >
      <form id="omt-form" className="tcc-form omt-form" onSubmit={submit} noValidate>
        {sample && (
          <p className="tcc-form__note">
            Sample content is showing. This is applied to the page only and is not saved.
          </p>
        )}
        <Input
          id="omt-form-title"
          label="Title"
          value={form.title}
          maxLength={160}
          autoFocus
          required
          error={errors.title}
          onChange={(e) => {
            set({ title: e.target.value });
            if (errors.title && e.target.value.trim()) setErrors((x) => ({ ...x, title: null }));
          }}
        />
        <div className="tcc-form__pair">
          <Select
            id="omt-form-category"
            label="Category"
            value={form.category}
            options={CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
            onChange={(e) => set({ category: e.target.value })}
          />
          <Input
            id="omt-form-when"
            label="Scheduled time (optional)"
            type="datetime-local"
            className="tcc-mono"
            value={form.scheduled_at}
            onChange={(e) => set({ scheduled_at: e.target.value })}
          />
        </div>
        <Input
          id="omt-form-location"
          label="Location (optional)"
          maxLength={200}
          value={form.location}
          onChange={(e) => set({ location: e.target.value })}
        />
        {ic && (
          <div className="tcc-form__pair">
            <Input
              id="omt-form-quorum"
              label="Quorum, % of voting members (optional)"
              type="number"
              min={1}
              max={100}
              className="tcc-mono"
              placeholder={String(DEFAULT_QUORUM_PCT)}
              value={form.quorum_pct}
              error={errors.quorum_pct}
              hint={`${DEFAULT_QUORUM_PCT}% when left empty.`}
              onChange={(e) => set({ quorum_pct: e.target.value })}
            />
            {isEdit && (
              <Select
                id="omt-form-pitch"
                label="Linked pitch (optional)"
                value={form.pitch_id}
                options={[
                  { value: '', label: 'None' },
                  ...pitches.map((p) => ({
                    value: p.id,
                    label: `${p.ticker}${p.company_name ? `: ${p.company_name}` : ''}`,
                  })),
                ]}
                onChange={(e) => set({ pitch_id: e.target.value })}
              />
            )}
          </div>
        )}
        {!ic && isEdit && (
          <Select
            id="omt-form-pitch"
            label="Linked pitch (optional)"
            value={form.pitch_id}
            options={[
              { value: '', label: 'None' },
              ...pitches.map((p) => ({
                value: p.id,
                label: `${p.ticker}${p.company_name ? `: ${p.company_name}` : ''}`,
              })),
            ]}
            onChange={(e) => set({ pitch_id: e.target.value })}
          />
        )}
        {!isEdit && (
          <p className="tcc-form__note">
            Invite members and build the agenda from the meeting once it is created.
          </p>
        )}
        {error && (
          <p className="omt-fielderror" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

/** Recorder status for managers. Never shows credentials. */
export function RecordersDialog({ sample, onClose }) {
  const [state, setState] = useState(
    sample ? { status: 'ready', connected: 0, total: 4 } : { status: 'loading' },
  );
  useEffect(() => {
    if (sample) return undefined;
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/org/meetings/recorders', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) setState({ status: 'error' });
        else
          setState({
            status: 'ready',
            connected: data.connectedCount || 0,
            total: (data.integrations || []).length,
          });
      } catch {
        if (alive) setState({ status: 'error' });
      }
    })();
    return () => {
      alive = false;
    };
  }, [sample]);

  return (
    <Modal
      open
      onClose={onClose}
      title="Meeting recorders"
      size={440}
      className="omt-dialog"
      footer={
        <button type="button" className="tcc-textbtn" onClick={onClose}>
          Close
        </button>
      }
    >
      <p className="omt-dialog__text">
        {state.status === 'loading'
          ? 'Checking recorder status.'
          : state.status === 'error'
            ? 'Recorder status could not be loaded.'
            : `${state.connected} of ${state.total} recorders connected.`}
      </p>
      <p className="omt-dialog__text tcc-meta">
        Connecting a recorder is not available yet. Paste a recording link on a completed meeting
        instead.
      </p>
    </Modal>
  );
}
