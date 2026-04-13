import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';
const MAX_ARTICLE_CHARS = 6000; // cap to keep prompt size reasonable
const MAX_HOLDINGS = 25; // cap holdings list length

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Try to fetch the full article body from its URL. Returns null on any failure.
 * We never throw here — the caller falls back to eventBody if this returns null.
 */
async function tryFetchArticle(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      // Set a UA so wire services / paywalls don't immediately 403 us
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EzanaFinance/1.0)' },
      // Prevent Next.js from caching the article fetch
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Strip scripts/styles, then collapse all HTML tags. Crude but adequate
    // for feeding the LLM — we're not trying to render it, just give it text.
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!stripped) return null;
    return stripped.slice(0, MAX_ARTICLE_CHARS);
  } catch {
    return null;
  }
}

/**
 * Resolve the user's holdings: live Plaid first, mock portfolio second.
 * Returns { source: 'brokerage'|'mock'|'none', holdings: [{ ticker, qty, price?, costBasis? }] }
 */
async function loadHoldings(supabase, userId) {
  // Priority 1: Plaid live holdings (schema: ticker, quantity, price, cost_basis; some rows use ticker_symbol)
  const { data: plaid } = await supabase.from('plaid_holdings').select('*').eq('user_id', userId);

  if (Array.isArray(plaid) && plaid.length > 0) {
    return {
      source: 'brokerage',
      holdings: plaid.slice(0, MAX_HOLDINGS).map((h) => ({
        ticker: h.ticker_symbol || h.ticker || '',
        qty: Number(h.quantity) || 0,
        price: Number(h.price_per_unit ?? h.price) || 0,
        costBasis: Number(h.cost_basis) || 0,
      })),
    };
  }

  // Priority 2: mock portfolio (stored as JSONB blob)
  const admin = getAdminClient();
  if (admin) {
    const { data: row } = await admin
      .from('mock_portfolios')
      .select('portfolio')
      .eq('user_id', userId)
      .maybeSingle();

    const portfolio = row?.portfolio;
    // The mock portfolio JSONB is { positions: { TICKER: {...}, ... }, ... }
    // Defensive: tolerate both an object map and an array shape.
    const positions = portfolio?.positions;
    const list = [];
    if (positions && typeof positions === 'object' && !Array.isArray(positions)) {
      for (const [ticker, p] of Object.entries(positions)) {
        list.push({
          ticker,
          qty: Number(p?.shares ?? p?.qty ?? 0) || 0,
          price: Number(p?.currentPrice ?? p?.price ?? 0) || 0,
          costBasis: Number(p?.avgCost ?? p?.costBasis ?? 0) || 0,
        });
      }
    } else if (Array.isArray(positions)) {
      for (const p of positions) {
        list.push({
          ticker: p?.ticker || p?.symbol || '',
          qty: Number(p?.shares ?? p?.qty ?? 0) || 0,
          price: Number(p?.currentPrice ?? p?.price ?? 0) || 0,
          costBasis: Number(p?.avgCost ?? p?.costBasis ?? 0) || 0,
        });
      }
    }
    if (list.length > 0) {
      return { source: 'mock', holdings: list.slice(0, MAX_HOLDINGS) };
    }
  }

  return { source: 'none', holdings: [] };
}

function formatHoldingsForPrompt({ source, holdings }) {
  if (holdings.length === 0) {
    return 'The user has no portfolio holdings on record (no brokerage connected and no mock portfolio).';
  }
  const lines = holdings.map(
    (h) =>
      `- ${h.ticker}: ${h.qty} shares` +
      (h.costBasis ? ` (avg cost $${h.costBasis.toFixed(2)})` : '') +
      (h.price ? ` (current $${h.price.toFixed(2)})` : ''),
  );
  const sourceLabel =
    source === 'brokerage' ? 'live brokerage account (Plaid)' : 'mock portfolio';
  return `User portfolio (from ${sourceLabel}):\n${lines.join('\n')}`;
}

function buildPrompt({ eventTitle, eventCountry, articleText, holdingsBlock }) {
  return `You are a market-analysis assistant for an investing app. The user has clicked "Analyze" on a news article in their market intelligence feed. Read the article carefully and write a concise, plain-English impact analysis tailored to this specific user's portfolio.

ARTICLE TITLE: ${eventTitle || '(no title)'}
ARTICLE REGION: ${eventCountry || 'Global'}

ARTICLE CONTENT:
${articleText}

${holdingsBlock}

Write your analysis using EXACTLY this structure (use these headers verbatim):

📊 SUMMARY
One paragraph (3-5 sentences) explaining what the article actually says — not generic statements.

🎯 IMPACT ON YOUR PORTFOLIO
If the user has holdings, name the SPECIFIC tickers in their portfolio that are most exposed to the events in the article and explain why (sector, geography, supply chain, customer base, etc.). If a holding has no plausible connection to the article, do not mention it. If the user has no holdings, say so once and continue with the general impact analysis below.

📈 OPPORTUNITIES
2-3 specific, actionable observations tied to the article's content. Avoid generic advice like "watch for oversold conditions" — say what specifically might benefit and why.

⚠️ RISKS
2-3 specific risks tied to the article's content for the user's positions. Again, no generic boilerplate — refer to actual sectors, regions, or company exposures.

💡 BOTTOM LINE
One sentence with a clear takeaway: are the events bullish, bearish, or neutral for this specific portfolio, and is any action warranted?

Important rules:
- Reference the user's actual tickers by name when relevant.
- Do NOT use phrases like "watch for X-related exposure" or "monitor currency impacts" unless you can name the specific currency/ticker/sector and why.
- Do NOT recommend specific trades — observations only.
- Keep the total response under 450 words.
- Plain text only, no markdown formatting beyond the section headers above.`;
}

export async function POST(request) {
  try {
    const { eventTitle, eventBody, eventCountry, eventUrl } = await request.json();

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

    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('[analyze-event] ANTHROPIC_API_KEY not configured');
      return NextResponse.json(
        { analysis: 'Analysis unavailable: AI service is not configured.' },
        { status: 200 },
      );
    }

    // Try to enrich with full article text. Falls back silently to eventBody.
    const fullArticle = await tryFetchArticle(eventUrl);
    const articleText = fullArticle
      ? fullArticle
      : (eventBody || eventTitle || '').slice(0, MAX_ARTICLE_CHARS);

    if (!articleText) {
      return NextResponse.json({ analysis: 'No article content available to analyze.' }, { status: 200 });
    }

    const holdingsResult = await loadHoldings(supabase, user.id);
    const holdingsBlock = formatHoldingsForPrompt(holdingsResult);
    const prompt = buildPrompt({
      eventTitle,
      eventCountry,
      articleText,
      holdingsBlock,
    });

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('[analyze-event] Anthropic error:', errorText.slice(0, 400));
      return NextResponse.json(
        { analysis: 'Analysis service is temporarily unavailable. Please try again in a moment.' },
        { status: 200 },
      );
    }

    const data = await anthropicResponse.json();
    const analysis = data?.content?.[0]?.text;

    if (!analysis) {
      console.error('[analyze-event] Unexpected Anthropic response shape:', JSON.stringify(data).slice(0, 300));
      return NextResponse.json(
        { analysis: 'Analysis returned an empty response. Please try again.' },
        { status: 200 },
      );
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('[analyze-event]', error);
    return NextResponse.json(
      { error: error.message, analysis: 'Analysis failed. Please try again.' },
      { status: 500 },
    );
  }
}
