'use client';

import { Suspense } from 'react';
import { ObsidianPanel } from './ObsidianPanel';
import { SectorHeatmap } from './SectorHeatmap';
import { StressTestCard } from './StressTestCard';
import { MPTCard } from './MPTCard';
import { BlackLittermanCard } from './BlackLittermanCard';
import { MonteCarloCard } from './MonteCarloCard';
import { defaultFilters, modelVisible } from '@/lib/research/research-filters';
import './market-portfolio.css';

/**
 * Industry / Portfolio research surfaces — split by `section` tab.
 * Industry: sector heatmap. Portfolio: stress-test and optimization models.
 * `filters` is the research page's filter state: it orders and narrows the
 * sector list, and chooses which portfolio models are on the page.
 */
const NO_FILTERS = defaultFilters();

export function MarketPortfolioView({ section = 'industry', filters = NO_FILTERS }) {
  const { direction, sort } = filters.industry;
  const { models } = filters.portfolio;
  return (
    <div className="mpv-root mpv-ledger">
      {section === 'industry' && (
        <>
          <ObsidianPanel />
          <Suspense
            fallback={<div className="shm-skeleton-tile" style={{ height: 200 }} aria-hidden />}
          >
            <SectorHeatmap direction={direction} sort={sort} />
          </Suspense>
        </>
      )}
      {section === 'portfolio' && (
        <div className="mpv-grid">
          {modelVisible(models, 'stress') && <StressTestCard />}
          {modelVisible(models, 'mpt') && <MPTCard />}
          {modelVisible(models, 'black_litterman') && <BlackLittermanCard />}
          {modelVisible(models, 'monte_carlo') && <MonteCarloCard />}
        </div>
      )}
    </div>
  );
}

export default MarketPortfolioView;
