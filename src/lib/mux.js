/**
 * Minimal Mux Video integration (no SDK) — talks to the Mux REST API with
 * Basic auth. Everything here is env-gated: when MUX_TOKEN_ID /
 * MUX_TOKEN_SECRET are absent, isMuxConfigured() is false and callers should
 * degrade gracefully instead of throwing.
 *
 * Required env to activate:
 *   MUX_TOKEN_ID, MUX_TOKEN_SECRET            (API access token)
 *   MUX_WEBHOOK_SECRET                        (optional, to verify webhooks)
 */
import crypto from 'crypto';

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;
const MUX_WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET;
const MUX_API = 'https://api.mux.com';

export function isMuxConfigured() {
  return Boolean(MUX_TOKEN_ID && MUX_TOKEN_SECRET);
}

function authHeader() {
  const basic = Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64');
  return `Basic ${basic}`;
}

async function muxFetch(path, options = {}) {
  if (!isMuxConfigured()) throw new Error('Mux is not configured');
  const res = await fetch(`${MUX_API}${path}`, {
    ...options,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.messages?.join(', ') || json?.message || `Mux API ${res.status}`;
    throw new Error(msg);
  }
  return json.data;
}

/**
 * Create a direct upload — returns { id, url }. The browser PUTs the file to
 * `url`; Mux then creates an asset and (via webhook) reports a playback id.
 */
export function createDirectUpload({ corsOrigin = '*', playbackPolicy = 'public' } = {}) {
  return muxFetch('/video/v1/uploads', {
    method: 'POST',
    body: JSON.stringify({
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policy: [playbackPolicy],
        encoding_tier: 'baseline',
      },
    }),
  });
}

export function getUpload(uploadId) {
  return muxFetch(`/video/v1/uploads/${uploadId}`);
}

export function getAsset(assetId) {
  return muxFetch(`/video/v1/assets/${assetId}`);
}

export async function deleteAsset(assetId) {
  if (!assetId) return;
  try {
    await muxFetch(`/video/v1/assets/${assetId}`, { method: 'DELETE' });
  } catch {
    /* best effort */
  }
}

/**
 * Reduce a Mux asset to the fields we persist.
 * status: 'preparing' | 'ready' | 'errored'
 */
export function summarizeAsset(asset) {
  if (!asset) return null;
  const playback = Array.isArray(asset.playback_ids) ? asset.playback_ids[0] : null;
  return {
    assetId: asset.id,
    playbackId: playback?.id || null,
    status:
      asset.status === 'ready' ? 'ready' : asset.status === 'errored' ? 'errored' : 'processing',
    duration: typeof asset.duration === 'number' ? asset.duration : null,
    aspectRatio: asset.aspect_ratio || null,
  };
}

/** Map a course_videos row to the client shape. */
export function mapVideoRow(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description || '',
    status: r.status,
    playbackId: r.mux_playback_id || null,
    duration: r.duration_seconds != null ? Number(r.duration_seconds) : null,
    aspectRatio: r.aspect_ratio || null,
    createdAt: r.created_at,
  };
}

/** Verify a Mux webhook signature (Mux-Signature: t=...,v1=...). */
export function verifyMuxSignature(rawBody, signatureHeader) {
  if (!MUX_WEBHOOK_SECRET) return true; // no secret set — accept (dev/setup)
  if (!signatureHeader) return false;
  try {
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((kv) => kv.split('=').map((s) => s.trim())),
    );
    if (!parts.t || !parts.v1) return false;
    const expected = crypto
      .createHmac('sha256', MUX_WEBHOOK_SECRET)
      .update(`${parts.t}.${rawBody}`)
      .digest('hex');
    const a = Buffer.from(parts.v1);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
