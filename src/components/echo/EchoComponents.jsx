'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

/**
 * AuthorCard — displays an author's profile with subscribe button.
 */
export function AuthorCard({ author, compact = false }) {
  return (
    <div className={`echo-author-card ${compact ? 'compact' : ''}`}>
      <div className="echo-author-avatar">
        {author.avatar_url ? (
          <img src={author.avatar_url} alt={author.display_name} />
        ) : (
          <span>{(author.display_name || 'A')[0]}</span>
        )}
        {author.verified && <i className="bi bi-patch-check-fill echo-author-verified" />}
      </div>
      <div className="echo-author-info">
        <Link href={`/ezana-echo/author/${author.user_id}`} className="echo-author-name">
          {author.display_name || 'Anonymous'}
        </Link>
        {!compact && author.bio && <p className="echo-author-bio">{author.bio}</p>}
        <div className="echo-author-stats">
          <span>{author.articleCount || 0} articles</span>
          <span>·</span>
          <span>{author.subscriberCount || 0} subscribers</span>
        </div>
      </div>
      <SubscribeButton authorId={author.user_id} />
    </div>
  );
}

/**
 * SubscribeButton — subscribe/unsubscribe to an author.
 * If not logged in, prompts to sign up.
 */
export function SubscribeButton({ authorId, className = '' }) {
  const [subscribed, setSubscribed] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, [authorId]);

  const checkSubscription = async () => {
    try {
      const res = await fetch(`/api/echo/subscribe?authorId=${authorId}`);
      const data = await res.json();
      setSubscribed(data.subscribed || false);
      setIsAuth(data.isAuthenticated || false);
    } catch {}
  };

  const handleClick = async () => {
    if (!isAuth) {
      setShowAuthPrompt(true);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/echo/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ authorId, action: subscribed ? 'unsubscribe' : 'subscribe' }),
      });
      const data = await res.json();
      setSubscribed(data.subscribed);
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <>
      <button
        className={`echo-subscribe-btn ${subscribed ? 'subscribed' : ''} ${className}`}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? '...' : subscribed ? (
          <><i className="bi bi-check-circle-fill" /> Subscribed</>
        ) : (
          <><i className="bi bi-plus-circle" /> Subscribe</>
        )}
      </button>

      {showAuthPrompt && (
        <div className="echo-auth-modal" onClick={() => setShowAuthPrompt(false)}>
          <div className="echo-auth-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Subscribe to this author</h3>
            <p>Create a free Ezana Finance account to subscribe to authors and get notified when they publish new articles.</p>
            <div className="echo-auth-modal-actions">
              <Link href="/auth/signup" className="echo-btn-primary">Sign Up Free</Link>
              <Link href="/auth/login" className="echo-btn-secondary">Login</Link>
            </div>
            <button className="echo-auth-modal-close" onClick={() => setShowAuthPrompt(false)}>
              <i className="bi bi-x-lg" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * EchoSearchBar — search articles by title or author name
 */
export function EchoSearchBar({ onSearch, placeholder = 'Search articles or authors...' }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(query.trim());
  };

  return (
    <form className="echo-search-bar" onSubmit={handleSubmit}>
      <i className="bi bi-search" />
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); if (!e.target.value) onSearch?.(''); }}
        placeholder={placeholder}
        className="echo-search-input"
      />
      {query && (
        <button type="button" className="echo-search-clear" onClick={() => { setQuery(''); onSearch?.(''); }}>
          <i className="bi bi-x" />
        </button>
      )}
    </form>
  );
}
