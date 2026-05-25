'use client';

export function PullQuote({ body, caption }) {
  const parts = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIdx = 0;
  let match;
  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIdx) parts.push({ text: body.slice(lastIdx, match.index), bold: false });
    parts.push({ text: match[1], bold: true });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < body.length) parts.push({ text: body.slice(lastIdx), bold: false });

  return (
    <figure className="lc-edit-pullquote">
      <span className="lc-edit-pullquote-mark" aria-hidden>
        {'\u201C'}
      </span>
      <blockquote>
        {parts.map((p, i) =>
          p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>,
        )}
      </blockquote>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
