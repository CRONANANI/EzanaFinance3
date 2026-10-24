import { timed } from '@/lib/perf/timed';
import { shortDate } from '@/lib/titans/format';
import {
  getNewestAdditions,
  getSanctionsNewsPulses,
  getSanctionsPage,
  getSanctionsSummary,
  getSanctionsTrends,
} from '@/lib/sanctions/summary';
import {
  getIngestStatus,
  getOfacActions,
  getSanctionsActivity,
  getSanctionsCoverage,
  getSanctionsKpis,
  getSanctionsNewsFeed,
  getTargetActivity,
  searchSanctions,
} from '@/lib/sanctions/research';
import { worldCountries } from '@/lib/sanctions/world-map';
import SanctionsClient from './SanctionsClient';

/**
 * Sanctions & Trade Policy Tracking: a sanctions intelligence page over the
 * whole OFAC Specially Designated Nationals list (US Treasury). Aggregates
 * are computed on the server and cached (revalidated by the ingest jobs via
 * the 'sanctions' tag); the listings explorer pages through
 * /api/datasets/sanctions. Every read degrades to an explicit unavailable
 * state, never a guessed number.
 */
export const dynamic = 'force-dynamic';

const NO_SEARCH = {
  type: '',
  country: '',
  program: '',
  q: '',
  ident: '',
  from: '',
  to: '',
  risk: false,
  linked: false,
  linkedTo: '',
  page: 1,
};

export default async function SanctionsPage() {
  /* The summary used to be awaited alone before every other read (only
     getNewestAdditions and getTargetActivity actually need it), serializing
     two full round trips. The independent reads now overlap it. */
  const [summary, search, trends, pulses, kpis, activity, actions, news, coverage, status] =
    await Promise.all([
      timed('/datasets/sanctions', getSanctionsSummary, 'getSanctionsSummary')(),
      timed('/datasets/sanctions', searchSanctions, 'searchSanctions')(NO_SEARCH),
      timed('/datasets/sanctions', getSanctionsTrends, 'getSanctionsTrends')(),
      timed('/datasets/sanctions', getSanctionsNewsPulses, 'getSanctionsNewsPulses')(),
      timed('/datasets/sanctions', getSanctionsKpis, 'getSanctionsKpis')(),
      timed('/datasets/sanctions', getSanctionsActivity, 'getSanctionsActivity')(
        24,
        null,
        null,
        null,
      ),
      timed('/datasets/sanctions', getOfacActions, 'getOfacActions')(30),
      timed('/datasets/sanctions', getSanctionsNewsFeed, 'getSanctionsNewsFeed')(30),
      timed('/datasets/sanctions', getSanctionsCoverage, 'getSanctionsCoverage')(),
      timed('/datasets/sanctions', getIngestStatus, 'getIngestStatus')(),
    ]);
  const targetMap = Object.fromEntries(summary.targets.map((t) => [t.name, t.codes]));
  const [newest, targetActivity] = await Promise.all([
    timed('/datasets/sanctions', getNewestAdditions, 'getNewestAdditions')(summary.baseline, 30),
    timed('/datasets/sanctions', getTargetActivity, 'getTargetActivity')(targetMap, 365),
  ]);
  /* Before the research functions are installed, the first page comes from
     the original listing query. */
  const firstPage =
    search.research === false
      ? {
          ...(await timed(
            '/datasets/sanctions',
            getSanctionsPage,
            'getSanctionsPage',
          )({ page: 1 })),
          research: false,
        }
      : search;
  const hasDates = Boolean(kpis && kpis.active_dated > 0);

  return (
    <SanctionsClient
      summary={summary}
      firstPage={firstPage}
      newest={newest}
      map={worldCountries()}
      trends={trends}
      pulses={pulses}
      kpis={kpis}
      activity={activity}
      targetActivity={hasDates ? targetActivity : null}
      actions={actions}
      news={news}
      coverage={coverage}
      status={status}
      nowIso={new Date().toISOString()}
      baselineLabel={shortDate(summary.baseline)}
    />
  );
}
