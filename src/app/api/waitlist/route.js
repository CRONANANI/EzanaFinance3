import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-service-role';
import { Resend } from 'resend';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, fullName, referralSource } = body;

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Initialize Supabase client
    const supabase = createServerSupabaseClient();

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('waitlist')
      .select('email, legacy_number')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'This email is already on the waitlist!',
          legacyNumber: existingUser.legacy_number
        },
        { status: 409 }
      );
    }

    // Get request headers for tracking
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Insert email into waitlist table
    const { data, error: insertError } = await supabase
      .from('waitlist')
      .insert([
        {
          email: normalizedEmail,
          full_name: fullName || null,
          referral_source: referralSource || 'landing_page',
          ip_address: ipAddress,
          user_agent: userAgent,
          status: 'pending',
          metadata: {
            signup_page: 'main_landing',
            signup_timestamp: new Date().toISOString(),
          },
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to join waitlist. Please try again.' },
        { status: 500 }
      );
    }

    // Determine legacy status message
    const isLegacy = data.legacy_user;
    const legacyNumber = data.legacy_number;

    // Send confirmation email using Resend - initialize lazily at request time
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Ezana Finance <waitlist@ezanafinance.com>',
          to: normalizedEmail,
          subject: isLegacy
            ? `You're Legacy Member #${legacyNumber}! 🎉`
            : "You're on the Ezana Finance Waitlist! 🎉",
          html: generateWaitlistEmail(normalizedEmail, isLegacy, legacyNumber),
        });
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Don't fail the request if email fails - user is still on waitlist
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: isLegacy
          ? `Welcome, Legacy Member #${legacyNumber}! Check your email for confirmation.`
          : "You're on the waitlist! Check your email for confirmation.",
        legacyUser: isLegacy,
        legacyNumber: legacyNumber,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Waitlist API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

// Email template generator function
function generateWaitlistEmail(email, isLegacy, legacyNumber) {
  const legacyBadge = isLegacy
    ? `
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px;">Legacy Member</p>
      <p style="color: #ffffff; font-size: 48px; font-weight: 800; margin: 0; line-height: 1;">#${legacyNumber}</p>
      <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 12px 0 0;">of the first 1,000 members</p>
    </div>
  `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #10b981; font-size: 28px; margin: 0;">Ezana Finance</h1>
          <p style="color: #6e7681; font-size: 14px; margin-top: 8px;">Follow the moves that matter</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: linear-gradient(180deg, rgba(22, 27, 34, 0.95) 0%, rgba(13, 17, 23, 0.98) 100%); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 16px; padding: 40px; text-align: center;">
          <div style="width: 60px; height: 60px; background: rgba(16, 185, 129, 0.1); border-radius: 50%; margin: 0 auto 24px; line-height: 60px;">
            <span style="font-size: 28px;">🎉</span>
          </div>
          
          <h2 style="color: #f0f6fc; font-size: 24px; margin: 0 0 16px;">
            ${isLegacy ? "You're a Legacy Member!" : "You're on the list!"}
          </h2>
          
          ${legacyBadge}
          
          <p style="color: #8b949e; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
            ${
              isLegacy
                ? "Congratulations! As one of our first 1,000 members, you'll receive exclusive benefits including lifetime discounts, early feature access, and a special Legacy badge on your profile."
                : "Thank you for joining the Ezana Finance waitlist. You'll be among the first to access institutional-grade market intelligence when we launch."
            }
          </p>
          
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: left;">
            <h3 style="color: #10b981; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px;">What you'll get access to:</h3>
            <ul style="color: #c9d1d9; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Real-time congressional trading alerts</li>
              <li>Hedge fund 13F filings & analysis</li>
              <li>Legendary investor portfolio tracking</li>
              <li>Community insights & discussions</li>
              ${isLegacy ? '<li><strong style="color: #10b981;">Legacy member exclusive benefits</strong></li>' : ''}
            </ul>
          </div>
          
          <p style="color: #6e7681; font-size: 14px; margin: 24px 0 0;">
            We'll notify you as soon as early access is available.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px;">
          <p style="color: #6e7681; font-size: 12px; margin: 0;">
            © 2026 Ezana Finance. All rights reserved.
          </p>
          <p style="color: #6e7681; font-size: 12px; margin: 8px 0 0;">
            You received this email because you signed up for the Ezana Finance waitlist.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
