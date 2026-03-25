import webpush from 'web-push';
import { createServerSupabaseClient } from '@/lib/supabase-service-role';

const rawContact = process.env.VAPID_CONTACT_EMAIL || 'support@ezanafinance.com';
const VAPID_SUBJECT = rawContact.startsWith('mailto:') ? rawContact : `mailto:${rawContact}`;

let vapidConfigured = false;

function ensureWebPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    return false;
  }
  if (!vapidConfigured) {
    webpush.setVapidDetails(VAPID_SUBJECT, pub, priv);
    vapidConfigured = true;
  }
  return true;
}

/**
 * Send a web push notification to all subscriptions for a user.
 * Call from server-only code (API routes, webhooks, cron).
 *
 * @param {string} userId — Supabase auth user id
 * @param {{ title: string, body: string, url?: string, tag?: string, image?: string }} payload
 */
export async function sendPushNotification(userId, { title, body, url, tag, image }) {
  if (!ensureWebPush()) {
    console.warn('sendPushNotification: VAPID keys not configured');
    return { sent: 0, error: 'VAPID not configured' };
  }

  let supabase;
  try {
    supabase = createServerSupabaseClient();
  } catch {
    return { sent: 0, error: 'Supabase service client unavailable' };
  }

  try {
    const { data: rows, error } = await supabase
      .from('push_subscriptions')
      .select('subscription, endpoint')
      .eq('user_id', userId);

    if (error) {
      console.error('sendPushNotification select:', error);
      return { sent: 0, error: error.message };
    }

    if (!rows?.length) {
      return { sent: 0 };
    }

    const payload = JSON.stringify({
      title: title || 'Ezana Finance',
      body: body || '',
      url: url || '/',
      tag,
      image,
    });

    let sent = 0;
    for (const row of rows) {
      const sub = row.subscription;
      if (!sub || !sub.endpoint) continue;

      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err) {
        const code = err.statusCode;
        if (code === 410 || code === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('endpoint', row.endpoint || sub.endpoint);
        } else {
          console.error('webpush.sendNotification:', err.message || err);
        }
      }
    }

    return { sent };
  } catch (error) {
    console.error('sendPushNotification:', error);
    return { sent: 0, error: error.message };
  }
}
