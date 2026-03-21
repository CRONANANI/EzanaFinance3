import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';

export async function POST(request) {
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

    if (!app) return NextResponse.json({ error: 'Invalid token or email not verified' }, { status: 404 });

    const updates = {};

    if (idDocument && idDocument.size > 0) {
      const idExt = idDocument.name.split('.').pop() || 'pdf';
      const idPath = `partner-applications/${app.id}/id-document.${idExt}`;
      const { error: idErr } = await supabaseAdmin.storage
        .from('documents')
        .upload(idPath, idDocument, { upsert: true });
      if (!idErr) updates.id_document_url = idPath;
    }

    if (financialDocument && financialDocument.size > 0) {
      const finExt = financialDocument.name.split('.').pop() || 'pdf';
      const finPath = `partner-applications/${app.id}/financial-document.${finExt}`;
      const { error: finErr } = await supabaseAdmin.storage
        .from('documents')
        .upload(finPath, financialDocument, { upsert: true });
      if (!finErr) updates.financial_document_url = finPath;
    }

    if (!updates.id_document_url || !updates.financial_document_url) {
      return NextResponse.json({ error: 'Both ID document and financial document are required' }, { status: 400 });
    }

    updates.documents_submitted = true;
    updates.documents_submitted_at = new Date().toISOString();
    updates.application_status = 'under_review';
    updates.updated_at = new Date().toISOString();

    await supabaseAdmin
      .from('partner_applications')
      .update(updates)
      .eq('id', app.id);

    return NextResponse.json({ success: true, message: 'Documents submitted. Your application is now under review.' });
  } catch (error) {
    console.error('[Partner Application] Documents upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
