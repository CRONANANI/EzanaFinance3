import { NextResponse } from 'next/server';
import { enforceAiRateLimit } from '@/lib/ai-rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import { getUserClient } from '@/lib/supabase';
import { sanitizeAIOutput } from '@/lib/sanitize';
import { OBSIDIAN_SYSTEM_PROMPT, buildObsidianUserPrompt } from '@/lib/ai/obsidian-prompt';
import { fetchWithTimeout } from '@/lib/http/fetch-json';

/** Reuses ANTHROPIC_API_KEY (same as /api/ai-stock-analysis). */
export const dynamic = 'force-dynamic';

const FMP_BASE = 'https://financialmodelingprep.com/stable';
/* Model is configurable so a retired snapshot never takes Obsidian down. */
const MODEL = process.env.OBSIDIAN_MODEL || 'claude-sonnet-4-20250514';

/** Tickers named in the report's "## Hot Companies" section: "(NVDA)",
    "(NASDAQ: NVDA)" or "$NVDA". Deduped, at most 10. */
function extractHotTickers(markdown) {
  const text = String(markdown || '');
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^##\s*Hot Companies\s*$/i.test(l.trim()));
  if (start < 0) return [];
  const section = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    section.push(line);
  }
  const body = section.join('\n');
  const found = new Set();
  const re =
    /\((?:[A-Z]{2,8}:\s*)?\$?([A-Z]{1,5}(?:[.-][A-Z]{1,2})?)\)|\$([A-Z]{1,5}(?:[.-][A-Z]{1,2})?)\b/g;
  let m;
  while ((m = re.exec(body)) && found.size < 10) found.add(m[1] || m[2]);
  return [...found];
}

/** Price the tickers through FMP batch-quote; only symbols FMP knows survive. */
async function priceTickers(symbols) {
  const key = process.env.FMP_API_KEY || '';
  if (!key || symbols.length === 0) return [];
  try {
    const url = `${FMP_BASE}/batch-quote?symbols=${encodeURIComponent(symbols.join(','))}&apikey=${encodeURIComponent(key)}`;
    const res = await fetchWithTimeout(url, { cache: 'no-store' }, 8000);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .map((q) => {
        const pct = Number(q?.changePercentage ?? q?.changesPercentage);
        const price = Number(q?.price);
        if (!Number.isFinite(pct) || !Number.isFinite(price)) return null;
        return { symbol: q.symbol, name: q.name || q.symbol, price, changePct: pct };
      })
      .filter(Boolean)
      .sort((a, b) => b.changePct - a.changePct);
  } catch {
    return [];
  }
}

export async function POST(request) {
  try {
    const supabase = getUserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const blocked = await enforceAiRateLimit(user.id, 'obsidian');
    if (blocked) return blocked;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Obsidian is not configured. Set ANTHROPIC_API_KEY.' },
        { status: 503 },
      );
    }

    const { keyword } = await request.json();
    const clean = (keyword || '').toString().trim().slice(0, 120);
    if (!clean) {
      return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
    }

    // Optional news grounding — non-fatal if it fails.
    let newsContext = '';
    // try { newsContext = await fetchObsidianNews(clean); } catch (e) { /* non-fatal */ }

    const anthropic = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 2 });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3500,
      system: OBSIDIAN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildObsidianUserPrompt(clean, newsContext) }],
    });

    // Numeric ranges keep a plain hyphen ("10-15%"); any other dash becomes a comma.
    const report = sanitizeAIOutput(response.content?.[0]?.text ?? '')
      .replace(/(\d)\s*[–—]\s*(\d)/g, '$1-$2')
      .replace(/\s*[—–]\s*/g, ', ');
    let topPerformers = [];
    try {
      topPerformers = await priceTickers(extractHotTickers(report));
    } catch {
      /* fail open: the report still renders */
    }
    return NextResponse.json({
      keyword: clean,
      report,
      topPerformers,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[obsidian] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 },
    );
  }
}
