'use client';

import { useMemo, useState } from 'react';
import { Button, Checkbox, Input, Modal } from '@/components/ds';
import { NA, fmtPct, roleLabel } from '@/lib/org-cohorts-model';
import { EmptyLine, Kpi, SampleNote, SectionError, TableSkeleton, TextMenu } from './parts';
import { ErrorLine } from './CohortDialogs';

function AddTaskDialog({ cohort, request, sample, onClose, onDone }) {
  const [title, setTitle] = useState('');
  const [gate, setGate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [titleErr, setTitleErr] = useState('');
  const submit = async (e) => {
    e?.preventDefault();
    if (!title.trim()) {
      setTitleErr('Enter a task title.');
      return;
    }
    setBusy(true);
    setErr('');
    const res = await request('POST', `/api/org/cohorts/${cohort.id}/onboarding`, {
      title: title.trim(),
      is_gate: gate,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.json?.error || 'The task was not added. Try again.');
      return;
    }
    onDone();
  };
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={`Add onboarding task · ${cohort.name}`}
      size={480}
      className="coh-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <Button
            variant="primary"
            className="tcc-flatbtn"
            type="submit"
            form="coh-task"
            loading={busy}
          >
            Add task
          </Button>
        </>
      }
    >
      <form id="coh-task" className="coh-form" onSubmit={submit} noValidate>
        <SampleNote on={sample} />
        <Input
          id="coh-task-title"
          label="Task"
          placeholder="Compliance orientation"
          value={title}
          error={titleErr || undefined}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleErr('');
          }}
        />
        <Checkbox
          checked={gate}
          onChange={(e) => setGate(e.target.checked)}
          label="Gate task: must be done before a first live pitch"
        />
        <p className="coh-hint">
          The task is created as an assignment. Members complete it there or here.
        </p>
        <ErrorLine>{err}</ErrorLine>
      </form>
    </Modal>
  );
}

function RemoveTaskDialog({ cohort, task, request, sample, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true);
    const res = await request(
      'DELETE',
      `/api/org/cohorts/${cohort.id}/onboarding?task_id=${encodeURIComponent(task.id)}`,
    );
    setBusy(false);
    if (!res.ok) {
      setErr(res.json?.error || 'The task was not removed. Try again.');
      return;
    }
    onDone();
  };
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={`Remove ${task.title}?`}
      size={460}
      className="coh-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <Button variant="danger" className="tcc-flatbtn" onClick={go} loading={busy}>
            Remove task
          </Button>
        </>
      }
    >
      <SampleNote on={sample} />
      <p className="coh-body">
        The task leaves this cohort&apos;s onboarding list. The assignment and any completions stay
        on Assignments.
      </p>
      <ErrorLine>{err}</ErrorLine>
    </Modal>
  );
}

