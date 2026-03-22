'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { StockHeatmap } from '@/components/company-research/StockHeatmap';
import { AnimatedGlowingSearchBar } from '@/components/ui/animated-glowing-search-bar';
import {
  CompanyOverview,
  StockQuote,
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

export default function CompanyResearchPage() {
  const scriptLoadedRef = useRef(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [stats, setStats] = useState({ mcap: '--', pe: '--', divYield: '--', eps: '--', capType: '--' });
  const [viewMode, setViewMode] = useState('heatmap');
  const [activeModel, setActiveModel] = useState(null);
  const searchRef = useRef(null);

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

  const handleSelectStock = useCallback((item) => {
    const sym = (typeof item === 'string' ? item : item?.symbol)?.toUpperCase?.() ?? item?.symbol;
    setSelectedStock(sym);
    setViewMode('stock');
    setQuery(sym);
    clearSuggestions();
  }, [setQuery, clearSuggestions]);

  const handleSearchInput = useCallback((eOrValue) => {
    const q = typeof eOrValue === 'string' ? eOrValue : eOrValue?.target?.value ?? '';
    setQuery(q);
  }, [setQuery]);

  const handleSelectSuggestion = useCallback((item) => {
    setQuery(item.symbol);
    clearSuggestions();
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

  return (
    <>
      <div className="company-search-wrapper relative" ref={searchRef}>
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

      <section className="market-chart-section" id="marketChartSection">
        <div id="heatmapView" style={{ display: viewMode === 'heatmap' ? '' : 'none' }}>
          <PinnableCard cardId="stock-heatmap" title="Stock Market Heatmap" sourcePage="/company-research" sourceLabel="Company Research" defaultW={4} defaultH={3}>
            <div className="chart-header compact">
              <div className="chart-title-area">
                <h2 className="chart-title">Stock Market Heatmap</h2>
                <span className="heatmap-subtitle">S&amp;P 500 · Performance YTD % · Market Cap</span>
              </div>
            </div>
            <div className="heatmap-container" id="heatmapContainer">
              <StockHeatmap onSelectStock={handleSelectStock} />
            </div>
          </PinnableCard>
        </div>

        <div id="stockChartView" style={{ display: viewMode === 'stock' ? '' : 'none' }}>
          <div className="chart-header compact">
            <div className="chart-title-area">
              <h2 className="chart-title" id="stockChartTitle">{selectedStock || '--'}</h2>
              <div className="market-chart-meta" id="stockChartMeta">
                <span className="market-price" id="stockPrice">--</span>
                <span className="market-change" id="stockChange">--</span>
              </div>
            </div>
            <div className="chart-controls">
              <button className="back-to-heatmap-btn" id="backToHeatmap" type="button" onClick={() => { setViewMode('heatmap'); setSelectedStock(null); resetStats(); setActiveModel(null); }}>
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
          <div className="chart-container compact" id="stockChartContainer">
            <div className="chart-loading" id="stockChartLoading">
              <i className="bi bi-arrow-repeat spin" />
              <span>Loading stock data...</span>
            </div>
            <canvas id="stockChart" />
          </div>
          <div className="market-chart-footer" id="stockChartFooter">
            <div className="market-stat"><span className="market-stat-label">Open</span><span className="market-stat-value" id="mstatOpen">--</span></div>
            <div className="market-stat"><span className="market-stat-label">High</span><span className="market-stat-value" id="mstatHigh">--</span></div>
            <div className="market-stat"><span className="market-stat-label">Low</span><span className="market-stat-value" id="mstatLow">--</span></div>
            <div className="market-stat"><span className="market-stat-label">Volume</span><span className="market-stat-value" id="mstatVolume">--</span></div>
            <div className="market-stat"><span className="market-stat-label">Prev Close</span><span className="market-stat-value" id="mstatPrevClose">--</span></div>
          </div>
        </div>
      </section>

      {selectedStock && (
        <section className="research-cards-section mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Company Research · {selectedStock}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PinnableCard cardId="company-overview" title="Company Overview" sourcePage="/company-research" sourceLabel="Company Research" defaultW={2} defaultH={2}>
              <CompanyOverview symbol={selectedStock} />
            </PinnableCard>
            <PinnableCard cardId="stock-quote" title="Stock Quote" sourcePage="/company-research" sourceLabel="Company Research" defaultW={2} defaultH={1}>
              <StockQuote symbol={selectedStock} />
            </PinnableCard>
            <PinnableCard cardId="key-metrics" title="Key Metrics" sourcePage="/company-research" sourceLabel="Company Research" defaultW={2} defaultH={2}>
              <KeyMetrics symbol={selectedStock} />
            </PinnableCard>
            <PinnableCard cardId="analyst-recommendations" title="Analyst Recommendations" sourcePage="/company-research" sourceLabel="Company Research" defaultW={2} defaultH={1}>
              <AnalystRecommendations symbol={selectedStock} />
            </PinnableCard>
            <PinnableCard cardId="company-news" title="Company News" sourcePage="/company-research" sourceLabel="Company Research" defaultW={4} defaultH={2}>
              <CompanyNews symbol={selectedStock} className="lg:col-span-2" />
            </PinnableCard>
            <PinnableCard cardId="earnings-card" title="Earnings" sourcePage="/company-research" sourceLabel="Company Research" defaultW={2} defaultH={2}>
              <EarningsCard symbol={selectedStock} />
            </PinnableCard>
            <PinnableCard cardId="competitors-card" title="Competitors" sourcePage="/company-research" sourceLabel="Company Research" defaultW={2} defaultH={2}>
              <CompetitorsCard symbol={selectedStock} onSelectPeer={handleSelectStock} />
            </PinnableCard>
          </div>
        </section>
      )}

      {/* ═══ AI Analysis Models Carousel ═══ */}
      <section className="models-carousel-section compact">
        <button className="carousel-nav prev" id="modelsCarouselPrev" type="button"><i className="bi bi-chevron-left" /></button>
        <div className="models-carousel-container">
          <div className="models-carousel-track" id="modelsCarouselTrack">
            {CAROUSEL_MODELS.map((model) => (
              <div
                key={model.id}
                className={`model-metric-card model-card ai-model-card ${model.flagship ? 'grpv-flagship' : ''} ${activeModel === model.id ? 'active' : ''}`}
                data-model={model.id}
                onClick={() => handleModelClick(model.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleModelClick(model.id)}
              >
                {model.flagship ? (
                  <div className="grpv-brand-logo">
                    <img src="/ezana-logo.svg" alt="Ezana Finance" className="grpv-logo-img" />
                  </div>
                ) : (
                  <div className={`model-metric-icon ${model.id}`} style={{ background: `${model.color}20`, color: model.color }}>
                    <i className={`bi ${model.icon}`} />
                  </div>
                )}
                <div className="model-metric-content">
                  <span className="model-metric-label">{model.name}</span>
                  <span className="model-metric-value">{model.description}</span>
                  <span className="model-metric-change">
                    {model.flagship ? 'Flagship' : model.subtitle} · {selectedStock ? 'Click to analyze' : 'Select a stock'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button className="carousel-nav next" id="modelsCarouselNext" type="button"><i className="bi bi-chevron-right" /></button>
      </section>

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

      <section className="learning-opportunities">
        <div className="learning-header">
          <div className="learning-title-area">
            <div className="learning-icon"><i className="bi bi-mortarboard-fill" /></div>
            <div className="learning-title-text">
              <h3>Fundamental Analysis Mastery</h3>
              <p>Deep dive into financial statement analysis and valuation</p>
            </div>
          </div>
          <Link href="/learning-center" className="view-all-btn">View All Courses</Link>
        </div>
        <div className="courses-grid">
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 6 hours</span></div>
            <h4 className="course-title">Financial Statement Analysis</h4>
            <p className="course-description">Master reading and analyzing income statements, balance sheets, and cash flow statements.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 20 lessons</div><div className="meta-item"><i className="bi bi-people" /> 3,241 enrolled</div></div>
            <div className="course-footer"><span className="course-level intermediate">Intermediate</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 8 hours</span></div>
            <h4 className="course-title">Valuation Methods &amp; DCF Modeling</h4>
            <p className="course-description">Learn to build discounted cash flow models and understand various valuation methodologies.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 24 lessons</div><div className="meta-item"><i className="bi bi-people" /> 2,847 enrolled</div></div>
            <div className="course-footer"><span className="course-level advanced">Advanced</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Skill</span><span className="course-duration"><i className="bi bi-clock" /> 4 hours</span></div>
            <h4 className="course-title">Earnings Call Analysis</h4>
            <p className="course-description">Learn to extract insights from quarterly earnings calls and management guidance.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 14 lessons</div><div className="meta-item"><i className="bi bi-people" /> 1,923 enrolled</div></div>
            <div className="course-footer"><span className="course-level intermediate">Intermediate</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 5 hours</span></div>
            <h4 className="course-title">Competitive Analysis Frameworks</h4>
            <p className="course-description">Master Porter&apos;s Five Forces, SWOT analysis, and competitive positioning strategies.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 18 lessons</div><div className="meta-item"><i className="bi bi-people" /> 2,134 enrolled</div></div>
            <div className="course-footer"><span className="course-level beginner">Beginner</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
        </div>
      </section>
    </>
  );
}
