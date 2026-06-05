/**
 * POST /api/plaid/sync
 * Re-syncs all Plaid-connected accounts for the user. Writes to the
 * unified layer (and the legacy tables for backwards compat).
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { supabaseAdmin } from '@/lib/plaid';
import { getAuthUser } from '@/lib/auth-helpers';
import { syncPlaidItem } from '@/lib/plaid-sync';

export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request, user) => {
    try {
      const { data: items } = await supabaseAdmin
        .from('plaid_items')
        .select('id, item_id, access_token, institution_id, institution_name')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!items || items.length === 0) {
        return NextResponse.json({ synced: 0, message: 'No connected Plaid institutions' });
      }

      let totalAccounts = 0;
      const errors = [];

      for (const item of items) {
        try {
          const result = await syncPlaidItem({
            userId: user.id,
            accessToken: item.access_token,
            institutionId: item.institution_id,
            institutionName: item.institution_name,
            plaidItemDbId: item.id,
            plaidItemId: item.item_id,
          });
          totalAccounts += result.syncedAccounts;
        } catch (err) {
          errors.push({ institution: item.institution_name, error: err.message });
        }
      }

      return NextResponse.json({ synced: totalAccounts, errors });
    } catch (error) {
      console.error('[Plaid] sync error:', error);
      return NextResponse.json({ error: 'Sync failed', details: error.message }, { status: 500 });
    }
  },
  { requireAuth: true },
);
