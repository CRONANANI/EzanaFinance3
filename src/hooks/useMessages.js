'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

const CONVO_POLL_MS = 30_000;
const CHAT_POLL_MS = 8_000;
const TYPING_TTL_MS = 4_000;
const TYPING_BROADCAST_THROTTLE_MS = 1_500;

async function authedFetch(url, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export function useMessages() {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [convosLoading, setConvosLoading] = useState(true);
  const [activeConvoId, setActiveConvoId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [typingUserIds, setTypingUserIds] = useState([]);
  const convoPollRef = useRef(null);
  const chatPollRef = useRef(null);
  const typingChannelRef = useRef(null);
  const lastTypingSentRef = useRef(0);
  const typingExpiryMapRef = useRef(new Map());
  const typingSweepRef = useRef(null);

  const loadConversations = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setConversations([]);
      setConvosLoading(false);
      return;
    }
    try {
      const res = await authedFetch('/api/messages');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConversations(Array.isArray(data?.conversations) ? data.conversations : []);
    } catch (e) {
      console.error('[useMessages] loadConversations:', e?.message);
    } finally {
      setConvosLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadConversations();
    convoPollRef.current = setInterval(loadConversations, CONVO_POLL_MS);
    return () => clearInterval(convoPollRef.current);
  }, [loadConversations]);

  const loadMessages = useCallback(async (convoId, opts = {}) => {
    if (!convoId) return;
    const { append = false, before = null } = opts;
    if (!append) setMessagesLoading(true);
    try {
      let url = `/api/messages/${convoId}?limit=50`;
      if (before) url += `&before=${encodeURIComponent(before)}`;
      const res = await authedFetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const msgs = Array.isArray(data?.messages) ? data.messages : [];
      if (append) {
        setMessages((prev) => [...prev, ...msgs]);
      } else {
        setMessages(msgs);
        setOtherUser(data?.other_user || null);
      }
      setHasMore(!!data?.has_more);
    } catch (e) {
      console.error('[useMessages] loadMessages:', e?.message);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const markRead = useCallback(async (convoId) => {
    if (!convoId) return;
    try {
      await authedFetch(`/api/messages/${convoId}`, { method: 'PATCH' });
      setConversations((prev) =>
        prev.map((c) => (c.id === convoId ? { ...c, unread_count: 0 } : c)),
      );
    } catch {
      /* silent */
    }
  }, []);

  const openConversation = useCallback(
    (convoId) => {
      setActiveConvoId(convoId);
      setMessages([]);
      setOtherUser(null);
      setTypingUserIds([]);
      typingExpiryMapRef.current.clear();
      loadMessages(convoId);
      markRead(convoId);
    },
    [loadMessages, markRead],
  );

  // Gentle polling fallback for messages in the active convo
  useEffect(() => {
    if (!activeConvoId) return undefined;
    chatPollRef.current = setInterval(() => {
      loadMessages(activeConvoId);
    }, CHAT_POLL_MS);
    return () => clearInterval(chatPollRef.current);
  }, [activeConvoId, loadMessages]);

  // Realtime: new messages in the active conversation
  useEffect(() => {
    if (!activeConvoId || !user?.id) return undefined;
    const channel = supabase
      .channel(`messages:thread:${activeConvoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConvoId}`,
        },
        (payload) => {
          const m = payload?.new;
          if (!m) return;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [
              {
                id: m.id,
                sender_id: m.sender_id,
                content: m.content,
                created_at: m.created_at,
                read_at: m.read_at,
                is_mine: m.sender_id === user.id,
              },
              ...prev,
            ];
          });
          if (m.sender_id !== user.id) markRead(activeConvoId);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConvoId}`,
        },
        (payload) => {
          const updated = payload?.new;
          if (!updated) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id ? { ...m, read_at: updated.read_at } : m,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConvoId, user?.id, markRead]);

  // Realtime: any new message in any of my conversations -> refresh list
  useEffect(() => {
    if (!user?.id) return undefined;
    const channel = supabase
      .channel('messages:inbox')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          loadConversations();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadConversations]);

  // Typing broadcast — subscribe + maintain TTL expiry for each user
  useEffect(() => {
    if (!activeConvoId || !user?.id) return undefined;

    const ch = supabase
      .channel(`messages:typing:${activeConvoId}`, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const uid = payload?.userId;
        if (!uid || uid === user.id) return;
        const expires = Date.now() + TYPING_TTL_MS;
        typingExpiryMapRef.current.set(uid, expires);
        setTypingUserIds(Array.from(typingExpiryMapRef.current.keys()));
      })
      .subscribe();

    typingChannelRef.current = ch;

    typingSweepRef.current = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [uid, exp] of typingExpiryMapRef.current.entries()) {
        if (exp < now) {
          typingExpiryMapRef.current.delete(uid);
          changed = true;
        }
      }
      if (changed) {
        setTypingUserIds(Array.from(typingExpiryMapRef.current.keys()));
      }
    }, 1000);

    return () => {
      clearInterval(typingSweepRef.current);
      typingExpiryMapRef.current.clear();
      setTypingUserIds([]);
      supabase.removeChannel(ch);
      typingChannelRef.current = null;
    };
  }, [activeConvoId, user?.id]);

  const broadcastTyping = useCallback(() => {
    const ch = typingChannelRef.current;
    if (!ch || !user?.id) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_BROADCAST_THROTTLE_MS) return;
    lastTypingSentRef.current = now;
    ch.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, at: now },
    });
  }, [user?.id]);

  const sendMessage = useCallback(
    async (toUserId, content) => {
      if (!content?.trim() || !toUserId) return { ok: false };
      setSending(true);
      setError(null);
      try {
        const res = await authedFetch('/api/messages', {
          method: 'POST',
          body: JSON.stringify({ to: toUserId, content: content.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error || `HTTP ${res.status}`);
          return { ok: false, error: data?.error };
        }
        const data = await res.json();
        if (data?.message) {
          setMessages((prev) => {
            if (prev.some((x) => x.id === data.message.id)) return prev;
            return [data.message, ...prev];
          });
        }
        loadConversations();
        return { ok: true, message: data.message };
      } catch (e) {
        setError(e?.message || 'Failed to send');
        return { ok: false, error: e?.message };
      } finally {
        setSending(false);
      }
    },
    [loadConversations],
  );

  const loadFriends = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setFriends([]);
      return;
    }
    setFriendsLoading(true);
    try {
      const res = await authedFetch('/api/messages/friends');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFriends(Array.isArray(data?.friends) ? data.friends : []);
    } catch (e) {
      console.error('[useMessages] loadFriends:', e?.message);
    } finally {
      setFriendsLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadMore = useCallback(() => {
    if (!activeConvoId || !messages.length) return;
    const oldest = messages[messages.length - 1];
    if (oldest?.created_at) {
      loadMessages(activeConvoId, { append: true, before: oldest.created_at });
    }
  }, [activeConvoId, messages, loadMessages]);

  const closeConversation = useCallback(() => {
    setActiveConvoId(null);
    setMessages([]);
    setOtherUser(null);
    setTypingUserIds([]);
    typingExpiryMapRef.current.clear();
    clearInterval(chatPollRef.current);
  }, []);

  return {
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
    refreshConversations: loadConversations,
  };
}
