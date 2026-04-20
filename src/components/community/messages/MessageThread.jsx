'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Phone, Video, MoreHorizontal } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { DateSeparator } from './DateSeparator';
import { MessageComposer } from './MessageComposer';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

function groupByDay(messages) {
  const map = new Map();
  for (const m of messages) {
    const key = new Date(m.created_at).toDateString();
    if (!map.has(key)) map.set(key, { dateIso: m.created_at, messages: [] });
    map.get(key).messages.push(m);
  }
  return Array.from(map.values()).map((g) => ({
    dateIso: g.dateIso,
    messages: g.messages,
  }));
}

export function MessageThread({
  conversationId,
  partnerName,
  partnerAvatarUrl,
  currentUserId,
  messages,
  loading,
  hasMore,
  onLoadMore,
  onBack,
  typingUserIds,
  composerValue,
  onComposerChange,
  onSend,
  sending,
  error,
  onTyping,
  canSend,
  composerPlaceholder,
}) {
  const scrollRef = useRef(null);
  const prevCount = useRef(0);

  const ascMessages = useMemo(() => [...messages].reverse(), [messages]);
  const groups = useMemo(() => groupByDay(ascMessages), [ascMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = ascMessages.length !== prevCount.current;
    const shouldScroll =
      prevCount.current === 0 || ascMessages.length - prevCount.current <= 3;
    if (grew && shouldScroll) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
    prevCount.current = ascMessages.length;
  }, [ascMessages.length]);

  const someoneTyping = (typingUserIds || []).length > 0;

  return (
    <div className="m-thread">
      <header className="m-thread__head">
        <div className="m-thread__head-left">
          <button
            type="button"
            className="m-thread__back"
            onClick={onBack}
            aria-label="Back to conversations"
          >
            <ArrowLeft size={16} />
          </button>
          {partnerAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partnerAvatarUrl}
              alt=""
              className="m-thread__avatar"
            />
          ) : (
            <div className="m-thread__avatar-fallback" aria-hidden>
              {getInitials(partnerName)}
            </div>
          )}
          <div className="m-thread__ident">
            <div className="m-thread__name">{partnerName || 'Conversation'}</div>
            <div
              className={`m-thread__meta${someoneTyping ? ' m-thread__meta--typing' : ''}`}
            >
              {someoneTyping ? 'Typing…' : 'Direct message'}
            </div>
          </div>
        </div>

        <div className="m-thread__actions">
          <button type="button" className="m-thread__action" aria-label="Voice call" title="Voice call">
            <Phone size={16} />
          </button>
          <button type="button" className="m-thread__action" aria-label="Video call" title="Video call">
            <Video size={16} />
          </button>
          <button type="button" className="m-thread__action" aria-label="More options" title="More">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Message history"
        className="m-thread__scroll"
      >
        {hasMore && (
          <button type="button" className="m-load-older" onClick={onLoadMore}>
            Load older messages
          </button>
        )}

        {loading && ascMessages.length === 0 ? (
          <div className="m-thread__skeleton" aria-hidden>
            <div className="m-thread__skeleton-bubble" />
            <div className="m-thread__skeleton-bubble m-thread__skeleton-bubble--right" />
            <div className="m-thread__skeleton-bubble" />
            <div className="m-thread__skeleton-bubble m-thread__skeleton-bubble--right" />
          </div>
        ) : ascMessages.length === 0 ? (
          <div className="m-list__empty" style={{ marginTop: '2rem' }}>
            Start the conversation! Say hi below.
          </div>
        ) : (
          groups.map((g) => {
            let prevSender = null;
            return (
              <div key={g.dateIso} className="m-group">
                <DateSeparator date={g.dateIso} />
                {g.messages.map((m) => {
                  const isSelf = m.sender_id === currentUserId;
                  const showAvatar = !isSelf && prevSender !== m.sender_id;
                  prevSender = m.sender_id;
                  return (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      isSelf={isSelf}
                      sender={{ name: partnerName, avatar_url: partnerAvatarUrl }}
                      showAvatar={showAvatar}
                    />
                  );
                })}
              </div>
            );
          })
        )}

        {someoneTyping && (
          <div className="m-bubble-row">
            <div className="m-bubble-row__avatar-fallback" aria-hidden>
              {getInitials(partnerName)}
            </div>
            <div className="m-bubble-col">
              <div className="m-typing-bubble" aria-label={`${partnerName} is typing`}>
                <span className="m-typing-dot" />
                <span className="m-typing-dot" />
                <span className="m-typing-dot" />
              </div>
            </div>
          </div>
        )}
      </div>

      <MessageComposer
        value={composerValue}
        onChange={onComposerChange}
        onSend={onSend}
        sending={sending}
        disabled={!canSend}
        error={error}
        onTyping={onTyping}
        placeholder={composerPlaceholder}
      />
    </div>
  );
}
