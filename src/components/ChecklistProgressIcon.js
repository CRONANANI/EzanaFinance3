'use client';

import { useState } from 'react';
import { useChecklist } from '@/hooks/useChecklist';
import { getTasksByStage, isStageUnlocked, CHECKLIST_STAGES } from '@/config/checklist';
import { useActiveTaskContext } from '@/contexts/ActiveTaskContext';

export function ChecklistProgressIcon() {
  const { completedCount, totalTasks, isComplete, progress } = useChecklist();
  const [isOpen, setIsOpen] = useState(false);
  const { startTask } = useActiveTaskContext();

  const percentage = Math.round((completedCount / totalTasks) * 100);
  const tasksByStage = getTasksByStage();

  if (isComplete) return null;

  return (
    <div style={{ position: 'relative' }} data-tutorial="checklist-icon">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`${completedCount}/${totalTasks} tasks completed`}
        className="checklist-trigger-btn"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <span>
          {completedCount}/{totalTasks}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            role="presentation"
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
          />

          <div className="checklist-dropdown">
            <h3 className="checklist-dropdown-title">Getting Started</h3>
            <p className="checklist-dropdown-subtitle">Complete these tasks to unlock trading</p>

            <div className="checklist-progress-bar-track">
              <div className="checklist-progress-bar-fill" style={{ width: `${percentage}%` }} />
            </div>

            {CHECKLIST_STAGES.map((stageMeta) => {
              const stage = tasksByStage[stageMeta.id];
              if (!stage?.tasks?.length) return null;
              const unlocked = isStageUnlocked(stageMeta.id, progress);
              const stageDone = stage.tasks.filter((t) => progress[t.id]).length;
              const stagePct = Math.round((stageDone / stage.tasks.length) * 100);
              const rewardClass =
                stageMeta.id >= 3
                  ? 'checklist-reward-badge checklist-reward-badge--lg'
                  : 'checklist-reward-badge';

              return (
                <div key={stageMeta.id} style={{ marginBottom: '1.25rem' }}>
                  <div className="checklist-stage-header">
                    <p className="checklist-stage-title">
                      Stage {stageMeta.id} — {stage.name}
                    </p>
                    <span className={rewardClass}>+{stageMeta.rewardXp} XP</span>
                  </div>
                  {!unlocked && (
                    <p className="checklist-stage-lock">
                      🔒 Complete Stage {stageMeta.id - 1} to unlock
                    </p>
                  )}
                  {unlocked && (
                    <>
                      <div className="checklist-stage-bar">
                        <div
                          className="checklist-stage-bar-fill"
                          style={{ width: `${stagePct}%` }}
                        />
                      </div>
                      {stage.tasks.map((task) => {
                        const done = !!progress[task.id];
                        return (
                          <div
                            key={task.id}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                if (!done) startTask(task.id);
                                setIsOpen(false);
                              }
                            }}
                            onClick={() => {
                              if (!done) startTask(task.id);
                              setIsOpen(false);
                            }}
                            className={`checklist-task-row ${done ? 'checklist-task-row--done' : ''}`}
                          >
                            <div
                              className={`checklist-checkbox ${done ? 'checklist-checkbox--done' : ''}`}
                            >
                              {done && (
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#fff"
                                  strokeWidth="3"
                                  aria-hidden
                                >
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p
                                className={`checklist-task-title ${done ? 'checklist-task-title--done' : ''}`}
                              >
                                {task.title}
                              </p>
                              <p className="checklist-task-desc">{task.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })}
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

        .checklist-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 8px;
          width: 360px;
          max-height: 500px;
          overflow-y: auto;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1rem;
          z-index: 50;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        }
        :is(.dark, body:not(.light-mode)) .checklist-dropdown {
          background: #0d1117;
          border-color: #1f2937;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }

        .checklist-dropdown-title {
          color: #111827;
          font-size: 1rem;
          margin-bottom: 4px;
        }
        :is(.dark, body:not(.light-mode)) .checklist-dropdown-title { color: #fff; }

        .checklist-dropdown-subtitle {
          color: #4b5563;
          font-size: 0.8rem;
          margin-bottom: 1rem;
        }
        :is(.dark, body:not(.light-mode)) .checklist-dropdown-subtitle {
          color: #9ca3af;
        }

        .checklist-progress-bar-track {
          background: #f3f4f6;
          border-radius: 6px;
          height: 8px;
          margin-bottom: 1rem;
          overflow: hidden;
        }
        :is(.dark, body:not(.light-mode)) .checklist-progress-bar-track { background: #1f2937; }

        .checklist-progress-bar-fill {
          background: #10b981;
          height: 100%;
          border-radius: 6px;
          transition: width 0.3s ease;
        }

        .checklist-section-label {
          color: #6b7280;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        :is(.dark, body:not(.light-mode)) .checklist-section-label {
          color: #9ca3af;
        }

        .checklist-task-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .checklist-task-row:hover { background: #f9fafb; }
        :is(.dark, body:not(.light-mode)) .checklist-task-row:hover { background: #161b22; }
        .checklist-task-row--done { opacity: 0.5; cursor: default; }
        .checklist-task-row--done:hover { background: transparent; }

        .checklist-checkbox {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 2px solid #d1d5db;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        :is(.dark, body:not(.light-mode)) .checklist-checkbox { border-color: #374151; }
        .checklist-checkbox--done {
          background: #10b981;
          border: none;
        }

        .checklist-task-title {
          color: #111827;
          font-size: 0.85rem;
          margin-bottom: 2px;
        }
        :is(.dark, body:not(.light-mode)) .checklist-task-title { color: #f0f6fc; }
        .checklist-task-title--done {
          text-decoration: line-through;
          color: #9ca3af;
        }
        :is(.dark, body:not(.light-mode)) .checklist-task-title--done {
          color: #6b7280;
        }

        .checklist-task-desc {
          color: #4b5563;
          font-size: 0.75rem;
        }
        :is(.dark, body:not(.light-mode)) .checklist-task-desc {
          color: #b0bac5;
        }
      `}</style>
    </div>
  );
}
