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
import './research-density.css';
import '../org-trading/org-trading.css';

const CAROUSEL_MODELS = getCarouselModels();

const EMPTY_QUOTE = {
  name: null,
  exchange: null,
  sector: null,
  industry: null,
  logo: null,
  change: null,
  changePct: null,
  asOf: null,
};

function formatAsOf(ts) {
  if (!Number.isFinite(ts)) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(ts * 1000));
  } catch {
    return null;
  }
}

/** Company logo with a ticker monogram fallback. Keyed by symbol at the call site. */
function CompanyMark({ symbol, logo }) {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return (
      <span className="crx-co-mark">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote issuer logo, sized by CSS */}
        <img
          src={logo}
          alt=""
          width={36}
          height={36}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }
  return (
    <span className="crx-co-mark crx-co-mark--text" aria-hidden="true">
      {(symbol || '').slice(0, 4)}
    </span>
  );
}

function ResearchPageHeader({ view, setView }) {
  return (
    <header className="crx-page-head">
      <div className="crx-page-head-text">
        <h1 className="crx-page-title">Research</h1>
        <p className="crx-page-sub">
          Analyze companies, industries, and portfolios using market data, financial models, and
          AI-powered intelligence.
        </p>
      </div>
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
  const [quote, setQuote] = useState(EMPTY_QUOTE);
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
    setQuote(EMPTY_QUOTE);

    fetch(`/api/fmp/stock-stats?symbol=${encodeURIComponent(selectedStock)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          setStats({ mcap: '--', pe: '--', divYield: '--', eps: '--', capType: '--' });
          setLivePrice(null);
          setQuote(EMPTY_QUOTE);
          return;
        }
        if (data.error) {
          setStats({ mcap: '--', pe: '--', divYield: '--', eps: '--', capType: '--' });
          setLivePrice(null);
          setQuote(EMPTY_QUOTE);
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
        setQuote({
          name: data.name || null,
          exchange: data.exchange || null,
          sector: data.sector || null,
          industry: data.industry || null,
          logo: data.logo || null,
          change: Number.isFinite(data.change) ? data.change : null,
          changePct: Number.isFinite(data.changePct) ? data.changePct : null,
          asOf: Number.isFinite(data.asOf) ? data.asOf : null,
        });
      })
      .catch(() => {
        setStats({ mcap: '--', pe: '--', divYield: '--', eps: '--', capType: '--' });
        setLivePrice(null);
        setQuote(EMPTY_QUOTE);
      });
  }, [selectedStock]);

  const tickerMeta = useMemo(
    () => (selectedStock ? getTickerMeta(selectedStock) : null),
    [selectedStock],
  );
  const companyName = quote.name || tickerMeta?.name || selectedStock || '';
  const companyMetaLine = useMemo(() => {
    const parts = [];
    const sector = quote.sector || tickerMeta?.sector;
    if (sector) parts.push(sector);
    if (quote.industry && quote.industry !== sector) parts.push(quote.industry);
    if (stats.capType && stats.capType !== '--' && stats.capType !== '…') parts.push(stats.capType);
    return parts.join(' · ');
  }, [quote.sector, quote.industry, tickerMeta, stats.capType]);
  const chgDir =
    quote.change == null ? 'flat' : quote.change > 0 ? 'up' : quote.change < 0 ? 'down' : 'flat';
  const asOfLabel = formatAsOf(quote.asOf);

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
    setQuote(EMPTY_QUOTE);
  };

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

  useEffect(() => {
    if (!wlModalOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setWlModalOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [wlModalOpen]);

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

  const renderTools = () =>
    CAROUSEL_MODELS.map((model) => {
      const isPremium = PREMIUM_MODEL_IDS.has(model.id);
      const isActive = activeModel === model.id;
      const showModelTips = beginner?.showTips ?? false;
      return (
        <button
          key={model.id}
          type="button"
          data-model={model.id}
          aria-pressed={isActive}
          className={`crx-tool${isPremium ? ' crx-tool--premium' : ''}${isActive ? ' is-active' : ''}`}
          onClick={() => handleModelClick(model.id)}
        >
          {model.flagship ? (
            <EzanaNavLogo
              width={14}
              height={16}
              className="crx-tool-logo nav-logo-img nav-logo-img--wing"
            />
          ) : (
            <i className={`bi ${model.icon} crx-tool-icon`} aria-hidden="true" />
          )}
          <span className="crx-tool-label">{model.name}</span>
          {showModelTips && model.id === 'grpv' && (
            <span className="beginner-model-chip">Start here</span>
          )}
          {showModelTips && model.id !== 'grpv' && isPremium && (
            <span className="beginner-model-advanced">Advanced</span>
          )}
          {isPremium && (
            <i className="bi bi-star-fill crx-tool-star" aria-label="Premium model" role="img" />
          )}
        </button>
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

        {((selectedStock && viewMode === 'stock') || viewMode === 'heatmap') && (
          <section className="crx-tools" aria-label="Research tools">
            <span className="crx-tools-label" id="crx-tools-label">
              Tools
            </span>
            <div className="crx-tools-row" role="group" aria-labelledby="crx-tools-label">
              {renderTools()}
            </div>
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
                  <header className="rhm-head">
                    <div className="rhm-head-id">
                      <span className="rhm-icon" aria-hidden="true">
                        <i className="bi bi-grid-3x3-gap" />
                      </span>
                      <div className="rhm-head-text">
                        <h2 className="rhm-title">Stock Market Heatmap</h2>
                        <span className="rhm-desc">
                          S&amp;P 500 · Performance YTD % · Tile size by return magnitude
                        </span>
                      </div>
                    </div>
                  </header>
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
                <div className="market-chart-section cr-db-card cr-stock-merged-card crx-co-card">
                  <div className="crx-co-head">
                    <div className="crx-co-id">
                      <CompanyMark key={selectedStock} symbol={selectedStock} logo={quote.logo} />
                      <div className="crx-co-names">
                        <div className="crx-co-name-row">
                          <h2 id="stockChartTitle" className="crx-co-name">
                            {companyName}
                          </h2>
                          {companyName !== selectedStock && (
                            <span className="crx-co-ticker">{selectedStock}</span>
                          )}
                          {quote.exchange && <span className="crx-co-exch">{quote.exchange}</span>}
                        </div>
                        {companyMetaLine && <p className="crx-co-meta">{companyMetaLine}</p>}
                      </div>
                    </div>
                    <div className="crx-co-actions">
                      <button
                        type="button"
                        className="crx-btn crx-btn--ghost back-to-heatmap-btn"
                        id="backToHeatmap"
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
                        <i className="bi bi-grid-3x3-gap" aria-hidden="true" /> Heatmap
                      </button>
                      {isOrgUser && hasPermission('send_to_team') && (
                        <button
                          type="button"
                          className="crx-btn crx-btn--ghost"
                          onClick={() => setSendChartTicker(selectedStock)}
                        >
                          <i className="bi bi-send" aria-hidden="true" /> Send Chart
                        </button>
                      )}
                      <button
                        type="button"
                        className="crx-btn crx-btn--accent"
                        onClick={openWatchlistModal}
                      >
                        <i className="bi bi-plus-lg" aria-hidden="true" /> Add to Watchlist
                      </button>
                    </div>
                  </div>

                  <div className="crx-co-quote">
                    <span className="crx-co-price">
                      {livePrice != null
                        ? `$${Number(livePrice).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : stats.mcap === '…'
                          ? '…'
                          : 'Price unavailable'}
                    </span>
                    {quote.change != null && quote.changePct != null && (
                      <span className={`crx-co-chg crx-co-chg--${chgDir}`}>
                        <i
                          className={`bi ${
                            chgDir === 'up'
                              ? 'bi-caret-up-fill'
                              : chgDir === 'down'
                                ? 'bi-caret-down-fill'
                                : 'bi-dash'
                          }`}
                          aria-hidden="true"
                        />
                        {quote.change > 0 ? '+' : ''}
                        {quote.change.toFixed(2)} ({quote.changePct > 0 ? '+' : ''}
                        {quote.changePct.toFixed(2)}%)
                        <span className="crx-visually-hidden">
                          {chgDir === 'up' ? ' up' : chgDir === 'down' ? ' down' : ' unchanged'}{' '}
                          today
                        </span>
                      </span>
                    )}
                    {(quote.change != null || asOfLabel) && (
                      <span className="crx-co-asof">
                        {quote.change != null ? 'Today' : null}
                        {quote.change != null && asOfLabel ? ' · ' : null}
                        {asOfLabel ? `As of ${asOfLabel}` : null}
                      </span>
                    )}
                  </div>

                  <div className="crx-co-chart">
                    <StockPriceChart
                      symbol={selectedStock}
                      livePrice={livePrice}
                      stats={stats}
                      hideSymbol
                      statsVariant="strip"
                    />
                  </div>
                </div>
              </PinnableCard>
            )}
          </div>
        </section>

        {/* Heatmap: user opened a model before selecting a ticker */}
        {activeModel && !selectedStock && (
          <section
            className="model-detail-section cr-model-detail-no-ticker crx-empty-panel"
            id="modelDetailSectionHeatmap"
            aria-labelledby="crx-empty-model-title"
          >
            <div className="crx-empty-panel-head">
              <h3 id="crx-empty-model-title" className="crx-empty-panel-title">
                {CAROUSEL_MODELS.find((m) => m.id === activeModel)?.name || 'Analysis'}
              </h3>
              <button
                type="button"
                className="crx-btn crx-btn--ghost"
                onClick={handleCloseAnalysis}
              >
                <i className="bi bi-x-lg" aria-hidden="true" /> Close
              </button>
            </div>
            <div className="crx-empty-panel-body">
              <i className="bi bi-search" aria-hidden="true" />
              <p>
                Search for a company or select a stock from the heatmap above to run this analysis.
              </p>
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
          variant="compact"
          title="Fundamental Analysis Mastery"
          subtitle="Build core financial analysis skills with expert-led courses."
          courses={researchCourses}
          viewAllHref="/learning-center?track=stocks"
          viewAllLabel="View all courses"
        />
      </div>

      {wlModalOpen && selectedStock && (
        <>
          <div
            className="crx-wl-backdrop"
            onClick={() => setWlModalOpen(false)}
            aria-hidden="true"
          />
          <div
            className="crx-wl-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crx-wl-title"
          >
            <div className="crx-wl-head">
              <div>
                <h3 id="crx-wl-title" className="crx-wl-title">
                  Add to Watchlist
                </h3>
                <p className="crx-wl-sub">
                  Adding <strong>{selectedStock}</strong>: select a watchlist
                </p>
              </div>
              <button
                type="button"
                className="crx-icon-btn"
                onClick={() => setWlModalOpen(false)}
                aria-label="Close"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>

            <div className="crx-wl-list">
              {watchlistsLoading && userWatchlists.length === 0 && (
                <p role="status" className="crx-wl-note">
                  Loading your watchlists...
                </p>
              )}
              {!watchlistsLoading && userWatchlists.length === 0 && (
                <p className="crx-wl-note">
                  You don&apos;t have a watchlist yet. Create one below.
                </p>
              )}
              {userWatchlists.map((wl) => {
                const alreadyIn = (wl.stocks || []).some(
                  (s) => s.ticker === selectedStock && (s.type || 'stock') === 'stock',
                );
                const done = alreadyIn || wlAddedMap[wl.id];
                const busy = wlBusyId === wl.id;
                return (
                  <button
                    key={wl.id}
                    type="button"
                    disabled={done || busy}
                    aria-busy={busy || undefined}
                    onClick={() => !done && handleAddToWatchlist(wl.id)}
                    className={`crx-wl-item${done ? ' is-done' : ''}`}
                  >
                    <span className="crx-wl-item-text">
                      <span className="crx-wl-item-name">{wl.label}</span>
                      <span className="crx-wl-item-count">{(wl.stocks || []).length} stocks</span>
                    </span>
                    {done ? (
                      <span className="crx-wl-item-done">
                        <i className="bi bi-check-circle-fill" aria-hidden="true" /> Added
                      </span>
                    ) : (
                      <span className="crx-wl-item-add" aria-hidden="true">
                        <i className="bi bi-plus-lg" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleCreateListAndAdd} className="crx-wl-new">
              <input
                aria-label="New watchlist name"
                type="text"
                value={newListLabel}
                onChange={(e) => setNewListLabel(e.target.value)}
                placeholder="New list name"
                maxLength={60}
                className="crx-wl-input"
              />
              <button
                type="submit"
                disabled={!newListLabel.trim() || creatingList}
                className="crx-btn crx-btn--accent"
              >
                <i className="bi bi-plus-lg" aria-hidden="true" />{' '}
                {creatingList ? 'Creating...' : 'Create list'}
              </button>
            </form>

            <p className="crx-wl-foot">
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
            color: 'var(--text-muted)',
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
