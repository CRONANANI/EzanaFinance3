import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { supabaseAdmin } from '@/lib/plaid';

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

      const { data: app } = await supabaseAdmin
        .from('partner_applications')
        .select('*')
        .eq('verification_token', token)
        .eq('email_verified', true)
        .maybeSingle();

      if (!app)
        return NextResponse.json({ error: 'Invalid token or email not verified' }, { status: 404 });

      const updates = {};

      if (idDocument && idDocument.size > 0) {
        const check = validateUpload(idDocument, 'ID document');
        if (check.error) return NextResponse.json({ error: check.error }, { status: 400 });
        const idPath = `partner-applications/${app.id}/id-document.${check.ext}`;
        const { error: idErr } = await supabaseAdmin.storage
          .from('documents')
          .upload(idPath, idDocument, { upsert: true, contentType: idDocument.type || undefined });
        if (!idErr) updates.id_document_url = idPath;
      }

      if (financialDocument && financialDocument.size > 0) {
        const check = validateUpload(financialDocument, 'Financial document');
        if (check.error) return NextResponse.json({ error: check.error }, { status: 400 });
        const finPath = `partner-applications/${app.id}/financial-document.${check.ext}`;
        const { error: finErr } = await supabaseAdmin.storage
          .from('documents')
          .upload(finPath, financialDocument, {
            upsert: true,
            contentType: financialDocument.type || undefined,
          });
        if (!finErr) updates.financial_document_url = finPath;
      }

      if (!updates.id_document_url || !updates.financial_document_url) {
        return NextResponse.json(
          { error: 'Both ID document and financial document are required' },
          { status: 400 },
        );
      }

      updates.documents_submitted = true;
      updates.documents_submitted_at = new Date().toISOString();
      updates.application_status = 'under_review';
      updates.updated_at = new Date().toISOString();

      await supabaseAdmin.from('partner_applications').update(updates).eq('id', app.id);

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
