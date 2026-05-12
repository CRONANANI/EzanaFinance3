import { NextResponse } from 'next/server';
import { Country } from 'country-state-city';

/* Returns the full list of ISO countries as [{ code, name }, ...].
   Cached aggressively because the data is static. */
export const dynamic = 'force-static';
export const revalidate = 60 * 60 * 24 * 30; /* 30 days */

export async function GET() {
  const countries = Country.getAllCountries()
    .map((c) => ({ code: c.isoCode, name: c.name, flag: c.flag }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(
    { countries },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=86400',
      },
    },
  );
}
