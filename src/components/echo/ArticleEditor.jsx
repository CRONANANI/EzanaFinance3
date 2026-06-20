'use client';

import { useState, useEffect } from 'react';

const CATEGORIES = [
  'Markets',
  'Investing',
  'Trading',
  'Crypto',
  'Economy',
  'Politics',
  'Technology',
  'Education',
];

export function ArticleEditor({ getToken, onSaved, editingArticle }) {
  const [title, setTitle] = useState(editingArticle?.article_title || '');
  const [excerpt, setExcerpt] = useState(editingArticle?.article_excerpt || '');
  const [body, setBody] = useState(editingArticle?.article_body || '');
  const [category, setCategory] = useState(editingArticle?.article_category || 'Markets');
  const [coverUrl, setCoverUrl] = useState(editingArticle?.cover_image_url || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [seriesList, setSeriesList] = useState([]);
  const [seriesId, setSeriesId] = useState(editingArticle?.series_id || '');
  const [newSeriesTitle, setNewSeriesTitle] = useState('');
  const [creatingSeries, setCreatingSeries] = useState(false);

  const [coAuthors, setCoAuthors] = useState([]);
  const [coAuthorInput, setCoAuthorInput] = useState('');
  const [coAuthorBusy, setCoAuthorBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/echo/series?mine=true', { cache: 'no-store' });
        if (res.ok && active) {
          const data = await res.json();
          setSeriesList(data.series || []);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!editingArticle?.id) return undefined;
    let active = true;
    fetch(`/api/echo/coauthors?articleId=${editingArticle.id}`)
      .then((r) => (r.ok ? r.json() : { coAuthors: [] }))
      .then((d) => {
        if (active) setCoAuthors(d.coAuthors || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [editingArticle?.id]);

  const createSeries = async () => {
    const title = newSeriesTitle.trim();
    if (!title) return;
    setCreatingSeries(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/echo/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (res.ok && data.series) {
        setSeriesList((prev) => [data.series, ...prev]);
        setSeriesId(data.series.id);
        setNewSeriesTitle('');
      } else {
        setError(data.error || 'Could not create series');
      }
    } finally {
      setCreatingSeries(false);
    }
  };

  const addCoAuthor = async () => {
    const username = coAuthorInput.trim().replace(/^@/, '');
    if (!username || !editingArticle?.id) return;
    setCoAuthorBusy(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/echo/coauthors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ articleId: editingArticle.id, username }),
      });
      const data = await res.json();
      if (res.ok) {
        setCoAuthors(data.coAuthors || []);
        setCoAuthorInput('');
      } else {
        setError(data.error || 'Could not add co-author');
      }
    } finally {
      setCoAuthorBusy(false);
    }
  };

  const removeCoAuthor = async (userId) => {
    setCoAuthorBusy(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/echo/coauthors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ articleId: editingArticle.id, userId }),
      });
      const data = await res.json();
      if (res.ok) setCoAuthors(data.coAuthors || []);
    } finally {
      setCoAuthorBusy(false);
    }
  };

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(wordCount / 200));

  const handleSave = async (action) => {
    if (!title.trim() || !body.trim()) {
      setError('Title and article body are required');
      return;
    }
    if (action === 'submit' && wordCount < 100) {
      setError('Articles must be at least 100 words to submit for review');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getToken();
      const isUpdate = !!editingArticle;
      const res = await fetch('/api/echo/articles', {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          articleId: editingArticle?.id,
          title,
          excerpt,
          body,
          category,
          coverImageUrl: coverUrl,
          action,
          seriesId: seriesId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      setSuccess(
        action === 'submit'
          ? 'Article submitted for review! Our editorial team will review it within 24-48 hours.'
          : 'Draft saved successfully.',
      );
      onSaved?.(data.article);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="echo-editor">
      <div className="echo-editor-header">
        <h2>{editingArticle ? 'Edit Article' : 'Write New Article'}</h2>
        <div className="echo-editor-meta">
          <span>{wordCount} words</span>
          <span>·</span>
          <span>{readTime} min read</span>
        </div>
      </div>

      {error && (
        <div className="echo-msg echo-msg-error">
          <i className="bi bi-exclamation-triangle" /> {error}
        </div>
      )}
      {success && (
        <div className="echo-msg echo-msg-success">
          <i className="bi bi-check-circle" /> {success}
        </div>
      )}

      <div className="echo-editor-body">
        <div className="echo-field">
          <label>Title</label>
          <input
            className="echo-input echo-input-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Your article headline..."
          />
        </div>

        <div className="echo-field-row">
          <div className="echo-field">
            <label>Category</label>
            <select
              className="echo-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="echo-field">
            <label>Cover Image URL (optional)</label>
            <input
              className="echo-input"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="echo-field">
          <label>Excerpt (shown in article cards)</label>
          <textarea
            className="echo-input echo-textarea-sm"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="A brief summary of your article (1-2 sentences)..."
            rows={2}
          />
        </div>

        <div className="echo-field">
          <label>Article Body</label>
          <textarea
            className="echo-input echo-textarea-lg"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your article here. Use markdown formatting: ## for headers, **bold**, *italic*, - for bullet points..."
            rows={20}
          />
        </div>

        <div className="echo-field">
          <label>Series (optional)</label>
          <select
            className="echo-input"
            value={seriesId}
            onChange={(e) => setSeriesId(e.target.value)}
          >
            <option value="">— No series —</option>
            {seriesList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              className="echo-input"
              placeholder="New series title…"
              value={newSeriesTitle}
              onChange={(e) => setNewSeriesTitle(e.target.value)}
            />
            <button
              type="button"
              className="echo-btn-secondary"
              onClick={createSeries}
              disabled={creatingSeries || !newSeriesTitle.trim()}
            >
              {creatingSeries ? 'Creating…' : 'Create series'}
            </button>
          </div>
        </div>

        <div className="echo-field">
          <label>Co-authors</label>
          {!editingArticle?.id ? (
            <p className="echo-field-hint" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Save a draft first, then credit co-authors here.
            </p>
          ) : (
            <>
              {coAuthors.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {coAuthors.map((c) => (
                    <span
                      key={c.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-secondary)',
                        fontSize: 13,
                      }}
                    >
                      {c.name}
                      {c.username ? ` · @${c.username}` : ''}
                      <button
                        type="button"
                        onClick={() => removeCoAuthor(c.id)}
                        disabled={coAuthorBusy}
                        aria-label={`Remove ${c.name}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          fontSize: 16,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="echo-input"
                  placeholder="Add by @username…"
                  value={coAuthorInput}
                  onChange={(e) => setCoAuthorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCoAuthor();
                    }
                  }}
                />
                <button
                  type="button"
                  className="echo-btn-secondary"
                  onClick={addCoAuthor}
                  disabled={coAuthorBusy || !coAuthorInput.trim()}
                >
                  Add
                </button>
              </div>
            </>
          )}
        </div>

        <div className="echo-editor-info">
          <i className="bi bi-info-circle" />
          <span>
            Articles are reviewed by our editorial team before publishing. Use markdown for
            formatting. Include data, sources, and original analysis for the best chance of
            approval.
          </span>
        </div>
      </div>

      <div className="echo-editor-actions">
        <button
          className="echo-btn-secondary"
          onClick={() => handleSave('draft')}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          className="echo-btn-primary"
          onClick={() => handleSave('submit')}
          disabled={loading || wordCount < 100}
        >
          <i className="bi bi-send" /> Submit for Review
        </button>
      </div>
    </div>
  );
}
