'use client';

import { useEffect, useRef, useState, useCallback, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { StockHeatmap } from '@/components/company-research/StockHeatmap';
import { AnimatedGlowingSearchBar } from '@/components/ui/animated-glowing-search-bar';
import { CompanyNews, CompanyOverview, EarningsCard, CompetitorsCard } from '@/components/research';
import { ViewToggle } from '@/components/research/dossier/ViewToggle';
import { SectionTabs } from '@/components/research/dossier/SectionTabs';
import { SectionStack } from '@/components/research/dossier/SectionStack';
import { useSectionStack } from '@/components/research/dossier/useSectionStack';
import { AIAnalysisPanel } from '@/components/research/AIAnalysisPanel';
import { PinnableCard } from '@/components/ui/PinnableCard';
import { useCompanySearchFinnhub } from '@/hooks/useFinnhub';
import { resolveTool, sectionForTool, sectionHasTools } from '@/lib/research/company-research';
import { useCompanyResearch } from '@/hooks/useCompanyResearch';
import { CompanyHero } from '@/components/research/company/CompanyHero';
import { ToolPicker } from '@/components/research/company/ToolPicker';
import { DcfWorkbench } from '@/components/research/company/DcfWorkbench';
import {
  AnalystCard,
  KeyMetricsCard,
  NewsCard,
  PinsCard,
} from '@/components/research/company/ResearchRail';
import {
  IndustryResearchCard,
  PortfolioToolsCard,
} from '@/components/research/company/ResearchExtras';
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
import { useOrg } from '@/contexts/OrgContext';
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
import '@/components/research/company/research-company.css';
import '@/styles/home-canvas.css';
import { markChecklistView } from '@/lib/onboarding/markView';

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
  const [selectedStock, setSelectedStock] = useState(null);
  /* Declared after selectedStock: reading it earlier threw for beginners
     with no analyses yet (temporal dead zone). */
  const showBeginnerAnalysis =
    beginner?.band === 'beginner' &&
    beginner.analysesRun === 0 &&
    !selectedStock &&
    view === 'company';
  const [viewMode, setViewMode] = useState('heatmap');
  /* Tool per tab (Models, Valuation). The active tab's tool is mirrored to
     ?tool= so pins, deep links and the back button land on it. */
  const [tools, setTools] = useState(() => {
    const t = searchParams.get('tool');
    return {
      models: resolveTool('models', t),
      valuation: resolveTool('valuation', t),
    };
  });
  /* One snapshot for every card: the same price, peers and metrics everywhere. */
  const research = useCompanyResearch(selectedStock);
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
     in-place panels with pinning. The tool choice and each card's data live
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
    /* Legacy ?model= links open the tab that holds that tool. */
    const m = searchParams.get('model');
    const legacySection = m ? sectionForTool(m) : null;
    if (legacySection) setTools((prev) => ({ ...prev, [legacySection]: m }));
  }, [searchParams]);

  const quoteReady = research?.quote.status === 'ready';
  useEffect(() => {
    if (selectedStock && quoteReady) {
      completeTask('research_2');
      markChecklistView('explore.company_profile');
    }
  }, [selectedStock, quoteReady, completeTask]);

  const handleSelectStock = useCallback(
    (item, opts) => {
      const sym = (typeof item === 'string' ? item : item?.symbol)?.toUpperCase?.() ?? item?.symbol;
      /* The search pill shows on every view; a ticker always opens Company. */
      if (view !== 'company') setView('company');
      setSelectedStock(sym);
      setViewMode('stock');
      setQuery('');
      clearSuggestions();
      completeTask('research_1');
      if (opts?.fromPeer) {
        completeTask('research_3');
        markChecklistView('watchlist.compare_two');
      }
    },
    [view, setView, setQuery, clearSuggestions, completeTask],
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

  /* Pick a tool inside the active tab (or the tab that offers it). */
  const selectTool = useCallback(
    (section, toolId) => {
      setTools((prev) => ({ ...prev, [section]: resolveTool(section, toolId) }));
      if (sectionState.active !== section) openSection(section);
    },
    [openSection, sectionState.active],
  );

  /* ValuationMethodSelector can recommend another model. */
  const handleOpenModel = useCallback(
    (toolId) => {
      const here = sectionState.active;
      const target =
        sectionHasTools(here) && resolveTool(here, toolId) === toolId
          ? here
          : sectionForTool(toolId);
      if (target) selectTool(target, toolId);
    },
    [sectionState.active, selectTool],
  );

  /* Mirror the active tab's tool into ?tool= (dropped on tabs without tools). */
  useEffect(() => {
    const active = sectionState.active;
    const want = sectionHasTools(active) ? tools[active] : null;
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete('model');
    if (want) sp.set('tool', want);
    else sp.delete('tool');
    const next = sp.toString();
    if (next !== searchParams.toString()) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [sectionState.active, tools]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) clearSuggestions();
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [clearSuggestions]);

  const backToHeatmap = useCallback(() => {
    setViewMode('heatmap');
    setSelectedStock(null);
    try {
      window.marketChartWidget?.showHeatmap?.();
    } catch (_) {}
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
    selectTool('models', 'grpv');
  }, [handleSelectStock, selectTool]);

  /* Models and Valuation: the tool picker, then the selected tool. DCF uses
     the redesigned workbench (K, L, M, N); every other tool keeps its
     existing panel. */
  const renderToolSection = (section) => {
    const tool = resolveTool(section, tools[section]);
    return (
      <div className="rc-tool-section">
        <ToolPicker section={section} tool={tool} onSelect={(id) => selectTool(section, id)} />
        {tool === 'dcf' && research ? (
          <DcfWorkbench
            symbol={selectedStock}
            price={research.quote.price}
            peers={research.peers}
          />
        ) : (
          <AIAnalysisPanel
            key={`${section}-${tool}`}
            modelId={tool}
            symbol={selectedStock}
            onClose={() => selectTool(section, null)}
            onOpenModel={handleOpenModel}
            showTips={beginner?.showTips}
          />
        )}
      </div>
    );
  };

  /* One body per section tab. */
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
      case 'valuation':
        return renderToolSection(id);
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

  /* Search pill (Nov 10 2026): the page title and subtitle are gone; the
     Company / Industry / Portfolio toggle sits inside the pill, left of the
     filter icon, on every view. The h1 stays for screen readers only. */
  const searchPill = (
    <>
      <h1 className="crx-visually-hidden">Company and Portfolio Research</h1>
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
          trailing={<ViewToggle view={view} setView={setView} />}
        />
      </div>
    </>
  );

  if (view === 'industry' || view === 'portfolio') {
    return (
      <div className="dashboard-page-inset cr-page ez-canvas">
        <div className="crx-canvas">
          {searchPill}
          <MarketPortfolioView section={view} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page-inset cr-page ez-canvas">
      <div className="crx-canvas">
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

        {searchPill}

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
        </section>

        {/* Company view: hero and tabs on the left, the rail on the right,
            then industry and portfolio tools. Built on one snapshot
            (useCompanyResearch) so every card quotes the same numbers. */}
        {selectedStock && viewMode === 'stock' && research && (
          <div className="rc-page">
            <div className="rc-main">
              <div className="rc-left">
                <CompanyHero
                  data={research}
                  onHeatmap={backToHeatmap}
                  onWatchlist={openWatchlistModal}
                  onSendChart={
                    isOrgUser && hasPermission('send_to_team')
                      ? () => setSendChartTicker(selectedStock)
                      : null
                  }
                />
                {view === 'company' && <EducationTip topic="diversification" />}
                <SectionTabs state={sectionState} onOpen={openSection} />
                <SectionStack
                  state={sectionState}
                  order={sectionOrder}
                  onPin={pinSection}
                  renderSection={renderSection}
                  titles={{
                    models: `Run a model on ${selectedStock}`,
                    valuation: 'Valuation',
                  }}
                />
                <p className="crx-visually-hidden" aria-live="polite">
                  {sectionAnnouncement}
                </p>
              </div>

              <aside className="rc-right" aria-label={`${selectedStock} at a glance`}>
                <AnalystCard analyst={research.analyst} price={research.quote.price} />
                <KeyMetricsCard metrics={research.metrics} />
                <NewsCard news={research.news} onViewAll={() => openSection('news', 'News')} />
                <PinsCard pinned={sectionState.pinned} onOpen={openSection} />
              </aside>
            </div>

            <div className="rc-bottom">
              <IndustryResearchCard profile={research.profile} peers={research.peers} />
              <PortfolioToolsCard />
            </div>
          </div>
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
