/**
 * Centralized input sanitization for Ezana Finance.
 *
 * Per CYBERSECURITY.md Section 3b: "Sanitize all user input. Community posts,
 * messages, profile bios, watchlist names — anything a user types that gets
 * stored and displayed to other users must be sanitized for XSS."
 */

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
