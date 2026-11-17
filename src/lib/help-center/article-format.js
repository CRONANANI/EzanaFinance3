/**
 * Presentation pass over a help article's authored HTML.
 *
 * Articles in src/lib/help-center-content.js are flat strings: an opening
 * paragraph, <h3> sections, an in-prose "Related articles" list and a FAQ
 * written as "Q:" / "A:" paragraph pairs. This module reshapes that markup
 * for the article layout without touching the content file:
 *
 *   - the opening paragraph becomes the lede,
 *   - the "Related articles" list is lifted out, so the page can render it
 *     once in the article footer instead of twice,
 *   - each FAQ pair becomes a question/answer block.
 *
 * Pure string work on trusted, repo-authored HTML (see sanitize-html.js for
 * the trust model). Never feed user or database content through it.
 */

const RELATED_RE = /<h3>\s*Related articles\s*<\/h3>\s*<ul>([\s\S]*?)<\/ul>/i;
const RELATED_LINK_RE = /<li>\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*<\/li>/g;
const FAQ_RE = /<p><strong>Q:<\/strong>\s*([\s\S]*?)<\/p>\s*<p>A:\s*([\s\S]*?)<\/p>/g;

const ENTITIES = {
  '&amp;': '&',
  '&plusmn;': '\u00b1',
  '&rsquo;': '\u2019',
  '&lsquo;': '\u2018',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

function plainText(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m] ?? m)
    .trim();
}

/**
 * @param {string} html authored article body
 * @returns {{ html: string, related: { href: string, title: string }[] }}
 */
export function formatHelpArticle(html) {
  let body = html || '';
  const related = [];

  const match = body.match(RELATED_RE);
  if (match) {
    for (const link of match[1].matchAll(RELATED_LINK_RE)) {
      related.push({ href: link[1], title: plainText(link[2]) });
    }
    /* Only lift the list when every item parsed as a plain link; otherwise
       leave the authored section where it is. */
    const itemCount = (match[1].match(/<li>/g) || []).length;
    if (related.length > 0 && related.length === itemCount) {
      body = body.replace(RELATED_RE, '');
    } else {
      related.length = 0;
    }
  }

  body = body.replace(
    FAQ_RE,
    (_, q, a) =>
      `<div class="hc-faq-item"><p class="hc-faq-q">${q.trim()}</p><p class="hc-faq-a">${a.trim()}</p></div>`,
  );

  if (/^\s*<p>/.test(body)) {
    body = body.replace(/^\s*<p>/, '<p class="hc-lede">');
  }

  return { html: body, related };
}

/** ~200 words per minute, floored at 1, computed from the stripped body. */
export function helpReadTime(html) {
  const words = (html || '')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
