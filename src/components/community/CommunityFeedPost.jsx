'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { formatRelativeTime, getInitials } from '@/lib/community-utils';
import { useAuth } from '@/components/AuthProvider';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function looksLikeUuid(s) {
  return typeof s === 'string' && UUID_RE.test(s.trim());
}

function mapProfileToAuthor(prof) {
  if (!prof) return { id: null, username: '', name: 'Member', initials: '?' };
  const s = prof.user_settings || {};
  const name = (s.display_name || '').trim() || 'Member';
  return { id: prof.id, username: prof.username || '', name, initials: getInitials(name) };
}

export function CommunityFeedPost({
  post,
  expanded,
  onToggle,
  onLike,
  onSave,
  quote,
  onCommentPosted,
}) {
  const router = useRouter();
  const { user } = useAuth();
  const previewLen = 120;
  const text = post.text || '';
  const long = text.length > previewLen;
  const shown = expanded || !long ? text : `${text.slice(0, previewLen).trim()}…`;

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const [pollData, setPollData] = useState(post.poll_data || null);
  const [myVote, setMyVote] = useState(post.my_vote || null);
  const [voteBusy, setVoteBusy] = useState(false);

  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    setPollData(post.poll_data || null);
    setMyVote(post.my_vote ?? null);
  }, [post.poll_data, post.my_vote]);

  const handleVote = async (optionId) => {
    if (!user || voteBusy) return;
    setVoteBusy(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id, option_id: optionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPollData(data.poll_data);
        setMyVote(data.my_vote);
      }
    } finally {
      setVoteBusy(false);
    }
  };

  useEffect(() => {
    const embed = post.ticker_embed;
    if (!embed?.symbol) {
      setChartData(null);
      setChartLoading(false);
      return;
    }

    setChartLoading(true);
    const range = embed.period || '1M';
    const sym = encodeURIComponent(embed.symbol);

    fetch(`/api/market-data/stock-candles?symbol=${sym}&range=${encodeURIComponent(range)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const candles = d?.candles;
        if (!Array.isArray(candles) || candles.length === 0) {
          setChartData([]);
          setChartLoading(false);
          return;
        }
        const points = candles.map((c) => ({
          t: c.label,
          price: c.price ?? c.close,
        }));
        setChartData(points);
        setChartLoading(false);
      })
      .catch(() => {
        setChartData([]);
        setChartLoading(false);
      });
  }, [post.ticker_embed?.symbol, post.ticker_embed?.period]);

  const profileSlug = post.username && !looksLikeUuid(post.username) ? post.username : post.userId;

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('community_posts')
        .select('id, content, created_at, user_id')
        .eq('parent_post_id', post.id)
        .order('created_at', { ascending: true });
      if (error) {
        setComments([]);
        return;
      }
      const ids = [...new Set((rows || []).map((r) => r.user_id))];
      let profMap = {};
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, username, user_settings').in('id', ids);
        profMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
      }
      setComments(
        (rows || []).map((r) => ({
          ...r,
          author: mapProfileToAuthor(profMap[r.user_id]),
        }))
      );
    } finally {
      setCommentsLoading(false);
    }
  }, [post.id]);

  useEffect(() => {
    if (!commentsOpen) return;
    loadComments();
  }, [commentsOpen, loadComments]);

  const toggleComments = (e) => {
    e.stopPropagation();
    setCommentsOpen((o) => !o);
  };

  const submitComment = async (e) => {
    e.stopPropagation();
    const t = commentDraft.trim();
    if (!user || !t || postingComment) return;
    setPostingComment(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: t, parent_post_id: post.id }),
      });
      if (res.ok) {
        setCommentDraft('');
        await loadComments();
        onCommentPosted?.(post.id);
      }
    } finally {
      setPostingComment(false);
    }
  };

  const returnStr = post.returnBadge;
  const retNum = returnStr ? parseFloat(String(returnStr).replace(/[^0-9.-]/g, '')) : null;
  const retPositive = retNum == null || retNum >= 0;

  return (
    <div className="db-card comm-feed-post-card">
      <div className="comm-post-block comm-post-block--card">
        <div
          className="comm-post comm-post--card"
          role="button"
          tabIndex={0}
          onClick={() => onToggle(post.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle(post.id);
            }
          }}
        >
          <div className="comm-post-head comm-post-head--card">
            <div className="comm-post-meta comm-post-meta--card">
              <div className="comm-avatar comm-avatar--feed" aria-hidden>
                {post.initials}
              </div>
              <div className="comm-post-author-block">
                <div className="comm-post-title-row">
                  {post.userId ? (
                    <span
                      role="link"
                      tabIndex={0}
                      className="comm-name-link comm-post-name"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/profile/${profileSlug}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation();
                          router.push(`/profile/${profileSlug}`);
                        }
                      }}
                    >
                      {post.name}
                    </span>
                  ) : (
                    <span className="comm-post-name">{post.name}</span>
                  )}
                  {post.isPartner && <span className="comm-post-partner-pill">Partner</span>}
                  {returnStr && (
                    <span className={`comm-post-return-badge ${retPositive ? 'is-pos' : 'is-neg'}`}>{returnStr}</span>
                  )}
                  <button type="button" className="comm-post-menu-btn" aria-label="Post menu" onClick={(e) => e.stopPropagation()}>
                    ···
                  </button>
                </div>
                <div className="comm-post-subrow">
                  {post.username && <span className="comm-post-handle">@{post.username}</span>}
                  <span className="comm-post-time">
                    {post.username ? ' · ' : ''}
                    {post.time}
                  </span>
                </div>
              </div>
            </div>
            {post.badge && <span className="comm-post-badge">{post.badge}</span>}
          </div>
          <p className="comm-post-text comm-post-text--card">
            {shown}
            {long && !expanded && <span className="comm-post-expand"> read more</span>}
          </p>

          {post.image_url && (
            <div style={{ marginTop: '0.75rem' }}>
              <img
                src={post.image_url}
                alt="Post image"
                style={{
                  width: '100%',
                  maxHeight: 320,
                  borderRadius: '8px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          )}

          {pollData && (
            <div
              style={{
                marginTop: '0.75rem',
                background: 'rgba(16,185,129,0.04)',
                border: '1px solid rgba(16,185,129,0.1)',
                borderRadius: '10px',
                padding: '0.75rem',
              }}
            >
              <p
                style={{
                  margin: '0 0 0.6rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--home-heading, #f0f6fc)',
                }}
              >
                📊 {pollData.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(pollData.options || []).map((opt) => {
                  const pct =
                    pollData.total_votes > 0 ? Math.round((opt.votes / pollData.total_votes) * 100) : 0;
                  const isMyVote = myVote === opt.id;
                  const hasVoted = myVote !== null;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={voteBusy || !user}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(opt.id);
                      }}
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '7px',
                        border: isMyVote ? '1.5px solid #10b981' : '1px solid rgba(16,185,129,0.12)',
                        background: 'rgba(16,185,129,0.03)',
                        cursor: user ? 'pointer' : 'default',
                        textAlign: 'left',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {hasVoted && (
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${pct}%`,
                            background: isMyVote ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.06)',
                            borderRadius: '7px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      )}
                      <span
                        style={{
                          position: 'relative',
                          fontSize: '0.8125rem',
                          color: '#e2e8f0',
                          fontWeight: isMyVote ? 700 : 400,
                        }}
                      >
                        {isMyVote && '✓ '}
                        {opt.label}
                      </span>
                      {hasVoted && (
                        <span
                          style={{
                            position: 'relative',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: isMyVote ? '#10b981' : '#6b7280',
                          }}
                        >
                          {pct}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.625rem', color: '#6b7280' }}>
                {pollData.total_votes ?? 0} vote{(pollData.total_votes ?? 0) !== 1 ? 's' : ''}
                {!user && ' · Sign in to vote'}
              </p>
            </div>
          )}

          {post.ticker_embed?.symbol && (
            <div
              style={{
                marginTop: '0.75rem',
                background: 'rgba(16,185,129,0.03)',
                border: '1px solid rgba(16,185,129,0.08)',
                borderRadius: '10px',
                padding: '0.75rem 0.5rem 0.5rem',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0 0.25rem',
                  marginBottom: '0.35rem',
                }}
              >
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#10b981' }}>
                  ${post.ticker_embed.symbol}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                  {post.ticker_embed.period}
                  {post.ticker_embed.highlight_price && ` · ★ $${post.ticker_embed.highlight_price}`}
                </span>
              </div>

              {chartLoading && (
                <p
                  style={{
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    padding: '1rem 0',
                    margin: 0,
                  }}
                >
                  Loading chart…
                </p>
              )}

              {!chartLoading && (!chartData || chartData.length === 0) && (
                <p
                  style={{
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    padding: '0.5rem 0',
                    margin: 0,
                  }}
                >
                  Chart data unavailable
                </p>
              )}

              {!chartLoading &&
                chartData &&
                chartData.length > 0 &&
                (() => {
                  const prices = chartData.map((d) => d.price).filter((v) => v != null && Number.isFinite(v));
                  if (prices.length === 0) return null;
                  const minP = Math.min(...prices);
                  const maxP = Math.max(...prices);
                  const pad = (maxP - minP) * 0.1 || 1;
                  const hp = post.ticker_embed.highlight_price;
                  let hlIdx = null;
                  if (hp != null) {
                    let best = Infinity;
                    chartData.forEach((d, i) => {
                      if (d.price == null || !Number.isFinite(d.price)) return;
                      const diff = Math.abs(d.price - hp);
                      if (diff < best) {
                        best = diff;
                        hlIdx = i;
                      }
                    });
                  }

                  return (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <XAxis
                          dataKey="t"
                          tick={{ fill: '#6b7280', fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          domain={[minP - pad, maxP + pad]}
                          tick={{ fill: '#6b7280', fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) =>
                            `$${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0)}`
                          }
                        />
                        <Tooltip
                          formatter={(v) => [`$${Number(v).toFixed(2)}`, post.ticker_embed.symbol]}
                          contentStyle={{
                            background: '#161b22',
                            border: '1px solid rgba(16,185,129,0.15)',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#10b981"
                          strokeWidth={1.8}
                          dot={false}
                          isAnimationActive={false}
                        />
                        {hp != null && (
                          <ReferenceLine
                            y={hp}
                            stroke="#f59e0b"
                            strokeDasharray="4 3"
                            strokeWidth={1}
                            label={{
                              value: `$${hp}`,
                              position: 'insideTopRight',
                              fill: '#f59e0b',
                              fontSize: 10,
                            }}
                          />
                        )}
                        {hlIdx !== null && chartData[hlIdx]?.price != null && (
                          <ReferenceDot
                            x={chartData[hlIdx].t}
                            y={chartData[hlIdx].price}
                            r={5}
                            fill="#f59e0b"
                            stroke="#fff"
                            strokeWidth={1.5}
                            label={{
                              value: `$${chartData[hlIdx].price.toFixed(2)}`,
                              position: 'top',
                              fill: '#f59e0b',
                              fontSize: 10,
                            }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  );
                })()}
            </div>
          )}

          {post.tickerSym && !post.ticker_embed && (
            <div className="comm-ticker-embed comm-ticker-embed--card">
              <span className="comm-ticker-sym">${post.tickerSym}</span>
              {quote ? (
                <>
                  <span className="comm-ticker-price">${quote.price?.toFixed(2) ?? '—'}</span>
                  <span className={`comm-ticker-chg ${(quote.changePercent ?? 0) >= 0 ? 'up' : 'dn'}`}>
                    {(quote.changePercent ?? 0) >= 0 ? '▲' : '▼'}{' '}
                    {(quote.changePercent ?? 0) >= 0 ? '+' : ''}
                    {(quote.changePercent ?? 0).toFixed(2)}%
                  </span>
                </>
              ) : (
                <span className="comm-ticker-price" style={{ color: '#6b7280', fontSize: '0.6875rem' }}>
                  Quote unavailable
                </span>
              )}
            </div>
          )}
        </div>
        <div className="comm-engage comm-engage--card">
          <button
            type="button"
            className="comm-engage-btn"
            aria-label="Like"
            onClick={(e) => {
              e.stopPropagation();
              onLike(post.id, post.liked_by_me);
            }}
          >
            <i className={post.liked_by_me ? 'bi bi-heart-fill' : 'bi bi-heart'} aria-hidden /> {post.likes}
          </button>
          <button type="button" className="comm-engage-btn" aria-label="Comments" onClick={toggleComments}>
            <i className="bi bi-chat-dots" aria-hidden /> {post.comments}
          </button>
          <div className="comm-share-wrap" style={{ position: 'relative' }}>
            <button
              type="button"
              className="comm-engage-btn"
              aria-label="Share"
              aria-expanded={shareOpen}
              onClick={(e) => {
                e.stopPropagation();
                setShareOpen((o) => !o);
              }}
            >
              <i className="bi bi-share" aria-hidden /> Share
            </button>
            {shareOpen && (
              <div
                role="dialog"
                aria-label="Share to social"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 6px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--card-bg, #fff)',
                  border: '1px solid rgba(16,185,129,0.15)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  zIndex: 50,
                  minWidth: '200px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                }}
              >
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--home-heading, #111)', margin: '0 0 10px' }}>
                  Share to
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  {[
                    { id: 'x', icon: 'bi-twitter-x', label: 'X', color: '#000' },
                    { id: 'instagram', icon: 'bi-instagram', label: 'Instagram', color: '#E1306C' },
                    { id: 'facebook', icon: 'bi-facebook', label: 'Facebook', color: '#1877F2' },
                    { id: 'tiktok', icon: 'bi-tiktok', label: 'TikTok', color: '#010101' },
                  ].map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      title={platform.label}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        border: `1px solid ${platform.color}30`,
                        background: `${platform.color}10`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        color: platform.color,
                      }}
                      onClick={() => {
                        // Future: open OAuth-linked share from settings
                        alert(`Share to ${platform.label} — connect your account in Settings to share.`);
                        setShareOpen(false);
                      }}
                    >
                      <i className={`bi ${platform.icon}`} />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShareOpen(false)}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '4px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.625rem',
                    color: 'var(--home-muted, #6b7280)',
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="comm-engage-btn"
            aria-label="Save"
            onClick={(e) => {
              e.stopPropagation();
              onSave(post.id, post.saved_by_me);
            }}
          >
            <i className="bi bi-bookmark" aria-hidden /> {post.saved_by_me ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {commentsOpen && (
        <div className="comm-comment-thread" onClick={(e) => e.stopPropagation()} role="region" aria-label="Comments">
          <div className="comm-comment-thread-head">
            <span>{post.comments} comments</span>
            <button type="button" className="comm-comment-collapse" onClick={toggleComments}>
              Collapse <i className="bi bi-chevron-up" aria-hidden />
            </button>
          </div>
          {commentsLoading && <p className="comm-empty">Loading comments…</p>}
          {!commentsLoading &&
            comments.map((c) => (
              <div key={c.id} className="comm-comment-row">
                <div className="comm-avatar comm-avatar-sm" aria-hidden>
                  {c.author.initials}
                </div>
                <div className="comm-comment-body">
                  <div className="comm-comment-meta">
                    {c.author.id ? (
                      <Link href={`/profile/${c.author.username || c.author.id}`} className="comm-name-link" onClick={(e) => e.stopPropagation()}>
                        {c.author.name}
                      </Link>
                    ) : (
                      <span className="comm-post-name">{c.author.name}</span>
                    )}
                    <span className="comm-post-time"> · {formatRelativeTime(c.created_at)}</span>
                  </div>
                  <p className="comm-comment-text">{c.content}</p>
                </div>
              </div>
            ))}
          {user && (
            <div className="comm-comment-compose">
              <input
                className="comm-compose-input"
                placeholder="Write a comment..."
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitComment(e);
                  }
                }}
              />
              <button type="button" className="comm-btn-sm" onClick={submitComment} disabled={postingComment || !commentDraft.trim()}>
                {postingComment ? 'Posting…' : 'Post'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

