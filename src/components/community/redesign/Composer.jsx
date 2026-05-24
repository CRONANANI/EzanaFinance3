'use client';

import { useState, useRef, useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase-browser';
import { getInitials, extractTickerFromContent } from '@/lib/community-utils';
import { TICKER_SEARCH_DATA } from '@/lib/tickerSearchData';
import { Avatar } from './Avatar';

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
        transition: 'all .15s ease',
      }}
    >
      <i className={`bi ${icon}`} style={{ fontSize: 13 }} />
      {label}
    </button>
  );
}

function ImageBody({ image, setImage }) {
  const fileInputRef = useRef(null);
  const [urlInput, setUrlInput] = useState('');
  const [showUrl, setShowUrl] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }
    const url = URL.createObjectURL(file);
    setImage({ url, source: 'device', file });
  };

  const handleUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) {
      alert('Image URL must start with http:// or https://');
      return;
    }
    setImage({ url, source: 'url' });
    setUrlInput('');
    setShowUrl(false);
  };

  if (image) {
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt="Composer attachment preview"
            style={{
              maxWidth: '100%',
              maxHeight: 360,
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
            <i className="bi bi-x" style={{ fontSize: 14 }} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        background: 'var(--surface-input)',
        borderRadius: 8,
        border: '1px dashed var(--border-input)',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="ez-btn ez-btn--secondary"
          style={{ padding: '6px 12px', fontSize: 12 }}
        >
          <i className="bi bi-upload" style={{ fontSize: 12, marginRight: 6 }} />
          Upload from device
        </button>
        <button
          type="button"
          onClick={() => setShowUrl((s) => !s)}
          className="ez-btn ez-btn--secondary"
          style={{ padding: '6px 12px', fontSize: 12 }}
        >
          <i className="bi bi-link-45deg" style={{ fontSize: 12, marginRight: 6 }} />
          Paste image URL
        </button>
      </div>
      {showUrl && (
        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://..."
            style={{
              flex: 1,
              padding: '6px 10px',
              background: 'var(--surface-card)',
              border: '1px solid var(--border-input)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 12,
            }}
          />
          <button
            type="button"
            onClick={handleUrl}
            className="ez-btn ez-btn--primary"
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

function PollBody({ poll, setPoll }) {
  const question = poll?.question ?? '';
  const options = poll?.options ?? ['', ''];

  const updateOption = (i, val) => {
    const next = [...options];
    next[i] = val;
    setPoll({ question, options: next });
  };

  const addOption = () => {
    if (options.length >= 4) return;
    setPoll({ question, options: [...options, ''] });
  };

  const removeOption = (i) => {
    if (options.length <= 2) return;
    setPoll({ question, options: options.filter((_, idx) => idx !== i) });
  };

  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        background: 'var(--surface-input)',
        borderRadius: 8,
        border: '1px solid var(--border-input)',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
        Poll
      </div>
      <input
        type="text"
        value={question}
        onChange={(e) => setPoll({ question: e.target.value, options })}
        placeholder="Ask a question..."
        style={{
          width: '100%',
          padding: '8px 10px',
          background: 'var(--surface-card)',
          border: '1px solid var(--border-input)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          fontSize: 13,
          marginBottom: 8,
        }}
      />
      {options.map((opt, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            type="text"
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
            placeholder={`Option ${i + 1}`}
            style={{
              flex: 1,
              padding: '6px 10px',
              background: 'var(--surface-card)',
              border: '1px solid var(--border-input)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 12,
            }}
          />
          {options.length > 2 && (
            <button
              type="button"
              onClick={() => removeOption(i)}
              aria-label={`Remove option ${i + 1}`}
              style={{
                width: 28,
                height: 28,
                background: 'transparent',
                border: '1px solid var(--border-input)',
                borderRadius: 6,
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <i className="bi bi-x" style={{ fontSize: 12 }} />
            </button>
          )}
        </div>
      ))}
      {options.length < 4 && (
        <button
          type="button"
          onClick={addOption}
          style={{
            background: 'transparent',
            border: '1px dashed var(--border-input)',
            borderRadius: 6,
            padding: '6px 12px',
            color: 'var(--text-muted)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          + Add option
        </button>
      )}
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
    ).slice(0, 8);
  }, [query]);

  const togglePick = (sym) => {
    const symbol = (sym.ticker || sym.symbol || sym).toString().toUpperCase();
    if (tickers.includes(symbol)) {
      setTickers(tickers.filter((t) => t !== symbol));
    } else if (tickers.length < 5) {
      setTickers([...tickers, symbol]);
    }
  };

  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        background: 'var(--surface-input)',
        borderRadius: 8,
        border: '1px solid var(--border-input)',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
        Embed live chart{tickers.length > 0 ? ` (${tickers.length}/5)` : ''}
      </div>

      {tickers.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {tickers.map((t) => (
            <span
              key={t}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                background: 'var(--emerald-bg)',
                border: '1px solid var(--emerald-border)',
                color: 'var(--emerald)',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
              }}
            >
              ${t}
              <button
                type="button"
                onClick={() => setTickers(tickers.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                <i className="bi bi-x" style={{ fontSize: 11 }} />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search ticker (AAPL, TSLA, NVDA...)"
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

      {results.length > 0 && (
        <div
          style={{
            maxHeight: 140,
            overflowY: 'auto',
            background: 'var(--surface-card)',
            border: '1px solid var(--border-input)',
            borderRadius: 6,
            marginBottom: 8,
          }}
        >
          {results.map((r) => {
            const sym = r.ticker.toUpperCase();
            const picked = tickers.includes(sym);
            return (
              <button
                type="button"
                key={sym}
                onClick={() => togglePick(r)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: picked ? 'var(--emerald-bg-subtle)' : 'transparent',
                  border: 'none',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  <span
                    className="ez-mono"
                    style={{ color: picked ? 'var(--emerald)' : 'var(--text-primary)' }}
                  >
                    {sym}
                  </span>
                  {r.name && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 11 }}>
                      {r.name}
                    </span>
                  )}
                </span>
                {picked && <i className="bi bi-check" style={{ color: 'var(--emerald)' }} />}
              </button>
            );
          })}
        </div>
      )}

      {tickers.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {['1D', '1W', '1M', '3M', '6M', '1Y'].map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                background: period === p ? 'var(--emerald-bg)' : 'transparent',
                border: `1px solid ${period === p ? 'var(--emerald-border)' : 'var(--border-input)'}`,
                color: period === p ? 'var(--emerald)' : 'var(--text-muted)',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DiscussionBody({ topic, setTopic }) {
  const topics = [
    { id: 'markets', label: 'Markets', icon: 'bi-graph-up' },
    { id: 'macro', label: 'Macro', icon: 'bi-globe' },
    { id: 'crypto', label: 'Crypto', icon: 'bi-currency-bitcoin' },
    { id: 'earnings', label: 'Earnings', icon: 'bi-bar-chart' },
    { id: 'politics', label: 'Politics & Policy', icon: 'bi-bank' },
    { id: 'general', label: 'General', icon: 'bi-chat-dots' },
  ];

  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        background: 'var(--surface-input)',
        borderRadius: 8,
        border: '1px solid var(--border-input)',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
        Discussion topic
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-muted)' }}>
        Marking this post as a discussion thread invites longer-form replies. It will appear under
        the Discussions tab.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {topics.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setTopic(topic === t.id ? null : t.id)}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              background: topic === t.id ? 'var(--emerald-bg)' : 'transparent',
              border: `1px solid ${topic === t.id ? 'var(--emerald-border)' : 'var(--border-input)'}`,
              color: topic === t.id ? 'var(--emerald)' : 'var(--text-muted)',
              borderRadius: 999,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className={`bi ${t.icon}`} style={{ fontSize: 12 }} />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Composer({ onPosted }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [mode, setMode] = useState(null);
  const [image, setImage] = useState(null);
  const [poll, setPoll] = useState(null);
  const [tickers, setTickers] = useState([]);
  const [period, setPeriod] = useState('1M');
  const [discussionTopic, setDiscussionTopic] = useState(null);
  const [posting, setPosting] = useState(false);

  const author = {
    display_name:
      user?.user_metadata?.full_name ||
      user?.user_metadata?.first_name ||
      user?.email?.split('@')[0] ||
      'You',
    username: user?.user_metadata?.username || '',
    id: user?.id,
    initials: getInitials(user?.user_metadata?.full_name, user?.email),
  };

  const pollOptions = poll?.options?.filter((o) => o.trim()) ?? [];
  const hasPoll = poll?.question?.trim() && pollOptions.length >= 2;
  const hasTicker = tickers.length > 0;
  const hasContent = text.trim().length > 0 || image || hasPoll || hasTicker || discussionTopic;
  const canPost = !!user && !posting && hasContent;

  const setModeExclusive = (next) => {
    setMode((cur) => (cur === next ? null : next));
  };

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
          .upload(path, image.file, {
            upsert: false,
            contentType: image.file.type,
          });
        if (!uploadErr && uploadData?.path) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('community-images').getPublicUrl(uploadData.path);
          image_url = publicUrl;
        }
      } else if (image?.url && image.source !== 'device') {
        image_url = image.url;
      }

      const autoBits = [];
      if (!text.trim()) {
        if (hasPoll) autoBits.push(`📊 ${poll.question.trim()}`);
        if (hasTicker) autoBits.push(`📈 ${tickers.join(', ')}`);
      }

      let content = text.trim() || autoBits.join(' ');
      if (discussionTopic) {
        const tag = `#discussion-${discussionTopic}`;
        if (!/^#discussion\b/i.test(content)) {
          content = `#discussion ${content}`.trim();
        }
        if (!content.toLowerCase().includes(tag.toLowerCase())) {
          content = `${content} ${tag}`.trim();
        }
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
          ? {
              period: normalizePeriod(period),
              symbols: tickers.map((symbol) => ({ symbol })),
            }
          : null,
      };

      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setText('');
        setMode(null);
        setImage(null);
        setPoll(null);
        setTickers([]);
        setDiscussionTopic(null);
        setPeriod('1M');
        await onPosted?.();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to post');
      }
    } catch (err) {
      alert(err.message || 'Network error');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="ez-card" style={{ padding: 14 }} data-composer-anchor>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Avatar author={author} size={36} />
        <div style={{ flex: 1 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's your take on the markets today?"
            rows={2}
            disabled={!user}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              resize: 'vertical',
              outline: 'none',
              minHeight: 40,
              padding: 0,
            }}
          />

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
          {mode === 'discussion' && (
            <DiscussionBody topic={discussionTopic} setTopic={setDiscussionTopic} />
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <ComposerTool
                icon="bi-image"
                label={image ? 'Image ✓' : 'Image'}
                active={mode === 'image' || image != null}
                onClick={() => setModeExclusive('image')}
                disabled={!user}
              />
              <ComposerTool
                icon="bi-bar-chart"
                label={hasPoll ? 'Poll ✓' : 'Poll'}
                active={mode === 'poll' || hasPoll}
                onClick={() => {
                  setModeExclusive('poll');
                  if (!poll) setPoll({ question: '', options: ['', ''] });
                }}
                disabled={!user}
              />
              <ComposerTool
                icon="bi-graph-up"
                label={
                  tickers.length > 0
                    ? `${tickers.length} ticker${tickers.length > 1 ? 's' : ''}`
                    : 'Ticker'
                }
                active={mode === 'ticker' || tickers.length > 0}
                onClick={() => setModeExclusive('ticker')}
                disabled={!user}
              />
              <ComposerTool
                icon="bi-chat-square-text"
                label={discussionTopic ? 'Discussion ✓' : 'Discussion'}
                active={mode === 'discussion' || discussionTopic != null}
                onClick={() => setModeExclusive('discussion')}
                disabled={!user}
              />
            </div>
            <button
              type="button"
              onClick={handlePost}
              disabled={!canPost}
              className="ez-btn ez-btn--primary"
              style={{
                padding: '8px 18px',
                fontSize: 13,
                opacity: canPost ? 1 : 0.5,
                cursor: canPost ? 'pointer' : 'not-allowed',
              }}
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
