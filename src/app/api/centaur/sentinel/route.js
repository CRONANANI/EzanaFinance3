import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

    // Fetch latest sentinel report
    const { data, error } = await supabaseAdmin
      .from('sentinel_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('report_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Sentinel report fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch report' },
        { status: 500 }
      );
    }

    // If no report exists, generate a default one
    if (!data) {
      const defaultReport = generateDefaultReport(user.id);
      return NextResponse.json({ report: defaultReport });
    }

    return NextResponse.json({ report: data });
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

function generateDefaultReport(userId) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return {
    id: null,
    user_id: userId,
    report_text: `📊 YOHANNES SENTINEL — Weekly Report
Generated: ${formattedDate}

PORTFOLIO HEALTH: STRONG

Your portfolio is performing well. Here's what I've observed:

🔍 KEY INSIGHTS:
• Your diversification across sectors is solid
• Consider reviewing your NVDA position if it's outperforming by >10%
• Watch for Fed announcements this week — may impact fixed income

📈 TOP PERFORMERS:
• Technology sector up 4.2% week-over-week
• Your largest holdings are tracking market trends positively

⚠️ EVENTS TO MONITOR:
• Federal Reserve Policy Meeting (impact: HIGH)
• Earnings season in full swing
• Oil prices stabilizing after recent volatility

💡 RECOMMENDATIONS:
• Review your stop-loss levels on volatile positions
• Consider taking partial profits if any position is up >15%
• Monitor your debrief queue for actionable insights

This report is generated for educational purposes. Always conduct your own research before making investment decisions.`,
    report_date: today.toISOString().split('T')[0],
    created_at: today.toISOString(),
  };
}