export function OnboardingTab({
  cohort,
  onboarding,
  canManage,
  viewer,
  request,
  sample,
  onChanged,
}) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [picked, setPicked] = useState(null);
  const [err, setErr] = useState('');
  const [busyKey, setBusyKey] = useState(null);

  const d = onboarding.data;
  const tasks = useMemo(() => d?.tasks || [], [d]);
  const members = useMemo(() => d?.members || [], [d]);
  const seniors = useMemo(
    () =>
      [...(d?.seniors || [])].sort(
        (a, b) => b.mentee_count - a.mentee_count || a.display_name.localeCompare(b.display_name),
      ),
    [d],
  );
  const selected = members.find((m) => m.id === picked) || members[0] || null;
  const loading = onboarding.status === 'loading';
  const failed = onboarding.status === 'error';
  const s = d?.stats || {};

  const tick = async (m, t, done) => {
    setBusyKey(`${m.id}:${t.assignment_id}`);
    setErr('');
    const res = await request('POST', `/api/org/cohorts/${cohort.id}/onboarding`, {
      action: done ? 'complete' : 'uncomplete',
      assignment_id: t.assignment_id,
      member_id: m.id,
    });
    setBusyKey(null);
    if (!res.ok) setErr(res.json?.error || 'The task was not updated. Try again.');
    else onChanged?.();
  };
  const pairMentor = async (m, mentorId) => {
    setBusyKey(`mentor:${m.id}`);
    setErr('');
    const res = await request('PATCH', `/api/org/cohorts/${cohort.id}/lifecycle`, {
      member_id: m.id,
      mentor_member_id: mentorId || null,
    });
    setBusyKey(null);
    if (!res.ok) setErr(res.json?.error || 'The mentor was not changed. Try again.');
    else onChanged?.();
  };

  const canTick = (m) => canManage || m.id === viewer.memberId;
  const mentorOptions = [
    { value: '', label: 'No mentor' },
    ...seniors.map((x) => ({ value: x.id, label: x.display_name })),
  ];

  return (
    <>
      <section className="coh-section" aria-labelledby="coh-onb-title">
        <div className="coh-head">
          <h2 className="coh-title" id="coh-onb-title">
            Onboarding <span className="coh-title__dim">· {cohort.name}</span>
          </h2>
          <div className="coh-controls">
            <span className="tcc-meta" title="Set when the cohort is created">
              <i className={`bi ${d?.gateEnabled ? 'bi-lock' : 'bi-unlock'}`} aria-hidden="true" />{' '}
              Gate {loading || failed ? NA : d?.gateEnabled ? 'on' : 'off'}
            </span>
            {canManage && (
              <button
                type="button"
                className="tcc-btn"
                onClick={() => setAdding(true)}
                disabled={loading || failed}
              >
                <i className="bi bi-plus-lg" aria-hidden="true" />
                Add task
              </button>
            )}
          </div>
        </div>

        <div className="coh-kpis" aria-busy={loading || undefined}>
          <div className="tcc-kpistrip coh-kpistrip--4" role="list" aria-label="Onboarding figures">
            <Kpi icon="bi-person-plus" label="Enrolled" loading={loading} na={failed}>
              {failed ? NA : (s.enrolled ?? 0)}
            </Kpi>
            <Kpi
              icon="bi-percent"
              label="Average completion"
              loading={loading}
              na={failed || s.avg_completion_pct == null}
            >
              {failed ? NA : fmtPct(s.avg_completion_pct)}
            </Kpi>
            <Kpi icon="bi-check2-all" label="Fully onboarded" loading={loading} na={failed}>
              {failed ? NA : (s.fully_onboarded ?? 0)}
            </Kpi>
            <Kpi
              icon="bi-exclamation-triangle"
              label="Blocked from first pitch"
              loading={loading}
              na={failed}
              warn={!failed && s.blocked > 0}
            >
              {failed ? NA : (s.blocked ?? 0)}
            </Kpi>
          </div>
        </div>
        {d?.gateEnabled && s.blocked > 0 && (
          <p className="coh-body coh-tone--warn">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" /> {s.blocked}{' '}
            {s.blocked === 1 ? 'member cannot' : 'members cannot'} make a first live pitch until
            every gate task is done.
          </p>
        )}
        {err && <ErrorLine>{err}</ErrorLine>}
      </section>

      <div className="coh-pair">
        <section className="coh-section coh-pair__cell" aria-labelledby="coh-tasks-title">
          <div className="coh-head">
            <h3 className="coh-subtitle" id="coh-tasks-title">
              Onboarding tasks <span className="coh-title__dim">· done of enrolled</span>
            </h3>
          </div>
          {loading ? (
            <TableSkeleton cols={2} rows={4} />
          ) : failed ? (
            <SectionError message="Could not load onboarding tasks." onRetry={onboarding.reload} />
          ) : tasks.length === 0 ? (
            canManage ? (
              <EmptyLine action="Add task" onAction={() => setAdding(true)}>
                No onboarding tasks set for this cohort.
              </EmptyLine>
            ) : (
              <EmptyLine>No onboarding tasks set for this cohort.</EmptyLine>
            )
          ) : (
            <ul className="coh-tasks">
              {tasks.map((t) => {
                const complete = t.total > 0 && t.done_count === t.total;
                return (
                  <li key={t.id}>
                    <div className="coh-tasks__top">
                      <span
                        className={`coh-tasks__name${complete ? ' coh-tone--pos' : t.is_gate && t.total > 0 ? ' coh-tone--warn' : ''}`}
                      >
                        <i
                          className={`bi ${complete ? 'bi-check-lg' : t.is_gate ? 'bi-lock' : 'bi-circle'}`}
                          aria-hidden="true"
                        />
                        <span className="coh-tasks__label">{t.title}</span>
                        {t.is_gate && <span className="coh-dim">Gate</span>}
                      </span>
                      <span className="tcc-mono">
                        {t.done_count}/{t.total}
                      </span>
                    </div>
                    {t.outstanding.length > 0 && (
                      <p className="coh-hint">
                        Outstanding: {t.outstanding.map((o) => o.display_name).join(', ')}
                      </p>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        className="tcc-textbtn coh-danger coh-tasks__remove"
                        onClick={() => setRemoving(t)}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {!loading && !failed && tasks.length > 0 && (
            <p className="coh-hint">Tasks are assignments; completing one records a submission.</p>
          )}
        </section>
        <div className="coh-vrule" aria-hidden="true" />
        <section className="coh-section coh-pair__cell" aria-labelledby="coh-gate-title">
          <div className="coh-head">
            <h3 className="coh-subtitle" id="coh-gate-title">
              Members and gate status
            </h3>
          </div>
          {loading ? (
            <TableSkeleton cols={4} rows={3} />
          ) : failed ? (
            <SectionError
              message="Could not load onboarding members."
              onRetry={onboarding.reload}
            />
          ) : members.length === 0 ? (
            <EmptyLine>No member of this cohort is onboarding.</EmptyLine>
          ) : (
            <>
              <div className="coh-scroll">
                <table className="coh-table coh-table--compact coh-gatetable">
                  <caption className="tcc-sr">Onboarding members of {cohort.name}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Member</th>
                      <th scope="col" className="coh-num">
                        Done
                      </th>
                      <th scope="col">Status</th>
                      <th scope="col" className="coh-num">
                        Mentor
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const on = selected?.id === m.id;
                      return (
                        <tr key={m.id} className={on ? 'is-on' : undefined} aria-selected={on}>
                          <td>
                            <button
                              type="button"
                              className="coh-rowbtn coh-strong"
                              onClick={() => setPicked(m.id)}
                            >
                              <span className="coh-ellipsis">{m.display_name}</span>
                            </button>
                          </td>
                          <td className="coh-num tcc-mono">
                            {m.completed_count}/{m.task_total}
                          </td>
                          <td>
                            {!m.user_linked ? (
                              <span className="coh-status coh-tone--muted">
                                <i className="bi bi-hourglass" aria-hidden="true" />
                                Account not set up
                              </span>
                            ) : m.blocked ? (
                              <span className="coh-status coh-tone--warn">
                                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                                Blocked, {m.missing_gate_count} gate{' '}
                                {m.missing_gate_count === 1 ? 'task' : 'tasks'} left
                              </span>
                            ) : (
                              <span className="coh-status coh-tone--pos">
                                <i className="bi bi-check-lg" aria-hidden="true" />
                                Ready to pitch
                              </span>
                            )}
                          </td>
                          <td className="coh-num">
                            {canManage ? (
                              <TextMenu
                                label="No mentor"
                                value={m.mentor_member_id || ''}
                                onChange={(v) => pairMentor(m, v)}
                                options={mentorOptions}
                                align="right"
                                ariaLabel={`Mentor for ${m.display_name}`}
                              />
                            ) : (
                              <span className={m.mentor_name ? '' : 'tcc-na'}>
                                {m.mentor_name || NA}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {selected && tasks.length > 0 && (
                <div className="coh-checklist">
                  <h4 className="coh-caps">Checklist · {selected.display_name}</h4>
                  <ul>
                    {tasks.map((t) => {
                      const done = selected.completed_assignment_ids.includes(t.assignment_id);
                      const key = `${selected.id}:${t.assignment_id}`;
                      return (
                        <li key={t.id}>
                          <Checkbox
                            checked={done}
                            disabled={
                              !canTick(selected) || !selected.user_linked || busyKey === key
                            }
                            onChange={(e) => tick(selected, t, e.target.checked)}
                            label={`${t.title}${t.is_gate ? ' (gate)' : ''}`}
                          />
                        </li>
                      );
                    })}
                  </ul>
                  {!selected.user_linked && (
                    <p className="coh-hint">
                      Completions are recorded once this member has set up their account.
                    </p>
                  )}
                  {!canTick(selected) && (
                    <p className="coh-hint">
                      Members tick their own tasks; managers tick anyone&apos;s.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="coh-head coh-head--sub">
            <h3 className="coh-subtitle">Mentor load</h3>
          </div>
          {loading ? (
            <TableSkeleton cols={3} rows={3} />
          ) : failed ? null : seniors.length === 0 ? (
            <EmptyLine>No senior members to mentor yet.</EmptyLine>
          ) : (
            <table className="coh-table coh-table--compact">
              <caption className="tcc-sr">Mentees per senior member, whole council</caption>
              <thead>
                <tr>
                  <th scope="col">Senior member</th>
                  <th scope="col">Role</th>
                  <th scope="col" className="coh-num">
                    Mentees
                  </th>
                </tr>
              </thead>
              <tbody>
                {seniors.map((x) => (
                  <tr key={x.id}>
                    <td className="coh-ellipsis">{x.display_name}</td>
                    <td className="coh-ellipsis">{x.title || roleLabel(x.role)}</td>
                    <td className="coh-num tcc-mono">{x.mentee_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {adding && (
        <AddTaskDialog
          cohort={cohort}
          request={request}
          sample={sample}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            onChanged?.();
          }}
        />
      )}
      {removing && (
        <RemoveTaskDialog
          cohort={cohort}
          task={removing}
          request={request}
          sample={sample}
          onClose={() => setRemoving(null)}
          onDone={() => {
            setRemoving(null);
            onChanged?.();
          }}
        />
      )}
    </>
  );
}
