'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Avatar, VerifiedTick, SkillBadge } from './Atoms';
import { CreatorBadge } from './CreatorBadge';
import { getTierColor, getTierLabel } from '@/lib/elo-tier-colors';
import { getCreatorTier } from '@/lib/creator-tiers';
import { RichContent } from '../_legacy_v1/RichContent';
import { MiniChart } from '../_legacy_v1/MiniChart';

export const ConvictionLike = forwardRef(function ConvictionLike(
  { post, onChange, compact = false },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [conviction, setConviction] = useState(post.my_conviction ?? 50);
  const [liked, setLiked] = useState(post.liked_by_me || false);
  const [likes, setLikes] = useState(post.likes ?? 0);

  useEffect(() => {
    setConviction(post.my_conviction ?? 50);
    setLiked(!!post.liked_by_me);
    setLikes(post.likes ?? 0);
  }, [post.my_conviction, post.liked_by_me, post.likes]);

  const handleQuickLike = async (e) => {
    e.stopPropagation();
    const newLiked = !liked;
    const prevLiked = liked;
    const prevLikes = likes;
    setLiked(newLiked);
    setLikes((c) => c + (newLiked ? 1 : -1));
    try {
      const res = await fetch('/api/community/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: post.id,
          action: newLiked ? 'like' : 'unlike',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.likes_count === 'number') setLikes(data.likes_count);
      } else {
        setLiked(prevLiked);
        setLikes(prevLikes);
      }
    } catch {
      setLiked(prevLiked);
      setLikes(prevLikes);
    }
  };

  useImperativeHandle(ref, () => ({
    openStake: () => setOpen(true),
  }));

  const handleOpen = (e) => {
    e?.stopPropagation?.();
    setOpen(true);
  };

  const handleStake = async () => {
    try {
      const res = await fetch('/api/community/posts/conviction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, conviction }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(true);
        setOpen(false);
        onChange?.({
          myConviction: data.my_conviction,
          avgConviction: data.avg_conviction,
          convictionCount: data.conviction_count,
        });
      }
    } catch {
      /* keep popup open */
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handleQuickLike}
        onContextMenu={handleOpen}
        title="Click to like · Right-click to stake conviction"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: compact ? '4px 8px' : '6px 10px',
          background: liked ? 'rgba(239,68,68,0.10)' : 'transparent',
          border: `1px solid ${liked ? 'rgba(239,68,68,0.20)' : 'transparent'}`,
          borderRadius: 999,
          color: liked ? 'var(--negative)' : 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'all .15s',
        }}
        onMouseEnter={(e) => {
          if (!liked) e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          if (!liked) e.currentTarget.style.color = 'var(--text-muted)';
        }}
      >
        <i className={`bi ${liked ? 'bi-heart-fill' : 'bi-heart'}`} style={{ fontSize: 13 }} />
        <span className="ez-mono" style={{ fontSize: 12, fontWeight: 600 }}>
          {likes}
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={handleOpen}
          onKeyDown={(e) => e.key === 'Enter' && handleOpen(e)}
          style={{
            fontSize: 10,
            padding: '0 5px',
            borderRadius: 999,
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            border: '1px solid var(--border-secondary)',
            cursor: 'pointer',
          }}
          title="Stake conviction"
        >
          ⚖
        </span>
      </button>

      {open && (
        <>
          <div
            role="presentation"
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 20 }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: 0,
              width: 260,
              padding: 14,
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-primary)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-lg)',
              zIndex: 21,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 4,
              }}
            >
              Stake your conviction
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
              How strongly do you back this take? Higher conviction = more weight in the feed
              algorithm.
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span
                className="ez-mono"
                style={{ fontSize: 24, fontWeight: 800, color: 'var(--emerald)' }}
              >
                {conviction}%
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {conviction < 30
                  ? 'Light agree'
                  : conviction < 60
                    ? 'Solid agree'
                    : conviction < 85
                      ? 'Strong agree'
                      : 'High conviction'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={conviction}
              onChange={(e) => setConviction(+e.target.value)}
              style={{ width: '100%', accentColor: 'var(--emerald)' }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button
                type="button"
                onClick={handleStake}
                className="ez-btn ez-btn--primary"
                style={{ flex: 1, padding: '7px 10px', fontSize: 12 }}
              >
                Back at {conviction}%
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ez-btn ez-btn--ghost"
                style={{ padding: '7px 10px', fontSize: 12 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export function EngagementBar({ post, variant = 'default', onConvictionChange }) {
  const convictionRef = useRef(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [saved, setSaved] = useState(post.saved_by_me || false);
  const [reposted, setReposted] = useState(false);

  useEffect(() => {
    setSaved(!!post.saved_by_me);
  }, [post.saved_by_me]);

  const handleSave = async () => {
    const newSaved = !saved;
    const prev = saved;
    setSaved(newSaved);
    try {
      const res = await fetch('/api/community/posts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: post.id,
          action: newSaved ? 'save' : 'unsave',
        }),
      });
      if (!res.ok) setSaved(prev);
    } catch {
      setSaved(prev);
    }
  };

  const iconBtn = (icon, count, color, onClick, active, label, key) => (
    <button
      key={key}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 10px',
        background: 'transparent',
        border: '1px solid transparent',
        borderRadius: 999,
        color: active ? color : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'background .15s, color .15s',
        fontSize: 12,
        fontWeight: 600,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--surface-card-hover)';
        if (!active) e.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        if (!active) e.currentTarget.style.color = 'var(--text-muted)';
      }}
    >
      <i className={`bi ${icon}`} style={{ fontSize: 13 }} />
      {count != null && <span className="ez-mono">{count}</span>}
    </button>
  );

  return (
    <div className="eng">
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {variant === 'conviction' ? (
          <ConvictionLike ref={convictionRef} post={post} onChange={onConvictionChange} compact />
        ) : (
          iconBtn(
            post.liked_by_me ? 'bi-heart-fill' : 'bi-heart',
            post.likes,
            'var(--negative)',
            null,
            post.liked_by_me,
            'Like',
            'lk',
          )
        )}
        {iconBtn('bi-chat-dots', post.comments, 'var(--info)', null, false, 'Comment', 'cm')}
        {iconBtn(
          reposted ? 'bi-arrow-repeat' : 'bi-quote',
          post.reposts ?? 0,
          'var(--emerald)',
          () => setReposted(!reposted),
          reposted,
          'Quote / Repost',
          'rp',
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShareOpen(!shareOpen);
          }}
          title="Share"
          style={{
            padding: '6px 10px',
            background: 'transparent',
            border: 'none',
            borderRadius: 999,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
          }}
        >
          <i className="bi bi-share" style={{ fontSize: 13 }} />
        </button>
        {shareOpen && (
          <>
            <div
              role="presentation"
              onClick={() => setShareOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 20 }}
            />
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                padding: 6,
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-primary)',
                borderRadius: 10,
                boxShadow: 'var(--shadow-lg)',
                zIndex: 21,
                display: 'flex',
                gap: 4,
              }}
            >
              {[
                { icon: 'bi-twitter-x', color: '#000' },
                { icon: 'bi-instagram', color: '#E1306C' },
                { icon: 'bi-facebook', color: '#1877F2' },
                { icon: 'bi-link-45deg', color: 'var(--text-muted)' },
              ].map((s) => (
                <button
                  key={s.icon}
                  type="button"
                  style={{
                    width: 30,
                    height: 30,
                    background: 'var(--bg-tertiary)',
                    border: 'none',
                    borderRadius: 8,
                    color: s.color,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className={`bi ${s.icon}`} style={{ fontSize: 14 }} />
                </button>
              ))}
            </div>
          </>
        )}
        {variant === 'conviction' && (
          <button
            type="button"
            className="stake"
            onClick={(e) => {
              e.stopPropagation();
              convictionRef.current?.openStake?.();
            }}
          >
            Stake conviction
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSave();
          }}
          title="Save"
          style={{
            padding: '6px 10px',
            background: 'transparent',
            border: 'none',
            borderRadius: 999,
            color: saved ? 'var(--gold)' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <i
            className={`bi ${saved ? 'bi-bookmark-fill' : 'bi-bookmark'}`}
            style={{ fontSize: 13 }}
          />
        </button>
      </div>
    </div>
  );
}

