/**
 * /api/mux/webhook — Mux asset lifecycle events. Updates course_videos when an
 * upload's asset is created, becomes ready (playback id available), or errors.
 * Configure this URL in the Mux dashboard and set MUX_WEBHOOK_SECRET.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { verifyMuxSignature, summarizeAsset } from '@/lib/mux';
import { recordFailedJob } from '@/lib/cron/failed-jobs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* Every write is checked: a failed update answers 500 so Mux retries the
   event (it retries non-2xx for up to 24 h). Events we ignore on purpose
   still answer 200. */
async function write(query) {
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function POST(request) {
  let raw;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  if (!verifyMuxSignature(raw, request.headers.get('mux-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = event?.type;
  const data = event?.data || {};
  const now = new Date().toISOString();

  try {
    const admin = getAdminClient();
    if (type === 'video.upload.asset_created') {
      // data.id = upload id, data.asset_id = new asset id
      if (data.id) {
        await write(
          admin
            .from('course_videos')
            .update({ mux_asset_id: data.asset_id || null, status: 'processing', updated_at: now })
            .eq('mux_upload_id', data.id),
        );
      }
    } else if (type === 'video.asset.ready' || type === 'video.asset.updated') {
      const s = summarizeAsset(data);
      const patch = {
        mux_asset_id: s.assetId,
        mux_playback_id: s.playbackId,
        status: s.status,
        duration_seconds: s.duration,
        aspect_ratio: s.aspectRatio,
        updated_at: now,
      };
      if (s.assetId) {
        await write(admin.from('course_videos').update(patch).eq('mux_asset_id', s.assetId));
      }
      if (data.upload_id) {
        await write(admin.from('course_videos').update(patch).eq('mux_upload_id', data.upload_id));
      }
    } else if (type === 'video.asset.errored') {
      if (data.id) {
        await write(
          admin
            .from('course_videos')
            .update({ status: 'errored', updated_at: now })
            .eq('mux_asset_id', data.id),
        );
      }
    }
  } catch (e) {
    console.error('[mux] webhook handler:', e?.message || e);
    await recordFailedJob({ job: 'webhook:mux', error: e, payload: { type, id: data.id || null } });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
