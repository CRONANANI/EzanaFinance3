'use client';

/**
 * SonarAdaptiveVisual (Nov 28 2026): draws one item of the presentation plan
 * (lib/sonar/presentation/planner.js) with the registry component it was matched to, inside
 * the shared component frame. Each chart family is its own code-split chunk (next/dynamic),
 * so an answer loads only the components it uses; the frame reserves the registry's minimum
 * height while the chunk loads, so nothing jumps.
 *
 * Also exports SonarUnavailableAnalyses: the honest notice for analyses the question asked
 * for that could not render (no placeholder chart is ever drawn in their place).
 */
import dynamic from 'next/dynamic';
import { getComponent } from '@/lib/sonar/presentation/registry';
import { SonarComponentFrame, SonarComponentSkeleton } from './SonarComponentFrame';

const wait = (h) => {
  const Loading = () => <SonarComponentSkeleton height={h} />;
  Loading.displayName = `SonarComponentLoading${h}`;
  return Loading;
};

/* The approved implementations, by registry `impl` key. Nothing else can be rendered. */
const IMPL = {
  SonarFinancialResearchTable: dynamic(
    () =>
      import('../charts/SonarFinancialResearchTable').then((m) => m.SonarFinancialResearchTable),
    { loading: wait(200) },
  ),
  SonarRankingEvolutionChart: dynamic(
    () => import('../charts/SonarRankingEvolutionChart').then((m) => m.SonarRankingEvolutionChart),
    { loading: wait(260) },
  ),
  SonarExposureBreakdown: dynamic(
    () => import('../charts/SonarExposureBreakdown').then((m) => m.SonarExposureBreakdown),
    { loading: wait(240) },
  ),
  SonarFinancialActivityMatrix: dynamic(
    () =>
      import('../charts/SonarFinancialActivityMatrix').then((m) => m.SonarFinancialActivityMatrix),
    { loading: wait(200) },
  ),
  SonarInvestmentUniverseHeatmap: dynamic(
    () =>
      import('../charts/SonarInvestmentUniverseHeatmap').then(
        (m) => m.SonarInvestmentUniverseHeatmap,
      ),
    { loading: wait(320), ssr: false },
  ),
  SonarResearchSecuritiesMonitor: dynamic(
    () =>
      import('../charts/SonarResearchSecuritiesMonitor').then(
        (m) => m.SonarResearchSecuritiesMonitor,
      ),
    { loading: wait(220) },
  ),
  SonarActivityTimeline: dynamic(
    () => import('../charts/SonarActivityTimeline').then((m) => m.SonarActivityTimeline),
    { loading: wait(260) },
  ),
  /* Sonar for organizations (Nov 28 2026): the council cards. */
  SonarOrgChecklistCard: dynamic(
    () => import('../cards/SonarOrgChecklistCard').then((m) => m.SonarOrgChecklistCard),
    { loading: wait(200) },
  ),
  SonarVersionComparison: dynamic(
    () => import('../cards/SonarVersionComparison').then((m) => m.SonarVersionComparison),
    { loading: wait(220) },
  ),
  SonarFinancialMetricCard: dynamic(
    () => import('../cards/SonarFinancialMetricCard').then((m) => m.SonarFinancialMetricCard),
    { loading: wait(60) },
  ),
};

/**
 * item  a presentation plan item with componentId (planPresentation().items)
 * onAsk optional follow-up runner, for components that offer "Ask about"
 */
export function SonarAdaptiveVisual({ item, onAsk = null }) {
  const c = getComponent(item?.componentId);
  if (!c) return null;
  const Impl = IMPL[c.impl];
  if (!Impl) return null;
  /* A metric card is its own compact surface, not a framed chart. */
  if (c.id === 'financial-metric-card') return <Impl payload={item.payload} />;
  if (c.impl === 'SonarFinancialResearchTable') {
    const d = item.payload?.data || {};
    return (
      <SonarComponentFrame
        payload={item.payload}
        state={item.state}
        reason={item.reason}
        takeaway={item.spec?.takeaway}
        views={['chart']}
        wide
      >
        {() => (
          <Impl
            columns={d.columns}
            rows={d.rows}
            caption={item.payload?.title}
            exportable={Boolean(d.exportable && item.payload?.access?.entitled)}
            selectable
          />
        )}
      </SonarComponentFrame>
    );
  }
  return (
    <SonarComponentFrame
      payload={item.payload}
      state={item.state}
      reason={item.reason}
      takeaway={item.spec?.takeaway}
      views={item.views}
      wide={(item.span?.wide || 0) >= 12}
    >
      {() => <Impl payload={item.payload} onAsk={onAsk} />}
    </SonarComponentFrame>
  );
}

/** Analyses the question asked for that had too little data to draw. */
export function SonarUnavailableAnalyses({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="srl" aria-label="Analyses not shown">
      <h3 className="srl-title">Not shown</h3>
      <ul className="srl-feed">
        {items.map((u) => (
          <li key={u.id} style={{ gridTemplateColumns: 'minmax(140px, 32%) minmax(0, 1fr)' }}>
            <span style={{ fontWeight: 600, color: 'var(--srl-text)' }}>{u.title}</span>
            <span>{u.reason || 'The data for this analysis could not be retrieved.'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default SonarAdaptiveVisual;
