'use client';

import { CheckCheck } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  const time = timeAgo(conversation.last_message_at);
  const unread = conversation.unread_count || 0;

  const matchedFirst =
    highlightTerm && contentMatches?.length > 0 ? contentMatches[0] : null;
  const previewText = matchedFirst ? matchedFirst.content : defaultPreview;
  const showYouPrefix = matchedFirst
    ? matchedFirst.sender_id === user?.id
    : Boolean(isMine);
  const hasPreview = Boolean(conversation.last_message || matchedFirst);

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`m-row${selected ? ' is-selected' : ''}`}
        aria-pressed={selected}
        aria-label={`Conversation with ${name}`}
      >
        <div className="m-row__avatar-wrap">
          {conversation.other_user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={conversation.other_user.avatar_url}
              alt=""
              className="m-row__avatar"
            />
          ) : (
            <div className="m-row__avatar-fallback" aria-hidden>
              {getInitials(name)}
            </div>
          )}
        </div>

        <div className="m-row__body">
          <div className="m-row__top">
            <span className="m-row__name">
              <Highlight text={name} term={highlightTerm} />
            </span>
            {time && <span className="m-row__time">{time}</span>}
          </div>
          <div className="m-row__bottom">
            <span
              className={`m-row__preview${
                isMine && unread === 0 ? ' m-row__preview--mine' : ''
              }`}
            >
              {hasPreview ? (
                <>
                  {showYouPrefix ? 'You: ' : ''}
                  <Highlight text={previewText} term={highlightTerm} />
                </>
              ) : (
                <em>No messages yet</em>
              )}
            </span>
            <span className="m-row__trail">
              {unread > 0 ? (
                <span className="m-unread" aria-label={`${unread} unread`}>
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : conversation.last_message?.is_mine ? (
                <CheckCheck
                  size={14}
                  className="m-read-receipt"
                  aria-label="Delivered"
                />
              ) : null}
            </span>
          </div>
        </div>
      </button>
    </li>
  );
}
