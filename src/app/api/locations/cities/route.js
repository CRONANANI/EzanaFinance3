import { NextResponse } from 'next/server';
import { City } from 'country-state-city';

/* GET /api/locations/cities?country=US
   Returns every city for the given ISO country code as a de-duplicated,
   alphabetically-sorted [{ name, stateCode }] list.

   Route is dynamic because the response depends on the `country` query string,
   but every (country -> cities) pair is immutable, so we serve aggressive
   public Cache-Control headers and let the CDN handle re-use. */
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const url = new URL(request.url);
  const country = (url.searchParams.get('country') || '').toUpperCase();

  if (!country) {
    return NextResponse.json({ cities: [] });
  }

  const raw = City.getCitiesOfCountry(country) || [];

  /* Dedupe by city name (case-insensitive) so the dropdown isn't filled with
     "Springfield (IL), Springfield (MA), Springfield (MO)…" duplicates. */
  const seen = new Set();
  const cities = [];
  for (const c of raw) {
    const key = c.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cities.push({ name: c.name, stateCode: c.stateCode || null });
  }
  cities.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(
    { country, cities },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=86400',
      },
    },
  );
}
