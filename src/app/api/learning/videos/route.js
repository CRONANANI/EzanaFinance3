/**
 * /api/learning/videos
 * GET  → the current user's videos (+ whether Mux is configured)
 * POST → start a Mux direct upload and create a pending video row
 */
import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { sanitizeInput } from '@/lib/sanitize';
import { isMuxConfigured, createDirectUpload, mapVideoRow } from '@/lib/mux';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const admin = getAdminClient();

export async function GET(request) {
  try {
    const { user } = await requireUser(request);
    const { data } = await admin
      .from('course_videos')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    return NextResponse.json({
      videos: (data || []).map(mapVideoRow),
      configured: isMuxConfigured(),
    });
  } catch (e) {
    if (e?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[mux] videos GET:', e?.message || e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user } = await requireUser(request);

    if (!isMuxConfigured()) {
      return NextResponse.json(
        { error: 'Video hosting is not configured yet.', configured: false },
        { status: 503 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const title = sanitizeInput(String(body.title || 'Untitled video').trim()).slice(0, 160);
    const description = body.description
      ? sanitizeInput(String(body.description).trim()).slice(0, 1000)
      : null;

    const origin = request.headers.get('origin') || '*';
    const upload = await createDirectUpload({ corsOrigin: origin });

    const { data: row, error } = await admin
      .from('course_videos')
      .insert({
        owner_id: user.id,
        title,
        description,
        mux_upload_id: upload.id,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      console.error('[mux] videos insert:', error.message);
      return NextResponse.json({ error: 'Failed to start upload' }, { status: 500 });
    }

    return NextResponse.json({ video: mapVideoRow(row), uploadUrl: upload.url });
  } catch (e) {
    if (e?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[mux] videos POST:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
