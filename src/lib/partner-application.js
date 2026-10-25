/**
 * Partner application pipeline: apply -> verify email -> upload documents ->
 * admin review. The routes under /api/partner-application and
 * /api/admin/partner-applications stay thin and call into here, so the
 * business rules (token lifetime, which statuses may resubmit, what an email
 * failure returns) live in one tested place (scripts/check-partner-pipeline.mjs).
 *
 * The Resend client and the Supabase admin client are injected rather than
 * imported, so the helpers run under plain node with mocks.
 */
import crypto from 'crypto';

/** Verification links (email + documents step) live this long. */
export const VERIFICATION_TOKEN_TTL_HOURS = 72;

/** Statuses an applicant can still be waiting on. */
export const IN_PROGRESS_STATUSES = ['pending_verification', 'pending_documents', 'under_review'];

export function partnerFromAddress() {
  return process.env.RESEND_FROM_EMAIL || 'Ezana Finance <partners@ezana.world>';
}

export function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://ezana.world';
}

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.toLowerCase().trim() : '';
}

/** A fresh random token plus its expiry, both ready to write to the row. */
export function newVerificationToken(now = Date.now()) {
  return {
    token: crypto.randomBytes(32).toString('hex'),
    expiresAt: new Date(now + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString(),
  };
}

export function isTokenExpired(app, now = Date.now()) {
  if (!app?.verification_token_expires) return true;
  return new Date(app.verification_token_expires).getTime() < now;
}

export function verifyUrlFor(token, base = appBaseUrl()) {
  return `${base}/auth/partner/apply/verify?token=${encodeURIComponent(token)}`;
}

/**
 * Decide whether a submit for an email that already has a row may proceed.
 * Returns null when it may, or { status, error } to send back.
 * A `pending_verification` row whose link has expired may resubmit (PAR-10):
 * the upsert regenerates the token and the email is sent again.
 */
export function resubmitBlock(existing, now = Date.now()) {
  if (!existing) return null;
  const status = existing.application_status;
  if (status === 'approved') {
    return { status: 409, error: 'This email already has an approved partner account.' };
  }
  if (status === 'pending_verification' && isTokenExpired(existing, now)) return null;
  if (IN_PROGRESS_STATUSES.includes(status)) {
    return {
      status: 409,
      error:
        'An application for this email is already in progress. Check your email for next steps, or request a new link.',
    };
  }
  return null;
}

/**
 * Send through Resend. resend-node v6 reports failures as `{ error }` rather
 * than throwing; both shapes are handled. Returns { ok, error }.
 */
async function sendEmail(resend, message) {
  try {
    // email-category: transactional (partner application verification and decisions)
    const res = await resend.emails.send({ from: partnerFromAddress(), ...message });
    if (res?.error) return { ok: false, error: res.error.message || String(res.error) };
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e?.message || 'send failed' };
  }
}

export function sendVerificationEmail(resend, { to, verifyUrl }) {
  return sendEmail(resend, {
    to,
    subject: 'Verify your Ezana partner application',
    html: `<p>Thanks for applying to the Ezana partner program.</p>
<p><a href="${verifyUrl}">Verify your email</a> to continue. The link expires in ${VERIFICATION_TOKEN_TTL_HOURS} hours.</p>
<p>After verifying you will be asked to upload an ID document and a financial document.</p>
<p>If you did not apply, you can ignore this email.</p>`,
    text: `Thanks for applying to the Ezana partner program.\n\nVerify your email to continue: ${verifyUrl}\nThe link expires in ${VERIFICATION_TOKEN_TTL_HOURS} hours.\n\nIf you did not apply, you can ignore this email.`,
  });
}

