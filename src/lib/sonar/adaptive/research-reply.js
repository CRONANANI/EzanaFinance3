/**
 * Sonar adaptive research: reading a model reply safely (Nov 2026).
 *
 * Every live research step asks for one JSON object and then checks it. These are the shared
 * checks: pull the first complete object out of the text, clip strings, accept only real
 * calendar dates, and accept only links the search tool actually returned in that call (the
 * model cannot introduce an address).
 */
import { canonicalUrl, hostOf } from './news-intelligence';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/* The long dash, by code point, so this file does not contain one. */
const DASH = new RegExp(`\\s*${String.fromCharCode(8212)}\\s*`, 'g');

export const clip = (v, n) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .replace(DASH, ', ')
    .trim()
    .slice(0, n);

export const isoDate = (v) =>
  DATE.test(String(v || '')) && !Number.isNaN(Date.parse(v)) ? String(v) : null;

export function firstJson(textIn) {
  const s = String(textIn || '');
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i += 1) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(s.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * The links a reply may cite: only https addresses the search tool returned.
 * @param {{ url: string, title?: string }[]} retrieved
 * @returns {{ links: (list: unknown) => string[], titles: Record<string, string> }}
 */
export function retrievedLinks(retrieved = []) {
  const allowed = new Map();
  for (const r of retrieved || []) {
    const u = canonicalUrl(r?.url);
    if (u && u.startsWith('https://')) allowed.set(u, clip(r.title, 160) || hostOf(u));
  }
  return {
    links: (list) => [
      ...new Set(
        (Array.isArray(list) ? list : [])
          .map((u) => canonicalUrl(u))
          .filter((u) => u && allowed.has(u)),
      ),
    ],
    titles: Object.fromEntries(allowed),
  };
}

export const strings = (list, n, max) =>
  (Array.isArray(list) ? list : [])
    .map((v) => clip(v, n))
    .filter(Boolean)
    .slice(0, max);
