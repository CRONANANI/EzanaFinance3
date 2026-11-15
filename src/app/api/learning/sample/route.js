/**
 * GET /api/learning/sample   sample content for the Learning Center hub
 *
 * { sample: null } for every member. Master admin and demo accounts (the
 * same check the Community page uses, on the verified session) get the
 * sample bundle from src/lib/learning/demo-hub.js, so the page can be
 * presented from an account with no learning activity. Nothing is read from
 * or written to the database here.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { buildLearningSample } from '@/lib/learning/demo-hub';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) =>
    NextResponse.json(
      { sample: isCommunityDemoViewer(user) ? buildLearningSample() : null },
      { headers: { 'Cache-Control': 'private, no-store' } },
    ),
  { requireAuth: true },
);
