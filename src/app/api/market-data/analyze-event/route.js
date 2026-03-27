import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { eventTitle, eventBody, eventCountry, eventUrl, eventTime } = await request.json();

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

    // Fetch user's portfolio holdings
    const { data: holdings } = await supabase
      .from('plaid_holdings')
      .select('ticker_symbol, quantity, cost_basis, price_per_unit')
      .eq('user_id', user.id);

    const holdingsList = (holdings || []).map(h => h.ticker_symbol).join(', ');

    // Generate analysis that references user's actual holdings
    const analysis = `📊 PORTFOLIO IMPACT ANALYSIS

EVENT: ${eventTitle}
REGION: ${eventCountry}

YOUR HOLDINGS: ${holdingsList || 'No holdings detected'}

🔍 IMPACT ON YOUR POSITIONS:
${holdings && holdings.length > 0
      ? `Based on your current holdings (${holdingsList}), here's how this event may affect you:\n\n` +
        holdings.map(h => `• ${h.ticker_symbol}: ${h.quantity} shares @ $${parseFloat(h.price_per_unit || 0).toFixed(2)}. Watch for ${eventCountry}-related exposure.`).join('\n')
      : 'Connect your brokerage on the Trading page to see personalized portfolio impact analysis. For now, here are general insights:'
    }

📈 POTENTIAL OPPORTUNITIES:
• Watch for oversold conditions in affected sectors — these often present buying opportunities within 48-72 hours.
• Consider diversification into defensive sectors if the event signals prolonged uncertainty.
• Monitor currency impacts if you hold overseas positions.

⚠️ CAUTIONS:
• Avoid making impulsive trades based on headlines alone — wait for market confirmation.
• Review your stop-loss levels on positions with direct exposure to ${eventCountry}.
• Monitor related currency pairs for secondary effects.

💡 RECOMMENDATION:
Hold current positions unless directly exposed. Set price alerts on key levels and reassess after the market's initial reaction settles.

Note: This analysis is generated based on general market patterns and your holdings. Always conduct your own research before making investment decisions.`;

    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json({ error: error.message, analysis: 'Analysis failed.' }, { status: 500 });
  }
}
