'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Data for the Command Center. Each resource loads on its own and owns its
 * state ({ status: 'loading' | 'ready' | 'error' | 'forbidden', data }), so a
 * failed request shows as a failure with Retry in the section that needs it,
 * never as an empty council.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, every resource is answered from the bundle and
 * nothing the member does is sent anywhere (a status change or a new task
 * stays on the page).
 */
const LIVE = {
  summary: '/api/org/team-hub/summary',
  digest: '/api/org/digest',
  tasks: '/api/org/tasks',
  meetings: '/api/org/meetings',
  assignments: '/api/org/assignments',
  setup: '/api/org/setup-status',
  health: '/api/org/fund-health',
};
const SAMPLE_URL = '/api/org/team-hub/sample';
const LOADING = { status: 'loading', data: null };

const recount = (tasks, base) => ({
  ...base,
  tasks,
  openCount: tasks.filter((t) => t.status !== 'completed').length,
  overdueCount: tasks.filter((t) => t.overdue && t.status !== 'completed').length,
});

export function useCommandCenterData({ enabled, wantHealth }) {
  const [live, setLive] = useState({});
  const [sample, setSample] = useState({ status: 'loading', bundle: null });
  const [showSample, setShowSample] = useState(true);
  const [sampleTasks, setSampleTasks] = useState(null);
  const [taskError, setTaskError] = useState(null);
  const [roster, setRoster] = useState({ status: 'idle', members: [] });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async (key) => {
    setLive((s) => ({ ...s, [key]: { status: 'loading', data: s[key]?.data ?? null } }));
    let next;
    try {
      const res = await fetch(LIVE[key], { cache: 'no-store' });
      if (res.status === 403 && key === 'health') next = { status: 'forbidden', data: null };
      else if (!res.ok) next = { status: 'error', data: null };
      else next = { status: 'ready', data: await res.json() };
    } catch {
      next = { status: 'error', data: null };
    }
    if (alive.current) setLive((s) => ({ ...s, [key]: next }));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    ['summary', 'digest', 'tasks', 'meetings', 'assignments', 'setup'].forEach(load);
    (async () => {
      let bundle = null;
      try {
        const res = await fetch(SAMPLE_URL, { cache: 'no-store' });
        if (res.ok) bundle = (await res.json())?.sample || null;
      } catch {
        bundle = null;
      }
      if (!alive.current) return;
      setSample({ status: 'ready', bundle });
      setSampleTasks(bundle?.tasks || null);
    })();
  }, [enabled, load]);

  useEffect(() => {
    if (enabled && wantHealth) load('health');
  }, [enabled, wantHealth, load]);

  const sampleActive = Boolean(sample.bundle) && showSample;
  const sampleAvailable = Boolean(sample.bundle);

  const resource = useCallback(
    (key) => {
      if (!enabled || sample.status === 'loading') return LOADING;
      if (sampleActive) {
        const data = key === 'tasks' ? sampleTasks : sample.bundle[key];
        return data ? { status: 'ready', data } : LOADING;
      }
      if (key === 'health' && !wantHealth) return { status: 'forbidden', data: null };
      return live[key] || LOADING;
    },
    [enabled, sample, sampleActive, sampleTasks, live, wantHealth],
  );

  const retry = useCallback(
    (...keys) => {
      if (sampleActive) return;
      keys.forEach(load);
    },
    [sampleActive, load],
  );

  /* ── Tasks ── */
  const changeTaskStatus = useCallback(
    async (taskId, nextStatus) => {
      setTaskError(null);
      const apply = (d, status) =>
        d
          ? recount(
              d.tasks.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      status,
                      updated_at: new Date().toISOString(),
                      overdue: Boolean(
                        t.due_date && status !== 'completed' && Date.parse(t.due_date) < Date.now(),
                      ),
                    }
                  : t,
              ),
              d,
            )
          : d;

      if (sampleActive) {
        setSampleTasks((d) => apply(d, nextStatus));
        return;
      }
      const before = live.tasks?.data?.tasks?.find((t) => t.id === taskId)?.status;
      if (!before || before === nextStatus) return;
      const patch = (status) =>
        setLive((s) =>
          s.tasks?.data ? { ...s, tasks: { ...s.tasks, data: apply(s.tasks.data, status) } } : s,
        );
      patch(nextStatus);
      try {
        const res = await fetch(LIVE.tasks, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: taskId, status: nextStatus }),
        });
        if (!res.ok) throw new Error('update failed');
      } catch {
        if (!alive.current) return;
        patch(before);
        setTaskError('Could not update the task. Its status was not changed.');
      }
    },
    [sampleActive, live.tasks],
  );

  const loadRoster = useCallback(async () => {
    if (sampleActive) return;
    setRoster((r) => (r.status === 'ready' ? r : { status: 'loading', members: [] }));
    try {
      const res = await fetch('/api/org/members', { cache: 'no-store' });
      if (!res.ok) throw new Error('roster failed');
      const d = await res.json();
      if (!alive.current) return;
      setRoster({
        status: 'ready',
        members: (d.members || []).filter((m) => m.is_active !== false && m.user_id),
      });
    } catch {
      if (alive.current) setRoster({ status: 'error', members: [] });
    }
  }, [sampleActive]);

  /** Returns { ok: true } or { ok: false, error }. */
  const createTask = useCallback(
    async (input) => {
      if (sampleActive) {
        const who = (sample.bundle.roster || []).find((m) => m.user_id === input.assigned_to);
        const viewerId = sampleTasks?.viewer?.userId;
        const row = {
          id: `sample-task-new-${Date.now()}`,
          title: input.title,
          description: input.description || null,
          due_date: input.due_date || null,
          status: 'pending',
          priority: input.priority || 'medium',
          team_id: input.team_id || null,
          assigned_to: input.assigned_to,
          assigned_by: viewerId,
          assignee_name: who?.display_name || 'Member',
          mine: input.assigned_to === viewerId,
          overdue: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_demo: true,
        };
        setSampleTasks((d) => (d ? recount([row, ...d.tasks], d) : d));
        return { ok: true, sample: true };
      }
      try {
        const res = await fetch(LIVE.tasks, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (res.status === 403) {
          return { ok: false, error: 'Only executives and portfolio managers can create tasks.' };
        }
        if (!res.ok) return { ok: false, error: 'Could not save the task. Try again.' };
        await load('tasks');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Could not save the task. Try again.' };
      }
    },
    [sampleActive, sample.bundle, sampleTasks, load],
  );

  const rosterView = useMemo(
    () => (sampleActive ? { status: 'ready', members: sample.bundle.roster || [] } : roster),
    [sampleActive, sample.bundle, roster],
  );

  return {
    resource,
    retry,
    sampleActive,
    sampleAvailable,
    setShowSample,
    changeTaskStatus,
    taskError,
    clearTaskError: () => setTaskError(null),
    createTask,
    roster: rosterView,
    loadRoster,
  };
}
