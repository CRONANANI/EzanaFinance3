'use client';

import { useEffect, useRef, useState, useCallback, useMemo, Suspense } from 'react';
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
import { MOCK_WATCHLISTS } from '@/lib/mockWatchlists';
import { getTickerMeta } from '@/lib/tickerSearchData';

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
  const [livePrice, setLivePrice] = useState(null);
  const [viewMode, setViewMode] = useState('heatmap');
  const [activeModel, setActiveModel] = useState(null);
  const [wlModalOpen, setWlModalOpen] = useState(false);
  const [wlAddedMap, setWlAddedMap] = useState({});
  const [userWatchlists, setUserWatchlists] = useState(() => MOCK_WATCHLISTS);
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
    setLivePrice(null);

    fetch(`/api/fmp/stock-stats?symbol=${encodeURIComponent(selectedStock)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          setStats({ mcap: '--', pe: '--', divYield: '--', eps: '--', capType: '--' });
          setLivePrice(null);
          return;
        }
        if (data.error) {
          setStats({ mcap: '--', pe: '--', divYield: '--', eps: '--', capType: '--' });
          setLivePrice(null);
          return;
        }
        setStats({
          mcap:    data.mcap    || '--',
          pe:      data.pe      || '--',
          divYield: data.divYield || '--',
          eps:     data.eps     || '--',
          capType: data.capType || '--',
        });
        if (data.price != null) setLivePrice(data.price);
      })
      .catch(() => {
        setStats({ mcap: '--', pe: '--', divYield: '--', eps: '--', capType: '--' });
        setLivePrice(null);
      });
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

  const resetStats = () => {
    setStats({ mcap: '--', pe: '--', divYield: '--', eps: '--', capType: '--' });
    setLivePrice(null);
  };

  const scrollModelsCarousel = useCallback((dir) => {
    modelsCarouselScrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  }, []);

  const handleAddToWatchlist = useCallback(
    (watchlistId) => {
      if (!selectedStock) return;
      setUserWatchlists((prev) =>
        prev.map((wl) => {
          if (wl.id !== watchlistId) return wl;
          if (wl.stocks.some((s) => s.ticker === selectedStock)) return wl;
          const meta = getTickerMeta(selectedStock);
          return {
            ...wl,
            stocks: [
              ...wl.stocks,
              {
                ticker: selectedStock,
                name: meta?.name || selectedStock,
                price: 0,
                change: 0,
                changePct: 0,
                marketCap: stats?.mcap || '—',
                volume: '—',
                sector: meta?.sector || '—',
              },
            ],
          };
        }),
      );
      setWlAddedMap((prev) => ({ ...prev, [watchlistId]: true }));
    },
    [selectedStock, stats?.mcap],
  );

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

      {/* Valuation / AI model shortcuts — only when a stock is selected (above chart, not below courses) */}
      {selectedStock && viewMode === 'stock' && (
        <section
          className="models-carousel-section compact cr-models-above-chart"
          aria-label="Stock analysis models"
        >
          <button
            className="carousel-nav prev"
            type="button"
            onClick={() => scrollModelsCarousel(-1)}
            aria-label="Previous models"
          >
            <i className="bi bi-chevron-left" />
          </button>
          <div className="models-carousel-container" ref={modelsCarouselScrollRef}>
            <div className="models-carousel-track" id="modelsCarouselTrackStock">
              {renderModelCards('st')}
            </div>
          </div>
          <button
            className="carousel-nav next"
            type="button"
            onClick={() => scrollModelsCarousel(1)}
            aria-label="Next models"
          >
            <i className="bi bi-chevron-right" />
          </button>
        </section>
      )}

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
                    <button
                      type="button"
                      onClick={() => {
                        setWlAddedMap({});
                        setWlModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        background: 'rgba(16, 185, 129, 0.08)',
                        color: '#10b981',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontFamily: 'var(--font-sans)',
                        flexShrink: 0,
                      }}
                    >
                      <i className="bi bi-plus-lg" style={{ fontSize: '0.875rem' }} />
                      Add to Watchlist
                    </button>
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
                  <StockPriceChart symbol={selectedStock} livePrice={livePrice} stats={stats} />
                </div>
              </div>
            </PinnableCard>
          )}

          {selectedStock && activeModel && (
            <section className="model-detail-section cr-model-detail-below-chart" id="modelDetailSection">
              <AIAnalysisPanel
                modelId={activeModel}
                symbol={selectedStock}
                onClose={handleCloseAnalysis}
              />
            </section>
          )}
        </div>
      </section>

      {/* Heatmap: user opened a model before selecting a ticker */}
      {activeModel && !selectedStock && (
        <section className="model-detail-section cr-model-detail-no-ticker" id="modelDetailSectionHeatmap">
          <div className="component-card model-detail-card">
            <div className="card-header">
              <h3>{CAROUSEL_MODELS.find((m) => m.id === activeModel)?.name || 'Analysis'}</h3>
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
        </section>
      )}

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

      <CoursePreviewSection
        title="Fundamental Analysis Mastery"
        subtitle="Deep dive into financial statement analysis and valuation"
        courses={researchCourses}
        viewAllHref="/learning-center?track=stocks"
      />

      {wlModalOpen && selectedStock && (
        <>
          <div
            onClick={() => setWlModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              zIndex: 1000,
              backdropFilter: 'blur(2px)',
            }}
          />

          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1001,
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '16px',
              padding: '1.5rem',
              width: 'min(420px, 92vw)',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--home-heading, #111827)' }}>
                  Add to Watchlist
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--home-muted, #6b7280)' }}>
                  Adding <strong style={{ color: '#10b981' }}>{selectedStock}</strong> — select a watchlist
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWlModalOpen(false)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '1px solid rgba(0,0,0,0.1)',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--home-muted, #6b7280)',
                  fontSize: '0.875rem',
                  flexShrink: 0,
                }}
                aria-label="Close"
              >
                <i className="bi bi-x" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {userWatchlists.map((wl) => {
                const alreadyIn = wl.stocks.some((s) => s.ticker === selectedStock);
                const justAdded = wlAddedMap[wl.id];
                const done = alreadyIn || justAdded;
                return (
                  <button
                    key={wl.id}
                    type="button"
                    onClick={() => !done && handleAddToWatchlist(wl.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: done
                        ? '1px solid rgba(16, 185, 129, 0.35)'
                        : '1px solid rgba(0, 0, 0, 0.08)',
                      background: done
                        ? 'rgba(16, 185, 129, 0.06)'
                        : 'rgba(0, 0, 0, 0.02)',
                      cursor: done ? 'default' : 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-sans)',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--home-heading, #111827)' }}>
                        {wl.label}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--home-muted, #6b7280)' }}>
                        {wl.stocks.length} stocks
                      </p>
                    </div>

                    {done ? (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#10b981',
                        }}
                      >
                        <i className="bi bi-check-circle-fill" /> Added
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          fontSize: '1rem',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        +
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p
              style={{
                margin: '1rem 0 0',
                fontSize: '0.6875rem',
                color: 'var(--home-muted, #9ca3af)',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              Your watchlists are saved locally. Visit the Watchlist page to manage them.
            </p>
          </div>
        </>
      )}
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
