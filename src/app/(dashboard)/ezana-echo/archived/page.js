'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { isAdminUserClient } from '@/lib/admin-helpers-client';
import { formatPublishedShort } from '@/lib/echo-format';
import '../ezana-echo.css';

export default function ArchivedArticlesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const isAdmin = isAdminUserClient(user);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/ezana-echo');
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/echo/admin/archived-articles', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setArticles(data.articles || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  async function handleRepublish(articleId) {
    if (!confirm('Republish this article? It will reappear in the public Echo feed.')) return;
    setBusyId(articleId);
    try {
      const res = await fetch('/api/echo/admin/archive', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
    } catch (err) {
      alert(`Failed to republish: ${err.message}`);
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) return <div className="echo-archive-loading">Loading…</div>;
  if (!isAdmin) return null;

  return (
    <div className="echo-archive-page">
      <div className="echo-archive-header">
        <div>
          <Link href="/ezana-echo" className="echo-archive-back">
            ← Back to Ezana Echo
          </Link>
          <h1>Archived Articles</h1>
          <p className="echo-archive-subtitle">
            Admin view. These articles are hidden from public Echo listings and return 404 to
            non-admin users. Republish to restore visibility.
          </p>
        </div>
      </div>

      {error && <div className="echo-archive-error">Failed to load: {error}</div>}

      {articles === null && !error && (
        <div className="echo-archive-loading">Loading archived articles…</div>
      )}

      {articles && articles.length === 0 && (
        <div className="echo-archive-empty">
          <i className="bi bi-archive" />
          <h2>No archived articles</h2>
          <p>Articles you archive will appear here.</p>
        </div>
      )}

      {articles && articles.length > 0 && (
        <div className="echo-archive-list">
          {articles.map((a) => (
            <article key={a.id} className="echo-archive-card">
              <div className="echo-archive-card-main">
                <span className="echo-archive-badge">Archived</span>
                <h2 className="echo-archive-card-title">
                  <Link href={`/ezana-echo/${a.id}`}>{a.title}</Link>
                </h2>
                <p className="echo-archive-card-excerpt">{a.excerpt}</p>
                <div className="echo-archive-card-meta">
                  <span>Category: {a.category}</span>
                  <span>•</span>
                  <span>Published: {formatPublishedShort(a.publishedAt)}</span>
                  {a.archivedAt && (
                    <>
                      <span>•</span>
                      <span>Archived: {formatPublishedShort(a.archivedAt)}</span>
                    </>
                  )}
                  {a.archivedBy && (
                    <>
                      <span>•</span>
                      <span>By: {a.archivedBy}</span>
                    </>
                  )}
                </div>
                {a.notes && <div className="echo-archive-card-notes">Note: {a.notes}</div>}
              </div>
              <div className="echo-archive-card-actions">
                <button
                  type="button"
                  className="echo-archive-republish-btn"
                  onClick={() => handleRepublish(a.id)}
                  disabled={busyId === a.id}
                >
                  <i className="bi bi-arrow-counterclockwise" />
                  {busyId === a.id ? 'Republishing…' : 'Republish'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
