'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { ArticleEditor, WriterApplication } from '@/components/echo';
import '../partner.css';
import '../../ezana-echo/echo-publish.css';

const PUBLISHED_COURSES = [
  { id: 1, title: 'Options Trading Basics', students: 342, revenue: 1890, rating: 4.8, modules: 5, status: 'published', lastUpdated: 'Mar 10, 2026' },
  { id: 2, title: 'Congressional Trade Signals', students: 187, revenue: 980, rating: 4.9, modules: 4, status: 'published', lastUpdated: 'Feb 28, 2026' },
  { id: 3, title: 'Building a Dividend Portfolio', students: 124, revenue: 650, rating: 4.7, modules: 6, status: 'published', lastUpdated: 'Jan 15, 2026' },
];

const DRAFT_COURSES = [
  { id: 4, title: 'Advanced Options Strategies', modules: 3, modulesPlanned: 8, status: 'draft', progress: 37 },
  { id: 5, title: 'Crypto DeFi Masterclass', modules: 1, modulesPlanned: 6, status: 'draft', progress: 12 },
];

const CONTENT_STATS = {
  totalStudents: 653,
  totalRevenue: 3520,
  avgRating: 4.8,
  completionRate: 72,
  totalCourses: 3,
  drafts: 2,
};

const RECENT_REVIEWS = [
  { student: 'Alex M.', course: 'Options Trading Basics', rating: 5, text: 'Best options course I\'ve taken. The iron condor section alone was worth it.', time: '2 days ago' },
  { student: 'Sarah K.', course: 'Congressional Trade Signals', rating: 5, text: 'Eye-opening content. Changed how I look at insider trading data.', time: '5 days ago' },
  { student: 'David W.', course: 'Building a Dividend Portfolio', rating: 4, text: 'Great framework. Would love more on international dividend stocks.', time: '1 week ago' },
];

