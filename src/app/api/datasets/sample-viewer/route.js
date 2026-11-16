/**
 * GET /api/datasets/sample-viewer -> { sample: boolean }
 *
 * Tells a dataset page whether the caller may see labelled sample content.
 * Only master admin and demo accounts may (isCommunityDemoViewer, the same
 * check the Community and org sample routes use). Everyone else, signed in or
 * not, gets { sample: false } and the page shows its honest empty state.
 *
 * UI gate only: sample rows are invented placeholders, never real records, and
 * nothing done to them is saved. Signed-out callers are answered without a
 * session lookup error.
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  let sample = false;
  try {
    const user = await getCurrentUser(request);
    sample = isCommunityDemoViewer(user);
  } catch {
    sample = false;
  }
  return NextResponse.json({ sample }, { headers: { 'Cache-Control': 'private, no-store' } });
}
