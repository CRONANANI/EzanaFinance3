'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { usePin } from '@/contexts/PinContext';
import { PinnedCardContent } from '@/components/home-hub/PinnedCardContent';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import '../../../../app-legacy/pages/watchlist.css';
import '../../../../app-legacy/pages/for-the-quants.css';
import '../../../../app-legacy/pages/learning-center.css';
import '../../../../app-legacy/pages/community.css';
import '../../../../app-legacy/pages/company-research.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/congressional-trading-card/congressional-trading-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/government-contracts-card/government-contracts-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/house-trading-card/house-trading-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/senator-trading-card/senator-trading-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/lobbying-activity-card/lobbying-activity-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/patent-momentum-card/patent-momentum-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/market-sentiment-card/market-sentiment-card.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import '../market-analysis/market-analysis-world-monitor.css';

export default function HomeHubPage() {
  const { pinned, updateLayout } = usePin();
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    const updateWidth = () => setWidth(typeof window !== 'undefined' ? window.innerWidth - 80 : 1200);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const layoutFromPinned = useCallback(() => {
    return pinned.map((p) => ({
      i: p.id,
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
    }));
  }, [pinned]);

  const onLayoutChange = (newLayout) => {
    updateLayout(newLayout);
  };

  if (pinned.length === 0) {
    return (
      <div className="page-content">
        <div className="home-hub-empty">
          <h1 className="text-2xl font-bold text-white mb-2">Your Home Hub</h1>
          <p className="text-muted-foreground mb-6">
            Pin component cards from any page to build your custom dashboard. Click the pin icon on any card to add it here.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/home-dashboard" className="btn-primary">
              <i className="bi bi-speedometer2" /> Go to Dashboard
            </Link>
            <Link href="/inside-the-capitol" className="btn-secondary">
              <i className="bi bi-building" /> Inside The Capitol
            </Link>
            <Link href="/company-research" className="btn-secondary">
              <i className="bi bi-bar-chart-line" /> Company Research
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="home-hub-header mb-6">
        <h1 className="text-2xl font-bold text-white">Your Home Hub</h1>
        <p className="text-muted-foreground mb-0">
          Drag cards to rearrange. Pin more cards from any page.
        </p>
      </div>
      <GridLayout
        className="layout"
        layout={layoutFromPinned()}
        onLayoutChange={onLayoutChange}
        cols={12}
        rowHeight={160}
        width={width}
        draggableHandle=".home-hub-card-header"
        isDraggable
        isResizable
      >
        {pinned.map((card) => (
          <div key={card.id} className="home-hub-card component-card">
            <div className="home-hub-card-header card-header flex justify-between items-center cursor-move">
              <span className="font-semibold">{card.title}</span>
              <Link
                href={card.sourcePage}
                className="text-sm text-emerald-500 hover:text-emerald-400"
                onClick={(e) => e.stopPropagation()}
              >
                View full <i className="bi bi-arrow-right" />
              </Link>
            </div>
            <div className="card-body overflow-auto">
              <PinnedCardContent cardId={card.id} />
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
