/**
 * /api/echo/writer-application
 * POST — submit a writer application (partner only)
 * GET — check application status
 */
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';


export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: partner } = await supabaseAdmin
    .from('partners')
    .select('id, display_name, echo_writer_approved')
    .eq('user_id', user.id)
    .single();

  if (!partner) {
    return NextResponse.json({ error: 'Only partners can apply to write for Ezana Echo' }, { status: 403 });
  }

  if (partner.echo_writer_approved) {
    return NextResponse.json({ error: 'You are already an approved writer' }, { status: 400 });
  }

  const body = await request.json();
  const { writingExperience, sampleUrls, specialization, reasonToWrite, portfolioUrl } = body;

  if (!writingExperience) {
    return NextResponse.json({ error: 'Writing experience is required' }, { status: 400 });
  }

  const { data: app, error: insertErr } = await supabaseAdmin
    .from('echo_writer_applications')
    .upsert(
      {
        user_id: user.id,
        applicant_name: partner.display_name || user.email,
        applicant_email: user.email,
        writing_experience: writingExperience,
        sample_urls: Array.isArray(sampleUrls) ? sampleUrls.join('\n') : (sampleUrls || null),
        specialization: specialization || null,
        reason_to_write: reasonToWrite || null,
        portfolio_url: portfolioUrl || null,
        application_status: 'pending',
        submitted_at: new Date().toISOString(),
        reviewer_notes: null,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (insertErr) {
    console.error('[Echo] Writer application error:', insertErr);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }

  return NextResponse.json({ success: true, application: app });
}

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: app } = await supabaseAdmin
    .from('echo_writer_applications')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const { data: partner } = await supabaseAdmin
    .from('partners')
    .select('echo_writer_approved')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json({
    application: app || null,
    isApprovedWriter: partner?.echo_writer_approved || false,
  });
}
