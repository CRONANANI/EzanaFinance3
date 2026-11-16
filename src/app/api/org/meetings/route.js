import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { memberHasPermission } from '@/lib/org-permissions-server';
import { loadMeetingsList } from './_loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const CATEGORIES = ['ic', 'sector', 'general', 'exec', 'education'];

/* GET /api/org/meetings: the whole library in one fetch (see _loader.js).
   Every meeting (lean, with reply counts and agenda size), the number of
   voting members, the Pitch Pipeline's committee sessions (read only, no
   ballot data), linkable pitches, whether a recorder is connected (managers
   only, never credentials) and what the viewer may do. No mock rows. */
export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { payload, error } = await loadMeetingsList(supabase, member);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json(payload);
  },
  { requireAuth: true },
);

/* POST /api/org/meetings — create a scheduled meeting (manager only).
   Optionally seeds the attendee roster (RSVP pending). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }
    if (!(await memberHasPermission(supabase, member, 'create_events'))) {
      return NextResponse.json({ error: 'create_events permission required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const title = (body?.title || '').trim();
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const category = CATEGORIES.includes(body?.category) ? body.category : 'general';
    const agenda = Array.isArray(body?.agenda) ? body.agenda : [];

    const insert = {
      org_id: member.org_id,
      title: title.slice(0, 160),
      status: 'scheduled',
      category,
      started_by: member.user_id,
      agenda,
      minutes: [],
      scheduled_at: body?.scheduled_at || null,
      location: body?.location ? String(body.location).slice(0, 200) : null,
      team_id: body?.team_id || null,
      quorum_pct:
        Number.isFinite(Number(body?.quorum_pct)) && body.quorum_pct !== null
          ? Math.max(0, Math.min(100, Math.round(Number(body.quorum_pct))))
          : null,
      pitch_id: body?.pitch_id || null,
    };

    const { data, error } = await supabase.from('org_meetings').insert(insert).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Seed attendees if provided (member_ids from the org chart).
    const memberIds = Array.isArray(body?.attendee_member_ids)
      ? [...new Set(body.attendee_member_ids.filter(Boolean))]
      : [];
    if (memberIds.length > 0) {
      await supabase.from('org_meeting_attendees').insert(
        memberIds.map((mid) => ({
          meeting_id: data.id,
          org_id: member.org_id,
          member_id: mid,
          rsvp: 'pending',
        })),
      );
    }

    return NextResponse.json({ meeting: data });
  },
  { requireAuth: true },
);