export function sendDecisionEmail(resend, { to, decision, signinUrl }) {
  if (decision === 'approved') {
    return sendEmail(resend, {
      to,
      subject: 'Your Ezana partner application was approved',
      html: `<p>Welcome to the Ezana partner program. Your application has been approved.</p>
<p><a href="${signinUrl}">Sign in to your partner account</a> to finish setting up your profile and payouts.</p>`,
      text: `Welcome to the Ezana partner program. Your application has been approved.\n\nSign in to your partner account: ${signinUrl}`,
    });
  }
  return sendEmail(resend, {
    to,
    subject: 'Your Ezana partner application',
    html: `<p>Thank you for applying to the Ezana partner program.</p>
<p>After reviewing your application we are not able to approve it at this time. You are welcome to apply again in the future.</p>`,
    text: 'Thank you for applying to the Ezana partner program.\n\nAfter reviewing your application we are not able to approve it at this time. You are welcome to apply again in the future.',
  });
}

/** Map the sanitized request body onto the partner_applications columns. */
export function applicationRowFromBody(body) {
  const {
    fullName,
    email,
    phone,
    country,
    city,
    partnerType,
    yearsExperience,
    currentRole,
    companyName,
    linkedinUrl,
    websiteUrl,
    aum,
    tradingStyle,
    marketsTraded,
    certifications,
    whyPartner,
    contentPlan,
    referralSource,
  } = body || {};
  return {
    full_name: String(fullName || '').trim(),
    email: normalizeEmail(email),
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
  };
}

/**
 * The whole submit flow. Returns { status, body } for the route to serialise.
 * @param {object} deps
 * @param {object} deps.db       Supabase admin client
 * @param {object} deps.resend   Resend client
 * @param {object} deps.logger
 * @param {object} deps.body     sanitized request body
 * @param {boolean} [deps.isDev] include the verify URL in the response
 * @param {number} [deps.now]
 */
export async function submitPartnerApplication({ db, resend, logger, body, isDev = false, now }) {
  const at = now ?? Date.now();
  if (!body?.fullName || !body?.email || !body?.partnerType) {
    return { status: 400, body: { error: 'Full name, email, and partner type are required' } };
  }
  const row = applicationRowFromBody(body);

  const { data: existing, error: lookupErr } = await db
    .from('partner_applications')
    .select('id, application_status, verification_token_expires')
    .eq('email', row.email)
    .maybeSingle();
  if (lookupErr) {
    logger.error('Partner application lookup failed', { error: lookupErr.message });
    return { status: 500, body: { error: 'Failed to submit application' } };
  }
  const block = resubmitBlock(existing, at);
  if (block) return { status: block.status, body: { error: block.error } };

  const { token, expiresAt } = newVerificationToken(at);
  const { data: app, error: insertErr } = await db
    .from('partner_applications')
    .upsert(
      {
        ...row,
        verification_token: token,
        verification_token_expires: expiresAt,
        email_verified: false,
        email_verified_at: null,
        // A resubmit (expired link, or a past rejection) starts the pipeline over.
        documents_submitted: false,
        documents_submitted_at: null,
        id_document_url: null,
        financial_document_url: null,
        application_status: 'pending_verification',
        updated_at: new Date(at).toISOString(),
      },
      { onConflict: 'email' },
    )
    .select('id')
    .single();
  if (insertErr || !app) {
    logger.error('Partner application insert error', { error: insertErr?.message });
    return { status: 500, body: { error: 'Failed to submit application' } };
  }

  const verifyUrl = verifyUrlFor(token);
  const sent = await sendVerificationEmail(resend, { to: row.email, verifyUrl });
  if (!sent.ok) {
    logger.error('Partner application email failed', { applicationId: app.id, error: sent.error });
    return {
      status: 502,
      body: { error: 'We could not send the verification email. Try again shortly.' },
    };
  }
  logger.info('Partner application submitted', { applicationId: app.id });

  return {
    status: 200,
    body: {
      success: true,
      message: 'Application submitted. Check your email to complete the process.',
      applicationId: app.id,
      ...(isDev ? { verifyUrl } : {}),
    },
  };
}

