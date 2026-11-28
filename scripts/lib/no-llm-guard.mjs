/**
 * Import first in any test that loads Sonar code: replaces global fetch so any request to
 * an LLM provider fails the test instead of spending money (Nov 28 2026). Other hosts are
 * refused too; tests that need a response install one with mockFetch().
 *
 *   import { mockFetch, llmRequests } from './lib/no-llm-guard.mjs';
 *   mockFetch((url, init) => new Response(JSON.stringify({...}), { status: 200 }));
 */
const LLM_HOSTS =
  /(^|\.)(anthropic\.com|openai\.com|moonshot\.ai|moonshot\.cn|deepseek\.com|googleapis\.com|mistral\.ai|groq\.com|together\.xyz|vercel\.sh|ai-gateway\.vercel\.sh)$/i;

export const llmRequests = [];
let handler = null;

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || String(input);
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    host = '';
  }
  if (LLM_HOSTS.test(host)) {
    llmRequests.push({ url, body: init?.body ? JSON.parse(init.body) : null });
    if (!handler) throw new Error(`no-llm-guard: blocked a request to ${host}`);
  }
  if (!handler) throw new Error(`no-llm-guard: blocked network request to ${host || url}`);
  return handler(url, init);
};

/** Answer requests with `fn(url, init)`; requests are still recorded in llmRequests. */
export function mockFetch(fn) {
  handler = fn;
}

export function clearMock() {
  handler = null;
}
