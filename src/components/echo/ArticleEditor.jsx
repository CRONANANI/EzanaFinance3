'use client';

import { useState } from 'react';

const CATEGORIES = ['Markets', 'Investing', 'Trading', 'Crypto', 'Economy', 'Politics', 'Technology', 'Education'];

export function ArticleEditor({ getToken, onSaved, editingArticle }) {
  const [title, setTitle] = useState(editingArticle?.article_title || '');
  const [excerpt, setExcerpt] = useState(editingArticle?.article_excerpt || '');
  const [body, setBody] = useState(editingArticle?.article_body || '');
  const [category, setCategory] = useState(editingArticle?.article_category || 'Markets');
  const [coverUrl, setCoverUrl] = useState(editingArticle?.cover_image_url || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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
          title, excerpt, body, category, coverImageUrl: coverUrl, action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      setSuccess(action === 'submit'
        ? 'Article submitted for review! Our editorial team will review it within 24-48 hours.'
        : 'Draft saved successfully.');
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

      {error && <div className="echo-msg echo-msg-error"><i className="bi bi-exclamation-triangle" /> {error}</div>}
      {success && <div className="echo-msg echo-msg-success"><i className="bi bi-check-circle" /> {success}</div>}

      <div className="echo-editor-body">
        <div className="echo-field">
          <label>Title</label>
          <input className="echo-input echo-input-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your article headline..." />
        </div>

        <div className="echo-field-row">
          <div className="echo-field">
            <label>Category</label>
            <select className="echo-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="echo-field">
            <label>Cover Image URL (optional)</label>
            <input className="echo-input" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div className="echo-field">
          <label>Excerpt (shown in article cards)</label>
          <textarea className="echo-input echo-textarea-sm" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="A brief summary of your article (1-2 sentences)..." rows={2} />
        </div>

        <div className="echo-field">
          <label>Article Body</label>
          <textarea className="echo-input echo-textarea-lg" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your article here. Use markdown formatting: ## for headers, **bold**, *italic*, - for bullet points..." rows={20} />
        </div>

        <div className="echo-editor-info">
          <i className="bi bi-info-circle" />
          <span>Articles are reviewed by our editorial team before publishing. Use markdown for formatting. Include data, sources, and original analysis for the best chance of approval.</span>
        </div>
      </div>

      <div className="echo-editor-actions">
        <button className="echo-btn-secondary" onClick={() => handleSave('draft')} disabled={loading}>
          {loading ? 'Saving...' : 'Save Draft'}
        </button>
        <button className="echo-btn-primary" onClick={() => handleSave('submit')} disabled={loading || wordCount < 100}>
          <i className="bi bi-send" /> Submit for Review
        </button>
      </div>
    </div>
  );
}
