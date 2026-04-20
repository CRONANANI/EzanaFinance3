import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const TOPICS = new Set(['general', 'billing', 'technical', 'feature', 'other']);
const TOPIC_LABELS = {
  general: 'General question',
  billing: 'Account & billing',
  technical: 'Technical issue',
  feature: 'Feature request',
  other: 'Other',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 120;
const MAX_MESSAGE = 1000;

function validate(body) {
  const errors = {};
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const topic = typeof body?.topic === 'string' ? body.topic.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!name) errors.name = 'Name is required';
  else if (name.length > MAX_NAME) errors.name = `Name must be ${MAX_NAME} characters or fewer`;

  if (!email) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(email)) errors.email = 'Invalid email address';

  if (!TOPICS.has(topic)) errors.topic = 'Invalid topic';

  if (!message) errors.message = 'Message is required';
  else if (message.length > MAX_MESSAGE) errors.message = `Message must be ${MAX_MESSAGE} characters or fewer`;

  return { errors, data: { name, email, topic, message } };
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderHtmlBody({ name, email, topic, message }) {
  const topicLabel = TOPIC_LABELS[topic] || topic;
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; max-width: 600px;">
      <h2 style="margin:0 0 16px; font-size: 18px;">New support request</h2>
      <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
        <tr><td style="padding: 6px 0; color:#64748b; width: 120px;">Name</td><td style="padding: 6px 0;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding: 6px 0; color:#64748b;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#059669;">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding: 6px 0; color:#64748b;">Topic</td><td style="padding: 6px 0;">${escapeHtml(topicLabel)}</td></tr>
      </table>
      <div style="padding: 16px; border-radius: 8px; background: #f8fafb; border: 1px solid rgba(0,0,0,0.08); white-space: pre-wrap; font-size: 14px; line-height: 1.55;">${escapeHtml(message)}</div>
      <p style="margin: 16px 0 0; font-size: 12px; color:#94a3b8;">Submitted via the Ezana landing page contact form. Reply directly to this email to respond to the sender.</p>
    </div>
  `;
}

export async function POST(request) {
  try {
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { errors, data } = validate(raw);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    const supportInbox = process.env.SUPPORT_INBOX || 'support@ezanafinance.com';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Ezana Contact <noreply@ezana.world>';

    if (!process.env.RESEND_API_KEY) {
      // Graceful dev fallback: log the message so local submissions still "work".
      // In production, a missing RESEND_API_KEY is a real misconfiguration — log
      // an error and return 503 so the client shows the inline error state with
      // the fallback email fallback, rather than a misleading success.
      if (process.env.NODE_ENV === 'production') {
        console.error('[support/contact] RESEND_API_KEY is not set in production');
        return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
      }
      console.warn('[support/contact] RESEND_API_KEY not set — logging locally only', {
        ...data,
        target: supportInbox,
      });
      return NextResponse.json({ ok: true, delivered: false });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const topicLabel = TOPIC_LABELS[data.topic] || data.topic;

    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: [supportInbox],
      replyTo: data.email,
      subject: `[${topicLabel}] ${data.name}`,
      html: renderHtmlBody(data),
      text:
        `From: ${data.name} <${data.email}>\n` +
        `Topic: ${topicLabel}\n\n` +
        `${data.message}\n`,
    });

    if (sendError) {
      console.error('[support/contact] Resend error:', sendError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, delivered: true });
  } catch (err) {
    console.error('[support/contact] Unhandled error:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
