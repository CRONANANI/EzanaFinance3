'use client';

/**
 * Learning Center: the personal learning hub (Nov 2026 redesign).
 * Component: src/components/learning/hub/LearningHub.jsx.
 * Flat home canvas: the root carries `ez-canvas` and home-canvas.css loads last.
 */
import { Suspense } from 'react';
import { LearningHub } from '@/components/learning/hub/LearningHub';
import '@/components/beginner/beginner.css';
import '@/components/learning/hub/learning-hub.css';
import '@/styles/home-canvas.css';

export default function Page() {
  return (
    <Suspense
      fallback={<div className="lh-page dashboard-page-inset ez-canvas" aria-busy="true" />}
    >
      <LearningHub />
    </Suspense>
  );
}
