'use client';

import { SectorHeatmap } from './SectorHeatmap';
import { StressTestCard } from './StressTestCard';
import { MPTCard } from './MPTCard';
import { BlackLittermanCard } from './BlackLittermanCard';
import { MonteCarloCard } from './MonteCarloCard';
import './market-portfolio.css';

/**
 * Market / Portfolio view — mirrors the Company view's outer layout:
 * a full-width top card (sector heatmap instead of a single-stock chart)
 * above a responsive 2-column grid of model cards.
 */
export function MarketPortfolioView() {
  return (
    <div className="mpv-root">
      <SectorHeatmap />
      <div className="mpv-grid">
        <StressTestCard />
        <MPTCard />
        <BlackLittermanCard />
        <MonteCarloCard />
      </div>
    </div>
  );
}

export default MarketPortfolioView;
