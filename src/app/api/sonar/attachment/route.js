import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { ATTACH_MAX_BYTES, ATTACH_MAX_CHARS, checkAttachment } from '@/lib/sonar/workspace';

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

/**
 * POST /api/sonar/attachment (multipart, one `file`)
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
