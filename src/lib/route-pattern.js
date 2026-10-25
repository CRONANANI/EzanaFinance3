/* Pure; used by api-guard for rate-limit buckets (reliability audit P2-12). */

/**
 * The route PATTERN for a request, so /api/x/[id] is one bucket rather
 * than one per id: each dynamic param value in the path is replaced by its
 * [name] (catch-alls by [...name]).
 */
export function routePattern(pathname, params) {
  if (!params || typeof params !== 'object') return pathname;
  let segs = String(pathname).split('/');
  for (const [name, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      const joined = value.map(String);
      for (let i = 0; i + joined.length <= segs.length; i += 1) {
        if (joined.every((v, k) => decodeURIComponent(segs[i + k]) === v)) {
          segs = [...segs.slice(0, i), `[...${name}]`, ...segs.slice(i + joined.length)];
          break;
        }
      }
    } else if (value != null) {
      const idx = segs.findIndex((x) => {
        try {
          return decodeURIComponent(x) === String(value);
        } catch {
          return x === String(value);
        }
      });
      if (idx > 0) segs[idx] = `[${name}]`;
    }
  }
  return segs.join('/');
}
