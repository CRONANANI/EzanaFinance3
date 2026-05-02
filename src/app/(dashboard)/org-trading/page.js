'use client';

import { useOrg } from '@/contexts/OrgContext';
import { CouncilOverview } from '@/components/org-trading/CouncilOverview';
import { TeamPortfolioView } from '@/components/org-trading/TeamPortfolioView';
import Link from 'next/link';
import './org-trading.css';

export default function OrgTradingPage() {
  const { isOrgUser, orgRole, orgData, isLoading, canFlagPositions } = useOrg();

  if (isLoading) {
    return <div style={{ padding: '2rem', color: '#8b949e' }}>Loading Council Trading…</div>;
  }
  if (!isOrgUser) {
    return (
      <div style={{ padding: '2rem', color: '#8b949e' }}>
        This page is for organizational members only.
      </div>
    );
  }

  return (
    <div className="dashboard-page-inset org-trading-page">
      <div className="ot-hero">
        <div className="ot-hero-left">
          <div className="ot-hero-icon">
            <i className="bi bi-bank2" />
          </div>
          <div>
            <h1>Council Trading</h1>
            <p className="ot-hero-sub">
              {orgData?.org?.name || 'Organization'} · {orgRole?.replace('_', ' ')}
              {canFlagPositions && <span className="ot-perm-pill"> · Can flag positions</span>}
            </p>
          </div>
        </div>
        <div className="ot-hero-actions">
          <Link href="/org-trading/inbox" className="ot-inbox-link">
            <i className="bi bi-flag-fill" />
            <span>Flag Inbox</span>
          </Link>
        </div>
      </div>

      {orgRole === 'executive' && <CouncilOverview />}
      {orgRole === 'portfolio_manager' && (
        <TeamPortfolioView
          teamId={orgData?.member?.team_id}
          memberRole="portfolio_manager"
          memberEmail={orgData?.member?.email}
        />
      )}
      {orgRole === 'analyst' && (
        <TeamPortfolioView
          teamId={orgData?.member?.team_id}
          memberRole="analyst"
          memberEmail={orgData?.member?.email}
        />
      )}
    </div>
  );
}
