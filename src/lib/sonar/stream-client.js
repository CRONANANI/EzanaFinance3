/**
 * Read a Sonar server-sent event stream (Nov 2026). Calls onEvent for each event and resolves
 * with the final { status, body } (the `done` event), which is the exact body the JSON route
 * would have returned. A stream that ends without `done` resolves to a 502-shaped failure so
 * the caller's normal error handling takes over.
 *
 * @param {ReadableStream<Uint8Array>} stream
 * @param {(event: object) => void} [onEvent]
 * @returns {Promise<{ status: number, body: object|null }>}
 */
export async function readSonarStream(stream, onEvent = () => {}) {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let done = null;
  const handle = (block) => {
    const data = block
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trimStart())
      .join('\n');
    if (!data) return;
    let ev;
    try {
      ev = JSON.parse(data);
    } catch {
      return;
    }
    if (ev?.t === 'done') done = { status: Number(ev.status) || 200, body: ev.body ?? null };
    else {
      try {
        onEvent(ev);
      } catch {
        /* a display error never stops the stream */
      }
    }
  };
  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const { value, done: end } = await reader.read();
    if (value) buf += dec.decode(value, { stream: true });
    let cut;
    while ((cut = buf.indexOf('\n\n')) >= 0) {
      handle(buf.slice(0, cut));
      buf = buf.slice(cut + 2);
    }
    if (end) break;
  }
  buf += dec.decode();
  if (buf.trim()) handle(buf);
  return done || { status: 502, body: { error: 'The answer stream ended early.' } };
}
