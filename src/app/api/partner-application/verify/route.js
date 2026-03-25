import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

    const { data: app } = await supabaseAdmin
      .from('partner_applications')
      .select('*')
      .eq('verification_token', token)
      .maybeSingle();

    if (!app) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    if (new Date(app.verification_token_expires) < new Date()) {
      return NextResponse.json({ error: 'Token expired. Please resubmit your application.' }, { status: 410 });
    }

    if (!app.email_verified) {
      await supabaseAdmin
        .from('partner_applications')
        .update({
          email_verified: true,
          email_verified_at: new Date().toISOString(),
          application_status: 'pending_documents',
          updated_at: new Date().toISOString(),
        })
        .eq('id', app.id);
    }

    return NextResponse.json({
      success: true,
      applicationId: app.id,
      fullName: app.full_name,
      email: app.email,
      status: app.documents_submitted ? 'under_review' : 'pending_documents',
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
