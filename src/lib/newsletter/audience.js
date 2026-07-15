import { createServerSupabaseClient } from '@/lib/supabase-service-role';
import {
  NEWSLETTER_MAILING_ADDRESS,
  listUnsubscribeHeader,
  newsletterUnsubscribeUrl,
} from './config';

/**
 * The ONLY sanctioned audience for any outbound newsletter. Returns strictly
 * `status = 'confirmed'` rows — never pending, unsubscribed, bounced, or
 * complained. Every send path MUST source its recipients from here, which is
 * what makes it structurally impossible to mail an unconfirmed or opted-out
 * address.
 *
 * @returns {Promise<Array<{ id: string, email: string, full_name: string|null, unsubscribe_token: string }>>}
 */
export async function getConfirmedSubscribers() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('marketing_subscribers')
    .select('id, email, full_name, unsubscribe_token')
    .eq('status', 'confirmed');
  if (error) {
    console.error('getConfirmedSubscribers error:', error);
    return [];
  }
  return data || [];
}

/**
 * CASL-required per-recipient send envelope. Every outbound newsletter MUST
 * include a working unsubscribe link (their token), the List-Unsubscribe header,
 * and the physical mailing address. Build the send from this so none is ever
 * omitted.
 *
 * @param {{ unsubscribe_token: string }} subscriber
 */
export function newsletterSendEnvelope(subscriber) {
  const unsubscribeUrl = newsletterUnsubscribeUrl(subscriber.unsubscribe_token);
  return {
    unsubscribeUrl,
    mailingAddress: NEWSLETTER_MAILING_ADDRESS,
    headers: {
      'List-Unsubscribe': listUnsubscribeHeader(subscriber.unsubscribe_token),
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}
