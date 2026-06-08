/**
 * SSRF guard utilities.
 *
 * Server-side code that fetches a URL derived from user input (article links,
 * webhook callbacks, image references, …) must validate the target first so an
 * attacker cannot make the server reach internal services — cloud metadata
 * (169.254.169.254), loopback, RFC1918 ranges, link-local, etc.
 *
 * `assertPublicHttpUrl` parses the URL, enforces http(s), and resolves DNS to
 * verify every resulting address is publicly routable. There is a small
 * residual DNS-rebinding window (the platform `fetch` re-resolves), but this
 * blocks the overwhelming majority of SSRF vectors and is standard practice.
 */

import dns from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal', 'metadata']);

/** True when an IP literal falls in a private / loopback / reserved range. */
function isBlockedIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true; // private
    if (a === 127) return true; // loopback
    if (a === 0) return true; // "this" network
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    if (low === '::1' || low === '::') return true; // loopback / unspecified
    if (low.startsWith('fe80')) return true; // link-local
    if (low.startsWith('fc') || low.startsWith('fd')) return true; // unique-local
    const mapped = low.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/); // IPv4-mapped
    if (mapped) return isBlockedIp(mapped[1]);
    return false;
  }
  return true; // unknown format → block
}

/**
 * Validate that `rawUrl` is a public http(s) URL safe to fetch server-side.
 * Throws an Error (with a generic message) when the URL is invalid or points
 * at a private / internal address. Returns the parsed URL on success.
 *
 * @param {string} rawUrl
 * @returns {Promise<URL>}
 */
export async function assertPublicHttpUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    !hostname ||
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Host not allowed');
  }

  // IP literal → check directly, no DNS needed.
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error('Host not allowed');
    return url;
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error('DNS resolution failed');
  }
  if (!addresses.length) throw new Error('DNS resolution failed');
  for (const { address } of addresses) {
    if (isBlockedIp(address)) throw new Error('Host resolves to a private address');
  }

  return url;
}

/**
 * Returns true if `rawUrl` is an https URL whose host is in `allowedHosts`
 * (exact host match). Used to constrain user-supplied media URLs to trusted
 * origins. Never throws.
 *
 * @param {string} rawUrl
 * @param {Iterable<string>} allowedHosts
 * @returns {boolean}
 */
export function isAllowedHttpsHost(rawUrl, allowedHosts) {
  if (typeof rawUrl !== 'string' || !rawUrl) return false;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const set = allowedHosts instanceof Set ? allowedHosts : new Set(allowedHosts);
  return set.has(url.host.toLowerCase());
}
