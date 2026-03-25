import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { sanitizeObject } from '@/lib/sanitize';
import { supabaseAdmin } from '@/lib/plaid';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';


async function handlePost(request) {
  const rawBody = await request.json();
  const body = sanitizeObject(rawBody);
    const {
      fullName, email, phone, country, city,
      partnerType, yearsExperience, currentRole, companyName, linkedinUrl, websiteUrl,
      aum, tradingStyle, marketsTraded, certifications,
      whyPartner, contentPlan, referralSource,
    } = body;

    if (!fullName || !email || !partnerType) {
      return NextResponse.json({ error: 'Full name, email, and partner type are required' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('partner_applications')
      .select('id, application_status')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      if (existing.application_status === 'approved') {
        return NextResponse.json({ error: 'This email already has an approved partner account.' }, { status: 409 });
      }
      if (['pending_verification', 'pending_documents', 'under_review'].includes(existing.application_status)) {
        return NextResponse.json({ error: 'An application for this email is already in progress. Check your email for next steps.' }, { status: 409 });
      }
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const { data: app, error: insertErr } = await supabaseAdmin
      .from('partner_applications')
      .upsert({
        full_name: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone || null,
        country: country || null,
        city: city || null,
        partner_type: partnerType,
        years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
        current_role: currentRole || null,
        company_name: companyName || null,
        linkedin_url: linkedinUrl || null,
        website_url: websiteUrl || null,
        assets_under_management: aum || null,
        trading_style: tradingStyle || null,
        markets_traded: marketsTraded || [],
        certifications: certifications || [],
        why_partner: whyPartner || null,
        content_plan: contentPlan || null,
        referral_source: referralSource || null,
        verification_token: verificationToken,
        verification_token_expires: tokenExpires.toISOString(),
        application_status: 'pending_verification',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' })
      .select('id')
      .single();

  if (insertErr) {
    logger.error('Partner Application insert error', { error: insertErr.message });
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://ezana.world'}/auth/partner/apply/verify?token=${verificationToken}`;
  logger.info('Partner application submitted', { email, applicationId: app.id });

  return NextResponse.json({
    success: true,
    message: 'Application submitted. Check your email to complete the process.',
    applicationId: app.id,
    ...(process.env.NODE_ENV === 'development' ? { verifyUrl } : {}),
  });
}

export const POST = withApiGuard(handlePost, { requireAuth: false, strict: true });
