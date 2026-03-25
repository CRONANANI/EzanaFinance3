/** Validate canonical UUID strings (any version) */
export function isValidUuid(s) {
  if (typeof s !== 'string' || !s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
