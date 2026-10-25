/**
 * Structured JSON logs. `logger.child({ requestId, job })` returns a logger
 * whose lines all carry those fields (reliability audit P3); requestIdOf()
 * reads the id the middleware put on the request.
 */
function line(level, base, message, data) {
  const out = JSON.stringify({
    level,
    message,
    ...base,
    ...data,
    timestamp: new Date().toISOString(),
  });
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else console.log(out);
}

function make(base = {}) {
  return {
    info: (message, data = {}) => line('info', base, message, data),
    warn: (message, data = {}) => line('warn', base, message, data),
    error: (message, data = {}) => line('error', base, message, data),
    child: (extra = {}) => make({ ...base, ...extra }),
  };
}

export const logger = make();

export function requestIdOf(request) {
  try {
    return request?.headers?.get?.('x-request-id') || null;
  } catch {
    return null;
  }
}
