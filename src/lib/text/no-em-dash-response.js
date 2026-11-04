/**
 * Route wrapper: no em dashes in any response an AI or Sonar route returns
 * (Nov 2026). Model output, third-party headlines, market questions and
 * stored text all pass through here on the way out.
 *
 *   JSON            every string value rewritten (deepRemoveEmDashes)
 *   event-stream    each SSE event rewritten as it streams
 *   text/plain      each chunk rewritten
 *   anything else   untouched
 *
 * Status and headers (Set-Cookie included) are kept; Content-Length is
 * dropped because the body length can change.
 */
import { deepRemoveEmDashes, removeEmDashes } from './em-dash';

function sseTransform() {
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buf = '';
  return new TransformStream({
    transform(chunk, controller) {
      buf += dec.decode(chunk, { stream: true });
      let cut;
      while ((cut = buf.indexOf('\n\n')) >= 0) {
        controller.enqueue(enc.encode(`${removeEmDashes(buf.slice(0, cut))}\n\n`));
        buf = buf.slice(cut + 2);
      }
    },
    flush(controller) {
      buf += dec.decode();
      if (buf) controller.enqueue(enc.encode(removeEmDashes(buf)));
    },
  });
}

function textTransform() {
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  return new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(enc.encode(removeEmDashes(dec.decode(chunk, { stream: true }))));
    },
    flush(controller) {
      const rest = dec.decode();
      if (rest) controller.enqueue(enc.encode(removeEmDashes(rest)));
    },
  });
}

/** Rewrite one Response. Exported for tests. */
export async function cleanResponse(res) {
  if (!res || typeof res.headers?.get !== 'function') return res;
  const type = res.headers.get('content-type') || '';
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  if (type.includes('application/json')) {
    const text = await res.text();
    let body = text;
    try {
      body = JSON.stringify(deepRemoveEmDashes(JSON.parse(text)));
    } catch {
      body = removeEmDashes(text);
    }
    return new Response(body, { status: res.status, statusText: res.statusText, headers });
  }
  if (res.body && (type.includes('text/event-stream') || type.startsWith('text/'))) {
    const t = type.includes('text/event-stream') ? sseTransform() : textTransform();
    return new Response(res.body.pipeThrough(t), {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  }
  return res;
}

/** Wrap a route handler: (request, context) => Response. */
export function withNoEmDash(handler) {
  return async (request, context) => cleanResponse(await handler(request, context));
}
