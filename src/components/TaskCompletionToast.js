'use client';

import { useEffect } from 'react';

export function TaskCompletionToast({ message, visible, onClose }) {
  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      className="task-completion-toast-wrap"
      style={{
        position: 'fixed',
        top: '70px',
        right: '20px',
        zIndex: 10000,
        animation: 'taskCompletionSlideIn 0.3s ease',
      }}
    >
      <div
        style={{
          background: '#111',
          border: '1px solid #10b981',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2)',
          maxWidth: '360px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🎉</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#10b981', fontWeight: '600', fontSize: '0.85rem', marginBottom: '2px' }}>Task Complete!</p>
          <p style={{ color: '#ccc', fontSize: '0.8rem' }}>{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#555',
            cursor: 'pointer',
            fontSize: '1.1rem',
            padding: '4px',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
