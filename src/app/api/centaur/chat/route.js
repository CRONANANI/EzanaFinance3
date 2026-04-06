import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { RAY_DALIO_SYSTEM_PROMPT } from '@/lib/rayDalioSystemPrompt';

export const dynamic = 'force-dynamic';

const ANTHROPIC_MODEL = 'claude-sonnet-4-5';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/**
 * Claude 4.x: first message must be `user`, last must be `user` (no assistant prefill),
 * no empty content; merge consecutive same-role turns.
 */
function sanitiseMessages(rawMessages) {
  let msgs = rawMessages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content.trim() : String(m.content ?? '').trim(),
    }))
    .filter((m) => m.content.length > 0);

  while (msgs.length > 0 && msgs[0].role === 'assistant') {
    msgs = msgs.slice(1);
  }

  while (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
    msgs = msgs.slice(0, -1);
  }

  const collapsed = [];
  for (const msg of msgs) {
    if (collapsed.length > 0 && collapsed[collapsed.length - 1].role === msg.role) {
      collapsed[collapsed.length - 1].content += `\n${msg.content}`;
    } else {
      collapsed.push({ ...msg });
    }
  }

  return collapsed;
}

function getYohannesPrompt(portfolioContext, debriefContext) {
  return `You are Yohannes, an AI investment advisor for the Ezana Finance platform. You are knowledgeable, professional, and helpful. You speak with authority but always remind users that your advice is for educational purposes only.

The user's current portfolio:
${portfolioContext || 'No holdings detected.'}

Recent events in their debrief queue:
${debriefContext || 'No pending debrief items.'}

Always reference the user's actual holdings when giving advice. Be specific about their positions. Keep responses concise (2-3 paragraphs max).`;
}

function getWarrenBuffettPrompt(portfolioContext) {
  return `You are Warren Buffett — Chairman and CEO of Berkshire Hathaway, the most successful long-term value investor in history. You speak with folksy wisdom, use simple analogies from everyday life, and always return to your core principles.

Your core principles:
- Only invest in businesses you understand completely
- Buy wonderful companies at fair prices, not fair companies at wonderful prices
- Your favourite holding period is forever
- Be fearful when others are greedy, be greedy when others are fearful
- The stock market is a device for transferring money from the impatient to the patient
- Never invest in a business you cannot understand
- Price is what you pay, value is what you get
- Rule #1: Never lose money. Rule #2: Never forget Rule #1.
- You look for businesses with durable competitive advantages — "moats"
- Strong free cash flow, low debt, honest management, simple business models

You speak in plain English, use homespun analogies, reference Omaha and Nebraska, and occasionally mention Charlie Munger. You are never short-term focused — you always think in decades.

${portfolioContext ? `\nThe user's portfolio for reference:\n${portfolioContext}` : ''}`;
}

function getCathieWoodPrompt(portfolioContext) {
  return `You are Cathie Wood — founder and CEO of ARK Invest, champion of disruptive innovation investing. You are deeply enthusiastic about exponential technology curves and 5-year price targets.

Your core philosophy:
- Focus exclusively on disruptive innovation: AI, genomics, robotics, energy storage, blockchain
- Technology follows Wright's Law — costs fall exponentially with cumulative production
- Convergence of multiple technologies creates compounding disruption
- Traditional valuation methods miss the exponential growth potential of platform businesses
- Your time horizon is always 5 years minimum
- You believe we are in the most significant technological transformation since the industrial revolution
- Electric vehicles, autonomous driving, AI, CRISPR, fintech, and digital wallets are your key themes

You speak with infectious optimism about the future. You reference your 5-year price targets, cite specific cost curves, and use phrases like "in our innovation universe" and "the convergence of these technologies."

${portfolioContext ? `\nThe user's portfolio for reference:\n${portfolioContext}` : ''}`;
}

function getPaulTudorJonesPrompt(portfolioContext) {
  return `You are Paul Tudor Jones — founder of Tudor Investment Corp, legendary macro trader. You are intensely focused on risk management, price action, and macro catalysts.

Your core principles:
- Losers average losers — never add to a losing position
- The most important rule: play great defence, not great offence
- 5:1 risk/reward ratio minimum on every trade
- Technical analysis and price action are the language of the market
- Macro events drive everything — central banks, geopolitics, commodity cycles
- You watch 200-day moving averages and key technical levels obsessively
- Cut losses quickly, let winners run
- "I am always thinking about losing money rather than making money"
- The market can remain irrational longer than you can remain solvent
- Be humble and nimble — the market is always right

You speak with intensity and precision. You talk about specific levels, stop-losses, and risk/reward. You reference your famous trade shorting the 1987 crash as a reference point for discipline.

${portfolioContext ? `\nThe user's portfolio for reference:\n${portfolioContext}` : ''}`;
}

function getRayDalioPromptWithContext(portfolioContext, debriefContext) {
  const userContextBlock = `
---
## User portfolio (for context only; stay in character)
${portfolioContext || 'No holdings detected.'}

## Debrief queue
${debriefContext || 'No pending debrief items.'}
`;
  return `${RAY_DALIO_SYSTEM_PROMPT}\n${userContextBlock}`;
}

/**
 * Resolve boardroom persona from `investor` or legacy `persona` body fields.
 */
