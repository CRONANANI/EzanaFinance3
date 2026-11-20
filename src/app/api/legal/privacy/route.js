import { NextResponse } from 'next/server';
import { PRIVACY_POLICY_CSS, PRIVACY_POLICY_HTML } from '@/app/privacy-policy/privacy-policy-content';

/**
 * GET /api/legal/privacy
 * The Privacy Policy markup (Termly export) and its stylesheet for the Privacy
 * popup (LegalModal), which runs in the browser and cannot read the source
 * file. Same content as /privacy-policy; built once, served statically.
 */
export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(
    { css: PRIVACY_POLICY_CSS, html: PRIVACY_POLICY_HTML },
    { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  );
}
