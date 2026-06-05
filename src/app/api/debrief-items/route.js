import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request, user) => {
    try {
      const { event_title, event_body, event_country, event_url, event_time, analysis } =
        await request.json();

      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                try {
                  cookieStore.set(name, value, options);
                } catch {}
              });
            },
          },
        },
      );

      // Insert into debrief_items table
      const { data, error } = await supabase
        .from('debrief_items')
        .insert({
          user_id: user.id,
          event_title,
          event_body,
          event_country,
          event_url,
          event_time,
          analysis,
          reviewed: false,
        })
        .select();

      if (error) {
        console.error('Debrief item insert error:', error);
        return NextResponse.json({ error: 'Failed to save debrief item' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: data[0],
      });
    } catch (error) {
      console.error('Debrief API error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);

export const GET = withApiGuard(
  async (request, user) => {
    try {
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                try {
                  cookieStore.set(name, value, options);
                } catch {}
              });
            },
          },
        },
      );

      // Fetch user's debrief items
      const { data, error } = await supabase
        .from('debrief_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Debrief fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch debrief items' }, { status: 500 });
      }

      return NextResponse.json({ items: data || [] });
    } catch (error) {
      console.error('Debrief GET API error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
