'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import './toast.css';

const ToastContext = createContext(null);

const TOAST_TYPES = ['success', 'error', 'info', 'warning'];
const TOAST_ICONS = {
  success: 'bi-check-circle-fill',
  error: 'bi-exclamation-circle-fill',
  info: 'bi-info-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
};
const TOAST_COLORS = {
  success: '#10b981',
  error: '#ef4444',
  info: '#3b82f6',
  warning: '#f59e0b',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const MAX_TOASTS = 3;
  const AUTO_DISMISS_MS = 3000;

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    const toast = { id, type, message, progress: 100 };
    setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), toast]);

    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, progress } : t))
      );
    }, 50);

    setTimeout(() => {
      clearInterval(interval);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  const toast = useCallback(
    Object.fromEntries(
      TOAST_TYPES.map((t) => [t, (msg) => addToast(t, msg)])
    ),
    [addToast]
  );

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss }}>
      {children}
      <div
        className="toast-container"
        role="region"
        aria-label="Notifications"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: 8,
          maxWidth: 380,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-item"
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '14px 16px',
              background: 'rgba(10, 14, 19, 0.95)',
              border: `1px solid ${TOAST_COLORS[t.type]}33`,
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
          >
            <i
              className={`bi ${TOAST_ICONS[t.type]}`}
              style={{ color: TOAST_COLORS[t.type], fontSize: 20, flexShrink: 0, marginTop: 2 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#f0f6fc', lineHeight: 1.4 }}>
                {t.message}
              </p>
              <div
                style={{
                  marginTop: 8,
                  height: 3,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${t.progress}%`,
                    background: TOAST_COLORS[t.type],
                    transition: 'width 0.05s linear',
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="toast-dismiss"
              aria-label="Dismiss notification"
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                padding: 4,
                fontSize: 16,
              }}
            >
              <i className="bi bi-x" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
