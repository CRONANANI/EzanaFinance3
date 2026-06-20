/**
 * /api/echo/series — Echo article series (collections).
 * GET  ?slug=         → a series + its published articles (public)
 *      ?mine=true      → the current writer's series
 *      ?ownerId=       → a given owner's series
 * POST                 → create a series (approved Echo writers only)
 */
import { NextResponse } from 'next/server';
import { requireUser, getCurrentUser, getAdminClient } from '@/lib/supabase';
import { sanitizeInput } from '@/lib/sanitize';
import { getSeriesBySlug, listSeriesByOwner } from '@/lib/echo-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const admin = getAdminClient();

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function isApprovedWriter(userId) {
  const { data } = await admin
    .from('partners')
    .select('echo_writer_approved')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data?.echo_writer_approved;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (slug) {
      const data = await getSeriesBySlug(slug);
      if (!data) return NextResponse.json({ error: 'Series not found' }, { status: 404 });
      return NextResponse.json(data);
    }

    const ownerId = searchParams.get('ownerId');
    if (ownerId) {
      return NextResponse.json({ series: await listSeriesByOwner(ownerId) });
    }

    if (searchParams.get('mine') === 'true') {
      const user = await getCurrentUser(request);
      if (!user) return NextResponse.json({ series: [] });
      return NextResponse.json({ series: await listSeriesByOwner(user.id) });
    }

    return NextResponse.json({ series: [] });
  } catch (e) {
    console.error('[echo] series GET:', e?.message || e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user } = await requireUser(request);
    if (!(await isApprovedWriter(user.id))) {
      return NextResponse.json({ error: 'Approved Echo writers only' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const title = sanitizeInput(String(body.title || '').trim()).slice(0, 120);
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const description = body.description
      ? sanitizeInput(String(body.description).trim()).slice(0, 400)
      : null;
    const cover_image_url =
      typeof body.coverImageUrl === 'string' ? body.coverImageUrl.slice(0, 500) : null;
    const slug = `${slugify(title)}-${Date.now().toString(36)}`;

    const { data: series, error } = await admin
      .from('echo_series')
      .insert({ owner_id: user.id, title, slug, description, cover_image_url })
      .select('id, title, slug, description, cover_image_url, created_at')
      .single();

    if (error) {
      console.error('[echo] series insert:', error.message);
      return NextResponse.json({ error: 'Failed to create series' }, { status: 500 });
    }
    return NextResponse.json({ series });
  } catch (e) {
    if (e?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[echo] series POST:', e?.message || e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
