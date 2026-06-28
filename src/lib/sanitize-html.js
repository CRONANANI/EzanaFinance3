/**
 * Layer 3 — XSS defense for raw-HTML sinks.
 *
 * Wrap any HTML that is NOT 100% authored by us at build time (DB content, user
 * input, external sources) with sanitizeHtml() before passing it to
 * dangerouslySetInnerHTML. Works on both server and client via
 * isomorphic-dompurify.
 */
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize an untrusted HTML string. Strips scripts, event handlers, and other
 * XSS vectors while keeping ordinary formatting markup. Returns '' for nullish
 * input so callers can inject the result safely.
 *
 * @param {string} dirty
 * @returns {string}
 */
export function sanitizeHtml(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    // Belt-and-suspenders: never allow inline event handlers or javascript: URLs.
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

export default sanitizeHtml;