export function PollWidget({ poll }) {
  const [vote, setVote] = useState(poll?.myVote);
  const [pollState, setPollState] = useState(poll);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPollState(poll);
    setVote(poll?.myVote);
  }, [poll]);

  if (!pollState?.options?.length) return null;

  const total = pollState.totalVotes + (vote && vote !== pollState.myVote ? 1 : 0);

  const handleVote = async (optId) => {
    if (busy) return;
    setBusy(true);
    setVote(optId);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: pollState.postId, option_id: optId }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.poll_data) {
        const options = (data.poll_data.options || []).map((o) => ({
          id: o.id,
          label: o.label,
          votes: o.votes || 0,
        }));
        const totalVotes = data.poll_data.total_votes ?? options.reduce((s, o) => s + o.votes, 0);
        setPollState({
          options,
          totalVotes,
          myVote: data.my_vote,
          postId: pollState.postId,
        });
        setVote(data.my_vote);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {pollState.options.map((opt) => {
        const votes = opt.votes + (vote === opt.id && pollState.myVote !== opt.id ? 1 : 0);
        const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
        const isMine = vote === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleVote(opt.id);
            }}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'var(--bg-tertiary)',
              border: `1px solid ${isMine ? 'var(--emerald-border)' : 'var(--border-secondary)'}`,
              borderRadius: 8,
              cursor: 'pointer',
              overflow: 'hidden',
              fontSize: 13,
              color: 'var(--text-primary)',
              fontWeight: isMine ? 600 : 500,
              fontFamily: 'var(--font-sans)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${pct}%`,
                background: isMine ? 'var(--emerald-bg)' : 'var(--surface-card-hover)',
                transition: 'width .3s',
              }}
            />
            <span
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {isMine && (
                <i
                  className="bi bi-check-circle-fill"
                  style={{ color: 'var(--emerald)', fontSize: 13 }}
                />
              )}
              {opt.label}
            </span>
            <span
              className="ez-mono"
              style={{
                position: 'relative',
                fontSize: 12,
                fontWeight: 700,
                color: isMine ? 'var(--emerald)' : 'var(--text-muted)',
              }}
            >
              {pct}%
            </span>
          </button>
        );
      })}
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }} className="ez-mono">
        {total.toLocaleString()} votes
      </div>
    </div>
  );
}

