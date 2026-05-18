import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function authorizeAdminRequest(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const adminOk = process.env.ADMIN_LOCK_SECRET && token === process.env.ADMIN_LOCK_SECRET;
  const cronOk = process.env.CRON_SECRET && token === process.env.CRON_SECRET;
  return adminOk || cronOk;
}

/**
 * POST /api/admin/ensure-avatars-bucket
 *
 * Idempotently ensures the `avatars` storage bucket exists in Supabase.
 * Uses the service-role key (server-only). RLS policies must still come from
 * migrations / SQL (this route only creates the bucket).
 *
 * Authorization: Bearer ADMIN_LOCK_SECRET or CRON_SECRET
 */
export async function POST(request) {
  try {
    if (!authorizeAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let supabase;
    try {
      supabase = getAdminClient();
    } catch {
      return NextResponse.json(
        {
          error: 'Service role client unavailable. Check SUPABASE_SERVICE_ROLE_KEY env var.',
        },
        { status: 500 },
      );
    }

    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) {
      return NextResponse.json(
        { error: `Failed to list buckets: ${listErr.message}` },
        { status: 500 },
      );
    }

    const exists = buckets?.some((b) => b.id === 'avatars' || b.name === 'avatars');

    if (exists) {
      return NextResponse.json({
        success: true,
        message: 'Avatars bucket already exists',
        created: false,
      });
    }

    const { error: createErr } = await supabase.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 2 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    });

    if (createErr) {
      return NextResponse.json(
        { error: `Failed to create bucket: ${createErr.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Avatars bucket created',
      created: true,
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
