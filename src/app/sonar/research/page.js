import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import ResearchClient from './ResearchClient';

/**
 * Sonar research (engine v3). Off unless NEXT_PUBLIC_SONAR_ENGINE_V3=true,
 * so the existing /sonar band stays the default until the benchmarks pass.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sonar research | Ezana',
  description:
    'Ask a research question; Sonar plans the investigation, retrieves evidence across Ezana datasets, validates every claim and writes a cited research report.',
};

export default function SonarResearchPage() {
  if (process.env.NEXT_PUBLIC_SONAR_ENGINE_V3 !== 'true') notFound();
  return (
    <Suspense fallback={null}>
      <ResearchClient />
    </Suspense>
  );
}