function resolveSystemPrompt(investor, persona, portfolioContext, debriefContext) {
  const raw = investor ?? persona ?? 'yohannes';
  const name = String(raw).toLowerCase().trim();

  if (!name || name === 'yohannes') {
    return getYohannesPrompt(portfolioContext, debriefContext);
  }

  if (name.includes('dalio') || name.includes('ray dalio')) {
    return getRayDalioPromptWithContext(portfolioContext, debriefContext);
  }
  if (name.includes('buffett') || name.includes('warren')) {
    return getWarrenBuffettPrompt(portfolioContext);
  }
  if (name.includes('wood') || name.includes('cathie')) {
    return getCathieWoodPrompt(portfolioContext);
  }
  if (name.includes('tudor') || name.includes('paul')) {
    return getPaulTudorJonesPrompt(portfolioContext);
  }

  return `You are a legendary investor channeling the philosophy of ${raw}. Review the user's portfolio with that lens.

The user's current portfolio:
${portfolioContext || 'No holdings detected.'}

${debriefContext ? `Recent events to consider:\n${debriefContext}` : ''}

Give specific, actionable insights. Keep responses focused (2-3 paragraphs).`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { messages, investor, persona } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ reply: 'No messages provided.' }, { status: 400 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[centaur/chat] ANTHROPIC_API_KEY set:', Boolean(process.env.ANTHROPIC_API_KEY));
    }

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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: holdings } = await supabaseAdmin
      .from('plaid_holdings')
      .select('ticker_symbol, quantity, cost_basis, price_per_unit')
      .eq('user_id', user.id);

    const portfolioContext = (holdings || [])
      .map((h) => `${h.ticker_symbol}: ${h.quantity} shares, cost basis $${h.cost_basis}, current ~$${h.price_per_unit}`)
      .join('\n');

    const rawPersona = investor ?? persona ?? 'yohannes';
    const nameLower = String(rawPersona).toLowerCase().trim();
    const isYohannes = !nameLower || nameLower === 'yohannes';

    const { data: debriefItems } = await supabaseAdmin
      .from('debrief_items')
      .select('event_title, event_country, analysis')
      .eq('user_id', user.id)
      .eq('reviewed', false)
      .order('created_at', { ascending: false })
      .limit(5);

    const debriefContext = (debriefItems || []).map((d) => `- ${d.event_title} (${d.event_country})`).join('\n');

    const systemPrompt = resolveSystemPrompt(investor, persona, portfolioContext, debriefContext);

    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('[centaur/chat] ANTHROPIC_API_KEY not configured, using fallback response');
      const fallbackReply =
        isYohannes
          ? "I appreciate your question! However, my AI backend isn't currently configured. In the meantime, I'd recommend reviewing your portfolio fundamentals and keeping an eye on the events in your debrief queue. Would you like to discuss any specific holdings?"
          : nameLower.includes('dalio')
            ? "I want to be clear — my full AI backend isn't configured here, so I can't give you the depth I'd like. When it's live, we'll walk through cycles, debt, and the world order with real rigor. In the meantime, what's on your mind about macro or your portfolio?"
            : `Thank you for asking! I'd need my AI systems fully configured to give you a complete perspective. Based on what I see in your portfolio, though, the fundamentals look worth exploring further. What specific position would you like to discuss?`;

      return NextResponse.json({ reply: fallbackReply });
    }

    const sanitisedMessages = sanitiseMessages(messages);

    if (sanitisedMessages.length === 0) {
      return NextResponse.json({ reply: 'Please send a message to get started.' }, { status: 400 });
    }

    const firstRole = sanitisedMessages[0].role;
    const lastRole = sanitisedMessages[sanitisedMessages.length - 1].role;
    if (firstRole !== 'user' || lastRole !== 'user') {
      console.error('[centaur/chat] Invalid message roles after sanitise:', {
        firstRole,
        lastRole,
        sanitisedMessages,
      });
      return NextResponse.json(
        { reply: 'Invalid conversation state. Please refresh and try again.' },
        { status: 400 },
      );
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: sanitisedMessages,
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      let errorBody = {};
      try {
        errorBody = JSON.parse(errorText);
      } catch {
        errorBody = { raw: errorText };
      }
      console.error('[centaur/chat] Anthropic error detail:', JSON.stringify(errorBody, null, 2));
      console.error('[centaur/chat] Messages sent:', JSON.stringify(sanitisedMessages, null, 2));
      const msg =
        errorBody?.error?.message ||
        (typeof errorBody?.raw === 'string' ? errorBody.raw.slice(0, 200) : null) ||
        String(anthropicResponse.status);
      return NextResponse.json({ reply: `AI error: ${msg}` }, { status: 500 });
    }

    const data = await anthropicResponse.json();
    if (process.env.NODE_ENV === 'development') {
      console.log('[centaur/chat] Anthropic response shape:', JSON.stringify(data).slice(0, 280));
    }

    const reply = data?.content?.[0]?.text;
    if (!reply) {
      console.error('[centaur/chat] Unexpected Anthropic response structure:', JSON.stringify(data));
      return NextResponse.json(
        { reply: 'I received an unexpected response from the AI. Please try again.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('[centaur/chat] Caught error:', error);
    return NextResponse.json(
      { reply: 'Something went wrong on our end. Please try again in a moment.' },
      { status: 500 },
    );
  }
}
