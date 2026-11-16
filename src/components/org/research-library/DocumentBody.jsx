'use client';

import ReactMarkdown from 'react-markdown';

/*
 * A document body is Markdown typed by a member: untrusted text. It is drawn
 * with the repo's existing renderer (react-markdown) with raw HTML skipped,
 * images left out and only plain text elements allowed. Links keep the
 * renderer's own URL check (javascript: and data: links are dropped) and open
 * in a new tab without referrer.
 */
const ALLOWED = [
  'p',
  'br',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'del',
  'code',
  'pre',
  'blockquote',
  'hr',
  'a',
];

const COMPONENTS = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow">
      {children}
    </a>
  ),
  h1: ({ children }) => <h4>{children}</h4>,
  h2: ({ children }) => <h4>{children}</h4>,
  h3: ({ children }) => <h5>{children}</h5>,
};

export function DocumentBody({ text }) {
  return (
    <div className="orl-md">
      <ReactMarkdown skipHtml allowedElements={ALLOWED} unwrapDisallowed components={COMPONENTS}>
        {String(text || '')}
      </ReactMarkdown>
    </div>
  );
}
