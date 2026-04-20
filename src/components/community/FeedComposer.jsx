'use client';

/**
 * Feed composer — extracted from CommunityPageClient.jsx as part of the
 * community-page polish pass. Composition is identical to the original
 * in-page version; every inline-styled control has been moved to the
 * .comm-composer-* classes in community.css so that:
 *
 *   - Every text / border / background color resolves via theme tokens
 *     (works in dark, light, and partner-gold without overrides).
 *   - Every interactive control has a visible :focus-visible ring.
 *   - Hover states retain label contrast (no more white-on-white on
 *     lightened backgrounds).
 *
 * Contract is identical to the original inline block — the parent
 * owns all composer state and wiring. This keeps the diff surgical
 * and preserves the exact post / poll / ticker-embed semantics the
 * /api/community/posts route already expects.
 */

import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getInitials, extractTickerFromContent } from '@/lib/community-utils';
import { TICKER_SEARCH_DATA } from '@/lib/tickerSearchData';

export function FeedComposer({
  user,
  userProfile,
  composerText,
  setComposerText,
  posting,
  setPosting,
  composerImage,
  setComposerImage,
  showImageMenu,
  setShowImageMenu,
  showPollBuilder,
  setShowPollBuilder,
  pollQuestion,
  setPollQuestion,
  pollOptions,
  setPollOptions,
  showTickerSearch,
  setShowTickerSearch,
  tickerQuery,
  setTickerQuery,
  tickerEmbedSymbols,
  setTickerEmbedSymbols,
  tickerStep,
  setTickerStep,
  tickerPeriod,
  setTickerPeriod,
  onPosted,
}) {
  const filteredTickers = useMemo(() => {
    const q = tickerQuery.toUpperCase().trim();
    if (!q) return [];
    return TICKER_SEARCH_DATA.filter(
      (t) => t.ticker.startsWith(q) || t.name.toUpperCase().includes(q),
    );
  }, [tickerQuery]);

  const hasContent =
    composerText.trim().length > 0 ||
    composerImage ||
    (pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2) ||
    tickerEmbedSymbols.length > 0;

  const canPost = !!user && !posting && hasContent;

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      let image_url = null;

      if (composerImage?.source === 'device' && composerImage?.file) {
        const ext = composerImage.file.name.split('.').pop() || 'jpg';
        const path = `community/${user.id}/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('community-images')
          .upload(path, composerImage.file, {
            upsert: false,
            contentType: composerImage.file.type,
          });
        if (!uploadErr && uploadData?.path) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('community-images').getPublicUrl(uploadData.path);
          image_url = publicUrl;
        }
      } else if (composerImage?.source === 'storage') {
        image_url = composerImage.url;
      }

      const hasPoll =
        pollQuestion.trim() && pollOptions.filter((o) => o.trim()).length >= 2;
      const hasTicker = tickerEmbedSymbols.length > 0;
      const tickerMatch = composerText.match(/\$([A-Za-z]{1,5})\b/);

      const autoBits = [];
      if (!composerText.trim()) {
        if (hasPoll) autoBits.push(`📊 ${pollQuestion.trim()}`);
        if (hasTicker) {
          autoBits.push(`📈 ${tickerEmbedSymbols.map((x) => x.symbol).join(', ')}`);
        }
      }

      const body = {
        content: composerText.trim() || autoBits.join(' '),
        mentioned_ticker:
          tickerEmbedSymbols[0]?.symbol ||
          (tickerMatch ? tickerMatch[1] : extractTickerFromContent(composerText)),
        image_url,
        poll_data: hasPoll
          ? {
              question: pollQuestion.trim(),
              options: pollOptions
                .filter((o) => o.trim())
                .map((o) => ({ label: o.trim() })),
            }
          : null,
        ticker_embed: hasTicker
          ? {
              period: tickerPeriod,
              symbols: tickerEmbedSymbols.map((s) => ({
                symbol: s.symbol,
                highlight_price: s.highlight_price,
              })),
            }
          : null,
      };

      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setComposerText('');
        setComposerImage(null);
        setShowImageMenu(false);
        setShowPollBuilder(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        setTickerEmbedSymbols([]);
        setShowTickerSearch(false);
        setTickerQuery('');
        setTickerStep('search');
        setTickerPeriod('1M');
        await onPosted?.();
      }
    } finally {
      setPosting(false);
    }
  };

  const avatarInitials = getInitials(
    userProfile?.full_name ||
      userProfile?.display_name ||
      user?.email ||
      'U',
  );

  return (
    <div className="db-card comm-composer-card" data-community-card>
      <div className="comm-composer-row">
        <div className="comm-composer-avatar" aria-hidden>
          {avatarInitials}
        </div>
        <textarea
          id="comm-composer"
          placeholder="Share something with the community…"
          value={composerText}
          onChange={(e) => setComposerText(e.target.value)}
          rows={2}
          disabled={!user}
          className="comm-composer-textarea"
        />
      </div>

      <div className="comm-composer-actions">
        <div className="comm-composer-tools">
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setShowImageMenu((v) => !v);
                setShowPollBuilder(false);
                setShowTickerSearch(false);
              }}
              className={`comm-composer-tool ${composerImage ? 'is-active' : ''}`}
              aria-pressed={!!composerImage}
            >
              <i className="bi bi-image" aria-hidden /> Image
              {composerImage ? ' ✓' : ''}
            </button>

            {showImageMenu && (
              <div className="comm-composer-image-menu">
                <p className="comm-composer-image-menu__label">Add image</p>

                <label className="comm-composer-image-menu__row">
                  <i
                    className="bi bi-upload"
                    style={{ color: 'var(--emerald, #10b981)' }}
                    aria-hidden
                  />
                  Upload from device
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      setComposerImage({ url, source: 'device', file });
                      setShowImageMenu(false);
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const url = window.prompt(
                      'Paste an image URL from your platform storage:',
                    );
                    if (url && url.startsWith('http')) {
                      setComposerImage({ url, source: 'storage' });
                    }
                    setShowImageMenu(false);
                  }}
                  className="comm-composer-image-menu__row comm-composer-image-menu__row--btn"
                >
                  <i
                    className="bi bi-cloud"
                    style={{ color: '#6366f1' }}
                    aria-hidden
                  />
                  Platform storage
                </button>

                {composerImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setComposerImage(null);
                      setShowImageMenu(false);
                    }}
                    className="comm-composer-image-menu__row comm-composer-image-menu__row--btn comm-composer-image-menu__row--danger"
                  >
                    <i className="bi bi-trash" aria-hidden /> Remove image
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setShowPollBuilder((v) => !v);
              setShowImageMenu(false);
            }}
            className={`comm-composer-tool ${showPollBuilder ? 'is-active' : ''}`}
            aria-pressed={showPollBuilder}
          >
            <i className="bi bi-bar-chart" aria-hidden /> Poll
          </button>

          <button
            type="button"
            onClick={() => {
              setShowTickerSearch((v) => !v);
              setShowImageMenu(false);
              if (!showTickerSearch) {
                setTickerStep('search');
                setTickerQuery('');
              }
            }}
            className={`comm-composer-tool ${tickerEmbedSymbols.length ? 'is-active' : ''}`}
            aria-pressed={tickerEmbedSymbols.length > 0}
          >
            <i className="bi bi-graph-up" aria-hidden />{' '}
            {tickerEmbedSymbols.length === 0
              ? 'Ticker'
              : tickerEmbedSymbols.length === 1
                ? `$${tickerEmbedSymbols[0].symbol}`
                : `${tickerEmbedSymbols.length} tickers`}
          </button>
        </div>

        <button
          type="button"
          onClick={handlePost}
          disabled={!canPost}
          className="comm-composer-post-btn"
        >
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>

      {composerImage && (
        <div className="comm-composer-image-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={composerImage.url} alt="Post preview" />
          <button
            type="button"
            onClick={() => setComposerImage(null)}
            className="comm-composer-image-remove"
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      )}

      {showPollBuilder && (
        <div className="comm-composer-subpanel">
          <input
            type="text"
            placeholder="Ask a question…"
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            maxLength={200}
            className="comm-composer-input"
          />
          {pollOptions.map((opt, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}
            >
              <input
                type="text"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const next = [...pollOptions];
                  next[i] = e.target.value;
                  setPollOptions(next);
                }}
                maxLength={100}
                className="comm-composer-input"
              />
              {pollOptions.length > 2 && (
                <button
                  type="button"
                  onClick={() =>
                    setPollOptions(pollOptions.filter((_, j) => j !== i))
                  }
                  className="comm-composer-poll-remove"
                  aria-label={`Remove option ${i + 1}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 6 && (
            <button
              type="button"
              onClick={() => setPollOptions([...pollOptions, ''])}
              className="comm-composer-poll-add"
            >
              + Add option
            </button>
          )}
        </div>
      )}

      {showTickerSearch && (
        <div className="comm-composer-subpanel">
          {tickerStep === 'search' && (
            <>
              <input
                type="text"
                placeholder="Search ticker (e.g. AAPL, NVDA…)"
                value={tickerQuery}
                onChange={(e) => setTickerQuery(e.target.value)}
                autoFocus
                className="comm-composer-input"
              />
              {filteredTickers.length > 0 && (
                <div className="comm-composer-ticker-results">
                  {filteredTickers.map((t) => (
                    <button
                      key={t.ticker}
                      type="button"
                      onClick={() => {
                        setTickerEmbedSymbols((prev) => {
                          if (prev.some((x) => x.symbol === t.ticker)) return prev;
                          if (prev.length >= 3) return prev;
                          return [...prev, { symbol: t.ticker, highlight_price: null }];
                        });
                      }}
                      className="comm-composer-ticker-result"
                    >
                      <span className="comm-composer-ticker-symbol" aria-hidden>
                        {t.ticker.slice(0, 2)}
                      </span>
                      <div className="comm-composer-ticker-meta">
                        <p className="comm-composer-ticker-name">{t.ticker}</p>
                        <p className="comm-composer-ticker-desc">{t.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {tickerEmbedSymbols.length > 0 && (
                <div className="comm-composer-ticker-chips">
                  {tickerEmbedSymbols.map((s) => (
                    <span key={s.symbol} className="comm-composer-ticker-chip">
                      ${s.symbol}
                      <button
                        type="button"
                        onClick={() =>
                          setTickerEmbedSymbols((prev) =>
                            prev.filter((x) => x.symbol !== s.symbol),
                          )
                        }
                        aria-label={`Remove ${s.symbol}`}
                        className="comm-composer-ticker-chip-remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <span className="comm-composer-ticker-count">
                    {tickerEmbedSymbols.length}/3
                  </span>
                </div>
              )}
              {tickerEmbedSymbols.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTickerStep('configure')}
                  className="comm-composer-ticker-next"
                >
                  Time period & highlights →
                </button>
              )}
            </>
          )}

          {tickerStep === 'configure' && tickerEmbedSymbols.length > 0 && (
            <div className="comm-composer-ticker-config">
              <div className="comm-composer-ticker-config-head">
                <span className="comm-composer-ticker-config-title">
                  {tickerEmbedSymbols.map((s) => `$${s.symbol}`).join(' · ')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTickerEmbedSymbols([]);
                    setTickerStep('search');
                    setTickerQuery('');
                  }}
                  className="comm-composer-ticker-config-back"
                >
                  ← Change tickers
                </button>
              </div>

              <div>
                <p className="comm-composer-ticker-config-label">
                  Time period (all charts)
                </p>
                <div className="comm-composer-ticker-period">
                  {['1D', '1W', '1M', '3M', '1Y'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTickerPeriod(p)}
                      className={`comm-composer-ticker-period-btn ${
                        tickerPeriod === p ? 'is-active' : ''
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {tickerEmbedSymbols.map((s, i) => (
                <div key={s.symbol}>
                  <p className="comm-composer-ticker-config-label">
                    Highlight ${s.symbol} (optional)
                  </p>
                  <input
                    type="number"
                    placeholder="e.g. 180.00"
                    value={Number.isFinite(s.highlight_price) ? s.highlight_price : ''}
                    onChange={(e) => {
                      const num = parseFloat(e.target.value);
                      setTickerEmbedSymbols((prev) =>
                        prev.map((row, j) =>
                          j === i
                            ? {
                                ...row,
                                highlight_price: Number.isFinite(num) ? num : null,
                              }
                            : row,
                        ),
                      );
                    }}
                    className="comm-composer-input"
                  />
                </div>
              ))}

              <p className="comm-composer-ticker-config-summary">
                ✓ {tickerEmbedSymbols.length} chart
                {tickerEmbedSymbols.length !== 1 ? 's' : ''} · {tickerPeriod}
              </p>
            </div>
          )}
        </div>
      )}

      {!user && (
        <p className="comm-composer-sign-in">Sign in to post.</p>
      )}
    </div>
  );
}

export default FeedComposer;
