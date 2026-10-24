/**
 * The strings Sonar shows about a ping. They read the understood DISPLAY
 * title, never the raw text the visitor typed (so "give me a lyout of …" is
 * never echoed back). Pure, unit tested in scripts/check-sonar-understand.mjs.
 */

export function newsHeaderTitle(live) {
  return live?.query ? `What is moving around “${live.query}”` : 'What is moving around it';
}

/** What the sign-up banner and history show for a ping. */
export function bannerQuery(understood, fallback = '') {
  return understood?.display || understood?.corrected || fallback;
}
