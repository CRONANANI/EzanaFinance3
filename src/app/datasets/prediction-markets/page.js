import { Suspense } from 'react';
import PredictionMarketsPage from '@/components/datasets/prediction-markets/PredictionMarketsPage';

/**
 * Prediction markets dataset page: the eight-card dashboard
 * (docs/design/prediction-markets-handoff). The page shell renders here; the
 * cards fetch their own data from /api/prediction-markets/* so each one has
 * real loading, empty, error and retry states. The client reads its filters
 * from the URL, hence the Suspense boundary for useSearchParams.
 */
export default function PredictionMarketsDatasetPage() {
  return (
    <Suspense fallback={null}>
      <PredictionMarketsPage />
    </Suspense>
  );
}
