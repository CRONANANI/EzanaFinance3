import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-service-role';
import { resend } from '@/lib/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set([
  'access_copy',
  'rectification',
  'erasure',
  'restrict_processing',
  'portability',
  'other',
]);

function getCookieSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // ignore
            }
          });
        },
      },
    },
  );
}

/** Authenticated user: list their submitted requests (newest first). */
export async function GET() {
  try {
    const authClient = getCookieSupabase();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const admin = createServerSupabaseClient();
    const { data, error } = await admin
      .from('data_subject_requests')
      .select('id, request_type, details, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[data-request GET]', error);
      return NextResponse.json({ error: 'Could not load requests' }, { status: 500 });
    }

    return NextResponse.json({ requests: data || [] });
  } catch (e) {
    console.error('[data-request GET]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

const TYPE_LABELS = {
  access_copy: 'Access / copy of personal data',
  rectification: 'Correction or update of personal data',
  erasure: 'Deletion of personal data',
  restrict_processing: 'Restrict processing',
  portability: 'Data portability',
  other: 'Other privacy request',
};

/**
 * POST body: { requestType: string, details?: string, accountContext?: object }
 * accountContext is optional client hint; server still records verified auth user id.
 */
export async function POST(request) {
  try {
    const authClient = getCookieSupabase();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const requestType = typeof body.requestType === 'string' ? body.requestType.trim() : '';
    if (!ALLOWED_TYPES.has(requestType)) {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }

    const details =
      typeof body.details === 'string' ? body.details.trim().slice(0, 8000) : '';

    const clientContext =
      body.accountContext && typeof body.accountContext === 'object' && !Array.isArray(body.accountContext)
        ? body.accountContext
        : {};

    const admin = createServerSupabaseClient();
    const { data: inserted, error: insertError } = await admin
      .from('data_subject_requests')
      .insert({
        user_id: user.id,
        email: user.email || null,
        request_type: requestType,
        details: details || null,
        account_context: {
          ...clientContext,
          auth_user_id: user.id,
          submitted_at_client: new Date().toISOString(),
        },
        status: 'pending',
      })
      .select('id, created_at')
      .single();

    if (insertError) {
      console.error('[data-request POST insert]', insertError);
      return NextResponse.json(
        { error: 'Could not save your request. Please try again later.' },
        { status: 500 },
      );
    }

    const privacyInbox =
      process.env.PRIVACY_REQUEST_EMAIL ||
      process.env.VAPID_CONTACT_EMAIL ||
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

    if (privacyInbox && process.env.RESEND_API_KEY) {
      const label = TYPE_LABELS[requestType] || requestType;
      try {
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL ||
            process.env.NOTIFICATIONS_FROM_EMAIL ||
            'Ezana Finance <notifications@ezanafinance.com>',
          to: [privacyInbox],
          subject: `[Privacy] Data request: ${label}`,
          text: [
            `New data subject request`,
            ``,
            `Request ID: ${inserted.id}`,
            `Type: ${label} (${requestType})`,
            `User ID: ${user.id}`,
            `Email: ${user.email || 'n/a'}`,
            ``,
            `Details from user:`,
            details || '(none)',
            ``,
            `Account context (client):`,
            JSON.stringify(clientContext, null, 2),
          ].join('\n'),
        });
      } catch (mailErr) {
        console.error('[data-request POST email]', mailErr);
      }
    }

    return NextResponse.json({
      ok: true,
      id: inserted.id,
      created_at: inserted.created_at,
      message:
        'Your request was submitted. Our team will respond using your account email where required.',
    });
  } catch (e) {
    console.error('[data-request POST]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