export default function PartnerLearningPage() {
  const [activeView, setActiveView] = useState('courses');
  const [echoArticles, setEchoArticles] = useState([]);
  const [editingArticle, setEditingArticle] = useState(null);
  const [isApprovedWriter, setIsApprovedWriter] = useState(false);
  const { user } = useAuth();

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const fetchWriterStatus = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch('/api/echo/writer-application', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setIsApprovedWriter(data.isApprovedWriter || false);
  }, [getToken]);

  useEffect(() => {
    if (activeView === 'echo' && user) {
      fetchEchoArticles();
      fetchWriterStatus();
    }
  }, [activeView, user, fetchEchoArticles, fetchWriterStatus]);

  const fetchEchoArticles = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch('/api/echo/articles?my=true', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setEchoArticles(data.articles || []);
  }, [getToken]);

  return (
    <div className="ptr-page">
      <div className="ptr-page-header">
        <h1 className="ptr-page-title">Content Studio</h1>
        <div className="ptr-page-header-right">
          <div className="ptr-tab-group">
            {[
              { key: 'courses', label: 'My Courses', icon: 'bi-journal-bookmark' },
              { key: 'echo', label: 'Ezana Echo', icon: 'bi-newspaper' },
              { key: 'analytics', label: 'Analytics', icon: 'bi-bar-chart' },
              { key: 'reviews', label: 'Reviews', icon: 'bi-star' },
            ].map((t) => (
              <button key={t.key} className={`ptr-tab ${activeView === t.key ? 'active' : ''}`} onClick={() => setActiveView(t.key)}>
                <i className={`bi ${t.icon}`} /> {t.label}
              </button>
            ))}
          </div>
          <button className="ptr-btn-primary"><i className="bi bi-plus-lg" /> Create Course</button>
        </div>
      </div>

      <div className="ptr-stats-row ptr-stats-compact">
        <div className="ptr-stat-mini"><span className="ptr-stat-mini-value">{CONTENT_STATS.totalStudents}</span><span className="ptr-stat-mini-label">Total Students</span></div>
        <div className="ptr-stat-mini"><span className="ptr-stat-mini-value">${CONTENT_STATS.totalRevenue.toLocaleString()}</span><span className="ptr-stat-mini-label">Course Revenue</span></div>
        <div className="ptr-stat-mini"><span className="ptr-stat-mini-value">{CONTENT_STATS.avgRating} ★</span><span className="ptr-stat-mini-label">Avg. Rating</span></div>
        <div className="ptr-stat-mini"><span className="ptr-stat-mini-value">{CONTENT_STATS.completionRate}%</span><span className="ptr-stat-mini-label">Completion Rate</span></div>
      </div>

      {activeView === 'courses' && (
        <>
          <div className="ptr-card">
            <div className="ptr-card-header">
              <h3>Published Courses</h3>
              <span className="ptr-card-count">{PUBLISHED_COURSES.length} courses</span>
            </div>
            <div className="ptr-course-list">
              {PUBLISHED_COURSES.map((c) => (
                <div key={c.id} className="ptr-course-item">
                  <div className="ptr-course-icon"><i className="bi bi-journal-bookmark-fill" /></div>
                  <div className="ptr-course-info">
                    <span className="ptr-course-title">{c.title}</span>
                    <span className="ptr-course-meta">{c.modules} modules · Updated {c.lastUpdated}</span>
                  </div>
                  <div className="ptr-course-stats-row">
                    <div className="ptr-course-stat"><span className="ptr-course-stat-val">{c.students}</span><span className="ptr-course-stat-lbl">Students</span></div>
                    <div className="ptr-course-stat"><span className="ptr-course-stat-val">${c.revenue.toLocaleString()}</span><span className="ptr-course-stat-lbl">Revenue</span></div>
                    <div className="ptr-course-stat"><span className="ptr-course-stat-val">{c.rating} ★</span><span className="ptr-course-stat-lbl">Rating</span></div>
                  </div>
                  <button className="ptr-btn-sm">Edit</button>
                </div>
              ))}
            </div>
          </div>

          <div className="ptr-card" style={{ marginTop: '1.25rem' }}>
            <div className="ptr-card-header">
              <h3>Drafts</h3>
              <span className="ptr-card-count">{DRAFT_COURSES.length} in progress</span>
            </div>
            <div className="ptr-course-list">
              {DRAFT_COURSES.map((c) => (
                <div key={c.id} className="ptr-course-item ptr-course-draft">
                  <div className="ptr-course-icon draft"><i className="bi bi-pencil-square" /></div>
                  <div className="ptr-course-info">
                    <span className="ptr-course-title">{c.title}</span>
                    <span className="ptr-course-meta">{c.modules}/{c.modulesPlanned} modules complete</span>
                  </div>
                  <div className="ptr-draft-progress">
                    <div className="ptr-draft-progress-bar"><div className="ptr-draft-progress-fill" style={{ width: `${c.progress}%` }} /></div>
                    <span className="ptr-draft-progress-pct">{c.progress}%</span>
                  </div>
                  <button className="ptr-btn-sm">Continue</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeView === 'echo' && (
        <div className="ptr-card" style={{ marginBottom: '1.25rem' }}>
          <div className="ptr-card-header">
            <h3>Ezana Echo</h3>
            <span className="ptr-card-count">{isApprovedWriter ? 'Write & publish articles' : 'Apply to become a writer'}</span>
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
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: '#8b949e' }}>Your Articles</h4>
                    {echoArticles.map((a) => (
                      <div key={a.id} className="ptr-course-item" style={{ marginBottom: '0.5rem' }}>
                        <div className="ptr-course-info">
                          <span className="ptr-course-title">{a.article_title}</span>
                          <span className="ptr-course-meta">
                            {a.article_category} · <span className={`echo-status-badge echo-status-${a.article_status}`}>{a.article_status}</span>
                          </span>
                        </div>
                        <button className="ptr-btn-sm" onClick={() => setEditingArticle(a)}>Edit</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeView === 'reviews' && (
        <div className="ptr-card">
          <div className="ptr-card-header"><h3>Recent Reviews</h3></div>
          {RECENT_REVIEWS.map((r, i) => (
            <div key={i} className="ptr-review-item">
              <div className="ptr-review-header">
                <div className="ptr-review-avatar">{r.student[0]}</div>
                <div>
                  <span className="ptr-review-name">{r.student}</span>
                  <span className="ptr-review-course">{r.course}</span>
                </div>
                <div className="ptr-review-rating">
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                </div>
              </div>
              <p className="ptr-review-text">{r.text}</p>
              <span className="ptr-review-time">{r.time}</span>
            </div>
          ))}
        </div>
      )}

      {activeView === 'analytics' && (
        <div className="ptr-analytics-grid">
          <div className="ptr-card ptr-analytics-card">
            <h4>Revenue by Course</h4>
            {PUBLISHED_COURSES.map((c) => (
              <div key={c.id} className="ptr-analytics-bar-row">
                <span className="ptr-analytics-bar-label">{c.title}</span>
                <div className="ptr-analytics-bar-track">
                  <div className="ptr-analytics-bar-fill" style={{ width: `${(c.revenue / CONTENT_STATS.totalRevenue) * 100}%` }} />
                </div>
                <span className="ptr-analytics-bar-val">${c.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="ptr-card ptr-analytics-card">
            <h4>Students by Course</h4>
            {PUBLISHED_COURSES.map((c) => (
              <div key={c.id} className="ptr-analytics-bar-row">
                <span className="ptr-analytics-bar-label">{c.title}</span>
                <div className="ptr-analytics-bar-track">
                  <div className="ptr-analytics-bar-fill blue" style={{ width: `${(c.students / CONTENT_STATS.totalStudents) * 100}%` }} />
                </div>
                <span className="ptr-analytics-bar-val">{c.students}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