/** The resend endpoint's reply is identical whether or not the email exists. */
export const RESEND_GENERIC_REPLY = {
  success: true,
  message: 'If an application is waiting on this email, a new link is on its way.',
};

/**
 * Regenerate the token and resend the link for an application that is still
 * waiting on the applicant (verification or documents). Never reveals whether
 * the email exists: callers always reply RESEND_GENERIC_REPLY with 200.
 * Returns { sent: boolean, reason } for logging and tests.
 */
export async function resendPartnerVerification({ db, resend, logger, email, now }) {
  const at = now ?? Date.now();
  const addr = normalizeEmail(email);
  if (!addr || !addr.includes('@')) return { sent: false, reason: 'invalid_email' };

  const { data: app, error } = await db
    .from('partner_applications')
    .select('id, application_status')
    .eq('email', addr)
    .maybeSingle();
  if (error) {
    logger.error('Partner resend lookup failed', { error: error.message });
    return { sent: false, reason: 'lookup_failed' };
  }
  if (!app || !['pending_verification', 'pending_documents'].includes(app.application_status)) {
    return { sent: false, reason: 'not_eligible' };
  }

  const { token, expiresAt } = newVerificationToken(at);
  const { error: updErr } = await db
    .from('partner_applications')
    .update({
      verification_token: token,
      verification_token_expires: expiresAt,
      updated_at: new Date(at).toISOString(),
    })
    .eq('id', app.id);
  if (updErr) {
    logger.error('Partner resend token update failed', {
      applicationId: app.id,
      error: updErr.message,
    });
    return { sent: false, reason: 'update_failed' };
  }

  const sent = await sendVerificationEmail(resend, { to: addr, verifyUrl: verifyUrlFor(token) });
  if (!sent.ok) {
    logger.error('Partner resend email failed', { applicationId: app.id, error: sent.error });
    return { sent: false, reason: 'email_failed' };
  }
  return { sent: true, reason: null };
}

/* ---------- Admin review (PAR-2) ---------- */

export const REVIEW_STATUSES = [
  'under_review',
  'pending_documents',
  'pending_verification',
  'approved',
  'rejected',
];

/** Columns an admin reviewer sees: never the verification token. */
export const ADMIN_APPLICATION_COLS =
  'id, full_name, email, phone, country, city, partner_type, years_experience, current_role, company_name, linkedin_url, website_url, assets_under_management, trading_style, markets_traded, certifications, why_partner, content_plan, referral_source, email_verified, documents_submitted, documents_submitted_at, id_document_url, financial_document_url, application_status, reviewer_notes, reviewed_by, reviewed_at, created_at, updated_at';

const SIGNED_URL_SECONDS = 600;

async function signDoc(db, path) {
  if (!path) return null;
  const { data, error } = await db.storage
    .from('documents')
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  return error ? null : data?.signedUrl || null;
}

/**
 * Applications in one status (or 'all'), newest first, each with 10-minute
 * signed URLs for its documents in the private `documents` bucket, plus
 * per-status counts. Caller has already checked admin access.
 */
export async function listPartnerApplications(db, status = 'under_review') {
  let filter = 'under_review';
  if (status === 'all') filter = null;
  else if (REVIEW_STATUSES.includes(status)) filter = status;

  let q = db
    .from('partner_applications')
    .select(ADMIN_APPLICATION_COLS)
    .order('created_at', { ascending: false })
    .limit(200);
  if (filter) q = q.eq('application_status', filter);
  const { data, error } = await q;
  if (error) return { error: error.message };

  const applications = await Promise.all(
    (data || []).map(async (app) => {
      const [idUrl, finUrl] = await Promise.all([
        signDoc(db, app.id_document_url),
        signDoc(db, app.financial_document_url),
      ]);
      return { ...app, id_document_signed_url: idUrl, financial_document_signed_url: finUrl };
    }),
  );

  const counts = {};
  await Promise.all(
    REVIEW_STATUSES.map(async (s) => {
      const { count } = await db
        .from('partner_applications')
        .select('id', { count: 'exact', head: true })
        .eq('application_status', s);
      counts[s] = count || 0;
    }),
  );
  return { error: null, status: filter || 'all', applications, counts };
}

