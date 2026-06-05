/**
 * Centralized input sanitization for Ezana Finance.
 *
 * Per CYBERSECURITY.md Section 3b: "Sanitize all user input. Community posts,
 * messages, profile bios, watchlist names — anything a user types that gets
 * stored and displayed to other users must be sanitized for XSS."
 */

/**
 * Escape HTML entities to prevent stored XSS.
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Strip HTML tags and encode entities to prevent stored XSS.
 * Use this on ANY user-provided text before writing to the database.
 */
export function sanitizeText(input, maxLength = 5000) {
  if (typeof input !== 'string') return '';
  return input
    .slice(0, maxLength)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#96;')
    .trim();
}

/**
 * Normalize and sanitize an email address before use.
 */
export function sanitizeEmail(input) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .toLowerCase()
    .slice(0, 254)
    .replace(/[<>"'`\s]/g, '');
}

/**
 * Sanitize a value for use in PostgREST .or() / .filter() expressions.
 * Prevents filter injection by stripping characters that could alter query logic.
 */
export function sanitizeFilterValue(input, maxLength = 200) {
  if (typeof input !== 'string') return '';
  return input
    .slice(0, maxLength)
    .replace(/[(){}[\];,`'"\\]/g, '')
    .replace(/\.\./g, '')
    .replace(/%00/g, '')
    .trim();
}

/**
 * Validate and sanitize a ticker symbol.
 */
export function sanitizeTicker(input) {
  if (typeof input !== 'string') return '';
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9.\-]/g, '')
    .slice(0, 15);
}

/**
 * Validate and sanitize a UUID.
 */
export function sanitizeUUID(input) {
  if (typeof input !== 'string') return '';
  const cleaned = input.trim().toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(cleaned)) {
    return cleaned;
  }
  return '';
}

/**
 * Sanitize JSON body — parse safely and validate types.
 */
export async function parseJsonBody(request) {
  try {
    const body = await request.json();
    if (typeof body !== 'object' || body === null) return null;
    return body;
  } catch {
    return null;
  }
}

/**
 * Sanitize output from AI/LLM responses before sending to client.
 */
export function sanitizeAIOutput(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');
}

/**
 * Generic input sanitizer — alias for sanitizeText with optional max-length.
 * Several API routes (community/posts, messages) import this name.
 */
export function sanitizeInput(input, maxLength = 5000) {
  return sanitizeText(input, maxLength);
}

/**
 * Recursively sanitize every string-valued field in an object. Pass through
 * primitives unchanged. Used by partner-application/submit and partner/profile
 * to scrub form-submitted JSON before persisting.
 *
 * @param {unknown} value
 * @param {number} [maxFieldLength=5000]
 */
export function sanitizeObject(value, maxFieldLength = 5000) {
  if (value == null) return value;
  if (typeof value === 'string') return sanitizeText(value, maxFieldLength);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeObject(v, maxFieldLength));
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeObject(v, maxFieldLength);
    }
    return out;
  }
  return value;
}
