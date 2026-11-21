import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import {
  ATTACH_MAX_BYTES,
  ATTACH_MAX_CHARS,
  IMAGE_MAX_BYTES,
  checkAttachment,
  checkImage,
  imageKindOfBytes,
} from '@/lib/sonar/workspace';
import { HAIKU_MODEL } from '@/lib/sonar/llm-providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEADERS = { 'Cache-Control': 'private, no-store' };
const fail = (error, status = 400) => NextResponse.json({ error }, { status, headers: HEADERS });
const CSV_ROWS = 200;

/* The file's own first bytes decide what it is: a PDF must start with "%PDF-", and a text,
   Markdown or CSV file must decode as text with no binary bytes. Neither the name nor the
   declared type is trusted alone. */
const isPdfBytes = (buf) => buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-';
const looksBinary = (buf) => {
  const head = buf.subarray(0, Math.min(buf.length, 4096));
  let odd = 0;
  for (const b of head) {
    if (b === 0) return true;
    if (b < 9 || (b > 13 && b < 32)) odd += 1;
  }
  return odd > head.length * 0.02;
};

async function pdfText(buf) {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return String(Array.isArray(text) ? text.join('\n') : text || '');
}

function csvText(raw) {
  const parsed = Papa.parse(raw, { skipEmptyLines: true, preview: CSV_ROWS });
  return (parsed.data || [])
    .map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? '').trim()).join(', ') : ''))
    .filter(Boolean)
    .join('\n');
}

const IMAGE_PROMPT =
  'Describe this image for a financial research assistant. Transcribe every piece of text, number, axis label, legend and table cell exactly as shown. Then say plainly what any chart or table shows (series, time span, direction). Do not guess values that are not legible, do not add outside facts, and do not give advice. Plain text only.';

/* A photo from the Sonar composer, read once into text by a vision call. The image itself is
   never stored or logged; only the text comes back, like any attached file. */
async function imageText(buf, media) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw Object.assign(new Error('no key'), { code: 'NO_VISION' });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      ...(process.env.ANTHROPIC_WORKSPACE_ID
        ? { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID }
        : {}),
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: media, data: buf.toString('base64') },
            },
            { type: 'text', text: IMAGE_PROMPT },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`vision ${res.status}`);
  const data = await res.json();
  return (data?.content || [])
    .filter((c) => c?.type === 'text')
    .map((c) => c.text)
    .join('\n')
    .trim();
}

/**
 * POST /api/sonar/attachment (multipart, one `file`)
 *
 * Nov 21: an image (PNG, JPEG, WebP or GIF, 4 MB or less, checked by its first bytes) is
 * read into text by one vision call and returned the same way, for the composer's photos.
 *
 * A file attached to a Sonar follow-up (Sonar research workspace, Nov 13 2026). Checked again
 * on the server (checkAttachment: PDF, text, Markdown or CSV, 2 MB or less) and by its first
 * bytes; the text is extracted here (unpdf for a PDF, papaparse for a CSV's first 200 rows,
 * a plain decode otherwise) and returned for the next research request. Nothing is written to
 * storage or to the database, and the text is never logged.
 *
 * 200 { name, text, clipped }
 */
export const POST = withApiGuard(
  async (request) => {
    try {
      const form = await request.formData().catch(() => null);
      const file = form?.get('file');
      if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function')
        return fail('Attach one file.');
      const name = String(file.name || 'file').slice(0, 120);
      const isImage =
        String(file.type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name);
      if (isImage) {
        const img = checkImage({ name, type: file.type || '', size: file.size || 0 });
        if (!img.ok) return fail(img.error);
        const ibuf = Buffer.from(await file.arrayBuffer());
        if (ibuf.length > IMAGE_MAX_BYTES) return fail('Add an image of 4 MB or less.');
        const real = imageKindOfBytes(ibuf.subarray(0, 12));
        if (!real) return fail('That file is not a readable image.');
        let described = '';
        try {
          described = await imageText(ibuf, `image/${real}`);
        } catch (e) {
          if (e?.code === 'NO_VISION') return fail('Photos cannot be read right now.', 503);
          return fail('That image could not be read. Try again.', 502);
        }
        if (!described) return fail('Nothing could be read from that image.');
        return NextResponse.json(
          {
            name,
            text: described.slice(0, ATTACH_MAX_CHARS),
            clipped: described.length > ATTACH_MAX_CHARS,
            kind: 'image',
          },
          { headers: HEADERS },
        );
      }
      const check = checkAttachment({ name, type: file.type || '', size: file.size || 0 });
      if (!check.ok) return fail(check.error);
      if (file.size > ATTACH_MAX_BYTES) return fail('Attach a file of 2 MB or less.');
      const buf = Buffer.from(await file.arrayBuffer());
      if (buf.length > ATTACH_MAX_BYTES) return fail('Attach a file of 2 MB or less.');

      const ext = name.toLowerCase().split('.').pop();
      const claimsPdf = check.kind === 'pdf' || ext === 'pdf' || file.type === 'application/pdf';
      let text = '';
      if (claimsPdf) {
        if (!isPdfBytes(buf)) return fail('That file is not a readable PDF.');
        text = await pdfText(buf).catch(() => '');
        if (!text.trim()) return fail('No text could be read from that PDF.');
      } else {
        if (isPdfBytes(buf) || looksBinary(buf))
          return fail('Attach a PDF, text, Markdown or CSV file.');
        const raw = buf.toString('utf8');
        text = check.kind === 'csv' || ext === 'csv' ? csvText(raw) : raw;
      }
      text = text.replace(/\u0000/g, '').trim();
      if (!text) return fail('That file has no text to read.');
      const clipped = text.length > ATTACH_MAX_CHARS;
      return NextResponse.json(
        { name, text: text.slice(0, ATTACH_MAX_CHARS), clipped },
        { headers: HEADERS },
      );
    } catch (err) {
      return safeErrorResponse(err, {
        message: 'That file could not be read.',
        context: 'sonar/attachment',
      });
    }
  },
  { strict: true },
);
