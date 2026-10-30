'use client';

import { useEffect, useRef, useState, useCallback, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { StockHeatmap } from '@/components/company-research/StockHeatmap';
import { AnimatedGlowingSearchBar } from '@/components/ui/animated-glowing-search-bar';
import {
  KeyMetrics,
  AnalystRecommendations,
  CompanyNews,
  CompanyOverview,
  EarningsCard,
  CompetitorsCard,
} from '@/components/research';
import { ViewToggle } from '@/components/research/dossier/ViewToggle';
import { SectionTabs } from '@/components/research/dossier/SectionTabs';
import { SectionStack } from '@/components/research/dossier/SectionStack';
import { useSectionStack } from '@/components/research/dossier/useSectionStack';
import { AIAnalysisPanel } from '@/components/research/AIAnalysisPanel';
import { PinnableCard } from '@/components/ui/PinnableCard';
import { useCompanySearchFinnhub } from '@/hooks/useFinnhub';
import { getCarouselModels } from '@/lib/ai/analysis-prompts';
import { useChecklist } from '@/hooks/useChecklist';
import { useBeginnerLevelOptional } from '@/contexts/BeginnerLevelContext';
import { BeginnerSpotlight } from '@/components/beginner/BeginnerSpotlight';
import { EducationTip } from '@/components/beginner/EducationTip';
import '@/components/beginner/beginner.css';
import { CoursePreviewSection } from '@/components/learning/CoursePreviewSection';
import { getCoursesByTrack } from '@/lib/learning-curriculum';
import { useWatchlists } from '@/hooks/useWatchlists';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/contexts/ToastContext';
import { getTickerMeta } from '@/lib/tickerSearchData';
import { MarketPortfolioView } from '@/components/research/market/MarketPortfolioView';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import { useOrg } from '@/contexts/OrgContext';

/* StockPriceChart imports Recharts. Before this change Recharts was in the
   initial bundle of /company-research (~342 kB First Load). The chart renders
   below the ticker header, so deferring it keeps the critical path lean and
   lets the browser paint the header/metrics faster. Fixed-height skeleton
   keeps CLS at zero. */
const StockPriceChart = dynamic(() => import('@/components/research/StockPriceChart'), {
  ssr: false,
  loading: () => <div style={{ height: 216 }} aria-hidden />,
});
const OrgSendToTeamModal = dynamic(
  () =>
    import('@/components/org/OrgSendToTeamModal').then((m) => ({ default: m.OrgSendToTeamModal })),
  { ssr: false, loading: () => null },
);

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import '../../../../app-legacy/pages/company-research.css';
import '../../../../app-legacy/components/grpv/snappy-slider.css';
import '@/components/research/ai-analysis-panel.css';
import '@/components/research/model-card-shell.css';
import '@/components/research/market/market-portfolio.css';
import './company-research-theme.css';
import './dossier.css';
import '../org-trading/org-trading.css';

const CAROUSEL_MODELS = getCarouselModels();

function ResearchPageHeader({ view, setView }) {
  return (
    <header className="cpr-page-header">
      <ViewToggle view={view} setView={setView} />
    </header>
  );
}

function CompanyResearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isOrgUser, hasPermission } = useOrg();
  const [sendChartTicker, setSendChartTicker] = useState(null);
  const rawView = searchParams.get('view');
  const view =
    rawView === 'industry' || rawView === 'market'
      ? 'industry'
      : rawView === 'portfolio'
        ? 'portfolio'
        : 'company';
  const setView = useCallback(
    (next) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (next === 'company') {
        sp.delete('view');
      } else {
        sp.set('view', next);
      }
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  const { completeTask } = useChecklist();
  const beginner = useBeginnerLevelOptional();
  const showBeginnerAnalysis =
    beginner?.band === 'beginner' &&
    beginner.analysesRun === 0 &&
    !selectedStock &&
    view === 'company';
  const [selectedStock, setSelectedStock] = useState(null);
  const [stats, setStats] = useState({
    mcap: '--',
    pe: '--',
    divYield: '--',
    eps: '--',
    capType: '--',
  });
  const [livePrice, setLivePrice] = useState(null);
  const [viewMode, setViewMode] = useState('heatmap');
  const [activeModel, setActiveModel] = useState(null);
  const [wlModalOpen, setWlModalOpen] = useState(false);
  const [wlAddedMap, setWlAddedMap] = useState({});
  const [wlBusyId, setWlBusyId] = useState(null);
  const [newListLabel, setNewListLabel] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const {
    watchlists: userWatchlists,
    loading: watchlistsLoading,
    addItem,
    createList,
  } = useWatchlists();
  const searchRef = useRef(null);
  const modelsCarouselScrollRef = useRef(null);
  /* Section tabs (Overview, Models, Valuation, Earnings, News, Peers):
     in-place panels with pinning. activeModel and each card's data live
     above the stack, so a pinned section moves instead of remounting. */
  const {
    state: sectionState,
    order: sectionOrder,
    open: openSection,
    pin: pinSection,
    announcement: sectionAnnouncement,
  } = useSectionStack();

  const researchCourses = useMemo(() => {
    const stocks = getCoursesByTrack('stocks');
    const relevant = stocks.filter(
      (c) =>
        c.title.includes('Fundamental Analysis') ||
        c.title.includes('Financial Statements') ||
        c.title.includes('Sector Analysis') ||
        c.title.includes('Earnings Season'),
    );
    if (relevant.length < 4) {
      const fill = stocks.filter(
        (c) => c.level === 'basic' && !relevant.find((r) => r.id === c.id),
      );
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
    const q = searchParams.get('q') || searchParams.get('ticker') || searchParams.get('symbol');
    if (q && q.trim()) {
      const sym = q.trim().toUpperCase();
      setSelectedStock(sym);
      setQuery(sym);
      setViewMode('stock');
    }
    const m = searchParams.get('model');
    if (m && CAROUSEL_MODELS.some((model) => model.id === m)) setActiveModel(m);
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
          mcap: data.mcap || '--',
          pe: data.pe || '--',
          divYield: data.divYield || '--',
          eps: data.eps || '--',
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
    if (stats.mcap && stats.mcap !== '--' && stats.mcap !== '…')
      parts.push(`Market Cap: ${stats.mcap}`);
    return parts.join(' · ') || selectedStock || '';
  }, [stats.mcap, stats.capType, selectedStock]);

  useEffect(() => {
    if (selectedStock && stats.mcap !== '--' && stats.mcap !== '…') {
      completeTask('research_2');
    }
  }, [selectedStock, stats.mcap, completeTask]);

  const handleSelectStock = useCallback(
    (item, opts) => {
      const sym = (typeof item === 'string' ? item : item?.symbol)?.toUpperCase?.() ?? item?.symbol;
      setSelectedStock(sym);
      setViewMode('stock');
      setQuery('');
      clearSuggestions();
      completeTask('research_1');
      if (opts?.fromPeer) completeTask('research_3');
    },
    [setQuery, clearSuggestions, completeTask],
  );

  const handleSearchInput = useCallback(
    (eOrValue) => {
      const q = typeof eOrValue === 'string' ? eOrValue : (eOrValue?.target?.value ?? '');
      setQuery(q);
    },
    [setQuery],
  );

  const handleSelectSuggestion = useCallback(
    (item) => {
      clearSuggestions();
      setQuery('');
      handleSelectStock(item.symbol);
    },
    [handleSelectStock, setQuery, clearSuggestions],
  );

  const handleModelClick = useCallback(
    (modelId) => {
      if (activeModel === modelId) {
        setActiveModel(null);
      } else {
        setActiveModel(modelId);
        /* With a ticker, the analysis opens in the Models section. */
        if (selectedStock) openSection('models', 'Models');
      }
    },
    [activeModel, selectedStock, openSection],
  );

  const handleCloseAnalysis = useCallback(() => {
    setActiveModel(null);
  }, []);

  /** DCF & Earnings (custom interactive) — gold accent on tiles (see company-research-theme.css). */
  const PREMIUM_MODEL_IDS = useMemo(
    () =>
      new Set([
        'grpv',
        'dcf',
        'earnings',
        'comps',
        'threestatement',
        'lbo',
        'ma',
        'risk',
        'montecarlo',
      ]),
    [],
  );

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

  /* QA RET-5: adds go to the user's saved lists (/api/watchlists), not demo
     state, so the ticker is still there after a reload of /watchlist. */
  const handleAddToWatchlist = useCallback(
    async (watchlistId) => {
      if (!selectedStock || wlBusyId) return;
      setWlBusyId(watchlistId);
      const meta = getTickerMeta(selectedStock);
      const res = await addItem(watchlistId, {
        ticker: selectedStock,
        type: 'stock',
        name: meta?.name || selectedStock,
        sector: meta?.sector || '',
      });
      setWlBusyId(null);
      if (res?.ok) {
        setWlAddedMap((prev) => ({ ...prev, [watchlistId]: true }));
      } else {
        toast.error(res?.reason || `Couldn't add ${selectedStock}. Please try again.`);
      }
    },
    [selectedStock, wlBusyId, addItem, toast],
  );

  const handleCreateListAndAdd = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const label = newListLabel.trim();
      if (!label || creatingList) return;
      setCreatingList(true);
      const res = await createList(label);
      setCreatingList(false);
      if (!res?.ok) {
        toast.error(res?.reason || "Couldn't create the list. Please try again.");
        return;
      }
      setNewListLabel('');
      await handleAddToWatchlist(res.listId);
    },
    [newListLabel, creatingList, createList, toast, handleAddToWatchlist],
  );

  const openWatchlistModal = useCallback(() => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?redirect=${encodeURIComponent(pathname || '/company-research')}`);
      return;
    }
    setWlAddedMap({});
    setWlModalOpen(true);
  }, [isAuthenticated, router, pathname]);

  const handleStartAppleAnalysis = useCallback(() => {
    handleSelectStock('AAPL');
    setViewMode('stock');
    setActiveModel('grpv');
  }, [handleSelectStock]);

  const renderModelCards = (keyPrefix) =>
    CAROUSEL_MODELS.map((model) => {
      const isPremium = PREMIUM_MODEL_IDS.has(model.id);
      const isActive = activeModel === model.id;
      const showModelTips = beginner?.showTips ?? false;
      const tileClass = [
        'model-metric-card',
        'model-card',
        'ai-model-card',
        'cr-model-tile',
        model.flagship ? 'grpv-flagship' : '',
        isPremium ? 'cr-model-tile--premium' : 'cr-model-tile--neutral',
        isActive ? 'active' : '',
      ]
        .filter(Boolean)
        .join(' ');

      return (
        <div
          key={`${keyPrefix}-${model.id}`}
          className={tileClass}
          data-model={model.id}
          onClick={() => handleModelClick(model.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleModelClick(model.id)}
        >
          {model.flagship ? (
            <div className="grpv-brand-logo">
              <EzanaNavLogo
                width={17}
                height={19}
                className="grpv-logo-img nav-logo-img nav-logo-img--wing"
              />
            </div>
          ) : (
            <div className={`model-metric-icon ${model.id} cr-model-tile__icon`}>
              <i className={`bi ${model.icon}`} />
            </div>
          )}
          <div className="model-metric-content">
            <span className="model-metric-label cr-model-tile__title">
              {model.name}
              {showModelTips && model.id === 'grpv' && (
                <span className="beginner-model-chip">Start here</span>
              )}
              {showModelTips && model.id !== 'grpv' && isPremium && (
                <span className="beginner-model-advanced">Advanced</span>
              )}
            </span>
          </div>
          {isPremium && (
            <span className="cr-model-premium-star" aria-hidden>
              ★
            </span>
          )}
        </div>
      );
    });

  /* One body per section tab. Phase 1 reuses the existing research cards;
     the redesigned cards replace them in later phases. */
  const renderSection = (id) => {
    switch (id) {
      case 'overview':
        return (
          <div className="crx-section-grid">
            <CompanyOverview symbol={selectedStock} />
            <div className="crx-section-actions">
              <button
                type="button"
                className="crx-link-btn"
                onClick={() => openSection('news', 'News')}
              >
                See all news <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      case 'models':
        return activeModel ? (
          <AIAnalysisPanel
            modelId={activeModel}
            symbol={selectedStock}
            onClose={handleCloseAnalysis}
            onOpenModel={setActiveModel}
            showTips={beginner?.showTips}
          />
        ) : (
          <p className="crx-section-empty">
            Pick a model from the strip above to run it on {selectedStock}.
          </p>
        );
      case 'valuation':
        return (
          <div className="crx-section-grid crx-section-grid--two">
            <AnalystRecommendations symbol={selectedStock} />
            <KeyMetrics symbol={selectedStock} />
          </div>
        );
      case 'earnings':
        return <EarningsCard symbol={selectedStock} />;
      case 'news':
        return <CompanyNews symbol={selectedStock} />;
      case 'peers':
        return (
          <CompetitorsCard
            symbol={selectedStock}
            onSelectPeer={(peer) => handleSelectStock(peer, { fromPeer: true })}
          />
        );
      default:
        return null;
    }
  };

  if (view === 'industry' || view === 'portfolio') {
    return (
      <div className="dashboard-page-inset cr-page">
        <div className="crx-canvas">
          <ResearchPageHeader view={view} setView={setView} />
          <MarketPortfolioView section={view} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page-inset cr-page">
      <div className="crx-canvas">
        <ResearchPageHeader view={view} setView={setView} />
        {showBeginnerAnalysis && (
          <div className="beginner-first-analysis">
            <p>
              New here? Let&apos;s analyze Apple together. We&apos;ll walk you through the models
              and key metrics.
            </p>
            <button type="button" onClick={handleStartAppleAnalysis}>
              Analyze AAPL together →
            </button>
          </div>
        )}

        <div
          className="company-search-wrapper crx-search"
          ref={searchRef}
          data-task-target="research-search-bar"
        >
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

        {/* Stock analysis models — horizontal strip, above heatmap (heatmap view) or above stock chart (stock view) */}
        {((selectedStock && viewMode === 'stock') || viewMode === 'heatmap') && (
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
              <div
                className="models-carousel-track"
                id={viewMode === 'stock' ? 'modelsCarouselTrackStock' : 'modelsCarouselTrack'}
              >
                {renderModelCards(viewMode === 'stock' ? 'st' : 'hm')}
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
            className="cr-heatmap-layout cr-heatmap-layout--full"
            style={{ display: viewMode === 'heatmap' ? undefined : 'none' }}
          >
            <div className="cr-heatmap-main">
              <PinnableCard cardId="stock-heatmap" section="research">
                <div className="cr-db-card cr-pinnable-inner">
                  <div className="chart-header compact">
                    <div className="chart-title-area">
                      <h2 className="chart-title">Stock Market Heatmap</h2>
                      <span className="heatmap-subtitle">
                        S&amp;P 500 · Performance YTD % · Tile size by return magnitude
                      </span>
                    </div>
                  </div>
                  <div
                    className="heatmap-container"
                    id="heatmapContainer"
                    data-task-target="research-company-card"
                  >
                    <StockHeatmap onSelectStock={handleSelectStock} />
                  </div>
                </div>
              </PinnableCard>
            </div>
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
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                          marginLeft: 'auto',
                        }}
                      >
                        {isOrgUser && hasPermission('send_to_team') && (
                          <button
                            type="button"
                            className="ot-position-flag-btn"
                            onClick={() => setSendChartTicker(selectedStock)}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            <i className="bi bi-send" /> Send Chart
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={openWatchlistModal}
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
          </div>
        </section>

        {/* Heatmap: user opened a model before selecting a ticker */}
        {activeModel && !selectedStock && (
          <section
            className="model-detail-section cr-model-detail-no-ticker"
            id="modelDetailSectionHeatmap"
          >
            <div className="component-card model-detail-card">
              <div className="card-header">
                <h3>{CAROUSEL_MODELS.find((m) => m.id === activeModel)?.name || 'Analysis'}</h3>
                <button className="card-action-btn" type="button" onClick={handleCloseAnalysis}>
                  <i className="bi bi-x-lg" /> Close
                </button>
              </div>
              <div className="card-body" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                <i
                  className="bi bi-search"
                  style={{
                    fontSize: '2rem',
                    color: '#6b7280',
                    display: 'block',
                    marginBottom: '1rem',
                  }}
                />
                <p style={{ color: '#8b949e', fontSize: '0.9375rem' }}>
                  Search for a company or select a stock from the heatmap above to run this
                  analysis.
                </p>
              </div>
            </div>
          </section>
        )}

        {selectedStock && view === 'company' && <EducationTip topic="diversification" />}

        {selectedStock && (
          <>
            <SectionTabs state={sectionState} onOpen={openSection} />
            <SectionStack
              state={sectionState}
              order={sectionOrder}
              onPin={pinSection}
              renderSection={renderSection}
              titles={{
                models: `Run a model on ${selectedStock}`,
                valuation: 'Valuation and analyst view',
              }}
            />
            <p className="crx-visually-hidden" aria-live="polite">
              {sectionAnnouncement}
            </p>
          </>
        )}

        <CoursePreviewSection
          title="Fundamental Analysis Mastery"
          subtitle="Deep dive into financial statement analysis and valuation"
          courses={researchCourses}
          viewAllHref="/learning-center?track=stocks"
        />
      </div>

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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--home-heading, #111827)',
                  }}
                >
                  Add to Watchlist
                </h3>
                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: '0.75rem',
                    color: 'var(--home-muted, #6b7280)',
                  }}
                >
                  Adding <strong style={{ color: '#10b981' }}>{selectedStock}</strong>: select a
                  watchlist
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
              {watchlistsLoading && userWatchlists.length === 0 && (
                <p
                  role="status"
                  style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}
                >
                  Loading your watchlists...
                </p>
              )}
              {!watchlistsLoading && userWatchlists.length === 0 && (
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  You don&apos;t have a watchlist yet. Create one below.
                </p>
              )}
              {userWatchlists.map((wl) => {
                const alreadyIn = (wl.stocks || []).some(
                  (s) => s.ticker === selectedStock && (s.type || 'stock') === 'stock',
                );
                const justAdded = wlAddedMap[wl.id];
                const done = alreadyIn || justAdded;
                const busy = wlBusyId === wl.id;
                return (
                  <button
                    key={wl.id}
                    type="button"
                    disabled={done || busy}
                    aria-busy={busy || undefined}
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
                      background: done ? 'rgba(16, 185, 129, 0.06)' : 'rgba(0, 0, 0, 0.02)',
                      cursor: done ? 'default' : 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-sans)',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: 'var(--home-heading, #111827)',
                        }}
                      >
                        {wl.label}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.6875rem',
                          color: 'var(--home-muted, #6b7280)',
                        }}
                      >
                        {(wl.stocks || []).length} stocks
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

            <form
              onSubmit={handleCreateListAndAdd}
              style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}
            >
              <input
                aria-label="New watchlist name"
                type="text"
                value={newListLabel}
                onChange={(e) => setNewListLabel(e.target.value)}
                placeholder="New list name"
                maxLength={60}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <button
                type="submit"
                disabled={!newListLabel.trim() || creatingList}
                style={{
                  padding: '0.6rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid color-mix(in srgb, var(--emerald) 35%, transparent)',
                  background: 'color-mix(in srgb, var(--emerald) 10%, transparent)',
                  color: 'var(--emerald-text, var(--emerald))',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: newListLabel.trim() && !creatingList ? 'pointer' : 'default',
                  fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap',
                }}
              >
                <i className="bi bi-plus-lg" aria-hidden="true" />{' '}
                {creatingList ? 'Creating...' : 'Create list'}
              </button>
            </form>

            <p
              style={{
                margin: '1rem 0 0',
                fontSize: '0.6875rem',
                color: 'var(--home-muted, #9ca3af)',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              Your watchlists are saved to your account. Visit the Watchlist page to manage them.
            </p>
          </div>
        </>
      )}

      {sendChartTicker && (
        <OrgSendToTeamModal
          onClose={() => setSendChartTicker(null)}
          attachment={{
            kind: 'chart',
            ref: JSON.stringify({ ticker: sendChartTicker, range: '1Y' }),
            label: `${sendChartTicker} Price Chart`,
            meta: { page: 'company-research' },
          }}
        />
      )}

      <BeginnerSpotlight
        pageKey="company-research"
        steps={[
          {
            targetSelector: '[data-task-target="research-search-bar"]',
            message: 'Search any ticker here. Try AAPL or your favorite company.',
            position: 'bottom',
          },
          {
            targetSelector: '[data-model="grpv"]',
            message: 'Start with GRPV, our guided model for a quick fundamentals overview.',
            position: 'bottom',
          },
          {
            targetSelector: '[data-task-target="research-company-card"]',
            message: 'Or click any tile in the heatmap to open a full company profile.',
            position: 'right',
          },
        ]}
      />
    </div>
  );
}

export default function CompanyResearchPage() {
  return (
    <Suspense
      fallback={
        <div
          className="dashboard-page-inset"
          style={{
            minHeight: '40vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8b949e',
          }}
        >
          Loading…
        </div>
      }
    >
      <CompanyResearchPageInner />
    </Suspense>
  );
}
