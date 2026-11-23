import { getEchoHubCached } from '@/lib/echo/hub-cache';
import { parseFilters } from '@/lib/echo/home-feed';
import EchoHomeClient from './EchoHomeClient';
import { BRAND_COPY, SITE_URL } from '@/lib/brand';

/* The publication itself, for search engines: a CollectionPage of Echo's articles,
   published by Ezana Finance (the Organization in the root layout's graph). */
const ECHO_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${SITE_URL}/ezana-echo#publication`,
  name: BRAND_COPY.echo.name,
  url: `${SITE_URL}/ezana-echo`,
  description: BRAND_COPY.echo.about,
  inLanguage: 'en',
  isPartOf: { '@id': `${SITE_URL}/#website` },
  publisher: { '@id': `${SITE_URL}/#organization` },
  about: [
    'Financial markets',
    'Macroeconomics',
    'Corporate strategy',
    'Technology and finance',
    'Geopolitics',
    'Financial institutions',
  ],
};

/* Server-rendered so the hero, Most read and the first bento row are in the
   HTML. The hub comes from the data cache (five minutes, tag echo-hub); the
   filters come from the URL, so a shared filtered link renders filtered. */
export default async function EzanaEchoPage({ searchParams }) {
  let initialHub = null;
  try {
    initialHub = await getEchoHubCached();
  } catch (e) {
    console.error('[echo] home hub:', e?.message || e);
  }
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams || {})) if (typeof v === 'string') qs.set(k, v);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(ECHO_JSON_LD).replace(/</g, '\\u003c'),
        }}
      />
      <EchoHomeClient initialHub={initialHub} initialFilters={parseFilters(qs)} now={Date.now()} />
    </>
  );
}
