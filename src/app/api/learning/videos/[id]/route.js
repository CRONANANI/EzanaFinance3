/**
 * /api/learning/videos/[id]
 * GET    → owner status check; lazily reconciles with Mux (upload → asset →
 *          playback id) so it works even without webhooks
 * DELETE → owner removes the video (and the Mux asset)
 */
import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import {
  isMuxConfigured,
  getUpload,
  getAsset,
  deleteAsset,
  summarizeAsset,
  mapVideoRow,
} from '@/lib/mux';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const admin = getAdminClient();

export async function GET(request, { params }) {
  try {
    const { user } = await requireUser(request);
    const { data: row } = await admin
      .from('course_videos')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (row.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let updated = row;
    const pending = row.status !== 'ready' && row.status !== 'errored';
    if (isMuxConfigured() && pending) {
      let assetId = row.mux_asset_id;
      if (!assetId && row.mux_upload_id) {
        try {
          const up = await getUpload(row.mux_upload_id);
          assetId = up?.asset_id || null;
          if (!assetId && up?.status === 'errored') {
            const { data: u } = await admin
              .from('course_videos')
              .update({ status: 'errored', updated_at: new Date().toISOString() })
              .eq('id', row.id)
              .select('*')
              .single();
            if (u) updated = u;
          }
        } catch {
          /* transient */
        }
      }
      if (assetId) {
        try {
          const s = summarizeAsset(await getAsset(assetId));
          const { data: u } = await admin
            .from('course_videos')
            .update({
              mux_asset_id: s.assetId,
              mux_playback_id: s.playbackId,
              status: s.status,
              duration_seconds: s.duration,
              aspect_ratio: s.aspectRatio,
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id)
            .select('*')
            .single();
          if (u) updated = u;
        } catch {
          /* transient */
        }
      }
    }

    return NextResponse.json({ video: mapVideoRow(updated) });
  } catch (e) {
    if (e?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[mux] video GET:', e?.message || e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { user } = await requireUser(request);
    const { data: row } = await admin
      .from('course_videos')
      .select('id, owner_id, mux_asset_id')
      .eq('id', params.id)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (row.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (isMuxConfigured() && row.mux_asset_id) await deleteAsset(row.mux_asset_id);
    await admin.from('course_videos').delete().eq('id', row.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[mux] video DELETE:', e?.message || e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
