'use client';

import { useEffect, useMemo, useRef } from 'react';
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

/* Message requests (Nov 2026):
     incoming  the other member wrote first and you aren't friends: their
               messages show, the composer is swapped for Accept / Decline.
     outgoing  you sent the request: a note says it's waiting on them.
     new       you're about to message someone who isn't a friend yet. */
function RequestNotice({ state, firstName, responding, onAccept, onDecline, error }) {
  if (state === 'incoming') {
    return (
      <div className="m-request" role="region" aria-label="Message request">
        <p className="m-request__text">
          <strong>{firstName} wants to message you.</strong> Accept to move this chat to your inbox
          and reply. If you decline, it disappears from your chats.
        </p>
        {error ? (
          <p className="m-composer__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="m-request__actions">
          <button
            type="button"
            className="m-request__btn m-request__btn--ghost"
            onClick={onDecline}
            disabled={responding}
          >
            Decline
          </button>
          <button
            type="button"
            className="m-request__btn m-request__btn--accept"
            onClick={onAccept}
            disabled={responding}
          >
            Accept
          </button>
        </div>
      </div>
    );
  }
  const text =
    state === 'outgoing'
      ? `Message request sent. ${firstName} will see it under Requests and can accept or decline.`
      : `You and ${firstName} aren't friends yet, so your first message goes to their message requests.`;
  return (
    <p className="m-request-note">
      <i className="bi bi-envelope-paper" aria-hidden="true" /> {text}
    </p>
  );
}

export function MessageThread({
  conversationId,
  partnerName,
  partnerHandle = '',
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
  highlightTerm = '',
  highlightedMessageIds = [],
  requestState = null,
  responding = false,
  onAcceptRequest,
  onDeclineRequest,
}) {
  const scrollRef = useRef(null);
  const prevCount = useRef(0);

  const ascMessages = useMemo(() => [...messages].reverse(), [messages]);
  const groups = useMemo(() => groupByDay(ascMessages), [ascMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = ascMessages.length !== prevCount.current;
    const shouldScroll = prevCount.current === 0 || ascMessages.length - prevCount.current <= 3;
    if (grew && shouldScroll) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
    prevCount.current = ascMessages.length;
  }, [ascMessages.length]);

  const someoneTyping = (typingUserIds || []).length > 0;
  const firstName = (partnerName || '').split(/\s+/)[0] || 'This member';

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
            <i className="bi bi-arrow-left" aria-hidden="true" />
          </button>
          {partnerAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={partnerAvatarUrl} alt="" className="m-thread__avatar" />
          ) : (
            <div className="m-thread__avatar-fallback" aria-hidden>
              {getInitials(partnerName)}
            </div>
          )}
          <div className="m-thread__ident">
            <div className="m-thread__name">{partnerName || 'Conversation'}</div>
            <div className={`m-thread__meta${someoneTyping ? ' m-thread__meta--typing' : ''}`}>
              {someoneTyping ? 'Typing...' : partnerHandle || 'Direct message'}
            </div>
          </div>
        </div>

        <div className="m-thread__actions">
          <button
            type="button"
            className="m-thread__action"
            aria-label="Voice call"
            title="Voice call"
          >
            <i className="bi bi-telephone" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="m-thread__action"
            aria-label="Video call"
            title="Video call"
          >
            <i className="bi bi-camera-video" aria-hidden="true" />
          </button>
          <button type="button" className="m-thread__action" aria-label="More options" title="More">
            <i className="bi bi-three-dots" aria-hidden="true" />
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
            {requestState === 'incoming'
              ? 'No messages to show.'
              : 'Start the conversation. Say hi below.'}
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
                      highlightTerm={highlightTerm}
                      isMatched={highlightedMessageIds.includes(m.id)}
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

      {requestState === 'incoming' ? (
        <RequestNotice
          state="incoming"
          firstName={firstName}
          responding={responding}
          onAccept={onAcceptRequest}
          onDecline={onDeclineRequest}
          error={error}
        />
      ) : (
        <>
          {requestState ? <RequestNotice state={requestState} firstName={firstName} /> : null}
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
        </>
      )}
    </div>
  );
}
