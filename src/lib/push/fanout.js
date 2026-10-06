/**
 * Push a notification row to its user's devices (server only). Called right
 * after a user_notifications insert, so the caller's existing preference
 * checks still decide whether the notification exists at all; this adds the
 * user's "push to my phone" switch, one push per notification row (the
 * delivery log's unique fingerprint), and at most 20 pushes a day.
 * Never throws: a push failure must not fail the request that triggered it.
 */
import { sendFcm, fcmConfigured } from './fcm';
import { sendApns, apnsConfigured } from './apns';
import {
  DAILY_PUSH_CAP,
  pushFingerprint,
  pushText,
  pushUrl,
  underDailyCap,
  utcDay,
} from './fanout-core';

const REAL_SENDERS = {
  ios: (token, msg) => (apnsConfigured() ? sendApns(token, msg) : { ok: false }),
  android: (token, msg) =>
    fcmConfigured() ? sendFcm(token, msg).catch(() => ({ ok: false })) : { ok: false },
  configured: () => fcmConfigured() || apnsConfigured(),
};

/* `senders` is for tests; production always uses APNs and FCM. */
export async function pushNotification(admin, row, { url, senders = REAL_SENDERS } = {}) {
  try {
    if (!row?.id || !row?.user_id) return { sent: 0 };
    if (!senders.configured()) return { sent: 0 };

    const { data: tokens } = await admin
      .from('device_push_tokens')
      .select('id, token, platform')
      .eq('user_id', row.user_id)
      .eq('enabled', true);
    if (!tokens?.length) return { sent: 0 };

    const { data: pref } = await admin
      .from('user_interest_profiles')
      .select('notification_prefs')
      .eq('user_id', row.user_id)
      .maybeSingle();
    if (pref?.notification_prefs?.mobile_push === false) return { sent: 0 };

    const day = utcDay();
    const { count } = await admin
      .from('notification_delivery_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', row.user_id)
      .like('event_fingerprint', `push:${day}:%`);
    if (!underDailyCap(count || 0, DAILY_PUSH_CAP)) return { sent: 0, capped: true };

    /* Claim the notification first: the unique (user, fingerprint) key means a
       retry or a second caller cannot push the same row twice. */
    const { error: claimErr } = await admin.from('notification_delivery_log').insert({
      user_id: row.user_id,
      event_fingerprint: pushFingerprint(row.id, day),
    });
    if (claimErr) return { sent: 0, duplicate: true };

    const msg = { ...pushText(row), url: url || pushUrl(row.content) };
    const results = await Promise.all(
      tokens.map(async (t) => {
        const r = await (t.platform === 'ios' ? senders.ios : senders.android)(t.token, msg);
        if (r.unregistered) {
          await admin.from('device_push_tokens').update({ enabled: false }).eq('id', t.id);
        }
        return r.ok;
      }),
    );
    return { sent: results.filter(Boolean).length };
  } catch (e) {
    console.error('[push] fan-out', e?.message || e);
    return { sent: 0 };
  }
}

/**
 * Insert a user_notifications row and push it. Returns the insert's error
 * (null on success), like the plain insert it replaces.
 */
export async function insertNotificationAndPush(admin, row, opts) {
  const { data, error } = await admin.from('user_notifications').insert(row).select('id').single();
  if (error) return { error };
  await pushNotification(admin, { ...row, id: data.id }, opts);
  return { error: null };
}
