/**
 * Open and Export PDF for a library document: a standalone, printable page
 * in a new window. App theme tokens do not exist in a blank window, so the
 * letterhead uses the Ezana brand emerald and font stacks directly (this file
 * is on the branding guard's list of standalone documents).
 *
 * Every value is escaped before it is written: the window shares this
 * origin, so raw text there would run as markup.
 */
import { cleanTitle, docTypeLabel, fmtDate } from '@/lib/org-research-library-model';

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

function docHtml(note) {
  const title = esc(cleanTitle(note.title));
  const meta = [
    docTypeLabel(note.doc_type),
    note.ticker,
    note.sector,
    note.author_name ? `by ${note.author_name}` : null,
    fmtDate(note.published_at || note.created_at),
    `v${note.version || 1}`,
  ]
    .filter(Boolean)
    .map(esc)
    .join(' &middot; ');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#1a1a1a;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.6}
  .lh{border-bottom:3px solid #10b981;padding-bottom:12px;margin-bottom:20px}
  .eyebrow{color:#047857;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px}
  h1{font-size:24px;margin:6px 0}
  .meta{color:#555;font-size:13px}
  .abstract{border-left:3px solid #10b981;padding:4px 16px;margin:18px 0}
  .body{white-space:pre-wrap;font-size:15px}
  .foot{margin-top:32px;border-top:1px solid #ddd;padding-top:10px;color:#777;font-size:11px}
</style></head><body>
  <div class="lh"><div class="eyebrow">Ezana Finance, Research Library</div>
  <h1>${title}</h1>
  <div class="meta">${meta}</div></div>
  ${note.abstract ? `<div class="abstract"><strong>Abstract.</strong> ${esc(note.abstract)}</div>` : ''}
  <div class="body">${esc(note.body)}</div>
  ${note.citations ? `<div class="foot"><strong>Sources:</strong> ${esc(note.citations)}</div>` : ''}
  <div class="foot">From the council's Research Library. Internal use only.</div>
</body></html>`;
}

/** Returns false when the browser blocked the new window. */
export function openDocument(note, { print = false } = {}) {
  if (typeof window === 'undefined') return false;
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(docHtml(note));
  w.document.close();
  if (print) setTimeout(() => w.print(), 350);
  return true;
}