export function TickerEmbed({ embed }) {
  if (!embed?.symbol) return null;
  const dir = (embed.change ?? 0) >= 0 ? 'up' : 'down';
  const periods = ['1D', '1W', '1M', '3M', '6M', '1Y'];
  return (
    <div
      style={{
        margin: '12px 0',
        padding: 14,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-secondary)',
        borderRadius: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span
            className="ez-mono"
            style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}
          >
            ${embed.symbol}
          </span>
          {embed.price > 0 && (
            <span
              className="ez-mono"
              style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}
            >
              ${Number(embed.price).toFixed(2)}
            </span>
          )}
          {embed.change != null && (
            <span
              className={dir === 'up' ? 'ez-pill ez-pill--pos' : 'ez-pill ez-pill--neg'}
              style={{ padding: '1px 6px', fontSize: 10 }}
            >
              {dir === 'up' ? '↑' : '↓'} {Math.abs(embed.change).toFixed(2)}%
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {periods.map((p) => (
            <span
              key={p}
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 4,
                background: p === (embed.period || '1M') ? 'var(--emerald)' : 'transparent',
                color: p === (embed.period || '1M') ? 'white' : 'var(--text-faint)',
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </div>
      <MiniChart direction={dir} height={70} />
    </div>
  );
}

export function QuotedPost({ quoted }) {
  if (!quoted) return null;
  const author = quoted.author || {
    display_name: quoted.name || 'Member',
    username: quoted.username || '',
    id: quoted.user,
  };
  return (
    <div
      style={{
        margin: '10px 0',
        padding: 12,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-secondary)',
        borderRadius: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Avatar author={author} size={22} />
        <span
          style={{ fontSize: 12, fontWeight: 600, color: getTierColor(author.tier) }}
          title={`${author.display_name} · ${getTierLabel(author.tier)}`}
        >
          {author.display_name}
        </span>
        {author.isPartner && (
          <CreatorBadge
            tierKey={author.creatorTier}
            type={author.partnerType}
            size={11}
            showLabel={false}
          />
        )}
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
          · {quoted.timeAgo || `${quoted.minsAgo ?? 0}m ago`}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
        <RichContent text={quoted.content} />
      </div>
    </div>
  );
}

export function PostHeader({ post, showSkill = true, onDelete }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef(null);
  const u = post.author || {};
  const isOwner = !!(user?.id && u.id === user.id);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this post? This cannot be undone.')) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/community/posts?post_id=${encodeURIComponent(post.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error || 'Could not delete post.');
        return;
      }
      setMenuOpen(false);
      onDelete?.(post.id);
    } catch {
      window.alert('Could not delete post.');
    } finally {
      setDeleting(false);
    }
  };

  const wins = post.conviction_wins ?? post.convictionWins ?? 0;
  const creatorTier = u.isPartner ? getCreatorTier(u.creatorTier) : null;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
      <Avatar author={u} size={40} ring={!!creatorTier} ringColor={creatorTier?.ring} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span
            style={{ fontSize: 14, fontWeight: 700, color: getTierColor(u.tier) }}
            title={`${u.display_name || 'Member'} · ${getTierLabel(u.tier)}`}
          >
            {u.display_name || 'Member'}
          </span>
          {creatorTier ? (
            <CreatorBadge tier={creatorTier} type={u.partnerType} size={13} />
          ) : (
            u.isVerified && <VerifiedTick size={13} gold={u.isLegendary} />
          )}
        </div>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}
        >
          {u.username && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{u.username}</span>
          )}
          <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>·</span>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }} className="ez-mono">
            {wins} conv. wins
          </span>
          {showSkill && post.skillRating && (
            <>
              <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>·</span>
              <SkillBadge tier={post.skillRating} />
            </>
          )}
        </div>
      </div>
      <span className="post-ts ez-mono" title={post.timeAgo}>
        {post.timeAgo || '—'}
      </span>
      {isOwner && (
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            aria-label="Post options"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((open) => !open);
            }}
            style={{
              background: menuOpen ? 'var(--surface-card-hover)' : 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <i className="bi bi-three-dots" style={{ fontSize: 14 }} />
          </button>
          {menuOpen && (
            <div
              className="ez-card evo-post-menu"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 4px)',
                minWidth: 160,
                padding: 6,
                zIndex: 20,
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              }}
            >
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="evo-post-menu-item evo-post-menu-item--danger"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 10px',
                  border: 'none',
                  borderRadius: 8,
                  background: 'transparent',
                  color: 'var(--negative)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: deleting ? 'wait' : 'pointer',
                  textAlign: 'left',
                }}
              >
                <i className="bi bi-trash" style={{ fontSize: 14 }} />
                {deleting ? 'Deleting…' : 'Delete post'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PostCard({ post, variant = 'conviction-bar', onConvictionChange, onDelete }) {
  const isDiscussion = post.isDiscussion;
  const padding = variant === 'compact' ? 14 : 18;
  const useConvictionBar = variant === 'conviction-bar' || variant === 'default';
  const showConvictionBar = post.avg_conviction != null || (post.conviction_count ?? 0) > 0;
  const convictionPct = post.avg_conviction ?? 0;

  const pollWithId = post.poll ? { ...post.poll, postId: post.id } : null;

  return (
    <article
      className="ez-card ledger-post"
      style={{
        padding,
        cursor: 'pointer',
        background: isDiscussion ? 'var(--emerald-bg-subtle)' : 'var(--surface-card)',
        borderColor: isDiscussion ? 'var(--emerald-border)' : 'var(--border-primary)',
        borderLeftWidth: isDiscussion ? 3 : 1,
        borderLeftColor: isDiscussion ? 'var(--emerald)' : undefined,
        position: 'relative',
      }}
    >
      {isDiscussion && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 999,
            background: 'var(--emerald-bg)',
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--emerald)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <i className="bi bi-chat-square-quote-fill" style={{ fontSize: 9 }} />
          Discussion
        </div>
      )}

      <PostHeader post={post} onDelete={onDelete} />

      {post.title && (
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
          }}
        >
          {post.title}
        </h3>
      )}

      <div
        style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          lineHeight: 1.55,
          marginBottom: 4,
          textWrap: 'pretty',
        }}
      >
        <RichContent text={post.content} />
      </div>

      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          style={{
            marginTop: 12,
            maxWidth: '100%',
            borderRadius: 10,
            border: '1px solid var(--border-secondary)',
          }}
        />
      )}

      {pollWithId && <PollWidget poll={pollWithId} />}
      {post.tickerEmbed && <TickerEmbed embed={post.tickerEmbed} />}
      {post.quotedPost && <QuotedPost quoted={post.quotedPost} />}

      {useConvictionBar && showConvictionBar && (
        <div className="conv-block">
          <div className="conv-label">Avg. conviction</div>
          <div className="conv-pct ez-mono">{convictionPct}%</div>
          <div className="conv-bar">
            <div className="conv-bar-fill" style={{ width: `${convictionPct}%` }} />
          </div>
          <div className="conv-hint">
            ▸ Right-click to stake your conviction ·{' '}
            <span className="ez-mono">{post.conviction_count ?? 0}</span> staked
          </div>
        </div>
      )}

      <EngagementBar
        post={post}
        variant={useConvictionBar ? 'conviction' : 'default'}
        onConvictionChange={onConvictionChange}
      />
    </article>
  );
}
