import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/org/pinned-items?ticker=AAPL
 * Uses profiles.pinned_cards (section → card id). Demo stubs when empty.
 */
export async function GET(request) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker') || '';

  const items = [];

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('pinned_cards')
      .eq('id', user.id)
      .maybeSingle();

    const pinned = profile?.pinned_cards;
    if (pinned && typeof pinned === 'object' && !Array.isArray(pinned)) {
      for (const [section, cardId] of Object.entries(pinned)) {
        if (!cardId) continue;
        items.push({
          attachment_kind: 'pinned_card',
          attachment_ref: String(cardId),
          attachment_label: `${section.replace(/-/g, ' ')} · ${cardId}`,
          attachment_meta: { section },
        });
      }
    }
  }

  if (items.length === 0) {
    const t = ticker || 'AAPL';
    items.push(
      {
        attachment_kind: 'saved_chart',
        attachment_ref: `chart-${t}-1y`,
        attachment_label: `${t} 1-year price chart`,
        attachment_meta: { source: 'company-research' },
      },
      {
        attachment_kind: 'saved_model',
        attachment_ref: `dcf-${t}`,
        attachment_label: `${t} DCF valuation model`,
        attachment_meta: { source: 'dcf-interactive' },
      },
      {
        attachment_kind: 'saved_news',
        attachment_ref: `news-${t}-earnings`,
        attachment_label: `${t} latest earnings coverage`,
        attachment_meta: { source: 'market-news' },
      }
    );
  }

  return NextResponse.json({ items });
}
