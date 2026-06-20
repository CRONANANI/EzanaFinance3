import { NextResponse } from 'next/server';
import { isMuxConfigured } from '@/lib/mux';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Tells the UI whether video hosting is wired up (Mux keys present). */
export async function GET() {
  return NextResponse.json({ configured: isMuxConfigured() });
}
