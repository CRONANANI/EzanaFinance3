/**
 * GET /api/partner/status -> { isPartner, partnerRole, verified, partner }
 * The caller's own partner standing, by the single isActivePartner definition
 * (src/lib/partner-access.js, QA PAR-3). PartnerContext reads this instead of
 * querying `partners` itself. Service-role read, scoped to the caller's id.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { withApiGuard } from '@/lib/api-guard';
import { isActivePartner, getActivePartnerRow } from '@/lib/partner-access';

export const dynamic = 'force-dynamic';

const PARTNER_FIELDS =
  'id, user_id, partner_role, partner_type, verified, display_name, username, avatar_url, bio, echo_writer_approved, status';

export const GET = withApiGuard(
  async (request, user) => {
    const db = getAdminClient();
    const isPartner = await isActivePartner(db, user);
    if (!isPartner) {
      return NextResponse.json(
        { isPartner: false, partnerRole: null, verified: false, partner: null },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const { data: partner, error } = await getActivePartnerRow(db, user.id, PARTNER_FIELDS);
    if (error)
      return NextResponse.json({ error: 'Failed to load partner status' }, { status: 500 });
    return NextResponse.json(
      {
        isPartner: true,
        partnerRole: partner?.partner_role || user.app_metadata?.partner_role || 'both',
        verified: partner?.verified === true,
        partner: partner || null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  },
  { requireAuth: true },
);
