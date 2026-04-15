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
    email_hint: row._email_hint || null,
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

    // ── Search profiles by full_name ──
    const { data: byFull, error: e1 } = await supabaseAdmin
      .from('profiles')
      .select(cols)
      .ilike('full_name', pattern)
      .limit(10);

    if (e1) console.error('community search full_name', e1);

    // ── Search profiles by display_name in user_settings ──
    const { data: bySettings, error: e2 } = await supabaseAdmin
      .from('profiles')
      .select(cols)
      .filter('user_settings->display_name', 'ilike', pattern)
      .limit(10);

    if (e2) console.error('community search display_name', e2);

    // ── Search profiles by username ──
    const { data: byUsername, error: e3 } = await supabaseAdmin
      .from('profiles')
      .select(cols)
      .ilike('username', pattern)
      .limit(10);

    if (e3) console.error('community search username', e3);

    // ── Search by email via profiles.email column ──
    // The profiles table has an `email` column that is set during signup/verification.
    let byEmail = [];
    if (raw.includes('@') || raw.includes('.')) {
      // Only search email if the query looks like it could be an email fragment
      const { data: emailRows, error: e4 } = await supabaseAdmin
        .from('profiles')
        .select(`${cols}, email`)
        .ilike('email', pattern)
        .limit(10);

      if (e4) {
        console.error('community search email', e4);
      } else {
        byEmail = (emailRows || []).map((r) => {
          // Mask the email for privacy: show first 3 chars + domain
          const email = r.email || '';
          const [local, domain] = email.split('@');
          const masked = local
            ? local.slice(0, 3) + '***@' + (domain || '')
            : '';
          return { ...r, _email_hint: masked };
        });
      }
    }

    // ── Merge and deduplicate ──
    const seen = new Set();
    const merged = [];
    for (const row of [...(byFull || []), ...(bySettings || []), ...(byUsername || []), ...byEmail]) {
      if (!row || seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(mapRow(row));
      if (merged.length >= 15) break;
    }

    return NextResponse.json({ users: merged });
  } catch (e) {
    console.error('community search', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
