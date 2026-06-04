'use client';

import { Suspense } from 'react';
import { SectorHeatmap } from './SectorHeatmap';
import { StressTestCard } from './StressTestCard';
import { MPTCard } from './MPTCard';
import { BlackLittermanCard } from './BlackLittermanCard';
import { MonteCarloCard } from './MonteCarloCard';
import './market-portfolio.css';

/**
 * Industry / Portfolio research surfaces — split by `section` tab.
 * Industry: sector heatmap. Portfolio: stress-test and optimization models.
 */
export function MarketPortfolioView({ section = 'industry' }) {
  return (
    <div className="mpv-root mpv-ledger">
      {section === 'industry' && (
        <Suspense
          fallback={<div className="shm-skeleton-tile" style={{ height: 200 }} aria-hidden />}
        >
          <SectorHeatmap />
        </Suspense>
      )}
      {section === 'portfolio' && (
        <div className="mpv-grid">
          <StressTestCard />
          <MPTCard />
          <BlackLittermanCard />
          <MonteCarloCard />
        </div>
      )}
    </div>
  );
}

export default MarketPortfolioView;
