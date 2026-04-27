'use client';

import { CheckCheck, Check } from 'lucide-react';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

function Highlight({ text, term }) {
  if (!term || text == null) return <>{text}</>;
  const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = String(text).split(new RegExp(`(${safeTerm})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === term.toLowerCase() ? (
          <mark key={i} className="m-search-mark">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function MessageBubble({
  message,
  isSelf,
  sender,
  showAvatar = true,
  highlightTerm = '',
  isMatched = false,
}) {
  const time = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const senderName = sender?.name || sender?.displayName || '';

  return (
    <div className={`m-bubble-row${isSelf ? ' m-bubble-row--self' : ''}`}>
      {!isSelf &&
        (showAvatar ? (
          sender?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sender.avatar_url}
              alt=""
              className="m-bubble-row__avatar"
            />
          ) : (
            <div className="m-bubble-row__avatar-fallback" aria-hidden>
              {getInitials(senderName)}
            </div>
          )
        ) : (
          <div className="m-bubble-row__avatar-spacer" aria-hidden />
        ))}

      <div className="m-bubble-col">
        {!isSelf && showAvatar && senderName && (
          <div className="m-bubble-sender">{senderName}</div>
        )}
        <div
          className={`m-bubble ${isSelf ? 'm-bubble--self' : 'm-bubble--theirs'}${
            isMatched ? ' m-bubble--matched' : ''
          }`}
        >
          <p className="m-bubble__text">
            <Highlight text={message.content} term={highlightTerm} />
          </p>
          <div className="m-bubble__foot">
            <span>{time}</span>
            {isSelf &&
              (message.read_at ? (
                <CheckCheck size={12} aria-label="Read" />
              ) : (
                <Check size={12} aria-label="Sent" />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
