import { NextResponse } from 'next/server';
import { enforceAiRateLimit } from '@/lib/ai-rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import { getUserClient } from '@/lib/supabase';
import { sanitizeAIOutput } from '@/lib/sanitize';
import { OBSIDIAN_SYSTEM_PROMPT, buildObsidianUserPrompt } from '@/lib/ai/obsidian-prompt';

/** Reuses ANTHROPIC_API_KEY (same as /api/ai-stock-analysis). */
export const dynamic = 'force-dynamic';

const MODEL = 'claude-sonnet-4-20250514';

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
