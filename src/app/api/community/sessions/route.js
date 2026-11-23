/**
 * /api/community/sessions (Nov 23, 2026): community research sessions,
 * workshops and discussions, with RSVPs.
 *   GET  ?scope=upcoming|past&limit=   community_sessions_list (the join link
 *        only for registered members)
 *   POST { session_id, going }         community_session_rsvp: checks the
 *        session is scheduled, has not started and has room, under a row
 *        lock, for the signed-in member only.
 * Sessions are created by admins. Until the v3 migration is applied, GET
 * answers { rows: [], unavailable: true } and POST refuses.
 */
import { NextResponse } from 'next/server';
import { withSession, PRIVATE } from '@/lib/community/route-session';
import { isMissingSchema } from '@/lib/community/v3';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const shape = (r) => ({
  id: r.id,
  title: r.title,
  description: r.description || '',
  session_type: r.session_type,
  starts_at: r.starts_at,
  ends_at: r.ends_at,
  timezone: r.timezone || 'America/New_York',
  capacity: r.capacity == null ? null : Number(r.capacity),
  join_url: r.join_url || null,
  status: r.status,
  rsvp_count: Number(r.rsvp_count) || 0,
  my_rsvp: Boolean(r.my_rsvp),
});

export async function GET(request) {
  return withSession(request, 'sessions', async ({ supabase }) => {
    const sp = new URL(request.url).searchParams;
    const scope = sp.get('scope') === 'past' ? 'past' : 'upcoming';
    const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '20', 10) || 20));
    const { data, error } = await supabase.rpc('community_sessions_list', {
      p_scope: scope,
      p_limit: limit,
    });
    if (error) {
      if (isMissingSchema(error))
        return NextResponse.json({ scope, rows: [], unavailable: true }, { headers: PRIVATE });
      throw new Error(error.message);
    }
    return NextResponse.json({ scope, rows: (data || []).map(shape) }, { headers: PRIVATE });
  });
}

const RSVP_ERRORS = {
  session_full: 'This session is full.',
  session_started: 'This session has already started.',
  session_cancelled: 'This session was cancelled.',
  session_not_found: 'That session was not found.',
};

export async function POST(request) {
  return withSession(request, 'sessions rsvp', async ({ supabase }) => {
    const body = await request.json().catch(() => ({}));
    const id = typeof body?.session_id === 'string' ? body.session_id : '';
    if (!UUID.test(id))
      return NextResponse.json(
        { error: 'That session was not found.' },
        { status: 400, headers: PRIVATE },
      );
    const { data, error } = await supabase.rpc('community_session_rsvp', {
      p_session: id,
      p_going: body?.going !== false,
    });
    if (error) {
      if (isMissingSchema(error))
        return NextResponse.json(
          { error: 'Registration is not open yet.' },
          { status: 503, headers: PRIVATE },
        );
      const key = Object.keys(RSVP_ERRORS).find((k) => String(error.message).includes(k));
      if (key)
        return NextResponse.json({ error: RSVP_ERRORS[key] }, { status: 409, headers: PRIVATE });
      throw new Error(error.message);
    }
    const row = (Array.isArray(data) ? data[0] : data) || {};
    return NextResponse.json(
      { going: Boolean(row.going), rsvp_count: Number(row.rsvp_count) || 0 },
      { headers: PRIVATE },
    );
  });
}
