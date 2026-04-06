'use client';

import { useEffect, useRef, useState, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { StockHeatmap } from '@/components/company-research/StockHeatmap';
import { AnimatedGlowingSearchBar } from '@/components/ui/animated-glowing-search-bar';
import {
  KeyMetrics,
  AnalystRecommendations,
  CompanyNews,
  EarningsCard,
  CompetitorsCard,
} from '@/components/research';
import { AIAnalysisPanel } from '@/components/research/AIAnalysisPanel';
import { PinnableCard } from '@/components/ui/PinnableCard';
import { useCompanySearchFinnhub, useCompanyProfile, useStockMetric } from '@/hooks/useFinnhub';
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

function fmtPriceShort(v) {
  if (v == null || v === '') return '--';
  const n = Number(v);
  if (Number.isNaN(n)) return '--';
  return n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`;
}

function CompanyResearchPageInner() {
  const searchParams = useSearchParams();
  const { completeTask } = useChecklist();
  const scriptLoadedRef = useRef(false);
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
  const { data: profile } = useCompanyProfile(selectedStock);
  const { data: metricData } = useStockMetric(selectedStock);
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
    if (!profile && !metricData) return;
    const mc = profile?.marketCapitalization ?? metricData?.metric?.marketCapitalization;
    const mcNum = mc != null ? Number(mc) : null;
    const pe = metricData?.metric?.peBasicExclExtraTTM ?? metricData?.metric?.peTTM;
    const divYield = metricData?.metric?.dividendYieldIndicatedAnnual ?? metricData?.metric?.dividendYield;
    const eps = metricData?.metric?.epsBasicExclExtraTTM ?? metricData?.metric?.epsTTM;

    setStats({
      mcap: mcNum != null
        ? (mcNum >= 1e12 ? `$${(mcNum / 1e12).toFixed(2)}T` : mcNum >= 1e9 ? `$${(mcNum / 1e9).toFixed(2)}B` : `$${(mcNum / 1e6).toFixed(0)}M`)
        : '--',
      pe: pe != null ? Number(pe).toFixed(2) : '--',
      divYield: divYield != null ? (Number(divYield) * 100).toFixed(2) + '%' : '--',
      eps: eps != null ? Number(eps).toFixed(2) : '--',
      capType: mcNum != null
        ? (mcNum >= 200e9 ? 'Mega Cap' : mcNum >= 10e9 ? 'Large Cap' : mcNum >= 2e9 ? 'Mid Cap' : 'Small Cap')
        : '--',
    });
  }, [profile, metricData]);

  const w52Range = useMemo(() => {
    const m = metricData?.metric;
    if (!m) return '--';
    const lo = m['52WeekLow'];
    const hi = m['52WeekHigh'];
    if (lo == null && hi == null) return '--';
    return `${fmtPriceShort(lo)} – ${fmtPriceShort(hi)}`;
  }, [metricData]);

  const companyMetaLine = useMemo(() => {
    const parts = [];
    if (profile?.finnhubIndustry) parts.push(profile.finnhubIndustry);
    if (profile?.exchange) parts.push(profile.exchange);
    if (stats.mcap && stats.mcap !== '--') parts.push(`Market Cap: ${stats.mcap}`);
    return parts.join(' · ') || '—';
  }, [profile, stats.mcap]);

  useEffect(() => {
    if (viewMode !== 'stock' || !selectedStock) return;
    const id = requestAnimationFrame(() => {
      try {
        window.marketChartWidget?.showStockChart?.(selectedStock);
      } catch (_) {}
    });
    return () => cancelAnimationFrame(id);
  }, [viewMode, selectedStock]);

  useEffect(() => {
    if (selectedStock && (profile || metricData)) {
      completeTask('research_2');
    }
  }, [selectedStock, profile, metricData, completeTask]);

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

  useEffect(() => {
    if (scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;
    const loadScript = (src) => new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(s);
    });
    loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js').catch(() => {});
    loadScript('/app-legacy/pages/company-research.js').catch(() => {});
  }, []);

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
                      {profile?.name ? <span className="cr-merged-long-name"> — {profile.name}</span> : null}
                      <span id="stockChartTitle" className="sr-only">{selectedStock}</span>
                    </div>
                    <div className="market-chart-meta cr-merged-quote" id="stockChartMeta">
                      <span className="market-price" id="stockPrice">--</span>
                      <span className="market-change" id="stockChange">--</span>
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
                    <div className="time-range-selector compact" id="stockTimeRange">
                      <button className="time-btn" type="button" data-range="1D">1D</button>
                      <button className="time-btn" type="button" data-range="1W">1W</button>
                      <button className="time-btn active" type="button" data-range="1M">1M</button>
                      <button className="time-btn" type="button" data-range="3M">3M</button>
                      <button className="time-btn" type="button" data-range="6M">6M</button>
                      <button className="time-btn" type="button" data-range="1Y">1Y</button>
                    </div>
                  </div>
                </div>
                <div className="chart-container compact cr-chart-shorter" id="stockChartContainer">
                  <div className="chart-loading" id="stockChartLoading">
                    <i className="bi bi-arrow-repeat spin" />
                    <span>Loading stock data...</span>
                  </div>
                  <canvas id="stockChart" />
                </div>
                <div className="cr-merged-stats market-chart-footer" id="stockChartFooter">
                  <div className="cr-merged-stats-row">
                    <div className="market-stat"><span className="market-stat-label">Open</span><span className="market-stat-value" id="mstatOpen">--</span></div>
                    <div className="market-stat"><span className="market-stat-label">High</span><span className="market-stat-value" id="mstatHigh">--</span></div>
                    <div className="market-stat"><span className="market-stat-label">Low</span><span className="market-stat-value" id="mstatLow">--</span></div>
                    <div className="market-stat"><span className="market-stat-label">Volume</span><span className="market-stat-value" id="mstatVolume">--</span></div>
                  </div>
                  <div className="cr-merged-stats-row cr-merged-stats-row--secondary">
                    <div className="market-stat"><span className="market-stat-label">P/E</span><span className="market-stat-value">{stats.pe}</span></div>
                    <div className="market-stat"><span className="market-stat-label">EPS</span><span className="market-stat-value">{stats.eps}</span></div>
                    <div className="market-stat"><span className="market-stat-label">Div Yield</span><span className="market-stat-value">{stats.divYield}</span></div>
                    <div className="market-stat"><span className="market-stat-label">52W range</span><span className="market-stat-value">{w52Range}</span></div>
                  </div>
                  <span id="mstatPrevClose" className="sr-only" aria-hidden>--</span>
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
