import { getEchoHubCached } from '@/lib/echo/hub-cache';
import { parseFilters } from '@/lib/echo/home-feed';
import EchoHomeClient from './EchoHomeClient';

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
    <EchoHomeClient initialHub={initialHub} initialFilters={parseFilters(qs)} now={Date.now()} />
  );
}
