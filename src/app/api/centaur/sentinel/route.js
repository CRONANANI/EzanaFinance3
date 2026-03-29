import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { buildSentinelReportText } from '@/lib/sentinel-report';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
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
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '12', 10), 1), 48);

    const { data: rows, error } = await supabaseAdmin
      .from('sentinel_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('report_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Sentinel report fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch report' },
        { status: 500 }
      );
    }

    if (!rows?.length) {
      const defaultReport = await generateDefaultReport(user.id);
      return NextResponse.json({ report: defaultReport, reports: [defaultReport] });
    }

    return NextResponse.json({ report: rows[0], reports: rows });
  } catch (error) {
    console.error('Sentinel GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { report_text } = await request.json();

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
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Save report
    const { data, error } = await supabaseAdmin
      .from('sentinel_reports')
      .insert({
        user_id: user.id,
        report_text,
        report_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      console.error('Sentinel report save error:', error);
      return NextResponse.json(
        { error: 'Failed to save report' },
        { status: 500 }
      );
    }

    return NextResponse.json({ report: data });
  } catch (error) {
    console.error('Sentinel POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateDefaultReport(userId) {
  const today = new Date();

  const { data: holdings } = await supabaseAdmin
    .from('plaid_holdings')
    .select('ticker_symbol, quantity, institution_value, institution_price, institution_name, name')
    .eq('user_id', userId)
    .order('institution_value', { ascending: false })
    .limit(40);

  const rows = holdings || [];
  const totalValue = rows.reduce((s, h) => s + (Number(h.institution_value) || 0), 0);
  const report_text = buildSentinelReportText(rows, { totalValue });

  return {
    id: null,
    user_id: userId,
    report_text,
    report_date: today.toISOString().split('T')[0],
    created_at: today.toISOString(),
  };
}
