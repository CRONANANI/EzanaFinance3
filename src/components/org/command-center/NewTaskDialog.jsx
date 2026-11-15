'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@/components/ds';

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

/**
 * New task: a short form for executives and portfolio managers. Saving uses
 * the council's existing task route. While sample content shows, the task is
 * added to the page only and is never saved (the dialog says so).
 */
export function NewTaskDialog({ open, onClose, onCreate, roster, onLoadRoster, viewerId, sample }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState(viewerId || '');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState('medium');
  const [titleError, setTitleError] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setAssignee(viewerId || '');
    setDue('');
    setPriority('medium');
    setTitleError(null);
    setError(null);
    setSaving(false);
    onLoadRoster?.();
  }, [open, viewerId, onLoadRoster]);

  const members = roster?.members || [];
  const options = [
    { value: viewerId || '', label: 'Me' },
    ...members
      .filter((m) => m.user_id !== viewerId)
      .map((m) => ({ value: m.user_id, label: m.display_name || 'Member' })),
  ];
  const rosterHint =
    roster?.status === 'loading'
      ? 'Loading members'
      : roster?.status === 'error'
        ? 'Members could not be loaded. The task can still be assigned to you.'
        : undefined;

  const submit = async (e) => {
    e?.preventDefault();
    const clean = title.trim();
    if (!clean) {
      setTitleError('Enter a title for the task.');
      return;
    }
    setSaving(true);
    setError(null);
    const who = members.find((m) => m.user_id === assignee);
    const res = await onCreate({
      title: clean,
      description: description.trim() || null,
      assigned_to: assignee || viewerId,
      team_id: who?.team_id || null,
      /* End of the chosen day, so a task due today is not overdue all day. */
      due_date: due ? `${due}T23:59:59Z` : null,
      priority,
    });
    if (res?.ok) {
      onClose();
      return;
    }
    setSaving(false);
    setError(res?.error || 'Could not save the task. Try again.');
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="New task"
      size={480}
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
            form="tcc-newtask"
          >
            Create task
          </Button>
        </>
      }
    >
      <form id="tcc-newtask" className="tcc-form" onSubmit={submit} noValidate>
        {sample && (
          <p className="tcc-form__note">
            Sample content is showing. This task is added to the page only and is not saved.
          </p>
        )}
        <Input
          id="tcc-newtask-title"
          label="Title"
          value={title}
          maxLength={160}
          autoFocus
          required
          error={titleError}
          onChange={(e) => {
            setTitle(e.target.value);
            if (titleError && e.target.value.trim()) setTitleError(null);
          }}
        />
        <Textarea
          id="tcc-newtask-desc"
          label="Description (optional)"
          rows={3}
          value={description}
          maxLength={600}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Select
          id="tcc-newtask-assignee"
          label="Assign to"
          value={assignee}
          options={options}
          hint={rosterHint}
          onChange={(e) => setAssignee(e.target.value)}
        />
        <div className="tcc-form__pair">
          <Input
            id="tcc-newtask-due"
            label="Due date (optional)"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
          <Select
            id="tcc-newtask-priority"
            label="Priority"
            value={priority}
            options={PRIORITIES}
            onChange={(e) => setPriority(e.target.value)}
          />
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
