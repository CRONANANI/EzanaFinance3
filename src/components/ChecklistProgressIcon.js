'use client';

import { useState } from 'react';
import { Check, Lock, ArrowRight } from 'lucide-react';
import { useChecklist } from '@/hooks/useChecklist';
import { getTasksByStage, isStageUnlocked, CHECKLIST_STAGES } from '@/config/checklist';
import { useActiveTaskContext } from '@/contexts/ActiveTaskContext';

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
  const { startTask } = useActiveTaskContext();

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
    if (nextTask) startTask(nextTask.id);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }} data-tutorial="checklist-icon">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`${completedCount}/${totalTasks} tasks completed`}
        className="checklist-trigger-btn"
        aria-expanded={isOpen}
      >
        <Check size={15} strokeWidth={2.4} style={{ color: '#10b981' }} aria-hidden />
        <span className="cl2-mono">
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
                        {s.complete ? <Check size={13} strokeWidth={3} aria-hidden /> : s.meta.id}
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
                                {done && <Check size={12} strokeWidth={3.2} aria-hidden />}
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
                        <Lock size={14} strokeWidth={2} aria-hidden />
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
                Resume <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        .checklist-trigger-btn {
          background: none;
          border: 1px solid rgba(107,114,128,0.3);
          border-radius: 8px;
          padding: 6px 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #111827;
          font-size: 0.8rem;
          font-weight: 600;
        }
        :is(.dark, body:not(.light-mode)) .checklist-trigger-btn {
          color: #fff;
          border-color: rgba(255,255,255,0.1);
        }
        .cl2-mono {
          font-family: var(--font-mono, 'JetBrains Mono', ui-monospace, monospace);
          font-variant-numeric: tabular-nums;
        }

        /* ── Panel shell ── */
        .cl2-panel {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          width: 396px;
          max-width: calc(100vw - 24px);
          max-height: min(560px, calc(100vh - 90px));
          display: flex;
          flex-direction: column;
          background: var(--surface-card, #ffffff);
          border: 1px solid var(--border-primary, rgba(0,0,0,0.08));
          border-radius: 16px;
          box-shadow: var(--shadow-lg, 0 16px 48px rgba(0,0,0,0.16));
          z-index: 50;
          overflow: visible;
          font-family: var(--font-sans, 'Plus Jakarta Sans', system-ui, sans-serif);
          animation: cl2-in 0.2s ease;
        }
        @keyframes cl2-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cl2-caret {
          position: absolute;
          top: -6px;
          left: 26px;
          width: 12px;
          height: 12px;
          background: var(--surface-card, #ffffff);
          border-left: 1px solid var(--border-primary, rgba(0,0,0,0.08));
          border-top: 1px solid var(--border-primary, rgba(0,0,0,0.08));
          transform: rotate(45deg);
        }

        /* ── Header ── */
        .cl2-header {
          flex-shrink: 0;
          padding: 16px 18px;
          border-bottom: 1px solid var(--border-primary, rgba(0,0,0,0.08));
          border-radius: 16px 16px 0 0;
          background:
            linear-gradient(180deg, rgba(16,185,129,0.08), transparent 90%),
            var(--surface-card, #ffffff);
        }
        .cl2-header-top {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .cl2-ring {
          position: relative;
          width: 64px;
          height: 64px;
          flex-shrink: 0;
        }
        .cl2-ring-track {
          fill: none;
          stroke: var(--emerald-bg, rgba(16,185,129,0.14));
          stroke-width: 6;
        }
        .cl2-ring-arc {
          fill: none;
          stroke: var(--emerald, #10b981);
          stroke-width: 6;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1);
        }
        .cl2-ring-center {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .cl2-ring-count {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary, #111827);
        }
        .cl2-ring-label {
          font-size: 7.5px;
          letter-spacing: 0.14em;
          color: var(--text-muted, #6b7280);
          margin-top: 2px;
        }
        .cl2-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary, #111827);
        }
        .cl2-sub {
          margin: 2px 0 0;
          font-size: 0.8rem;
          color: var(--text-muted, #6b7280);
        }
        .cl2-xp {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
        }
        .cl2-xp-track {
          flex: 1;
          height: 8px;
          border-radius: 999px;
          background: var(--emerald-bg, rgba(16,185,129,0.12));
          overflow: hidden;
        }
        .cl2-xp-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--emerald, #10b981), #34d399);
          transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
        }
        .cl2-xp-value {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--emerald-text, #059669);
          flex-shrink: 0;
        }

        /* ── Body ── */
        .cl2-body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 14px 18px 8px;
        }
        .cl2-stage { margin-bottom: 16px; }
        .cl2-stage-head {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 9px;
        }
        .cl2-stage-num {
          width: 22px;
          height: 22px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .cl2-stage-num--active {
          color: var(--emerald-text, #059669);
          background: var(--emerald-bg, rgba(16,185,129,0.12));
          border: 1px solid var(--emerald-border, rgba(16,185,129,0.35));
        }
        .cl2-stage-num--done {
          color: #fff;
          background: var(--emerald, #10b981);
        }
        .cl2-stage-num--locked {
          color: var(--text-muted, #9ca3af);
          background: var(--surface-card-hover, rgba(0,0,0,0.04));
          border: 1px solid var(--border-primary, rgba(0,0,0,0.08));
        }
        .cl2-stage-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary, #111827);
        }
        .cl2-xp-pill {
          margin-left: auto;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
          color: var(--emerald-text, #059669);
          background: var(--emerald-bg, rgba(16,185,129,0.1));
        }

        .cl2-tasks { display: flex; flex-direction: column; gap: 2px; }
        .cl2-task {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          width: 100%;
          text-align: left;
          padding: 8px;
          border: none;
          border-radius: 9px;
          background: transparent;
          cursor: pointer;
          transition: background 0.15s ease;
          font-family: inherit;
        }
        .cl2-task:hover { background: var(--emerald-bg, rgba(16,185,129,0.06)); }
        .cl2-task--done { cursor: default; }
        .cl2-task--done:hover { background: transparent; }
        .cl2-check {
          width: 18px;
          height: 18px;
          border-radius: 6px;
          border: 2px solid var(--border-input, #d1d5db);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
          margin-top: 1px;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .cl2-check--done {
          background: var(--emerald, #10b981);
          border-color: var(--emerald, #10b981);
          animation: cl2-pop 0.2s ease;
        }
        @keyframes cl2-pop { from { transform: scale(0.6); } to { transform: scale(1); } }
        .cl2-task-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .cl2-task-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary, #111827);
        }
        .cl2-task--done .cl2-task-title {
          text-decoration: line-through;
          color: var(--text-muted, #9ca3af);
          font-weight: 500;
        }
        .cl2-task-desc {
          font-size: 0.75rem;
          line-height: 1.4;
          color: var(--text-muted, #6b7280);
        }
        .cl2-task-meta {
          font-size: 0.66rem;
          font-weight: 600;
          color: var(--emerald-text, #059669);
          margin-top: 1px;
        }
        .cl2-task--done .cl2-task-meta { color: var(--text-ghost, #9ca3af); }

        /* Locked stage inset */
        .cl2-locked {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border: 1px dashed var(--border-hover, rgba(0,0,0,0.18));
          border-radius: 10px;
          color: var(--text-muted, #6b7280);
        }
        .cl2-locked svg { margin-top: 1px; flex-shrink: 0; }
        .cl2-locked-title {
          margin: 0;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary, #4b5563);
        }
        .cl2-locked-preview {
          margin: 2px 0 0;
          font-size: 0.72rem;
          color: var(--text-muted, #9ca3af);
        }

        /* ── Footer ── */
        .cl2-footer {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 18px;
          border-top: 1px solid var(--border-primary, rgba(0,0,0,0.08));
        }
        .cl2-footer-text {
          font-size: 0.78rem;
          color: var(--text-muted, #6b7280);
        }
        .cl2-resume {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 7px 14px;
          border: none;
          border-radius: 9px;
          background: var(--emerald, #10b981);
          color: #fff;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: filter 0.15s ease;
          flex-shrink: 0;
        }
        .cl2-resume:hover:not(:disabled) { filter: brightness(1.06); }
        .cl2-resume:disabled { opacity: 0.5; cursor: default; }

        @media (prefers-reduced-motion: reduce) {
          .cl2-panel { animation: none; }
          .cl2-ring-arc, .cl2-xp-fill, .cl2-check--done, .cl2-task, .cl2-resume { transition: none; animation: none; }
        }
      `}</style>
    </div>
  );
}
