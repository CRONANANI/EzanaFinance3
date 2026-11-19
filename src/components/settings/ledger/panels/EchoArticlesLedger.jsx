'use client';

/**
 * Settings → Echo articles (admin only). The one place admins archive and
 * restore Ezana Echo articles; the Echo home no longer carries per-card
 * archive buttons. Archived articles are hidden from every reader (home,
 * search, article pages) until restored.
 *
 *   published: GET /api/echo/hub (published, non-archived)
 *   archived:  GET /api/echo/admin/archived-articles
 *   archive:   POST   /api/echo/admin/archive { articleId }
 *   restore:   DELETE /api/echo/admin/archive { articleId }
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LedgerBadge, LedgerButton, LedgerRow, LedgerSegmented } from '../primitives';
import './echo-articles-ledger.css';

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function EchoArticlesLedger() {
  const [view, setView] = useState('published');
  const [published, setPublished] = useState([]);
  const [archived, setArchived] = useState([]);
  const [status, setStatus] = useState('loading');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const [hub, arch] = await Promise.all([
        fetch('/api/echo/hub', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/echo/admin/archived-articles', { cache: 'no-store' }).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
        ),
      ]);
      const archivedList = arch.articles || [];
      const archivedIds = new Set(archivedList.map((a) => a.id));
      setPublished((hub.articles || []).filter((a) => !archivedIds.has(a.id)));
      setArchived(archivedList);
      setStatus('ready');
    } catch (err) {
      setError(`Could not load articles: ${err.message}`);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (article, kind) => {
    const verb = kind === 'archive' ? 'Archive' : 'Restore';
    const msg =
      kind === 'archive'
        ? `Archive "${article.title}"? It will be hidden from every reader until restored.`
        : `Restore "${article.title}"? It will be visible to readers again.`;
    if (!window.confirm(msg)) return;
    setBusyId(article.id);
    setError('');
    try {
      const res = await fetch('/api/echo/admin/archive', {
        method: kind === 'archive' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      if (kind === 'archive') {
        setPublished((p) => p.filter((a) => a.id !== article.id));
        setArchived((a) => [{ ...article, archivedAt: new Date().toISOString() }, ...a]);
      } else {
        setArchived((a) => a.filter((x) => x.id !== article.id));
        setPublished((p) => [article, ...p]);
      }
    } catch (err) {
      setError(`${verb} failed: ${err.message}`);
    } finally {
      setBusyId(null);
    }
  };

  const list = view === 'published' ? published : archived;
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (a) =>
        a.title?.toLowerCase().includes(needle) ||
        a.id?.toLowerCase().includes(needle) ||
        a.category?.toLowerCase().includes(needle),
    );
  }, [list, q]);

  return (
    <>
      <LedgerRow
        idx="01"
        title="Echo articles"
        helper="Archive an article to take it off Ezana Echo for every reader. Restore it to publish it again. Nothing is deleted."
      >
        <div className="eal-toolbar">
          <LedgerSegmented
            value={view}
            onChange={setView}
            options={[
              { value: 'published', label: `Published (${published.length})` },
              { value: 'archived', label: `Archived (${archived.length})` },
            ]}
          />
          <label className="eal-search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              className="sl-input"
              placeholder="Search by title or section"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search articles"
            />
          </label>
        </div>

        {error ? (
          <p className="eal-error" role="alert">
            {error}
          </p>
        ) : null}

        {status === 'loading' ? (
          <p className="eal-empty">Loading articles…</p>
        ) : status === 'error' ? (
          <LedgerButton icon="bi-arrow-clockwise" onClick={load}>
            Try again
          </LedgerButton>
        ) : shown.length === 0 ? (
          <p className="eal-empty">
            {q ? 'No articles match that search.' : view === 'archived' ? 'Nothing is archived.' : 'No published articles.'}
          </p>
        ) : (
          <ul className="eal-list">
            {shown.map((a) => (
              <li key={a.id} className="eal-item">
                <div className="eal-item-text">
                  <Link href={`/ezana-echo/${a.id}`} className="eal-title" target="_blank">
                    {a.title}
                  </Link>
                  <span className="eal-meta">
                    {a.category ? <LedgerBadge variant="info">{a.category}</LedgerBadge> : null}
                    <span>
                      {view === 'archived'
                        ? `Archived ${fmtDate(a.archivedAt)}${a.archivedBy ? ` by ${a.archivedBy}` : ''}`
                        : `Published ${fmtDate(a.publishedAt)}`}
                    </span>
                  </span>
                </div>
                <LedgerButton
                  variant={view === 'archived' ? 'pri' : 'out'}
                  icon={
                    busyId === a.id
                      ? 'bi-hourglass-split'
                      : view === 'archived'
                        ? 'bi-arrow-counterclockwise'
                        : 'bi-archive'
                  }
                  disabled={busyId === a.id}
                  onClick={() => act(a, view === 'archived' ? 'restore' : 'archive')}
                >
                  {view === 'archived' ? 'Restore' : 'Archive'}
                </LedgerButton>
              </li>
            ))}
          </ul>
        )}
      </LedgerRow>
    </>
  );
}
