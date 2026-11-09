'use client';

/* Community (Nov 2026 redesign): src/components/community/CommunityPage.jsx.
   community.css stays for the post composer's shared .ez-btn / .ez-card
   styles; the page itself is styled by community.module.css. */
import { Suspense } from 'react';
import './community.css';
import '@/styles/home-canvas.css';
import { CommunityPage } from '@/components/community/CommunityPage';

export default function CommunityRoute() {
  return (
    <Suspense fallback={null}>
      <CommunityPage />
    </Suspense>
  );
}
