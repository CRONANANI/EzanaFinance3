import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { eventTitle, eventBody, eventCountry } = await request.json();

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try { cookieStore.set(name, value, options); } catch {}
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // For now, return a structured placeholder analysis
    // Later this can call an AI API (Claude, OpenAI, etc.) with the event + portfolio context
    const analysis = `📊 PORTFOLIO IMPACT ANALYSIS

EVENT: ${eventTitle}
REGION: ${eventCountry}

🔍 IMPACT ON YOUR POSITIONS:
Based on this event, here's how your portfolio may be affected:

• If you hold positions in companies with significant exposure to ${eventCountry}, expect increased volatility in the short term.
• Sectors most likely impacted: Financials, Energy, and Technology.

📈 POTENTIAL OPPORTUNITIES:
• Watch for oversold conditions in affected sectors — these often present buying opportunities within 48-72 hours.
• Consider diversification into defensive sectors if the event signals prolonged uncertainty.

⚠️ CAUTIONS:
• Avoid making impulsive trades based on headlines alone — wait for market confirmation.
• Review your stop-loss levels on positions with direct exposure.
• Monitor related currency pairs for secondary effects.

💡 RECOMMENDATION:
Hold current positions unless directly exposed. Set price alerts on key levels and reassess after the market's initial reaction settles.

Note: This analysis is generated based on general market patterns. Always conduct your own research before making investment decisions.`;

    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json({ error: error.message, analysis: 'Analysis failed.' }, { status: 500 });
  }
}
