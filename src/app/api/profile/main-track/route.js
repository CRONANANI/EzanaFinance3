import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const VALID_TRACKS = ['stocks', 'crypto', 'betting', 'commodities', 'risk'];

export async function GET() {
  try {
    const supabase = getUserClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_settings')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({
      main_track: profile?.user_settings?.learning_main_track || 'stocks',
    });
  } catch {
    return NextResponse.json({ main_track: 'stocks' });
  }
}

export const POST = withApiGuard(
  async (request, user) => {
    try {
      const supabase = getUserClient();
      const body = await request.json().catch(() => null);
      const track = body?.track;

      if (!VALID_TRACKS.includes(track)) {
        return NextResponse.json({ error: 'invalid track' }, { status: 400 });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_settings')
        .eq('id', user.id)
        .maybeSingle();

      const newSettings = { ...(profile?.user_settings || {}), learning_main_track: track };

      await supabase.from('profiles').update({ user_settings: newSettings }).eq('id', user.id);

      return NextResponse.json({ ok: true, main_track: track });
    } catch (err) {
      console.error('[profile/main-track]', err);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
