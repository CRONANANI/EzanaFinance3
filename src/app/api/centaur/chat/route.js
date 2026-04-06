import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { RAY_DALIO_SYSTEM_PROMPT } from '@/lib/rayDalioSystemPrompt';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { messages, persona = 'yohannes' } = await request.json();

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

    // Fetch user's portfolio
    const { data: holdings } = await supabaseAdmin
      .from('plaid_holdings')
      .select('ticker_symbol, quantity, cost_basis, price_per_unit')
      .eq('user_id', user.id);

    // Fetch debrief items
    const { data: debriefItems } = await supabaseAdmin
      .from('debrief_items')
      .select('event_title, event_country, analysis')
      .eq('user_id', user.id)
      .eq('reviewed', false)
      .order('created_at', { ascending: false })
      .limit(5);

    const portfolioContext = (holdings || [])
      .map(h => `${h.ticker_symbol}: ${h.quantity} shares, cost basis $${h.cost_basis}, current ~$${h.price_per_unit}`)
      .join('\n');

    const debriefContext = (debriefItems || [])
      .map(d => `- ${d.event_title} (${d.event_country})`)
      .join('\n');

    // Get investor persona details for boardroom mode
    const investorPersonas = {
      'Warren Buffett': 'Value investing perspective focusing on long-term fundamentals, dividend yields, and margin of safety',
      'Ray Dalio': 'Macro analysis and asset allocation perspective, studying global economic trends and correlations',
      'Cathie Wood': 'Disruptive innovation and growth perspective, focusing on emerging technology and paradigm shifts',
      'Paul Tudor Jones': 'Macro trading perspective, using technical analysis and trend-following strategies',
    };

    const personaStyle = investorPersonas[persona] || 'professional investment advisor';

    // Prepare system prompt (Ray Dalio uses dedicated Changing World Order prompt + context)
    const userContextBlock = `
---
## User portfolio (for context only; stay in character)
${portfolioContext || 'No holdings detected.'}

## Debrief queue
${debriefContext || 'No pending debrief items.'}
`;

    let systemPrompt;
    if (persona === 'yohannes') {
      systemPrompt = `You are Yohannes, an AI investment advisor for the Ezana Finance platform. You are knowledgeable, professional, and helpful. You speak with authority but always remind users that your advice is for educational purposes only.

The user's current portfolio:
${portfolioContext || 'No holdings detected.'}

Recent events in their debrief queue:
${debriefContext || 'No pending debrief items.'}

Always reference the user's actual holdings when giving advice. Be specific about their positions. Keep responses concise (2-3 paragraphs max).`;
    } else if (persona === 'Ray Dalio') {
      systemPrompt = `${RAY_DALIO_SYSTEM_PROMPT}\n${userContextBlock}`;
    } else {
      systemPrompt = `You are a legendary investor channeling the philosophy of ${persona}. Review the user's portfolio from a ${personaStyle} perspective.

The user's current portfolio:
${portfolioContext || 'No holdings detected.'}

${debriefContext ? `Recent events to consider:\n${debriefContext}` : ''}

Give specific, actionable insights based on ${persona}'s known investment approach. Keep responses focused and insightful (2-3 paragraphs).`;
    }

    // Check if Anthropic API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('ANTHROPIC_API_KEY not configured, using fallback response');
      const fallbackReply =
        persona === 'yohannes'
          ? "I appreciate your question! However, my AI backend isn't currently configured. In the meantime, I'd recommend reviewing your portfolio fundamentals and keeping an eye on the events in your debrief queue. Would you like to discuss any specific holdings?"
          : persona === 'Ray Dalio'
            ? "I want to be clear — my full AI backend isn't configured here, so I can't give you the depth I'd like. When it's live, we'll walk through cycles, debt, and the world order with real rigor. In the meantime, what's on your mind about macro or your portfolio?"
            : `Thank you for asking! I'd need my AI systems fully configured to give you a complete perspective. Based on what I see in your portfolio, though, the fundamentals look worth exploring further. What specific position would you like to discuss?`;

      return NextResponse.json({ reply: fallbackReply });
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      console.error('Anthropic API error:', response.status, await response.text());
      return NextResponse.json(
        { reply: 'I encountered an issue processing your request. Please try again.' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'I apologize, I was unable to process your request.';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Centaur chat error:', error);
    return NextResponse.json(
      { reply: 'I encountered an error. Please try again.' },
      { status: 500 }
    );
  }
}
