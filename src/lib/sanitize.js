import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return DOMPurify.sanitize(input.trim(), { ALLOWED_TAGS: [] });
}

export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      clean[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      clean[key] = value.map((v) => (typeof v === 'string' ? sanitizeInput(v) : v));
    } else {
      clean[key] = value;
    }
  }
  return clean;
}
