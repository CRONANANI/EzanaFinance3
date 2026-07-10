'use client';

import Link from 'next/link';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';

/**
 * Team Permissions — placeholder surface reached from the Team Hub sidebar
 * (the renamed "Archive" action). The full org permissions-management UI is a
 * roadmap item; this page keeps the route real and gated to org members so the
 * sidebar link never dead-ends. Access control for real edits is enforced
 * server-side when that UI ships.
 */
export default function TeamPermissionsPage() {
  const { isOrgUser, isLoading } = useOrg();

  if (isLoading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>;
  }
  if (!isOrgUser) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>
        This page is for organizational members only.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '1rem 0' }}>
      <Link
        href="/org-team-hub"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text-muted)',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        <ArrowLeft size={14} aria-hidden /> Back to Command Center
      </Link>
      <div
        style={{
          marginTop: '1.5rem',
          padding: '2rem',
          border: '1px solid var(--border-primary)',
          borderRadius: 16,
          background: 'var(--surface-card)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            margin: '0 auto 1rem',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--emerald-bg, rgba(16,185,129,0.1))',
            color: 'var(--emerald, #10b981)',
          }}
        >
          <KeyRound size={22} aria-hidden />
        </div>
        <h1
          style={{
            margin: '0 0 0.5rem',
            fontSize: '1.35rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
          }}
        >
          Team Permissions
        </h1>
        <p style={{ margin: '0 auto', maxWidth: 460, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Manage roles, dataset access, and approval rights across the fund from here. The full
          permissions-management console is <strong>coming soon</strong> — role edits currently run
          through the Org Chart (each member&apos;s tier controls what they can do).
        </p>
        <Link
          href="/org-team-hub/org-chart"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: '1.25rem',
            padding: '0.6rem 1.1rem',
            borderRadius: 10,
            background: 'var(--emerald, #10b981)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          Open Org Chart
        </Link>
      </div>
    </div>
  );
}
