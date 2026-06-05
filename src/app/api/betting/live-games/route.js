/**
 * GET /api/betting/live-games?sport=NBA
 *
 * Returns today's / upcoming real games for a given league. The
 * /betting-markets page calls this once per sport on mount and uses
 * the response to drive the odds board + Live Events stat card.
 *
 * Today this is a placeholder: it ships the route surface, normalized
 * response shape, and league mapping so the client can already render
 * the live/final/scheduled UI states, but the upstream call returns an
 * empty array until SPORTRADAR_API_KEY (or whichever provider we
 * settle on) is wired up. The client treats empty arrays as "no games
 * scheduled" and falls through to the ODDS_DATA_FALLBACK in the page,
 * which itself is empty — the page renders an empty board, not stale
 * mock playoff games from 2024.
 *
 * To finish wiring real data, replace the body of `fetchFromSportsApi`
 * with the actual provider call (SportRadar, ESPN public API, etc.)
 * and map their game shape to: { home, away, status, score, win_probability,
 * local_start, start_time }.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

// UI sport label → upstream league code.
const LEAGUE_MAP = {
  NFL: 'nfl',
  NBA: 'nba',
  NHL: 'nhl',
  MLB: 'mlb',
  Soccer: 'epl',
};

async function fetchFromSportsApi(_league) {
  // Placeholder — see file docstring. Returning [] is intentional, not
  // a bug. Swap in the real provider call when SPORTRADAR_API_KEY (or
  // similar) is provisioned on Vercel.
  return [];
}

export const GET = withApiGuard(
  async (request) => {
    const { searchParams } = new URL(request.url);
    const sport = (searchParams.get('sport') || 'NBA').toUpperCase();

    try {
      const games = await fetchFromSportsApi(LEAGUE_MAP[sport] || 'nba');
      return NextResponse.json(
        { ok: true, sport, games },
        {
          // Edge-cache for a minute; game data turns over fast during live play.
          headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
        },
      );
    } catch (err) {
      console.error('[betting/live-games]', err);
      return NextResponse.json(
        { ok: false, error: err.message, games: [] },
        {
          status: 500,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        },
      );
    }
  },
  { requireAuth: false },
);
