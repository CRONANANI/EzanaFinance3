'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AuthorCard } from '@/components/echo';
import '../../echo-publish.css';
import '../../ezana-echo.css';

export default function AuthorPage() {
  const params = useParams();
  const id = params?.id;
  const [author, setAuthor] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/echo/authors?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        setAuthor(d.author);
        setArticles(d.articles || []);
      })
      .catch(() => setAuthor(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="ezana-echo-page">
        <div className="ezana-echo-bg" />
        <div className="ezana-echo-container" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#8b949e' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="ezana-echo-page">
        <div className="ezana-echo-bg" />
        <div className="ezana-echo-container" style={{ padding: '3rem', textAlign: 'center' }}>
          <h2 style={{ color: '#f0f6fc', marginBottom: '0.5rem' }}>Author not found</h2>
          <Link href="/ezana-echo" className="echo-btn-secondary">Back to Articles</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ezana-echo-page">
      <div className="ezana-echo-bg" />
      <div className="ezana-echo-container" style={{ padding: '2rem 0' }}>
        <Link href="/ezana-echo" className="ezana-article-back" style={{ display: 'inline-flex', marginBottom: '1.5rem' }}>
          <i className="bi bi-arrow-left" />
          Back to Articles
        </Link>

        <div className="echo-author-profile" style={{ marginBottom: '2rem' }}>
          <AuthorCard author={author} />
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f0f6fc', marginBottom: '1rem' }}>Articles</h2>
        <div className="ezana-echo-grid">
          {articles.map((a) => (
            <Link key={a.id} href={`/ezana-echo/${a.article_slug}`} className="ezana-echo-card">
              <div className="ezana-echo-card-image">
                <div className="ezana-echo-card-image-placeholder">
                  <i className="bi bi-newspaper text-4xl text-emerald-500/30" />
                </div>
                <span className="ezana-echo-card-category">{a.article_category}</span>
              </div>
              <div className="ezana-echo-card-body">
                <h3 className="ezana-echo-card-title">{a.article_title}</h3>
                <p className="ezana-echo-card-excerpt">{a.article_excerpt}</p>
                <div className="ezana-echo-card-meta">
                  <span>{a.read_time_minutes} min read</span>
                  <span>{a.published_at ? new Date(a.published_at).toLocaleDateString() : ''}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
