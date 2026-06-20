'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase-browser';
import { getInitials, extractTickerFromContent } from '@/lib/community-utils';
import { TICKER_SEARCH_DATA } from '@/lib/tickerSearchData';
import { POST_TYPE_LIST, STANDARD_DISCLAIMER } from '@/lib/post-types';
import { Avatar } from './Atoms';

const VALID_PERIODS = ['1D', '1W', '1M', '3M', '1Y'];

function normalizePeriod(period) {
  if (period === '6M') return '3M';
  return VALID_PERIODS.includes(period) ? period : '1M';
}

function ComposerTool({ icon, label, active, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: active ? 'var(--emerald-bg)' : 'transparent',
        border: `1px solid ${active ? 'var(--emerald-border)' : 'transparent'}`,
        color: active ? 'var(--emerald)' : 'var(--text-muted)',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <i className={`bi ${icon}`} style={{ fontSize: 13 }} />
      {label}
    </button>
  );
}

function ImageBody({ image, setImage }) {
  const fileInputRef = useRef(null);

  if (image) {
    return (
      <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt=""
          style={{
            maxWidth: '100%',
            maxHeight: 280,
            borderRadius: 8,
            border: '1px solid var(--border-primary)',
          }}
        />
        <button
          type="button"
          onClick={() => setImage(null)}
          aria-label="Remove image"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 26,
            height: 26,
            borderRadius: 999,
            background: 'rgba(0,0,0,0.7)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <i className="bi bi-x" />
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setImage({ url: URL.createObjectURL(file), source: 'device', file });
        }}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="ez-btn ez-btn--secondary"
        style={{ fontSize: 12 }}
      >
        Upload image
      </button>
    </div>
  );
}

function PollBody({ poll, setPoll }) {
  const question = poll?.question ?? '';
  const options = poll?.options ?? ['', ''];
  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        background: 'var(--surface-input)',
        borderRadius: 8,
        border: '1px solid var(--border-input)',
      }}
    >
      <input
        type="text"
        value={question}
        onChange={(e) => setPoll({ question: e.target.value, options })}
        placeholder="Poll question"
        style={{
          width: '100%',
          marginBottom: 8,
          padding: '6px 10px',
          background: 'var(--surface-card)',
          border: '1px solid var(--border-input)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          fontSize: 12,
        }}
      />
      {options.map((opt, i) => (
        <input
          key={i}
          type="text"
          value={opt}
          onChange={(e) => {
            const next = [...options];
            next[i] = e.target.value;
            setPoll({ question, options: next });
          }}
          placeholder={`Option ${i + 1}`}
          style={{
            width: '100%',
            marginBottom: 6,
            padding: '6px 10px',
            background: 'var(--surface-card)',
            border: '1px solid var(--border-input)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            fontSize: 12,
          }}
        />
      ))}
    </div>
  );
}

