/**
 * Org audit log. Append privileged actions to org_audit_log. Best-effort —
 * a logging failure must NEVER break the action it records, so every call is
 * wrapped and swallows errors. Pass a service-role client (org_audit_log has
 * no client-insert RLS policy by design; writes are server-side only).
 */
export async function logOrgAction(
  client,
  { orgId, actorId, action, targetType, targetId, detail } = {},
) {
  if (!client || !orgId || !action) return;
  try {
    await client.from('org_audit_log').insert({
      org_id: orgId,
      actor_id: actorId || null,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      detail: detail || null,
    });
  } catch (err) {
    console.warn('[org-audit] log failed:', err?.message || err);
  }
}
