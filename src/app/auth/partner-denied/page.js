'use client';

import Link from 'next/link';

export default function PartnerDeniedPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f8fafb',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <i
        className="bi bi-exclamation-triangle"
        style={{ fontSize: '2.5rem', color: '#ef4444', marginBottom: '1rem' }}
      />
      <h2 style={{ color: '#0f172a', fontSize: '1.25rem', margin: '0 0 0.75rem' }}>
        Access Denied
      </h2>
      <p
        style={{
          color: '#475569',
          fontSize: '0.875rem',
          maxWidth: '400px',
          lineHeight: 1.6,
          marginBottom: '1.5rem',
        }}
      >
        This account is not registered as a partner. Please login as a regular user or apply to
        become a partner.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/auth/signin"
          style={{
            padding: '0.625rem 1.25rem',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            borderRadius: '10px',
            fontSize: '0.8125rem',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Login as User
        </Link>
        <Link
          href="/auth/partner/apply"
          style={{
            padding: '0.625rem 1.25rem',
            background: 'rgba(212, 168, 83, 0.12)',
            color: '#a16207',
            border: '1px solid rgba(212, 168, 83, 0.35)',
            borderRadius: '10px',
            fontSize: '0.8125rem',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Apply as Partner
        </Link>
      </div>
    </div>
  );
}
