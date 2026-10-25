'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase-browser';
import { ArticleEditor, WriterApplication } from '@/components/echo';
import { CreatorVideoStudio } from '@/components/learning/video/CreatorVideoStudio';
import { PartnerPreviewEmpty } from '@/components/partner/PartnerPreviewEmpty';
import '../partner.css';
import '../ezana-echo/echo-publish.css';

/* QA PAR-12: course authoring is not built yet. The old sample courses,
   revenue, ratings, reviews and their dead Create/Edit/Continue buttons are
   replaced by one honest "Courses: coming soon" state. Videos and Ezana Echo
   are real and unchanged. */

export default function PartnerLearningPage() {
  const [activeView, setActiveView] = useState('courses');
  const [echoArticles, setEchoArticles] = useState([]);
  const [editingArticle, setEditingArticle] = useState(null);
  const [isApprovedWriter, setIsApprovedWriter] = useState(false);
  const { user } = useAuth();

  const getToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const fetchEchoArticles = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch('/api/echo/articles?my=true', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setEchoArticles(data.articles || []);
  }, [getToken]);

  const fetchWriterStatus = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch('/api/echo/writer-application', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setIsApprovedWriter(data.isApprovedWriter || false);
  }, [getToken]);

  useEffect(() => {
    if (activeView === 'echo' && user) {
      fetchEchoArticles();
      fetchWriterStatus();
    }
  }, [activeView, user, fetchEchoArticles, fetchWriterStatus]);

  return (
    <div className="ptr-page">
      <div className="ptr-page-header">
        <h1 className="ptr-page-title">Creator Studio</h1>
        <div className="ptr-page-header-right">
          <div className="ptr-tab-group" role="tablist" aria-label="Creator Studio sections">
            {[
              { key: 'courses', label: 'My Courses', icon: 'bi-journal-bookmark' },
              { key: 'videos', label: 'Videos', icon: 'bi-camera-video' },
              { key: 'echo', label: 'Ezana Echo', icon: 'bi-newspaper' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={activeView === t.key}
                className={`ptr-tab ${activeView === t.key ? 'active' : ''}`}
                onClick={() => setActiveView(t.key)}
              >
                <i className={`bi ${t.icon}`} aria-hidden="true" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeView === 'videos' && (
        <div className="ptr-content-area">
          <div className="ptr-card" style={{ padding: 20 }}>
            <CreatorVideoStudio />
          </div>
        </div>
      )}

      {activeView === 'courses' && (
        <div className="ptr-card">
          <div className="ptr-card-header">
            <h3>My Courses</h3>
          </div>
          <PartnerPreviewEmpty icon="bi-journal-bookmark" title="Courses: coming soon">
            Building, publishing and selling courses is on the way. Until then you can publish
            videos and Ezana Echo articles from the other tabs.
          </PartnerPreviewEmpty>
        </div>
      )}

      {activeView === 'echo' && (
        <div className="ptr-card" style={{ marginBottom: '1.25rem' }}>
          <div className="ptr-card-header">
            <h3>Ezana Echo</h3>
            <span className="ptr-card-count">
              {isApprovedWriter ? 'Write & publish articles' : 'Apply to become a writer'}
            </span>
          </div>
          <div className="ptr-echo-section">
            {!isApprovedWriter ? (
              <WriterApplication getToken={getToken} />
            ) : (
              <>
                <ArticleEditor
                  getToken={getToken}
                  editingArticle={editingArticle}
                  onSaved={() => {
                    setEditingArticle(null);
                    fetchEchoArticles();
                  }}
                />
                {echoArticles.length > 0 && (
                  <div className="ptr-echo-articles-list" style={{ marginTop: '1.5rem' }}>
                    <h4
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        marginBottom: '0.75rem',
                        color: '#8b949e',
                      }}
                    >
                      Your Articles
                    </h4>
                    {echoArticles.map((a) => (
                      <div
                        key={a.id}
                        className="ptr-course-item"
                        style={{ marginBottom: '0.5rem' }}
                      >
                        <div className="ptr-course-info">
                          <span className="ptr-course-title">{a.article_title}</span>
                          <span className="ptr-course-meta">
                            {a.article_category} ·{' '}
                            <span className={`echo-status-badge echo-status-${a.article_status}`}>
                              {a.article_status}
                            </span>
                          </span>
                        </div>
                        <button className="ptr-btn-sm" onClick={() => setEditingArticle(a)}>
                          Edit
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
