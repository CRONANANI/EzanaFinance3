'use client';

import { useEffect, useRef, useState, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { StockHeatmap } from '@/components/company-research/StockHeatmap';
import { AnimatedGlowingSearchBar } from '@/components/ui/animated-glowing-search-bar';
import StockPriceChart from '@/components/research/StockPriceChart';
import {
  KeyMetrics,
  AnalystRecommendations,
  CompanyNews,
  EarningsCard,
  CompetitorsCard,
} from '@/components/research';
import { AIAnalysisPanel } from '@/components/research/AIAnalysisPanel';
import { PinnableCard } from '@/components/ui/PinnableCard';
import { useCompanySearchFinnhub } from '@/hooks/useFinnhub';
import { getCarouselModels } from '@/lib/ai/analysis-prompts';
import { useChecklist } from '@/hooks/useChecklist';
import { CoursePreviewSection } from '@/components/learning/CoursePreviewSection';
import { getCoursesByTrack } from '@/lib/learning-curriculum';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import '../../../../app-legacy/pages/company-research.css';
import '../../../../app-legacy/components/grpv/snappy-slider.css';
import '@/components/research/ai-analysis-panel.css';

/* ── Carousel model configs from the prompts library ── */
const CAROUSEL_MODELS = getCarouselModels();

function CompanyResearchPageInner() {
  const searchParams = useSearchParams();
  const { completeTask } = useChecklist();
  const [selectedStock, setSelectedStock] = useState(null);
  const [stats, setStats] = useState({ mcap: '--', pe: '--', divYield: '--', eps: '--', capType: '--' });
  const [viewMode, setViewMode] = useState('heatmap');
  const [activeModel, setActiveModel] = useState(null);
  const searchRef = useRef(null);
  const modelsCarouselScrollRef = useRef(null);

  const researchCourses = useMemo(() => {
    const stocks = getCoursesByTrack('stocks');
    const relevant = stocks.filter(c =>
      c.title.includes('Fundamental Analysis') ||
      c.title.includes('Financial Statements') ||
      c.title.includes('Sector Analysis') ||
      c.title.includes('Earnings Season')
    );
    if (relevant.length < 4) {
      const fill = stocks.filter(c => c.level === 'basic' && !relevant.find(r => r.id === c.id));
      return [...relevant, ...fill].slice(0, 4);
    }
    return relevant.slice(0, 4);
  }, []);

  const {
    query,
    setQuery,
    suggestions,
    loading: searchLoading,
    clearSuggestions,
  } = useCompanySearchFinnhub();
  const showSuggestions = suggestions.length > 0;

  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('ticker');
    if (q && q.trim()) {
      const sym = q.trim().toUpperCase();
      setSelectedStock(sym);
      setQuery(sym);
      setViewMode('stock');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedStock) return;
    setStats({ mcap: '…', pe: '…', divYield: '…', eps: '…', capType: '…' });

    fetch(`/api/fmp/stock-stats?symbol=${encodeURIComponent(selectedStock)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || data.error) return;
        setStats({
          mcap:    data.mcap    || '--',
          pe:      data.pe      || '--',
          divYield: data.divYield || '--',
          eps:     data.eps     || '--',
          capType: data.capType || '--',
        });
      })
      .catch(() => {});
  }, [selectedStock]);

  const companyMetaLine = useMemo(() => {
    const parts = [];
    if (stats.capType && stats.capType !== '--') parts.push(stats.capType);
    if (stats.mcap && stats.mcap !== '--' && stats.mcap !== '…') parts.push(`Market Cap: ${stats.mcap}`);
    return parts.join(' · ') || selectedStock || '—';
  }, [stats.mcap, stats.capType, selectedStock]);

  useEffect(() => {
    if (selectedStock && stats.mcap !== '--' && stats.mcap !== '…') {
      completeTask('research_2');
    }
  }, [selectedStock, stats.mcap, completeTask]);

  const handleSelectStock = useCallback((item, opts) => {
    const sym = (typeof item === 'string' ? item : item?.symbol)?.toUpperCase?.() ?? item?.symbol;
    setSelectedStock(sym);
    setViewMode('stock');
    setQuery('');
    clearSuggestions();
    completeTask('research_1');
    if (opts?.fromPeer) completeTask('research_3');
  }, [setQuery, clearSuggestions, completeTask]);

  const handleSearchInput = useCallback((eOrValue) => {
    const q = typeof eOrValue === 'string' ? eOrValue : eOrValue?.target?.value ?? '';
    setQuery(q);
  }, [setQuery]);

  const handleSelectSuggestion = useCallback((item) => {
    clearSuggestions();
    setQuery('');
    handleSelectStock(item.symbol);
  }, [handleSelectStock, setQuery, clearSuggestions]);

  const handleModelClick = useCallback((modelId) => {
    if (activeModel === modelId) {
      setActiveModel(null);
    } else {
      setActiveModel(modelId);
    }
  }, [activeModel]);

  const handleCloseAnalysis = useCallback(() => {
    setActiveModel(null);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) clearSuggestions();
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [clearSuggestions]);

  const resetStats = () => setStats({ mcap: '--', pe: '--', divYield: '--', eps: '--', capType: '--' });

  const scrollModelsCarousel = useCallback((dir) => {
    modelsCarouselScrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  }, []);

  const renderModelCards = (keyPrefix) =>
    CAROUSEL_MODELS.map((model) => (
      <div
        key={`${keyPrefix}-${model.id}`}
        className={`model-metric-card model-card ai-model-card ${model.flagship ? 'grpv-flagship' : ''} ${activeModel === model.id ? 'active' : ''}`}
        data-model={model.id}
        onClick={() => handleModelClick(model.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleModelClick(model.id)}
        style={!model.flagship ? {
          background: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '8px',
          transition: 'all 0.15s ease',
          cursor: 'pointer',
        } : {}}
        onMouseEnter={(e) => {
          if (!model.flagship) {
            e.currentTarget.style.background = 'rgba(212, 175, 55, 0.18)';
            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.7)';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(212, 175, 55, 0.15)';
          }
        }}
        onMouseLeave={(e) => {
          if (!model.flagship) {
            e.currentTarget.style.background = 'rgba(212, 175, 55, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        {model.flagship ? (
          <div className="grpv-brand-logo">
            <img src="/ezana-logo.svg" alt="Ezana Finance" className="grpv-logo-img" />
          </div>
        ) : (
          <div className={`model-metric-icon ${model.id}`} style={{ 
            background: 'rgba(212, 175, 55, 0.15)',
            color: '#D4AF37',
            borderRadius: '8px',
            padding: '8px',
          }}>
            <i className={`bi ${model.icon}`} />
          </div>
        )}
        <div className="model-metric-content">
          <span className="model-metric-label" style={!model.flagship ? { color: '#D4AF37' } : {}}>{model.name}</span>
          <span className="model-metric-value">{model.description}</span>
          <span className="model-metric-change">
            {model.flagship ? 'Flagship' : model.subtitle} · {selectedStock ? 'Click to analyze' : 'Select a stock'}
          </span>
        </div>
      </div>
    ));

  return (
    <div className="dashboard-page-inset cr-page">
      <div className="company-search-wrapper relative" ref={searchRef} data-task-target="research-search-bar">
        <AnimatedGlowingSearchBar
          value={query}
          onChange={handleSearchInput}
          onSearch={(q) => q && handleSelectStock(q.toUpperCase())}
          placeholder="Search company or ticker (e.g., NVDA, Apple Inc.)"
          suggestions={suggestions}
          onSelectSuggestion={handleSelectSuggestion}
          showSuggestions={showSuggestions}
          onFocus={() => {}}
          loading={searchLoading}
        />
      </div>

      <div className="stats-grid" id="companyStatsGrid">
        <div className="stat-card" id="stat-mcap">
          <div className="stat-icon market"><i className="bi bi-building" /></div>
          <div className="stat-content">
            <div className="stat-value" id="statMarketCap">{stats.mcap}</div>
            <div className="stat-label">Market Cap</div>
            <div className="stat-change" id="statCapType">{stats.capType}</div>
          </div>
        </div>
        <div className="stat-card" id="stat-pe">
          <div className="stat-icon performance"><i className="bi bi-trophy" /></div>
          <div className="stat-content">
            <div className="stat-value" id="statPE">{stats.pe}</div>
            <div className="stat-label">P/E Ratio</div>
            <div className="stat-change" id="statPELabel">--</div>
          </div>
        </div>
        <div className="stat-card" id="stat-divyield">
          <div className="stat-icon stocks"><i className="bi bi-cash-coin" /></div>
          <div className="stat-content">
            <div className="stat-value" id="statDivYield">{stats.divYield}</div>
            <div className="stat-label">Dividend Yield</div>
            <div className="stat-change" id="statDivYieldLabel">--</div>
          </div>
        </div>
        <div className="stat-card" id="stat-eps">
          <div className="stat-icon volume"><i className="bi bi-graph-up-arrow" /></div>
          <div className="stat-content">
            <div className="stat-value" id="statEPS">{stats.eps}</div>
            <div className="stat-label">EPS</div>
            <div className="stat-change" id="statEPSLabel">--</div>
          </div>
        </div>
      </div>

      <section className="cr-market-chart-root" id="marketChartSection">
        <div
          id="heatmapView"
          className="cr-heatmap-layout"
          style={{ display: viewMode === 'heatmap' ? undefined : 'none' }}
        >
          <div className="cr-heatmap-main">
            <PinnableCard cardId="stock-heatmap" section="research">
              <div className="cr-db-card cr-pinnable-inner">
                <div className="chart-header compact">
                  <div className="chart-title-area">
                    <h2 className="chart-title">Stock Market Heatmap</h2>
                    <span className="heatmap-subtitle">S&amp;P 500 · Performance YTD % · Market Cap</span>
                  </div>
                </div>
                <div className="heatmap-container" id="heatmapContainer" data-task-target="research-company-card">
                  <StockHeatmap onSelectStock={handleSelectStock} />
                </div>
              </div>
            </PinnableCard>
          </div>
          <aside className="cr-heatmap-sidebar cr-scrollbar" aria-label="Financial model shortcuts">
            <p className="cr-sidebar-heading">Stock analysis models</p>
            <div className="models-carousel-section compact cr-models-vertical">
              <div className="models-carousel-container cr-models-vertical-inner">
                <div className="models-carousel-track" id="modelsCarouselTrack">
                  {renderModelCards('hm')}
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div id="stockChartView" style={{ display: viewMode === 'stock' ? '' : 'none' }}>
          {selectedStock && (
            <PinnableCard cardId="stock-chart-merged" section="research">
              <div className="market-chart-section cr-db-card cr-stock-merged-card">
                <div className="cr-merged-stock-head">
                  <div className="cr-merged-title-row">
                    <div className="cr-merged-names">
                      <span className="cr-merged-ticker">{selectedStock}</span>
                      <span id="stockChartTitle" className="sr-only">
                        {selectedStock}
                      </span>
                    </div>
                  </div>
                  <p className="cr-merged-meta-line">{companyMetaLine}</p>
                </div>
                <div className="chart-header compact cr-chart-toolbar">
                  <div className="chart-controls">
                    <button
                      className="back-to-heatmap-btn"
                      id="backToHeatmap"
                      type="button"
                      onClick={() => {
                        setViewMode('heatmap');
                        setSelectedStock(null);
                        resetStats();
                        setActiveModel(null);
                        try {
                          window.marketChartWidget?.showHeatmap?.();
                        } catch (_) {}
                      }}
                    >
                      <i className="bi bi-grid-3x3-gap" /> Heatmap
                    </button>
                  </div>
                </div>

                {/* New React-based chart component */}
                <div style={{ padding: '1rem 0' }}>
                  <StockPriceChart symbol={selectedStock} />
                </div>

                <div
                  className="cr-merged-stats market-chart-footer"
                  id="stockChartFooter"
                >
                  <div className="cr-merged-stats-row cr-merged-stats-row--secondary">
                    <div className="market-stat">
                      <span className="market-stat-label">P/E</span>
                      <span className="market-stat-value">{stats.pe}</span>
                    </div>
                    <div className="market-stat">
                      <span className="market-stat-label">EPS</span>
                      <span className="market-stat-value">{stats.eps}</span>
                    </div>
                    <div className="market-stat">
                      <span className="market-stat-label">Div Yield</span>
                      <span className="market-stat-value">{stats.divYield}</span>
                    </div>
                    <div className="market-stat">
                      <span className="market-stat-label">Market Cap</span>
                      <span className="market-stat-value">{stats.mcap}</span>
                    </div>
                  </div>
                </div>
              </div>
            </PinnableCard>
          )}
        </div>
      </section>

      {selectedStock && (
        <section className="research-cards-section cr-research-cards mt-8">
          <h2 className="cr-section-heading">Research · {selectedStock}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PinnableCard cardId="key-metrics" section="research">
              <KeyMetrics symbol={selectedStock} />
            </PinnableCard>
            <PinnableCard cardId="analyst-recommendations" section="research">
              <AnalystRecommendations symbol={selectedStock} />
            </PinnableCard>
            <PinnableCard cardId="company-news" section="research" className="lg:col-span-2">
              <CompanyNews symbol={selectedStock} className="lg:col-span-2" />
            </PinnableCard>
            <PinnableCard cardId="earnings-card" section="research">
              <EarningsCard symbol={selectedStock} />
            </PinnableCard>
            <PinnableCard cardId="competitors-card" section="research">
              <CompetitorsCard symbol={selectedStock} onSelectPeer={(peer) => handleSelectStock(peer, { fromPeer: true })} />
            </PinnableCard>
          </div>
        </section>
      )}

      {viewMode === 'stock' && (
        <section className="models-carousel-section compact cr-models-below-stock">
          <button className="carousel-nav prev" id="modelsCarouselPrev" type="button" onClick={() => scrollModelsCarousel(-1)} aria-label="Previous models">
            <i className="bi bi-chevron-left" />
          </button>
          <div className="models-carousel-container" ref={modelsCarouselScrollRef}>
            <div className="models-carousel-track" id="modelsCarouselTrackStock">
              {renderModelCards('st')}
            </div>
          </div>
          <button className="carousel-nav next" id="modelsCarouselNext" type="button" onClick={() => scrollModelsCarousel(1)} aria-label="Next models">
            <i className="bi bi-chevron-right" />
          </button>
        </section>
      )}

      {/* ═══ AI Analysis Detail Panel ═══ */}
      {activeModel && (
        <section className="model-detail-section" id="modelDetailSection">
          {selectedStock ? (
            <AIAnalysisPanel
              modelId={activeModel}
              symbol={selectedStock}
              onClose={handleCloseAnalysis}
            />
          ) : (
            <div className="component-card model-detail-card">
              <div className="card-header">
                <h3>{CAROUSEL_MODELS.find(m => m.id === activeModel)?.name || 'Analysis'}</h3>
                <button className="card-action-btn" type="button" onClick={handleCloseAnalysis}>
                  <i className="bi bi-x-lg" /> Close
                </button>
              </div>
              <div className="card-body" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                <i className="bi bi-search" style={{ fontSize: '2rem', color: '#6b7280', display: 'block', marginBottom: '1rem' }} />
                <p style={{ color: '#8b949e', fontSize: '0.9375rem' }}>
                  Search for a company or select a stock from the heatmap above to run this analysis.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      <CoursePreviewSection
        title="Fundamental Analysis Mastery"
        subtitle="Deep dive into financial statement analysis and valuation"
        courses={researchCourses}
        viewAllHref="/learning-center?track=stocks"
      />
    </div>
  );
}

export default function CompanyResearchPage() {
  return (
    <Suspense fallback={<div className="dashboard-page-inset" style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>Loading…</div>}>
      <CompanyResearchPageInner />
    </Suspense>
  );
}
