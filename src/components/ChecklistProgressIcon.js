'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChecklist } from '@/hooks/useChecklist';
import { getTasksByStage, isStageUnlocked, CHECKLIST_STAGES } from '@/config/checklist';
import { useOptionalActiveTaskContext } from '@/contexts/ActiveTaskContext';
import './checklist-panel.css';

/* Trigger ring geometry (24px box). */
const TRIG_R = 9.5;
const TRIG_C = 2 * Math.PI * TRIG_R;

/**
 * Getting-Started checklist dropdown — rebuilt per the Nav Dropdowns design
 * handoff (spec 1a): progress ring + XP bar header, stage cards with task rows
 * and locked-stage insets, and a Resume footer.
 *
 * All state derives from the REAL onboarding data:
 *   - `progress` (per-task done map) + `TOTAL_TASKS` from useChecklist()
 *   - stage grouping + reward XP from src/config/checklist
 * Clicking a task calls the real `completeTask()` (Supabase + rewards); the
 * panel stays open so the tick fills and the ring / XP bar / stages update live.
 * Resume routes into the guided flow at the next incomplete task via
 * startTask(). Per-task XP is derived from the stage reward so totals reconcile.
 */
export function ChecklistProgressIcon() {
  const { completedCount, totalTasks, isComplete, progress, completeTask } = useChecklist();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  /* Optional: the Navbar renders this on every page, and the provider only
     exists inside the dashboard. Null off the dashboard is expected, not an
     error. */
  const activeTask = useOptionalActiveTaskContext();

  const tasksByStage = getTasksByStage();

  if (isComplete) return null;

  const pct = totalTasks > 0 ? completedCount / totalTasks : 0;

  // ── Derive XP from real progress. Per-task XP splits the stage reward evenly
  //    so the running total and the max always reconcile. ──
  let earnedXp = 0;
  let totalXp = 0;
  const stageView = CHECKLIST_STAGES.map((meta) => {
    const stage = tasksByStage[meta.id];
    const tasks = stage?.tasks || [];
    const perTaskXp = tasks.length ? Math.round(meta.rewardXp / tasks.length) : 0;
    const doneTasks = tasks.filter((t) => progress[t.id]);
    earnedXp += doneTasks.length * perTaskXp;
    totalXp += tasks.length * perTaskXp;
    return {
      meta,
      tasks,
      perTaskXp,
      doneCount: doneTasks.length,
      unlocked: isStageUnlocked(meta.id, progress),
      complete: tasks.length > 0 && doneTasks.length === tasks.length,
    };
  }).filter((s) => s.tasks.length > 0);

  const xpPct = totalXp > 0 ? Math.round((earnedXp / totalXp) * 100) : 0;

  // Current stage = first unlocked stage with work left; next task = its first
  // incomplete task (drives the footer text + Resume destination).
  const currentStage = stageView.find((s) => s.unlocked && !s.complete) || null;
  const nextTask = currentStage ? currentStage.tasks.find((t) => !progress[t.id]) || null : null;
  const remaining = currentStage ? currentStage.tasks.length - currentStage.doneCount : 0;
  const footerText = currentStage
    ? `${remaining} ${remaining === 1 ? 'task' : 'tasks'} left in Stage ${currentStage.meta.id}`
    : 'All stages complete';

  // Progress-ring geometry.
  const R = 26;
  const C = 2 * Math.PI * R;

  const resume = () => {
    if (nextTask) {
      /* Inside the dashboard the guide overlay drives the task in place.
         Outside it there is no overlay to drive, so navigate to the task's
         own page — the same destination startTask would route to — instead
         of doing nothing. */
      if (activeTask?.startTask) activeTask.startTask(nextTask.id);
      else router.push(nextTask.page || '/home');
    }
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }} data-tutorial="checklist-icon">
      {/* Trigger: same family as the right-cluster icon buttons (44px tap
          target wrapping a 36px circle), with the progress count moved into a
          corner badge that mirrors the bell's badge geometry in the emerald
          treatment (progress, not alerts). Click behavior unchanged. */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`${completedCount}/${totalTasks} tasks completed`}
        aria-label={`Getting started checklist, ${completedCount} of ${totalTasks} tasks completed`}
        className="checklist-trigger-btn"
        aria-expanded={isOpen}
      >
        <span className="checklist-trigger-inner" aria-hidden="true">
          <svg className="cl2-trig-ring" viewBox="0 0 24 24" width="24" height="24">
            <circle className="cl2-trig-track" cx="12" cy="12" r={TRIG_R} />
            <circle
              className="cl2-trig-arc"
              cx="12"
              cy="12"
              r={TRIG_R}
              strokeDasharray={TRIG_C}
              strokeDashoffset={TRIG_C * (1 - pct)}
              transform="rotate(-90 12 12)"
            />
          </svg>
          <i className="bi bi-check2 cl2-trig-check" />
        </span>
        <span className="checklist-trigger-badge cl2-mono" aria-hidden="true">
          {completedCount}/{totalTasks}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            role="presentation"
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          />

          <div className="cl2-panel" role="dialog" aria-label="Getting started checklist">
            <span className="cl2-caret" aria-hidden />

            {/* ── Fixed header: ring + title + XP bar ── */}
            <div className="cl2-header">
              <div className="cl2-header-top">
                <div className="cl2-ring" aria-hidden>
                  <svg viewBox="0 0 64 64" width="64" height="64">
                    <circle className="cl2-ring-track" cx="32" cy="32" r={R} />
                    <circle
                      className="cl2-ring-arc"
                      cx="32"
                      cy="32"
                      r={R}
                      strokeDasharray={C}
                      strokeDashoffset={C * (1 - pct)}
                      transform="rotate(-90 32 32)"
                    />
                  </svg>
                  <div className="cl2-ring-center">
                    <span className="cl2-ring-count cl2-mono">
                      {completedCount}/{totalTasks}
                    </span>
                    <span className="cl2-ring-label cl2-mono">TASKS</span>
                  </div>
                </div>
                <div className="cl2-header-text">
                  <h3 className="cl2-title">Getting started</h3>
                  <p className="cl2-sub">Finish these to unlock live trading</p>
                </div>
              </div>
              <div className="cl2-xp">
                <div className="cl2-xp-track">
                  <div className="cl2-xp-fill" style={{ width: `${xpPct}%` }} />
                </div>
                <span className="cl2-xp-value cl2-mono">{earnedXp} XP</span>
              </div>
            </div>

            {/* ── Scrolling body: stages ── */}
            <div className="cl2-body">
              {stageView.map((s) => {
                const chipCls = s.complete
                  ? 'cl2-stage-num cl2-stage-num--done'
                  : s.unlocked
                    ? 'cl2-stage-num cl2-stage-num--active'
                    : 'cl2-stage-num cl2-stage-num--locked';
                return (
                  <div key={s.meta.id} className="cl2-stage">
                    <div className="cl2-stage-head">
                      <span className={chipCls}>
                        {s.complete ? (
                          <i className="bi bi-check-lg" aria-hidden="true" />
                        ) : (
                          s.meta.id
                        )}
                      </span>
                      <span className="cl2-stage-name">{s.meta.name}</span>
                      <span className="cl2-xp-pill cl2-mono">+{s.meta.rewardXp} XP</span>
                    </div>

                    {s.unlocked ? (
                      <div className="cl2-tasks">
                        {s.tasks.map((task) => {
                          const done = !!progress[task.id];
                          return (
                            <button
                              key={task.id}
                              type="button"
                              className={`cl2-task${done ? ' cl2-task--done' : ''}`}
                              onClick={() => {
                                // Complete in place — panel stays open so the
                                // tick fills and the ring / XP update live.
                                if (!done) completeTask(task.id);
                              }}
                              disabled={done}
                            >
                              <span className={`cl2-check${done ? ' cl2-check--done' : ''}`}>
                                {done && <i className="bi bi-check-lg" aria-hidden="true" />}
                              </span>
                              <span className="cl2-task-body">
                                <span className="cl2-task-title">{task.title}</span>
                                <span className="cl2-task-desc">{task.description}</span>
                                <span className="cl2-task-meta cl2-mono">+{s.perTaskXp} XP</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="cl2-locked">
                        <i className="bi bi-lock" aria-hidden="true" />
                        <div>
                          <p className="cl2-locked-title">
                            Complete Stage {s.meta.id - 1} to unlock
                          </p>
                          <p className="cl2-locked-preview">{s.tasks[0]?.title}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Fixed footer ── */}
            <div className="cl2-footer">
              <span className="cl2-footer-text">{footerText}</span>
              <button type="button" className="cl2-resume" onClick={resume} disabled={!nextTask}>
                Resume <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* The trigger button itself is styled ONLY by the .checklist-trigger-btn
          family in globals.css (borderless 44px icon button matching the bell).
          The panel's styles live in checklist-panel.css; do not add trigger
          styles there. */}
    </div>
  );
}