/**
 * Approve or reject one application. Caller has already checked admin access.
 * Approve: find or invite the auth user, grant partner access (partners row
 * active, profiles.is_partner, app_metadata.partner_role), then record the
 * decision. Reject: record the decision. Both email the applicant; a failed
 * email does not undo the decision (the reply carries a warning).
 *
 * @param {object} deps
 * @param {object} deps.db            service-role client
 * @param {object} deps.resend
 * @param {object} deps.logger
 * @param {object} deps.partnerAdmin  { grantPartnerAccess, findOrInviteAuthUser }
 * @param {string} deps.applicationId
 * @param {'approve'|'reject'} deps.action
 * @param {string} [deps.note]
 * @param {string|null} [deps.reviewerId]
 * @returns {Promise<{ status: number, body: object }>}
 */
export async function reviewPartnerApplication({
  db,
  resend,
  logger,
  partnerAdmin,
  applicationId,
  action,
  note = '',
  reviewerId = null,
}) {
  if (!['approve', 'reject'].includes(action)) {
    return { status: 400, body: { error: "action must be 'approve' or 'reject'" } };
  }
  const { data: app, error: loadErr } = await db
    .from('partner_applications')
    .select('id, email, full_name, partner_type, application_status')
    .eq('id', applicationId)
    .maybeSingle();
  if (loadErr) return { status: 500, body: { error: 'Could not load the application' } };
  if (!app) return { status: 404, body: { error: 'Application not found' } };
  if (['approved', 'rejected'].includes(app.application_status)) {
    return { status: 409, body: { error: `Application is already ${app.application_status}` } };
  }
  if (action === 'approve' && app.application_status !== 'under_review') {
    return {
      status: 409,
      body: { error: 'Only applications with submitted documents (under review) can be approved' },
    };
  }

  const signinUrl = `${appBaseUrl()}/auth/partner/signin`;
  let userId = null;
  let invited = false;
  if (action === 'approve') {
    const found = await partnerAdmin.findOrInviteAuthUser(db, app.email, signinUrl);
    if (found.error || !found.id) {
      logger.error('Partner approve: auth user', { applicationId, error: found.error });
      return { status: 500, body: { error: 'Could not find or invite the applicant account' } };
    }
    userId = found.id;
    invited = found.invited;
    const granted = await partnerAdmin.grantPartnerAccess(db, {
      userId,
      partnerType: app.partner_type,
      displayName: app.full_name,
      markApproved: true,
    });
    if (granted.error) {
      logger.error('Partner approve: grant', { applicationId, error: granted.error });
      return { status: 500, body: { error: 'Could not grant partner access' } };
    }
  }

  const decision = action === 'approve' ? 'approved' : 'rejected';
  const now = new Date().toISOString();
  const { error: updErr } = await db
    .from('partner_applications')
    .update({
      application_status: decision,
      reviewer_notes: note ? String(note).slice(0, 2000) : null,
      reviewed_by: reviewerId,
      reviewed_at: now,
      verification_token: null,
      verification_token_expires: null,
      updated_at: now,
    })
    .eq('id', app.id);
  if (updErr) {
    logger.error('Partner review: status update', { applicationId, error: updErr.message });
    return { status: 500, body: { error: 'Could not record the decision' } };
  }

  const sent = await sendDecisionEmail(resend, { to: app.email, decision, signinUrl });
  if (!sent.ok) logger.error('Partner decision email failed', { applicationId, error: sent.error });

  return {
    status: 200,
    body: {
      success: true,
      applicationId: app.id,
      status: decision,
      userId,
      invited,
      emailSent: sent.ok,
      ...(sent.ok ? {} : { warning: 'Decision saved, but the applicant email could not be sent.' }),
    },
  };
}
