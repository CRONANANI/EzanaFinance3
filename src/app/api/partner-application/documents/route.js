import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { logger } from '@/lib/logger';
import { isTokenExpired } from '@/lib/partner-application';

export const dynamic = 'force-dynamic';

// Identity / financial documents: accept PDFs and common image formats only,
// capped at 10MB. Extension + MIME are both validated so an attacker can't
// upload executable/HTML/SVG content that the storage bucket might later serve
// inline (stored XSS) or oversized files (storage abuse / DoS).
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic']);
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

/** Returns { ext } on success or { error } describing the rejection. */
function validateUpload(file, label) {
  if (file.size > MAX_FILE_BYTES) {
    return { error: `${label} exceeds the 10MB size limit` };
  }
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return { error: `${label} must be a PDF, JPG, PNG, WEBP, or HEIC file` };
  }
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return { error: `${label} has an unsupported file type` };
  }
  return { ext };
}

export const POST = withApiGuard(
  async (request) => {
    try {
      const formData = await request.formData();
      const token = formData.get('token');
      const idDocument = formData.get('idDocument');
      const financialDocument = formData.get('financialDocument');

      if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

      const db = getAdminClient();
      const { data: app, error: lookupErr } = await db
        .from('partner_applications')
        .select('id, application_status, verification_token_expires')
        .eq('verification_token', token)
        .eq('email_verified', true)
        .maybeSingle();

      if (lookupErr) {
        logger.error('Partner documents lookup failed', { error: lookupErr.message });
        return NextResponse.json({ error: 'Could not look up this application' }, { status: 500 });
      }
      if (!app)
        return NextResponse.json({ error: 'Invalid token or email not verified' }, { status: 404 });
      // PAR-14: the link only opens the documents step, and only while it is fresh.
      if (isTokenExpired(app)) {
        return NextResponse.json(
          { error: 'This link has expired. Request a new link to upload your documents.' },
          { status: 410 },
        );
      }
      if (app.application_status !== 'pending_documents') {
        return NextResponse.json(
          { error: 'Documents can no longer be uploaded for this application.' },
          { status: 409 },
        );
      }

      if (!idDocument?.size || !financialDocument?.size) {
        return NextResponse.json(
          { error: 'Both ID document and financial document are required' },
          { status: 400 },
        );
      }
      const idCheck = validateUpload(idDocument, 'ID document');
      if (idCheck.error) return NextResponse.json({ error: idCheck.error }, { status: 400 });
      const finCheck = validateUpload(financialDocument, 'Financial document');
      if (finCheck.error) return NextResponse.json({ error: finCheck.error }, { status: 400 });

      const uploads = [
        {
          label: 'ID document',
          file: idDocument,
          path: `partner-applications/${app.id}/id-document.${idCheck.ext}`,
        },
        {
          label: 'financial document',
          file: financialDocument,
          path: `partner-applications/${app.id}/financial-document.${finCheck.ext}`,
        },
      ];
      for (const u of uploads) {
        const { error: upErr } = await db.storage
          .from('documents')
          .upload(u.path, u.file, { upsert: true, contentType: u.file.type || undefined });
        if (upErr) {
          logger.error('Partner document upload failed', {
            applicationId: app.id,
            document: u.label,
            error: upErr.message,
          });
          return NextResponse.json(
            { error: `We could not store your ${u.label}. Try again shortly.` },
            { status: 500 },
          );
        }
      }

      const now = new Date().toISOString();
      const { error: updErr } = await db
        .from('partner_applications')
        .update({
          id_document_url: uploads[0].path,
          financial_document_url: uploads[1].path,
          documents_submitted: true,
          documents_submitted_at: now,
          application_status: 'under_review',
          // PAR-14: the link is single-use once documents are in.
          verification_token: null,
          verification_token_expires: null,
          updated_at: now,
        })
        .eq('id', app.id);
      if (updErr) {
        logger.error('Partner documents status update failed', {
          applicationId: app.id,
          error: updErr.message,
        });
        return NextResponse.json(
          {
            error:
              'Your documents were stored but we could not update your application. Try again shortly.',
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Documents submitted. Your application is now under review.',
      });
    } catch (error) {
      return safeErrorResponse(error, { context: '[Partner Application] Documents upload' });
    }
  },
  { requireAuth: false, strict: true },
);
