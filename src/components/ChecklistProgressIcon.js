'use client';

import { useState } from 'react';
import { useChecklist } from '@/hooks/useChecklist';
import { getTasksBySection } from '@/config/checklist';
import { useActiveTaskContext } from '@/contexts/ActiveTaskContext';

export function ChecklistProgressIcon() {
  const { completedCount, totalTasks, isComplete, progress } = useChecklist();
  const [isOpen, setIsOpen] = useState(false);
  const { startTask } = useActiveTaskContext();

  const percentage = Math.round((completedCount / totalTasks) * 100);
  const tasksBySection = getTasksBySection();

  if (isComplete) return null;

  return (
    <div style={{ position: 'relative' }} data-tutorial="checklist-icon">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`${completedCount}/${totalTasks} tasks completed`}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '6px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#fff',
          fontSize: '0.8rem',
          fontWeight: '600',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <span>{completedCount}/{totalTasks}</span>
      </button>

      {isOpen && (
        <>
          <div
            role="presentation"
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 40,
            }}
          />

          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '8px',
            width: '360px',
            maxHeight: '500px',
            overflowY: 'auto',
            background: '#111',
            border: '1px solid #222',
            borderRadius: '12px',
            padding: '1rem',
            zIndex: 50,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
          >
            <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '4px' }}>
              Getting Started
            </h3>
            <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Complete these tasks to unlock trading
            </p>

            <div style={{
              background: '#1a1a1a',
              borderRadius: '6px',
              height: '8px',
              marginBottom: '1rem',
              overflow: 'hidden',
            }}
            >
              <div style={{
                background: '#10b981',
                height: '100%',
                width: `${percentage}%`,
                borderRadius: '6px',
                transition: 'width 0.3s ease',
              }} />
            </div>

            {Object.entries(tasksBySection).map(([section, { sectionName, tasks }]) => (
              <div key={section} style={{ marginBottom: '1rem' }}>
                <p style={{
                  color: '#666',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px',
                }}
                >
                  {sectionName}
                </p>
                {tasks.map((task) => {
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
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '8px',
                        borderRadius: '8px',
                        cursor: done ? 'default' : 'pointer',
                        opacity: done ? 0.5 : 1,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => { if (!done) e.currentTarget.style.background = '#1a1a1a'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: done ? 'none' : '2px solid #333',
                        background: done ? '#10b981' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                      >
                        {done && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" aria-hidden>
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p style={{
                          color: done ? '#666' : '#fff',
                          fontSize: '0.85rem',
                          textDecoration: done ? 'line-through' : 'none',
                          marginBottom: '2px',
                        }}
                        >
                          {task.title}
                        </p>
                        <p style={{ color: '#555', fontSize: '0.75rem' }}>
                          {task.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
