'use client';

import { useState } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@/components/ds';
import {
  MAX_FEEDBACK,
  MAX_LETTER,
  WORK_KINDS,
  blankForm,
  fmtDay,
  formFromGrade,
  kindIcon,
  kindLabel,
  roleLabel,
  validateGrade,
} from '@/lib/org-grades-model';
import { RubricTable } from './StudentRecord';

/**
 * Enter a grade, or change one. Executives only (the route checks again).
 * The letter is typed by the grader: there is no scale that turns a score
 * into a letter, so nothing is filled in for them. A stored rubric is shown
 * read only. Changing a grade makes the executive its grader; no earlier
 * version is kept.
 */
export function GradeDialog({ mode, grade, roster, presetStudent, sample, act, onClose, onSaved }) {
  const isEdit = mode === 'edit' && grade;
  const [form, setForm] = useState(() =>
    isEdit ? formFromGrade(grade) : blankForm(presetStudent || ''),
  );
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    const keys = Object.keys(patch);
    if (keys.some((k) => errors[k])) {
      setErrors((x) => {
        const n = { ...x };
        for (const k of keys) delete n[k];
        return n;
      });
    }
  };

  const submit = async (e) => {
    e?.preventDefault();
    const found = validateGrade(form, { mode: isEdit ? 'edit' : 'new' });
    setErrors(found);
    setError(null);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`ogr-form-${first}`)?.focus();
      return;
    }
    setSaving(true);
    const res = await act(
      isEdit ? { type: 'update', id: grade.id, form } : { type: 'create', form },
    );
    if (res.ok) {
      const name = isEdit
        ? grade.student_name
        : roster.find((m) => m.user_id === form.student_id)?.display_name;
      onSaved?.({ id: res.id, studentId: form.student_id, name, mode: isEdit ? 'edit' : 'new' });
      onClose();
      return;
    }
    setSaving(false);
    setError(
      res.status === 403
        ? 'Only executives can enter or change grades. Nothing was saved.'
        : res.error && res.status === 400
          ? `${res.error} Nothing was saved.`
          : `${isEdit ? 'The change was' : 'The grade was'} not saved. Try again.`,
    );
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={isEdit ? 'Change grade' : 'Enter grade'}
      size={560}
      className="ogr-dialog"
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
            form="ogr-form"
          >
            Save grade
          </Button>
        </>
      }
    >
      <form id="ogr-form" className="tcc-form ogr-form" onSubmit={submit} noValidate>
        {sample && (
          <p className="tcc-form__note">
            Sample content is showing. This is applied to the page only and is not saved.
          </p>
        )}
        {isEdit ? (
          <div className="ogr-form__fixed">
            <div>
              <span className="ogr-form__label">Member</span>
              <span className="ogr-form__value">{grade.student_name}</span>
            </div>
            <div>
              <span className="ogr-form__label">Kind of work</span>
              <span className="ogr-form__value">
                <i className={`bi ${kindIcon(grade.work_type)}`} aria-hidden="true" />
                {kindLabel(grade.work_type)}
              </span>
            </div>
            <p className="ogr-form__changed">
              Last changed{grade.grader_name ? ` by ${grade.grader_name}` : ''} on{' '}
              <span className="tcc-mono">{fmtDay(grade.updated_at || grade.created_at)}</span>
            </p>
          </div>
        ) : (
          <div className="tcc-form__pair">
            <Select
              id="ogr-form-student_id"
              label="Member"
              value={form.student_id}
              error={errors.student_id}
              autoFocus={!presetStudent}
              options={[
                { value: '', label: roster.length ? 'Choose a member' : 'No members to grade' },
                ...roster.map((m) => ({
                  value: m.user_id,
                  label: `${m.display_name}, ${roleLabel(m.role).toLowerCase()}`,
                })),
              ]}
              onChange={(e) => set({ student_id: e.target.value })}
            />
            <Select
              id="ogr-form-work_type"
              label="Kind of work"
              value={form.work_type}
              error={errors.work_type}
              options={WORK_KINDS.map((k) => ({ value: k.key, label: k.label }))}
              onChange={(e) => set({ work_type: e.target.value })}
            />
          </div>
        )}
        <div className="ogr-form__trio">
          <Input
            id="ogr-form-score"
            label="Score"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            className="tcc-mono"
            value={form.score}
            error={errors.score}
            autoFocus={Boolean(isEdit || presetStudent)}
            onChange={(e) => set({ score: e.target.value })}
          />
          <Input
            id="ogr-form-max_score"
            label="Out of"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            className="tcc-mono"
            value={form.max_score}
            error={errors.max_score}
            onChange={(e) => set({ max_score: e.target.value })}
          />
          <Input
            id="ogr-form-letter"
            label="Letter (optional)"
            maxLength={MAX_LETTER}
            className="tcc-mono"
            value={form.letter}
            error={errors.letter}
            hint="Typed by you"
            onChange={(e) => set({ letter: e.target.value })}
          />
        </div>
        <Textarea
          id="ogr-form-feedback"
          label="Feedback (optional)"
          rows={4}
          maxLength={MAX_FEEDBACK}
          value={form.feedback}
          error={errors.feedback}
          hint={`${form.feedback.length.toLocaleString('en-US')} of ${MAX_FEEDBACK.toLocaleString('en-US')} characters. The member sees this.`}
          onChange={(e) => set({ feedback: e.target.value })}
        />
        {isEdit && grade.rubric ? (
          <div className="ogr-form__rubric">
            <span className="ogr-form__label">Rubric (read only)</span>
            <RubricTable rubric={grade.rubric} caption="Stored rubric for this grade" />
          </div>
        ) : null}
        {error && (
          <p className="ogr-fielderror" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
