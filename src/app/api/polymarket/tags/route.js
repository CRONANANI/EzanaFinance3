import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/polymarket/tags
 *
 * Proxies https://gamma-api.polymarket.com/tags
 */
export async function GET() {
  try {
    const res = await fetch('https://gamma-api.polymarket.com/tags', {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `upstream ${res.status}`, tags: [] }, { status: res.status });
    }

    const data = await res.json();
    const list = Array.isArray(data) ? data : [];

    const tags = list
      .filter((t) => t.label && !t.forceHide)
      .map((t) => ({
        id: String(t.id),
        label: t.label,
        slug: t.slug || '',
      }));

    return NextResponse.json({ tags });
  } catch (e) {
    console.error('[polymarket/tags]', e);
    return NextResponse.json({ error: e.message, tags: [] }, { status: 500 });
  }
}
