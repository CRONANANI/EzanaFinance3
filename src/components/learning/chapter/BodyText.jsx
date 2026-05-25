'use client';

import { useRef } from 'react';
import { parseTickerTokens } from './ticker-popup/parseTickerTokens';
import { useTickerPopup } from './ticker-popup/TickerPopupContext';

export function BodyText({ body }) {
  const tokens = parseTickerTokens(body);

  return (
    <p className="lc-edit-paragraph">
      {tokens.map((tok, i) => {
        if (tok.type === 'ticker') {
          return <InlineTicker key={i} symbol={tok.symbol} display={tok.display} />;
        }
        return <FormattedText key={i} text={tok.content} />;
      })}
    </p>
  );
}

function InlineTicker({ symbol, display }) {
  const { openTicker } = useTickerPopup();
  const buttonRef = useRef(null);

  return (
    <button
      ref={buttonRef}
      type="button"
      className="lc-ticker-inline"
      onClick={() => openTicker(symbol, buttonRef.current)}
      aria-label={`View ${symbol} (${display}) details`}
    >
      {display}
    </button>
  );
}

function FormattedText({ text }) {
  if (!text) return null;

  const parts = [];
  let lastIdx = 0;
  const boldRegex = /\*\*(.+?)\*\*/g;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ kind: 'plain', text: text.slice(lastIdx, match.index) });
    }
    parts.push({ kind: 'bold', text: match[1] });
    lastIdx = boldRegex.lastIndex;
  }
  if (lastIdx < text.length) {
    parts.push({ kind: 'plain', text: text.slice(lastIdx) });
  }

  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === 'bold') return <strong key={i}>{renderItalics(p.text)}</strong>;
        return <span key={i}>{renderItalics(p.text)}</span>;
      })}
    </>
  );
}

function renderItalics(text) {
  const segs = [];
  let lastIdx = 0;
  const italicRegex = /\*(.+?)\*/g;
  let match;
  while ((match = italicRegex.exec(text)) !== null) {
    if (match.index > lastIdx) segs.push({ kind: 'plain', text: text.slice(lastIdx, match.index) });
    segs.push({ kind: 'italic', text: match[1] });
    lastIdx = italicRegex.lastIndex;
  }
  if (lastIdx < text.length) segs.push({ kind: 'plain', text: text.slice(lastIdx) });
  if (segs.length === 0) return text;
  return segs.map((s, i) =>
    s.kind === 'italic' ? <em key={i}>{s.text}</em> : <span key={i}>{s.text}</span>,
  );
}
