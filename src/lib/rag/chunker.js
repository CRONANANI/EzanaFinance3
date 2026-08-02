/**
 * Heading-aware chunker (RAG_SYSTEM.md §3 P1). Splits on markdown/plaintext
 * headings first, then packs sentences to TARGET_CHARS with OVERLAP_CHARS of
 * trailing overlap. Never splits mid-sentence. ~4 chars/token heuristic:
 * 500 tokens ≈ 2000 chars, 50-token overlap ≈ 200 chars.
 */
export const TARGET_CHARS = 2000;
export const OVERLAP_CHARS = 200;
export const MIN_CHUNK_CHARS = 300; // merge runts into the previous chunk

const HEADING_RE = /^(#{1,4}\s+.+|[A-Z][A-Za-z0-9 ,'’&()-]{2,80})$/;

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function splitSentences(text) {
  return (
    String(text || '')
      .replace(/\s+/g, ' ')
      .match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || []
  );
}

/** Split plaintext into { title, body } sections on heading-looking lines. */
export function splitSections(plaintext) {
  const lines = String(plaintext || '').split(/\n+/);
  const sections = [];
  let current = { title: null, body: [] };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const isHeading = line.length <= 90 && HEADING_RE.test(line) && !/[.!?]$/.test(line);
    if (isHeading && current.body.length) {
      sections.push(current);
      current = { title: line.replace(/^#+\s*/, ''), body: [] };
    } else if (isHeading && !current.title) {
      current.title = line.replace(/^#+\s*/, '');
    } else {
      current.body.push(line);
    }
  }
  if (current.body.length) sections.push(current);
  return sections.length ? sections : [{ title: null, body: [plaintext] }];
}

/** Pack one section's sentences into overlapping chunks. */
function packSection(sectionText) {
  const sentences = splitSentences(sectionText);
  const chunks = [];
  let buf = '';
  for (const s of sentences) {
    if (buf && (buf + s).length > TARGET_CHARS) {
      chunks.push(buf.trim());
      buf = buf.slice(-OVERLAP_CHARS) + s; // sentence-safe-ish overlap tail
    } else {
      buf += s;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  // Merge runts backward so no chunk is uselessly small.
  return chunks.reduce((acc, c) => {
    if (c.length < MIN_CHUNK_CHARS && acc.length) acc[acc.length - 1] += ' ' + c;
    else acc.push(c);
    return acc;
  }, []);
}

/**
 * chunkDocument(plaintext) →
 *   [{ chunkIndex, sectionAnchor, sectionTitle, content, tokenEstimate }]
 */
export function chunkDocument(plaintext) {
  const out = [];
  let i = 0;
  for (const sec of splitSections(plaintext)) {
    const anchor = sec.title ? slugify(sec.title) : null;
    for (const content of packSection(sec.body.join(' '))) {
      out.push({
        chunkIndex: i++,
        sectionAnchor: anchor,
        sectionTitle: sec.title || null,
        content,
        tokenEstimate: Math.round(content.length / 4),
      });
    }
  }
  return out;
}
