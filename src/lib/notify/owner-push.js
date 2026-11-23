/**
 * Push notifications to the founder's phone (Nov 23 2026, owner's request) through ntfy
 * (https://ntfy.sh): a new Advanced free trial confirmed by Stripe, and a new waitlist
 * sign-up.
 *
 * Setup: install the ntfy app, subscribe to the topic in OWNER_NTFY_TOPIC (a long random
 * name; it works like a password, since anyone who knows it can read the topic), and set
 * that variable in Vercel. NTFY_SERVER overrides https://ntfy.sh; NTFY_TOKEN adds a
 * bearer token for a protected topic. With no topic set this does nothing.
 *
 * It never throws and gives up after 3 seconds, so a notification problem can never
 * fail a sign-up or a Stripe webhook.
 */

const TIMEOUT_MS = 3000;

/** HTTP headers must be plain ASCII: ntfy titles stay simple. */
const asciiHeader = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '')
    .slice(0, 120);

export function ownerPushConfigured() {
  return Boolean(process.env.OWNER_NTFY_TOPIC);
}

/**
 * @param {{ title: string, message: string, tags?: string[], click?: string, priority?: 1|2|3|4|5 }} n
 * @returns {Promise<boolean>} whether ntfy accepted it
 */
export async function notifyOwner({ title, message, tags = [], click, priority = 4 }) {
  const topic = process.env.OWNER_NTFY_TOPIC;
  if (!topic) return false;
  const server = (process.env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, '');
  const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
    Title: asciiHeader(title),
    Priority: String(priority),
  };
  if (tags.length) headers.Tags = tags.map(asciiHeader).join(',');
  if (click) headers.Click = asciiHeader(click);
  if (process.env.NTFY_TOKEN) headers.Authorization = `Bearer ${process.env.NTFY_TOKEN}`;
  try {
    const res = await fetch(`${server}/${encodeURIComponent(topic)}`, {
      method: 'POST',
      headers,
      body: String(message || '').slice(0, 2000),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) console.error('[owner-push] ntfy answered', res.status);
    return res.ok;
  } catch (e) {
    console.error('[owner-push] failed:', e?.message);
    return false;
  }
}

const BILLING_LABEL = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };

/** A new Advanced (or other) trial that Stripe confirmed. */
export function notifyTrialStarted({ email, name, plan, billing }) {
  const planName = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Plan';
  return notifyOwner({
    title: `New ${planName} free trial`,
    message: [
      name || null,
      email || 'Email not on the checkout',
      billing ? `${BILLING_LABEL[billing] || billing} billing` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    tags: ['tada'],
    click: 'https://dashboard.stripe.com/subscriptions?status=trialing',
  });
}

/** A new waitlist entry (repeat sign-ups with the same email do not notify). */
export function notifyWaitlistJoined({ name, email, role, organization, plan, billing }) {
  return notifyOwner({
    title: 'New waitlist sign-up',
    message: [
      name || null,
      email,
      [role, organization].filter(Boolean).join(', ') || null,
      plan ? `Plan: ${plan}${billing ? `, ${BILLING_LABEL[billing] || billing}` : ''}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    tags: ['memo'],
    click: 'https://ezana.world/admin/waitlist',
  });
}
