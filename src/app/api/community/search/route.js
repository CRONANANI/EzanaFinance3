import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = (searchParams.get('q') || '').trim().toLowerCase();
    if (raw.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const { data: recent, error } = await supabaseAdmin
      .from('profiles')
      .select('id, user_settings')
      .order('created_at', { ascending: false })
      .limit(1500);

    if (error) {
      console.error('community search', error);
      return NextResponse.json({ users: [] });
    }

    const filtered = (recent || [])
      .filter((p) => {
        const dn = (p.user_settings?.display_name || '').toLowerCase();
        return dn.includes(raw);
      })
      .slice(0, 10);

    const users = filtered.map((row) => {
      const s = row.user_settings || {};
      const privacyOk = s.privacy_show_profile !== false;
      const displayName = (s.display_name || '').trim() || 'Member';
      return {
        id: row.id,
        full_name: privacyOk ? displayName : 'Member',
        avatar_url: privacyOk ? s.avatar_url || '' : '',
        bio: privacyOk ? (s.bio || '').slice(0, 160) : '',
      };
    });

    return NextResponse.json({ users });
  } catch (e) {
    console.error('community search', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
