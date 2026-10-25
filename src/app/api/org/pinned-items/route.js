import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/org/pinned-items?ticker=AAPL
 * Uses profiles.pinned_cards (section → card id). No pins → an empty list
 * (QA ORG-11: the demo AAPL stubs are gone).
 */
export const GET = withApiGuard(
  async (request, user) => {
    const items = [];

    if (user) {
      const supabase = getUserClient();
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

    return NextResponse.json({ items });
  },
  { requireAuth: true },
);
