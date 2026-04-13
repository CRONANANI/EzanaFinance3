'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function ProGateModal({ isOpen, onClose }) {
  const router = useRouter();

  // Lock body scroll while the modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-gate-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 10, 8, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 440,
          background:
            'linear-gradient(135deg, rgba(212, 175, 55, 0.10) 0%, rgba(212, 175, 55, 0.18) 100%)',
          border: '1px solid rgba(212, 175, 55, 0.55)',
          borderRadius: '14px',
          padding: '1.75rem 1.75rem 1.5rem',
          boxShadow:
            '0 24px 64px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(212, 175, 55, 0.2) inset',
          fontFamily: 'var(--font-sans, sans-serif)',
          color: '#f0f6fc',
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 30,
            height: 30,
            borderRadius: '8px',
            background: 'rgba(212, 175, 55, 0.08)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            color: '#D4AF37',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>

        {/* Lock icon */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: '12px',
            background: 'rgba(212, 175, 55, 0.15)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            color: '#D4AF37',
            fontSize: '1.4rem',
            marginBottom: '1rem',
          }}
        >
          <i className="bi bi-lock-fill" />
        </div>

        <h2
          id="pro-gate-title"
          style={{
            margin: 0,
            fontSize: '1.15rem',
            fontWeight: 800,
            color: '#D4AF37',
            letterSpacing: '0.01em',
          }}
        >
          Advanced Pro Feature
        </h2>

        <p
          style={{
            margin: '0.5rem 0 1.25rem',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            color: '#e5e7eb',
          }}
        >
          This feature is currently only available to advanced pro users.
          Upgrade your plan to gain access.
        </p>

        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push('/pricing');
            }}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #D4AF37 0%, #b8941f 100%)',
              border: 'none',
              color: '#1a1a1a',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            Upgrade Plan
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              color: '#D4AF37',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
