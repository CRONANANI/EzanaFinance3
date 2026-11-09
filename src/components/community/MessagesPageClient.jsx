'use client';

/* ============================================================================
 * Messages page (Community). Nov 2026 redesign.
 * ----------------------------------------------------------------------------
 *   Canvas:      transparent; the dashboard ground shows through. No panel
 *                fills, borders or shadows.
 *   Left:        "Chats" column (ConversationList): title + round new-message
 *                button, pill search, All / Unread / Requests, hairline rows.
 *   Right:       the open chat (MessageThread) or the empty state.
 *   New message: search any member by name or @username (NewMessageDialog).
 *                Friends (mutual follows) land in the inbox; anyone else gets
 *                a message request to accept or decline.
 * All classes prefixed `.m-*` live in messages.css.
 * ==========================================================================*/

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/components/AuthProvider';
import { handleOf } from '@/lib/messages/requests';
import { ConversationList } from '@/components/community/messages/ConversationList';
import { MessageThread } from '@/components/community/messages/MessageThread';
import { EmptyConversationState } from '@/components/community/messages/EmptyConversationState';
import { NewMessageDialog } from '@/components/community/messages/NewMessageDialog';

export default function MessagesPageClient() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

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
    typingUserIds,
    openConversation,
    closeConversation,
    sendMessage,
    loadFriends,
    loadMore,
    broadcastTyping,
    respondToRequest,
  } = useMessages();

  const [showNewMessage, setShowNewMessage] = useState(false);
  /* A member picked in New message who has no chat with you yet. */
  const [pendingRecipient, setPendingRecipient] = useState(null);
  const [composerText, setComposerText] = useState('');
  const [mobileView, setMobileView] = useState('list');
  const [activeSearch, setActiveSearch] = useState({ query: '', matches: {} });
  const [responding, setResponding] = useState(false);

  const initialConvoId = searchParams.get('conversation');

  useEffect(() => {
    if (initialConvoId && !activeConvoId) {
      openConversation(initialConvoId);
      setMobileView('thread');
    }
  }, [initialConvoId, activeConvoId, openConversation]);

  useEffect(() => {
    if (activeConvoId || pendingRecipient) setMobileView('thread');
  }, [activeConvoId, pendingRecipient]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const handleSelect = (id) => {
    setPendingRecipient(null);
    openConversation(id);
    setMobileView('thread');
    setComposerText('');
  };

  const handleBack = () => {
    setMobileView('list');
  };

  const handleOpenNewMessage = () => {
    setShowNewMessage(true);
  };

  const handlePick = (person) => {
    setShowNewMessage(false);
    if (person.conversation_id) {
      setPendingRecipient(null);
      openConversation(person.conversation_id);
    } else {
      closeConversation();
      setPendingRecipient(person);
    }
    setMobileView('thread');
    setComposerText('');
  };

  const handleSend = async () => {
    const text = composerText.trim();
    if (!text) return;
    const toId = pendingRecipient?.id || otherUser?.id;
    if (!toId) return;
    const result = await sendMessage(toId, text);
    if (result.ok) {
      setComposerText('');
      if (pendingRecipient && result.message?.conversation_id) {
        openConversation(result.message.conversation_id);
        setPendingRecipient(null);
      }
    }
  };

  const handleRespond = async (action) => {
    if (!activeConvoId || responding) return;
    setResponding(true);
    const result = await respondToRequest(activeConvoId, action);
    setResponding(false);
    if (result.ok && action === 'decline') {
      closeConversation();
      setMobileView('list');
    }
  };

  const activeConvo = useMemo(
    () => (conversations || []).find((c) => c.id === activeConvoId) || null,
    [conversations, activeConvoId],
  );

  let requestState = null;
  if (activeConvo?.is_incoming_request) requestState = 'incoming';
  else if (activeConvo?.is_outgoing_request) requestState = 'outgoing';
  else if (pendingRecipient && !pendingRecipient.is_friend) requestState = 'new';

  const partnerName = pendingRecipient?.name || otherUser?.name || activeConvo?.other_user?.name;
  const partnerAvatarUrl =
    pendingRecipient?.avatar_url ||
    otherUser?.avatar_url ||
    activeConvo?.other_user?.avatar_url ||
    null;
  const partnerHandle = handleOf(
    pendingRecipient?.username || activeConvo?.other_user?.username || '',
  );

  const hasActive = Boolean(activeConvoId || pendingRecipient);
  const listHiddenOnMobile = hasActive && mobileView === 'thread';
  const threadHiddenOnMobile = !hasActive || mobileView === 'list';

  const firstName = (partnerName || '').split(/\s+/)[0] || 'them';

  return (
    <div className="m-page dashboard-page-inset">
      <div className="m-body">
        <div className="m-grid">
          <aside
            className={`m-panel m-panel--list${listHiddenOnMobile ? ' is-hidden-mobile' : ''}`}
            aria-label="Chats"
          >
            <ConversationList
              conversations={conversations}
              loading={convosLoading}
              selectedId={activeConvoId}
              onSelect={handleSelect}
              onNewMessage={handleOpenNewMessage}
              onSearchMatchesChange={setActiveSearch}
            />
          </aside>

          <main
            className={`m-panel m-panel--thread${threadHiddenOnMobile ? ' is-hidden-mobile' : ''}`}
            aria-label="Chat"
          >
            {hasActive ? (
              <MessageThread
                conversationId={activeConvoId}
                partnerName={partnerName || 'Member'}
                partnerHandle={partnerHandle}
                partnerAvatarUrl={partnerAvatarUrl}
                currentUserId={user?.id}
                messages={messages}
                loading={messagesLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                onBack={handleBack}
                typingUserIds={typingUserIds}
                composerValue={composerText}
                onComposerChange={setComposerText}
                onSend={handleSend}
                sending={sending}
                error={error}
                onTyping={broadcastTyping}
                canSend={Boolean(pendingRecipient?.id || otherUser?.id)}
                composerPlaceholder={
                  pendingRecipient ? `Say hi to ${firstName}...` : 'Type a message'
                }
                requestState={requestState}
                responding={responding}
                onAcceptRequest={() => handleRespond('accept')}
                onDeclineRequest={() => handleRespond('decline')}
                highlightTerm={activeSearch.query}
                highlightedMessageIds={
                  activeConvoId && activeSearch.matches[activeConvoId]
                    ? activeSearch.matches[activeConvoId].map((m) => m.id)
                    : []
                }
              />
            ) : (
              <EmptyConversationState onStartNew={handleOpenNewMessage} />
            )}
          </main>
        </div>
      </div>

      <NewMessageDialog
        open={showNewMessage}
        friends={friends}
        conversations={conversations}
        currentUserId={user?.id}
        loading={friendsLoading}
        onClose={() => setShowNewMessage(false)}
        onPick={handlePick}
      />
    </div>
  );
}
