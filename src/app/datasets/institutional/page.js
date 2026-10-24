import { Suspense } from 'react';
import {
  getConvergence,
  getFilingCurve,
  getInstitutionalOverview,
  getInstitutionalOverviewFor,
  getLagTax,
  mapInstitutionalPayload,
} from '@/lib/titans/store';
import { netBreadth } from '@/lib/titans/institutional-model';
import { ALLOW_SAMPLE } from '@/lib/titans/format';
import { currentReportQuarter, latestCompleteQuarter } from '@/lib/sec/quarters';
import { getFilingProgress } from '@/lib/datasets/institutional/filingProgress';
import InstitutionalClient from './InstitutionalClient';
import fixture from './institutional-fixture.sample.json';

/**
 * Institutional Holdings (13F), Oct 2026 redesign
 * (docs: institutional-handoff). Server component: loads the latest complete
 * quarter's snapshot, the open quarter's partial snapshot when one exists,
 * the filing curve, the lag-tax prices and the convergence signals, and
 * hands plain rows to the client. Empty overview -> honest empty states; the
 * SAMPLE fixture renders only under NEXT_PUBLIC_ALLOW_SAMPLE_DATA with its
 * chip, and never attaches figures to a real filer.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Institutional holdings (13F) | Ezana',
  description:
    'Every 13F-HR on EDGAR: what managers held at quarter end, what changed against the prior quarter, who is buying against who is selling, and who is filing for the quarter now underway.',
};

export default async function InstitutionalDatasetPage() {
  const now = new Date();
  const completeQ = latestCompleteQuarter(now);
  const openQ = currentReportQuarter(now);

  /* Each read settles on its own. They used to share one Promise.all, so a
     single failure (Oct 22: the filing-curve function was missing from the
     database) threw away the overview that HAD loaded and the whole page
     rendered empty. Now a failed read only empties its own cards. */
  const [overviewRes, openRes, curveRes, progressRes] = await Promise.allSettled([
    getInstitutionalOverview(),
    openQ !== completeQ ? getInstitutionalOverviewFor(openQ) : Promise.resolve(null),
    openQ !== completeQ ? getFilingCurve(openQ) : Promise.resolve(null),
    getFilingProgress(),
  ]);
  const settled = (res, label) => {
    if (res.status === 'fulfilled') return res.value;
    console.error(`[titans] institutional ${label}:`, res.reason?.message || res.reason);
    return null;
  };
  let overview = settled(overviewRes, 'overview');
  const openOverview = settled(openRes, 'open quarter');
  let curve = settled(curveRes, 'filing curve');
  const progress = settled(progressRes, 'filing progress');

  let sampled = false;
  if (!overview && ALLOW_SAMPLE) {
    overview = mapInstitutionalPayload(fixture.overview, { key: `institutional:${completeQ}` });
    curve = fixture.filing_curve || null;
    sampled = true;
  }

  /* The lag tax and the convergence board read the top net-breadth tickers. */
  const topBreadth = (overview?.breadth || [])
    .filter((b) => b.ticker)
    .sort((a, b) => netBreadth(b) - netBreadth(a))
    .slice(0, 10);
  let lag = {};
  let convergence = {};
  if (!sampled && topBreadth.length) {
    const tickers = topBreadth.map((b) => b.ticker);
    const [lagRes, convRes] = await Promise.allSettled([
      getLagTax(tickers, overview.quarter),
      getConvergence(tickers, overview.quarter),
    ]);
    lag = settled(lagRes, 'lag tax') || {};
    convergence = settled(convRes, 'convergence') || {};
  } else if (sampled) {
    lag = Object.fromEntries((fixture.lag?.rows || []).map((r) => [r.ticker, r.pct_since]));
    convergence = Object.fromEntries(
      (fixture.convergence || []).map((r) => [
        r.ticker,
        {
          insider: r.insider ? { buys: r.insider, sells: 0, latest: null } : null,
          congress: r.congress ? { buys: r.congress, sells: 0 } : null,
          activist: r.activist ? { pct: null, form: null } : null,
          etf: null,
        },
      ]),
    );
  }

  return (
    <Suspense fallback={null}>
      <InstitutionalClient
        overview={overview}
        openOverview={openOverview}
        curve={curve}
        lag={lag}
        convergence={convergence}
        openQuarter={openQ !== completeQ ? openQ : null}
        progress={sampled ? null : progress}
        sampled={sampled}
      />
    </Suspense>
  );
}
