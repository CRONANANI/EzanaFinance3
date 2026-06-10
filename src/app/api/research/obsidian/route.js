import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabase } from '@/lib/supabase-server';
import { sanitizeAIOutput } from '@/lib/sanitize';
import { getClientIp } from '@/lib/client-ip';
import { OBSIDIAN_SYSTEM_PROMPT, buildObsidianUserPrompt } from '@/lib/ai/obsidian-prompt';

/** Reuses ANTHROPIC_API_KEY (same as /api/ai-stock-analysis). */
export const dynamic = 'force-dynamic';

const MODEL = 'claude-sonnet-4-20250514';

const obsidianRateMap = new Map();
function checkRate(ip) {
  const now = Date.now();
  const e = obsidianRateMap.get(ip);
  if (!e || now - e.ts > 60000) {
    obsidianRateMap.set(ip, { ts: now, n: 1 });
    return true;
  }
  e.n++;
  return e.n <= 10;
}

export async function POST(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (!checkRate(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in 60 seconds.' },
        { status: 429 },
      );
    }

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

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3500,
      system: OBSIDIAN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildObsidianUserPrompt(clean, newsContext) }],
    });

    const report = sanitizeAIOutput(response.content?.[0]?.text ?? '');
    return NextResponse.json({
      keyword: clean,
      report,
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
