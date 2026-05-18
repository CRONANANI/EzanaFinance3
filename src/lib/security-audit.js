import { getAdminClient } from '@/lib/supabase';

export async function logSecurityEvent(eventType, { actorId, targetId, ip, details } = {}) {
  try {
    const admin = getAdminClient();
    await admin.from('security_audit_log').insert({
      event_type: eventType,
      actor_id: actorId || null,
      target_id: targetId || null,
      ip_address: ip || null,
      details: details || {},
    });
  } catch (e) {
    console.error('[security-audit] failed to log', eventType, e?.message);
  }
}
