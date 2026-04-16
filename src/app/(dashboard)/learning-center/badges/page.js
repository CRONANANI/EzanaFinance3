'use client';

import Link from 'next/link';
import '@/app/(dashboard)/home-dashboard/home-dashboard.css';
import '@/app/(dashboard)/learning-center/learning-center.css';
import { LearningCommunityBadgesPanel } from '@/components/community/LearningCommunityBadgesPanel';

export default function LearningBadgesPage() {
  return (
    <div className="dashboard-page-inset db-page lc3-page" style={{ paddingTop: 0, paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link
          href="/learning-center"
          className="lc3-back"
          style={{ fontSize: '0.8125rem', color: '#10b981', textDecoration: 'none' }}
        >
          ← Back to Learning Center
        </Link>
      </div>
      <h1 className="lc3-page-title" style={{ marginBottom: '0.5rem' }}>
        Learning badges
      </h1>
      <p style={{ color: '#6b7280', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
        Course topic badges use the same tier style as community achievements.
      </p>
      <LearningCommunityBadgesPanel />
    </div>
  );
}
