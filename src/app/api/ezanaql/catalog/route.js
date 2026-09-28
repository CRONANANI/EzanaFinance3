/**
 * GET /api/ezanaql/catalog, what is queryable, before anyone writes a query.
 *
 * Public and cached: it is a description of the catalog, not of anyone's data,
 * so there is nothing here that varies by viewer. It exists so the builder can
 * show availability honestly rather than letting a visitor discover it by
 * writing a query that gets refused.
 *
 * `available` is the whole point of the payload. A dataset is live only when
 * its query path is wired AND its table has rows; one that is bound but empty
 * reports false, because a live badge on an empty dataset turns "nothing has
 * been ingested" into "there is nothing to find".
 */
import { NextResponse } from 'next/server';
import { CATALOG, CATALOG_GAPS, CATALOG_VERSION } from '@/lib/ezanaql/catalog';

export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const datasets = Object.values(CATALOG).map((d) => ({
    name: d.name,
    label: d.label,
    source: d.source,
    access: d.access,
    available: d.available,
    /* The dimension a dataset belongs to, taken from the prefix of its name
       rather than a second list that could drift from it. */
    group: d.name.split('.')[0],
    fields: Object.entries(d.fields || {}).map(([name, meta]) => ({
      name,
      type: meta.type,
      ...(meta.enum ? { enum: meta.enum } : {}),
      ...(meta.nullable ? { nullable: true } : {}),
      ...(meta.derived ? { derived: true } : {}),
      /* Flagged so a caller can label it rather than print it as a figure. */
      ...(meta.estimate ? { estimate: true } : {}),
    })),
    ...(CATALOG_GAPS[d.name] ? { gaps: CATALOG_GAPS[d.name] } : {}),
  }));

  return NextResponse.json(
    {
      ok: true,
      version: CATALOG_VERSION,
      counts: {
        total: datasets.length,
        available: datasets.filter((d) => d.available).length,
      },
      datasets,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
