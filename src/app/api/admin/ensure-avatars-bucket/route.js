import { NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/ensure-avatars-bucket
 *
 * Idempotently ensures the `avatars` storage bucket exists in Supabase.
 * Uses the service-role key (server-only). RLS policies must still come from
 * migrations / SQL (this route only creates the bucket).
 */
export async function POST() {
  try {
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            'Service role client unavailable. Check SUPABASE_SERVICE_ROLE_KEY env var.',
        },
        { status: 500 },
      );
    }

    const supabase = createServerSupabaseClient();

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
    return NextResponse.json(
      { error: err?.message || 'Unknown error' },
      { status: 500 },
    );
  }
}