function TickerBody({ tickers, setTickers, period, setPeriod }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.toUpperCase().trim();
    if (!q) return [];
    return TICKER_SEARCH_DATA.filter(
      (t) => t.ticker.startsWith(q) || t.name.toUpperCase().includes(q),
    ).slice(0, 6);
  }, [query]);

  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        background: 'var(--surface-input)',
        borderRadius: 8,
        border: '1px solid var(--border-input)',
      }}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search ticker"
        style={{
          width: '100%',
          padding: '6px 10px',
          background: 'var(--surface-card)',
          border: '1px solid var(--border-input)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          fontSize: 12,
          marginBottom: 8,
        }}
      />
      {results.map((r) => {
        const sym = r.ticker.toUpperCase();
        const picked = tickers.includes(sym);
        return (
          <button
            key={sym}
            type="button"
            onClick={() => {
              if (picked) setTickers(tickers.filter((t) => t !== sym));
              else if (tickers.length < 5) setTickers([...tickers, sym]);
            }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '4px 8px',
              background: picked ? 'var(--emerald-bg)' : 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            ${sym} {picked ? '✓' : ''}
          </button>
        );
      })}
      {tickers.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {['1D', '1W', '1M', '3M', '1Y'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={period === p ? 'ez-pill' : 'ez-pill ez-pill--ghost'}
              style={{ padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EvoComposer({
  onPosted,
  expanded = true,
  onToggle,
  quotedPost = null,
  onClearQuote,
}) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [mode, setMode] = useState(null);
  const [image, setImage] = useState(null);
  const [poll, setPoll] = useState(null);
  const [tickers, setTickers] = useState([]);
  const [period, setPeriod] = useState('1M');
  const [quoteMode, setQuoteMode] = useState(!!quotedPost);
  const [postConviction, setPostConviction] = useState(0);
  const [posting, setPosting] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [postType, setPostType] = useState(null);
  const [disclosure, setDisclosure] = useState('');

  useEffect(() => {
    if (!user?.id) {
      setIsPartner(false);
      return undefined;
    }
    let active = true;
    supabase
      .from('profiles')
      .select('is_partner')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setIsPartner(!!data?.is_partner);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);

  const author = {
    display_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You',
    username: user?.user_metadata?.username || '',
    id: user?.id,
    initials: getInitials(user?.user_metadata?.full_name, user?.email),
  };

  const pollOptions = poll?.options?.filter((o) => o.trim()) ?? [];
  const hasPoll = poll?.question?.trim() && pollOptions.length >= 2;
  const hasTicker = tickers.length > 0;
  const hasContent = text.trim().length > 0 || image || hasPoll || hasTicker || quoteMode;
  const canPost = !!user && !posting && hasContent;

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      let image_url = null;
      if (image?.source === 'device' && image?.file && user?.id) {
        const ext = image.file.name.split('.').pop() || 'jpg';
        const path = `community/${user.id}/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('community-images')
          .upload(path, image.file, { upsert: false, contentType: image.file.type });
        if (!uploadErr && uploadData?.path) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('community-images').getPublicUrl(uploadData.path);
          image_url = publicUrl;
        }
      } else if (image?.url && image.source !== 'device') {
        image_url = image.url;
      }

      let content = text.trim();
      if (quoteMode && quotedPost) {
        content = content || `Quoting @${quotedPost.author?.username || 'member'}`;
      }

      const tickerMatch = content.match(/\$([A-Za-z]{1,5})\b/);
      const body = {
        content,
        mentioned_ticker:
          tickers[0] || (tickerMatch ? tickerMatch[1] : extractTickerFromContent(content)),
        image_url,
        poll_data: hasPoll
          ? {
              question: poll.question.trim(),
              options: pollOptions.map((o) => ({ label: o.trim() })),
            }
          : null,
        ticker_embed: hasTicker
          ? { period: normalizePeriod(period), symbols: tickers.map((symbol) => ({ symbol })) }
          : null,
        quoted_post_id: quoteMode && quotedPost?.id ? quotedPost.id : undefined,
        post_type: isPartner && postType ? postType : undefined,
        disclosure: isPartner && postType && disclosure.trim() ? disclosure.trim() : undefined,
      };

      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to post');
        return;
      }

      const data = await res.json();
      const postId = data.post?.id;

      if (postId && postConviction > 0) {
        await fetch('/api/community/posts/conviction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, conviction: postConviction }),
        });
      }

      setText('');
      setMode(null);
      setImage(null);
      setPoll(null);
      setTickers([]);
      setPostConviction(0);
      setQuoteMode(false);
      setPostType(null);
      setDisclosure('');
      onClearQuote?.();
      await onPosted?.();
    } catch (err) {
      alert(err.message || 'Network error');
    } finally {
      setPosting(false);
    }
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="ez-card evo-composer-collapsed"
        style={{
          width: '100%',
          padding: '14px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--surface-card)',
          border: '1px solid var(--border-primary)',
          borderRadius: 12,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <Avatar author={author} size={32} />
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Share a take…</span>
      </button>
    );
  }

  return (
    <div
      className="ez-card evo-composer"
      style={{ padding: 14, marginBottom: 16 }}
      data-composer-anchor
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Avatar author={author} size={36} />
        <div style={{ flex: 1 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share a take on the markets…"
            rows={3}
            disabled={!user}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              resize: 'vertical',
              outline: 'none',
              minHeight: 48,
              padding: 0,
            }}
          />

          {isPartner && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--text-faint)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginRight: 2,
                  }}
                >
                  Format
                </span>
                <button
                  type="button"
                  onClick={() => setPostType(null)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: postType === null ? 'var(--surface-card-hover)' : 'transparent',
                    border: `1px solid ${postType === null ? 'var(--border-primary)' : 'var(--border-secondary)'}`,
                    color: postType === null ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  Standard
                </button>
                {POST_TYPE_LIST.map((t) => {
                  const active = postType === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setPostType(active ? null : t.key)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: active ? t.soft : 'transparent',
                        border: `1px solid ${active ? t.color : 'var(--border-secondary)'}`,
                        color: active ? t.color : 'var(--text-muted)',
                      }}
                    >
                      <i className={`bi ${t.icon}`} style={{ fontSize: 12 }} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
              {postType && (
                <div style={{ marginTop: 8 }}>
                  <input
                    type="text"
                    value={disclosure}
                    onChange={(e) => setDisclosure(e.target.value)}
                    maxLength={200}
                    placeholder="Position or sponsorship disclosure (optional) — e.g., Long $TSLA"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-input)',
                      borderRadius: 6,
                      color: 'var(--text-primary)',
                      fontSize: 12,
                    }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>
                    <i className="bi bi-info-circle" /> {STANDARD_DISCLAIMER} is shown
                    automatically.
                  </div>
                </div>
              )}
            </div>
          )}

          {quoteMode && quotedPost && (
            <div
              style={{
                marginTop: 8,
                padding: 10,
                background: 'var(--bg-tertiary)',
                borderRadius: 8,
                border: '1px solid var(--border-secondary)',
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              Quoting: {quotedPost.content?.slice(0, 120)}
              {quotedPost.content?.length > 120 ? '…' : ''}
            </div>
          )}

          {mode === 'image' && <ImageBody image={image} setImage={setImage} />}
          {mode === 'poll' && (
            <PollBody poll={poll ?? { question: '', options: ['', ''] }} setPoll={setPoll} />
          )}
          {mode === 'ticker' && (
            <TickerBody
              tickers={tickers}
              setTickers={setTickers}
              period={period}
              setPeriod={setPeriod}
            />
          )}

          <div
            style={{
              marginTop: 12,
              padding: '10px 0',
              borderTop: '1px solid var(--border-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Your conviction
              </span>
              <span
                className="ez-mono"
                style={{ fontSize: 16, fontWeight: 800, color: 'var(--emerald)' }}
              >
                {postConviction}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={postConviction}
              onChange={(e) => setPostConviction(+e.target.value)}
              disabled={!user}
              style={{ width: '100%', accentColor: 'var(--emerald)' }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <ComposerTool
                icon="bi-image"
                label="Image"
                active={mode === 'image' || image != null}
                onClick={() => setMode((m) => (m === 'image' ? null : 'image'))}
                disabled={!user}
              />
              <ComposerTool
                icon="bi-bar-chart"
                label="Poll"
                active={mode === 'poll' || hasPoll}
                onClick={() => {
                  setMode((m) => (m === 'poll' ? null : 'poll'));
                  if (!poll) setPoll({ question: '', options: ['', ''] });
                }}
                disabled={!user}
              />
              <ComposerTool
                icon="bi-graph-up"
                label="Ticker"
                active={mode === 'ticker' || tickers.length > 0}
                onClick={() => setMode((m) => (m === 'ticker' ? null : 'ticker'))}
                disabled={!user}
              />
              <ComposerTool
                icon="bi-quote"
                label={quoteMode ? 'Quote ✓' : 'Quote'}
                active={quoteMode}
                onClick={() => setQuoteMode((q) => !q)}
                disabled={!user || !quotedPost}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {onToggle && (
                <button
                  type="button"
                  onClick={onToggle}
                  className="ez-btn ez-btn--ghost"
                  style={{ fontSize: 12 }}
                >
                  Collapse
                </button>
              )}
              <button
                type="button"
                onClick={handlePost}
                disabled={!canPost}
                className="ez-btn ez-btn--primary"
                style={{ fontSize: 13, opacity: canPost ? 1 : 0.5 }}
              >
                {posting ? 'Posting…' : 'Post take'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
