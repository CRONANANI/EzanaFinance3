/**
 * GET /api/watchlist/politicians?ids=A000001,B000002   members with their latest trades
 * GET /api/watchlist/politicians?q=pelosi              name search for the add flow
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { exceptionResponse } from '@/lib/api-errors';
import { politiciansWithTrades, searchPoliticians } from '@/lib/watchlist/politicians';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const admin = getAdminClient();
      const q = searchParams.get('q');
      if (q != null) {
        return NextResponse.json({ results: await searchPoliticians(admin, q) });
      }
      const ids = (searchParams.get('ids') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return NextResponse.json(
        { politicians: await politiciansWithTrades(admin, ids) },
        { headers: { 'Cache-Control': 'private, max-age=300' } },
      );
    } catch (e) {
      return exceptionResponse('watchlist politicians GET', e);
    }
  },
  { requireAuth: true },
);
