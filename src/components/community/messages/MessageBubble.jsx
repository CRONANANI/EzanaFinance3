'use client';

/**
 * One chat message (Nov 22 2026, the owner's messaging-conversation reference): the sender's
 * avatar beside a rounded bubble (yours emerald on the right, theirs tinted on the left),
 * then the time and, on hover or focus, the message's actions: Reply (quotes it into the
 * composer), Copy, and for someone else's message Report or Block through the moderation
 * routes. Nothing here acts without a real route behind it.
 */
import { useState } from 'react';
import ContentActionsMenu from '@/components/moderation/ContentActionsMenu';

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
  onReply = null,
}) {
  const [copied, setCopied] = useState(false);
  const time = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const senderName = sender?.name || sender?.displayName || '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(message.content || ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable: nothing to do */
    }
  };

  const extra = [
    onReply
      ? { key: 'reply', icon: 'bi-reply', label: 'Reply', onSelect: () => onReply(message) }
      : null,
    { key: 'copy', icon: 'bi-copy', label: 'Copy', onSelect: copy },
  ].filter(Boolean);

  return (
    <div
      className={`m-bubble-row${isSelf ? ' m-bubble-row--self' : ''}${showAvatar ? '' : ' is-cont'}`}
    >
      {showAvatar ? (
        sender?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sender.avatar_url} alt="" className="m-bubble-row__avatar" />
        ) : (
          <div className="m-bubble-row__avatar-fallback" aria-hidden>
            {getInitials(senderName)}
          </div>
        )
      ) : (
        <div className="m-bubble-row__avatar-spacer" aria-hidden />
      )}

      <div className="m-bubble-col">
        <div
          className={`m-bubble ${isSelf ? 'm-bubble--self' : 'm-bubble--theirs'}${
            isMatched ? ' m-bubble--matched' : ''
          }`}
        >
          <p className="m-bubble__text">
            <Highlight text={message.content} term={highlightTerm} />
          </p>
        </div>
        <div className="m-bubble__foot">
          <time dateTime={message.created_at || undefined}>{time}</time>
          {isSelf ? (
            message.read_at ? (
              <i className="bi bi-check2-all m-bubble__read" role="img" aria-label="Read" />
            ) : (
              <i className="bi bi-check2" role="img" aria-label="Sent" />
            )
          ) : null}
          {copied ? (
            <span className="m-bubble__copied" role="status">
              Copied
            </span>
          ) : null}
          {message.id ? (
            <span className="m-bubble__actions">
              <ContentActionsMenu
                contentType="message"
                contentId={message.id}
                authorId={message.sender_id}
                authorName={senderName || 'this member'}
                extraItems={extra}
                triggerLabel="Message actions"
                menuAlign={isSelf ? 'end' : 'start'}
              />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
