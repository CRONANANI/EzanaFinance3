/**
 * /api/echo/writer-application
 *   POST  submit an Echo Writer application (active partners only)
 *   GET   the caller's application and whether they are an approved writer
 *
 * Nov 23 2026 (Help Center audit): eligibility now uses the one canonical
 * active-partner check (src/lib/partner-access.js) instead of "has any
 * partners row"; fields are validated by the same rules the form uses
 * (src/lib/echo/writer-application.js); a second submit while an application
 * is under review is refused instead of silently overwriting it; and every
 * refusal carries a `code` so the form can show a specific next step.
 *
 * Codes: not_partner, already_approved, already_pending, invalid_body,
 *        invalid_fields (with `fields`), save_failed.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getLazyAdminClient } from '@/lib/supabase';
import { isActivePartner } from '@/lib/partner-access';
import { validateWriterApplication } from '@/lib/echo/writer-application';

export const dynamic = 'force-dynamic';

const admin = getLazyAdminClient();

const fail = (status, code, error, extra = {}) =>
  NextResponse.json({ error, code, ...extra }, { status });

export const POST = withApiGuard(
  async (request, user) => {
    if (!(await isActivePartner(admin, user))) {
      return fail(
        403,
        'not_partner',
        'Only active Ezana partners can apply to write for Ezana Echo. This account is not an active partner yet.',
      );
    }

    const { data: partner } = await admin
      .from('partners')
      .select('id, display_name, echo_writer_approved')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (partner?.echo_writer_approved) {
      return fail(400, 'already_approved', 'You are already an approved Echo writer.');
    }

    const { data: existing } = await admin
      .from('echo_writer_applications')
      .select('application_status, submitted_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing?.application_status === 'pending') {
      return fail(409, 'already_pending', 'Your application is already under review.', {
        submitted_at: existing.submitted_at,
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return fail(400, 'invalid_body', 'We could not read the application. Submit it again.');
    }

    const check = validateWriterApplication(body || {});
    if (!check.ok) {
      return fail(400, 'invalid_fields', 'Some fields need attention.', { fields: check.errors });
    }
    const v = check.value;

    const { data: app, error: insertErr } = await admin
      .from('echo_writer_applications')
      .upsert(
        {
          user_id: user.id,
          applicant_name: partner?.display_name || user.email,
          applicant_email: user.email,
          writing_experience: v.writingExperience,
          sample_urls: v.sampleUrls.join('\n'),
          specialization: v.specialization,
          reason_to_write: v.reasonToWrite,
          portfolio_url: v.portfolioUrl,
          application_status: 'pending',
          submitted_at: new Date().toISOString(),
          reviewer_notes: null,
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single();

    if (insertErr) {
      console.error('[Echo] Writer application error:', insertErr);
      return fail(500, 'save_failed', 'Your application was not saved.');
    }

    return NextResponse.json({ success: true, application: app });
  },
  { requireAuth: true },
);

export const GET = withApiGuard(
  async (request, user) => {
    const [{ data: app }, { data: partner }, isPartner] = await Promise.all([
      admin.from('echo_writer_applications').select('*').eq('user_id', user.id).maybeSingle(),
      admin
        .from('partners')
        .select('echo_writer_approved')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle(),
      isActivePartner(admin, user),
    ]);

    return NextResponse.json({
      application: app || null,
      isApprovedWriter: partner?.echo_writer_approved || false,
      isActivePartner: isPartner,
    });
  },
  { requireAuth: true },
);
