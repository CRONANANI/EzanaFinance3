'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useMessages } from '@/hooks/useMessages';

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

export default function MessagesPageClient() {
  const {
    conversations,
    convosLoading,
    activeConvoId,
    messages,
    messagesLoading,
    otherUser,
    hasMore,
    friends,
    friendsLoading,
    sending,
    error,
    openConversation,
    closeConversation,
    sendMessage,
    loadFriends,
    loadMore,
  } = useMessages();

  const [composerText, setComposerText] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [pendingFriend, setPendingFriend] = useState(null);
  const messagesEndRef = useRef(null);

  const prevMsgCount = useRef(0);
  useEffect(() => {
    if (messages.length > 0 && messages.length !== prevMsgCount.current) {
      if (prevMsgCount.current === 0 || messages.length - prevMsgCount.current <= 2) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevMsgCount.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (showNewMessage) loadFriends();
  }, [showNewMessage, loadFriends]);

  const filteredFriends = useMemo(() => {
    if (!friendSearch.trim()) return friends;
    const q = friendSearch.toLowerCase();
    return friends.filter((f) => f.name.toLowerCase().includes(q));
  }, [friends, friendSearch]);

  const handleSend = async () => {
    if (!composerText.trim()) return;
    const toId = otherUser?.id;
    if (!toId) return;
    const result = await sendMessage(toId, composerText);
    if (result.ok) setComposerText('');
  };

  const handleStartConvoWithFriend = async (friend) => {
    setShowNewMessage(false);
    setFriendSearch('');
    if (friend.conversation_id) {
      openConversation(friend.conversation_id);
    } else {
      closeConversation();
      setPendingFriend(friend);
    }
  };

  const handleSendToPending = async () => {
    if (!composerText.trim() || !pendingFriend) return;
    const result = await sendMessage(pendingFriend.id, composerText);
    if (result.ok) {
      setComposerText('');
      setPendingFriend(null);
      if (result.message?.conversation_id) {
        openConversation(result.message.conversation_id);
      }
    }
  };

  const isInChat = !!activeConvoId || !!pendingFriend;
  const chatPartnerName = otherUser?.name || pendingFriend?.name || 'Chat';

  const displayMessages = useMemo(() => [...messages].reverse(), [messages]);

  return (
    <div className="msgs-page dashboard-page-inset db-page">
      <div className="msgs-header">
        <Link href="/community" className="msgs-back">
          ← Community
        </Link>
        <h1 className="msgs-title">Messages</h1>
        <button
          type="button"
          className="msgs-new-btn"
          onClick={() => {
            setShowNewMessage(true);
            closeConversation();
            setPendingFriend(null);
          }}
        >
          <i className="bi bi-pencil-square" /> New
        </button>
      </div>

      <div className="msgs-layout">
        <div className={`msgs-sidebar ${isInChat ? 'msgs-sidebar-hidden-mobile' : ''}`}>
          {showNewMessage && (
            <div className="msgs-friend-picker db-card">
              <div className="msgs-fp-header">
                <span>New message</span>
                <button
                  type="button"
                  className="msgs-fp-close"
                  onClick={() => {
                    setShowNewMessage(false);
                    setFriendSearch('');
                  }}
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                className="msgs-fp-search"
                placeholder="Search friends…"
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
              />
              <div className="msgs-fp-list">
                {friendsLoading && <p className="msgs-muted">Loading friends…</p>}
                {!friendsLoading && filteredFriends.length === 0 && (
                  <p className="msgs-muted">
                    {friends.length === 0
                      ? 'No friends yet. Follow someone and have them follow you back!'
                      : 'No friends match your search.'}
                  </p>
                )}
                {filteredFriends.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="msgs-fp-item"
                    onClick={() => handleStartConvoWithFriend(f)}
                  >
                    <div className="msgs-avatar-sm">{f.name.charAt(0).toUpperCase()}</div>
                    <span>{f.name}</span>
                    {f.conversation_id && <span className="msgs-fp-existing">•</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {convosLoading && conversations.length === 0 && (
            <div className="msgs-empty">
              <div className="msgs-spinner" />
              <p>Loading conversations…</p>
            </div>
          )}

          {!convosLoading && conversations.length === 0 && !showNewMessage && (
            <div className="msgs-empty">
              <i
                className="bi bi-chat-dots"
                style={{ fontSize: '2rem', color: '#10b981', opacity: 0.5 }}
              />
              <p>No conversations yet</p>
              <p className="msgs-muted">
                Click <strong>New</strong> to message a friend.
              </p>
            </div>
          )}

          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`msgs-convo-item ${activeConvoId === c.id ? 'active' : ''}`}
              onClick={() => {
                setShowNewMessage(false);
                setPendingFriend(null);
                openConversation(c.id);
              }}
            >
              <div className="msgs-avatar">{c.other_user.name.charAt(0).toUpperCase()}</div>
              <div className="msgs-convo-body">
                <div className="msgs-convo-top">
                  <span className="msgs-convo-name">{c.other_user.name}</span>
                  <span className="msgs-convo-time">{timeAgo(c.last_message_at)}</span>
                </div>
                <div className="msgs-convo-preview">
                  {c.last_message ? (
                    <>
                      {c.last_message.is_mine && <span className="msgs-you">You: </span>}
                      {c.last_message.content}
                    </>
                  ) : (
                    <span className="msgs-muted">No messages yet</span>
                  )}
                </div>
              </div>
              {c.unread_count > 0 && (
                <span className="msgs-unread-badge">{c.unread_count}</span>
              )}
            </button>
          ))}
        </div>

        <div className={`msgs-chat ${!isInChat ? 'msgs-chat-hidden-mobile' : ''}`}>
          {!isInChat && (
            <div className="msgs-chat-empty">
              <i
                className="bi bi-chat-left-text"
                style={{ fontSize: '3rem', color: '#10b981', opacity: 0.3 }}
              />
              <p>Select a conversation or start a new one</p>
            </div>
          )}

          {isInChat && (
            <>
              <div className="msgs-chat-header">
                <button
                  type="button"
                  className="msgs-chat-back"
                  onClick={() => {
                    closeConversation();
                    setPendingFriend(null);
                  }}
                >
                  <i className="bi bi-arrow-left" />
                </button>
                <div className="msgs-avatar-sm">{chatPartnerName.charAt(0).toUpperCase()}</div>
                <span className="msgs-chat-partner-name">{chatPartnerName}</span>
              </div>

              <div className="msgs-chat-messages">
                {hasMore && (
                  <button type="button" className="msgs-load-more" onClick={loadMore}>
                    Load older messages
                  </button>
                )}

                {messagesLoading && displayMessages.length === 0 && (
                  <div className="msgs-chat-loading">
                    <div className="msgs-spinner" />
                    <span>Loading messages…</span>
                  </div>
                )}

                {!messagesLoading && displayMessages.length === 0 && (
                  <div className="msgs-chat-empty-inner">
                    <p>Start the conversation! Send your first message below.</p>
                  </div>
                )}

                {displayMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`msgs-bubble-row ${m.is_mine ? 'mine' : 'theirs'}`}
                  >
                    <div className={`msgs-bubble ${m.is_mine ? 'mine' : 'theirs'}`}>
                      <p className="msgs-bubble-text">{m.content}</p>
                      <span className="msgs-bubble-time">{timeAgo(m.created_at)}</span>
                    </div>
                  </div>
                ))}

                <div ref={messagesEndRef} />
              </div>

              <div className="msgs-composer">
                {error && <p className="msgs-composer-error">{error}</p>}
                <div className="msgs-composer-row">
                  <input
                    type="text"
                    className="msgs-composer-input"
                    placeholder="Type a message…"
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (pendingFriend) handleSendToPending();
                        else handleSend();
                      }
                    }}
                    disabled={sending}
                  />
                  <button
                    type="button"
                    className="msgs-send-btn"
                    disabled={!composerText.trim() || sending}
                    onClick={pendingFriend ? handleSendToPending : handleSend}
                  >
                    {sending ? '…' : <i className="bi bi-send-fill" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
