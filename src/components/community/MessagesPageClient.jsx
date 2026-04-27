'use client';

/* ============================================================================
 * Messages Page — Ezana brand tokens
 * ----------------------------------------------------------------------------
 *   Page bg:        var(--app-bg)              (bg-app)
 *   Card surface:   var(--surface-card)         (.m-panel)
 *   Accent:         var(--emerald)              (own-message bubble, CTA)
 *   Own bubble:     var(--emerald) + #fff
 *   Received:       var(--surface-card-hover) + var(--text-primary)
 *   Borders:        var(--border-primary) / --border-secondary
 *   Muted text:     var(--text-muted) / --text-faint
 *   Selected row:   var(--emerald-bg) + 2px border-left var(--emerald)
 * All classes prefixed `.m-*` live in messages.css.
 * ==========================================================================*/

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { MessagesHeader } from '@/components/community/messages/MessagesHeader';
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
  } = useMessages();

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [pendingFriend, setPendingFriend] = useState(null);
  const [composerText, setComposerText] = useState('');
  const [mobileView, setMobileView] = useState('list');
  const [onlineIds, setOnlineIds] = useState([]);
  const [activeSearch, setActiveSearch] = useState({ query: '', matches: {} });

  const initialConvoId = searchParams.get('conversation');

  useEffect(() => {
    if (initialConvoId && !activeConvoId) {
      openConversation(initialConvoId);
      setMobileView('thread');
    }
  }, [initialConvoId, activeConvoId, openConversation]);

  useEffect(() => {
    if (activeConvoId || pendingFriend) setMobileView('thread');
  }, [activeConvoId, pendingFriend]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  // Presence: track which users are currently on the messages page
  useEffect(() => {
    if (!user?.id) return undefined;
    const ch = supabase.channel('community:presence', {
      config: { presence: { key: user.id } },
    });
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      setOnlineIds(Object.keys(state));
    });
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ online_at: new Date().toISOString() });
      }
    });
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const handleSelect = (id) => {
    setPendingFriend(null);
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

  const handlePickFriend = (friend) => {
    setShowNewMessage(false);
    if (friend.conversation_id) {
      openConversation(friend.conversation_id);
    } else {
      closeConversation();
      setPendingFriend(friend);
    }
    setMobileView('thread');
    setComposerText('');
  };

  const handleSend = async () => {
    const text = composerText.trim();
    if (!text) return;
    const toId = pendingFriend?.id || otherUser?.id;
    if (!toId) return;
    const result = await sendMessage(toId, text);
    if (result.ok) {
      setComposerText('');
      if (pendingFriend && result.message?.conversation_id) {
        openConversation(result.message.conversation_id);
        setPendingFriend(null);
      }
    }
  };

  const partnerName =
    pendingFriend?.name || otherUser?.name || 'Conversation';
  const partnerAvatarUrl =
    pendingFriend?.avatar_url || otherUser?.avatar_url || null;

  const hasActive = Boolean(activeConvoId || pendingFriend);
  const listHiddenOnMobile = hasActive && mobileView === 'thread';
  const threadHiddenOnMobile = !hasActive || mobileView === 'list';

  const onlineUsers = useMemo(() => {
    const set = new Set(onlineIds);
    return friends.filter((f) => set.has(f.id)).slice(0, 8);
  }, [friends, onlineIds]);

  return (
    <div className="m-page dashboard-page-inset">
      <MessagesHeader />

      <div className="m-body">
        <div className="m-grid">
          <aside
            className={`m-panel m-panel--list${
              listHiddenOnMobile ? ' is-hidden-mobile' : ''
            }`}
            aria-label="Conversations"
          >
            <ConversationList
              conversations={conversations}
              loading={convosLoading}
              selectedId={activeConvoId}
              onSelect={handleSelect}
              onNewMessage={handleOpenNewMessage}
              onlineUsers={onlineUsers}
              onSearchMatchesChange={setActiveSearch}
            />
          </aside>

          <main
            className={`m-panel m-panel--thread${
              threadHiddenOnMobile ? ' is-hidden-mobile' : ''
            }`}
            aria-label="Conversation"
          >
            {hasActive ? (
              <MessageThread
                conversationId={activeConvoId}
                partnerName={partnerName}
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
                canSend={Boolean(pendingFriend?.id || otherUser?.id)}
                composerPlaceholder={
                  pendingFriend
                    ? `Say hi to ${pendingFriend.name}…`
                    : 'Type message'
                }
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
        loading={friendsLoading}
        onClose={() => setShowNewMessage(false)}
        onPickFriend={handlePickFriend}
      />
    </div>
  );
}
