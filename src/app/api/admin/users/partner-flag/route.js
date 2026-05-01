import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/plaid';
import { isAdminUser } from '@/lib/admin-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/users/partner-flag
 * Body: { userId: string, isPartner: boolean }
 */
export async function POST(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const userId = body?.userId;
    const isPartner = Boolean(body?.isPartner);
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ is_partner: isPartner })
      .eq('id', userId)
      .select('id, username, full_name, is_partner')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, profile: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
