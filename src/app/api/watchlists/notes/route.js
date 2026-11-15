/**
 * GET    /api/watchlists/notes?type=&ticker=   the caller's note for one asset ({ note } or { note: null })
 * GET    /api/watchlists/notes?listId=         the caller's notes for every item in one of their lists
 * PUT    /api/watchlists/notes                 create or replace a note (body validated by parseNote)
 * DELETE /api/watchlists/notes?type=&ticker=   delete the caller's note
 *
 * Logic: src/lib/watchlist/notes-server.js. Identity comes from the session;
 * a user id in the body is rejected by parseNote as an unknown field.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAuthContext } from '@/lib/supabase';
import { dbErrorResponse, exceptionResponse } from '@/lib/api-errors';
import {
  NoteError,
  deleteNote,
  getNote,
  listNotesForList,
  saveNote,
} from '@/lib/watchlist/notes-server';

export const dynamic = 'force-dynamic';

const PRIVATE = { headers: { 'Cache-Control': 'private, no-store' } };

const fail = (label, e) => {
  if (e instanceof NoteError) {
    return NextResponse.json(
      { error: e.message, ...(e.field ? { field: e.field } : {}) },
      { status: e.status },
    );
  }
  if (e?.code) return dbErrorResponse(label, e, { fallback: 'Could not save the note.' });
  return exceptionResponse(label, e);
};

export const GET = withApiGuard(
  async (request, user) => {
    try {
      const { supabase } = await getAuthContext(request);
      const sp = new URL(request.url).searchParams;
      const listId = sp.get('listId');
      if (listId) {
        return NextResponse.json(
          { notes: await listNotesForList(supabase, user.id, listId) },
          PRIVATE,
        );
      }
      const note = await getNote(supabase, user.id, {
        type: sp.get('type'),
        ticker: sp.get('ticker'),
      });
      return NextResponse.json({ note }, PRIVATE);
    } catch (e) {
      return fail('watchlist notes GET', e);
    }
  },
  { requireAuth: true },
);

export const PUT = withApiGuard(
  async (request, user) => {
    try {
      const { supabase } = await getAuthContext(request);
      const body = await request.json().catch(() => null);
      return NextResponse.json({ note: await saveNote(supabase, user.id, body) }, PRIVATE);
    } catch (e) {
      return fail('watchlist notes PUT', e);
    }
  },
  { requireAuth: true },
);

export const DELETE = withApiGuard(
  async (request, user) => {
    try {
      const { supabase } = await getAuthContext(request);
      const sp = new URL(request.url).searchParams;
      return NextResponse.json(
        await deleteNote(supabase, user.id, { type: sp.get('type'), ticker: sp.get('ticker') }),
      );
    } catch (e) {
      return fail('watchlist notes DELETE', e);
    }
  },
  { requireAuth: true },
);
