import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

function mapRow(row) {
  const s = row.user_settings || {};
  const privacyOk = s.privacy_show_profile !== false;
  const fromSettings = (s.display_name || '').trim();
  const fromColumn = (row.full_name || '').trim();
  const displayName = privacyOk ? fromColumn || fromSettings || 'Member' : 'Member';
  return {
    id: row.id,
    username: row.username || '',
    full_name: displayName,
    avatar_url: privacyOk ? s.avatar_url || '' : '',
    bio: privacyOk ? (s.bio || '').slice(0, 160) : '',
    is_partner: row.is_partner === true,
    partner_type: row.partner_type || null,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = (searchParams.get('q') || '').trim();
    if (raw.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const pattern = `%${raw}%`;
    const cols = 'id, username, full_name, user_settings, is_partner, partner_type';

    const { data: byFull, error: e1 } = await supabaseAdmin
      .from('profiles')
      .select(cols)
      .ilike('full_name', pattern)
      .limit(10);

    if (e1) {
      console.error('community search full_name', e1);
    }

    const { data: bySettings, error: e2 } = await supabaseAdmin
      .from('profiles')
      .select(cols)
      .filter('user_settings->display_name', 'ilike', pattern)
      .limit(10);

    if (e2) {
      console.error('community search display_name', e2);
    }

    const seen = new Set();
    const merged = [];
    for (const row of [...(byFull || []), ...(bySettings || [])]) {
      if (!row || seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(mapRow(row));
      if (merged.length >= 10) break;
    }

    return NextResponse.json({ users: merged });
  } catch (e) {
    console.error('community search', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
