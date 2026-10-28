/**
 * Browser fetch for org API routes that never reports a failed write as a
 * success. Resolves to the parsed JSON body on 2xx; otherwise throws an Error
 * whose message is the route's `{ error }` (or a status fallback) and whose
 * `.status` is the HTTP status.
 *
 *   const data = await orgRequest('/api/org/teams', { method: 'POST', json: { name } });
 */
export async function orgRequest(url, { json, headers, ...init } = {}) {
  const opts = { ...init, headers: { ...(headers || {}) } };
  if (json !== undefined) {
    opts.body = JSON.stringify(json);
    opts.headers['Content-Type'] = 'application/json';
  }
  let res;
  try {
    res = await fetch(url, opts);
  } catch {
    throw Object.assign(new Error('Network error. Check your connection and try again.'), {
      status: 0,
    });
  }
  const type = res.headers.get('content-type') || '';
  const body = type.includes('json') ? await res.json().catch(() => ({})) : null;
  if (!res.ok) {
    const message =
      (body && typeof body.error === 'string' && body.error) ||
      (res.status === 403
        ? 'You do not have permission to do that.'
        : `Request failed (${res.status}).`);
    throw Object.assign(new Error(message), { status: res.status, body });
  }
  return body ?? {};
}
