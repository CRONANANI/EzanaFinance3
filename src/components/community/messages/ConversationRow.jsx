'use client';

import { useAuth } from '@/components/AuthProvider';
import { chatTime } from '@/lib/messages/requests';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

/**
 * Highlights matches of `term` inside `text` by wrapping them in a <mark>.
 */
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

/* One chat row: avatar, name and relative time on top, the last message
   and a green unread count underneath. Hairline dividers come from CSS. */
export function ConversationRow({
  conversation,
  selected,
  onClick,
  highlightTerm = '',
  contentMatches = [],
}) {
  const { user } = useAuth();
  const name = conversation.other_user?.name || 'Member';
  const defaultPreview = conversation.last_message?.content || '';
  const isMine = conversation.last_message?.is_mine;
  const time = chatTime(conversation.last_message_at);
  const unread = conversation.unread_count || 0;
  const outgoing = Boolean(conversation.is_outgoing_request);
  const incoming = Boolean(conversation.is_incoming_request);

  const matchedFirst = highlightTerm && contentMatches?.length > 0 ? contentMatches[0] : null;
  const previewText = matchedFirst ? matchedFirst.content : defaultPreview;
  const showYouPrefix = matchedFirst ? matchedFirst.sender_id === user?.id : Boolean(isMine);
  const hasPreview = Boolean(conversation.last_message || matchedFirst);

  return (
    <li className="m-rows__item">
      <button
        type="button"
        onClick={onClick}
        className={`m-row${selected ? ' is-selected' : ''}${unread > 0 ? ' is-unread' : ''}`}
        aria-pressed={selected}
        aria-label={`Chat with ${name}${unread > 0 ? `, ${unread} unread` : ''}${
          incoming ? ', message request' : ''
        }`}
      >
        <div className="m-row__avatar-wrap">
          {conversation.other_user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={conversation.other_user.avatar_url} alt="" className="m-row__avatar" />
          ) : (
            <div className="m-row__avatar-fallback" aria-hidden="true">
              {getInitials(name)}
            </div>
          )}
        </div>

        <div className="m-row__body">
          <div className="m-row__top">
            <span className="m-row__name">
              <Highlight text={name} term={highlightTerm} />
            </span>
            {time ? <span className="m-row__time">{time}</span> : null}
          </div>
          <div className="m-row__bottom">
            <span className="m-row__preview">
              {hasPreview ? (
                <>
                  {showYouPrefix ? 'You: ' : ''}
                  <Highlight text={previewText} term={highlightTerm} />
                </>
              ) : (
                <em>No messages yet</em>
              )}
            </span>
            {unread > 0 ? (
              <span className="m-unread" aria-hidden="true">
                {unread > 99 ? '99+' : unread}
              </span>
            ) : outgoing ? (
              <span className="m-row__tag">Request sent</span>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}
