'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getCourse } from '@/lib/courses';
import { useChecklist } from '@/hooks/useChecklist';
import './course-detail.css';

export default function CourseDetailPage() {
  const params = useParams();
  const { completeTask } = useChecklist();
  const course = getCourse(params.courseId);

  const [activeTab, setActiveTab] = useState('description');
  const [activeLesson, setActiveLesson] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [completedLessons, setCompletedLessons] = useState({});
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState({});

  useEffect(() => {
    if (!course) return;
    const saved = localStorage.getItem(`ezana-course-${course.id}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setCompletedLessons(data.completed || {});
      } catch {}
    }
    if (course.modules.length > 0) {
      setExpandedModules({ [course.modules[0].id]: true });
    }
  }, [course]);

  useEffect(() => {
    if (!course) return;
    localStorage.setItem(`ezana-course-${course.id}`, JSON.stringify({ completed: completedLessons }));
  }, [completedLessons, course]);

  const totalLessons = useMemo(() => {
    if (!course) return 0;
    return course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  }, [course]);

  const completedCount = Object.values(completedLessons).filter(Boolean).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  if (!course) {
    return (
      <div className="cd-page">
        <div className="cd-not-found">
          <i className="bi bi-journal-x" />
          <h2>Course Not Found</h2>
          <p>This course does not exist or has been removed.</p>
          <Link href="/learning-center" className="cd-btn-primary">Back to Learning Center</Link>
        </div>
      </div>
    );
  }

  const toggleModule = (modId) => {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const [showModuleCelebration, setShowModuleCelebration] = useState(null);
  const [show100Overlay, setShow100Overlay] = useState(false);

  const markComplete = (lessonId) => {
    setCompletedLessons((prev) => {
      const next = { ...prev, [lessonId]: true };
      const mod = course?.modules.find((m) => m.lessons.some((l) => l.id === lessonId));
      if (mod) {
        const done = mod.lessons.filter((l) => next[l.id]).length;
        if (done === mod.lessons.length) setShowModuleCelebration(mod.title);
      }
      const total = course?.modules.reduce((s, m) => s + m.lessons.length, 0) || 0;
      const completed = Object.values(next).filter(Boolean).length;
      if (total > 0 && completed === total) setTimeout(() => setShow100Overlay(true), 400);
      return next;
    });
  };

  const selectLesson = (lesson) => {
    setActiveLesson(lesson);
    setActiveTab('description');
    markComplete(lesson.id);
    if (lesson.type === 'quiz' && !quizSubmitted[lesson.id]) {
      setQuizAnswers({});
    }
  };

  const handleQuizAnswer = (qIdx, optIdx) => {
    if (quizSubmitted[activeLesson?.id]) return;
    setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const submitQuiz = () => {
    if (!activeLesson) return;
    setQuizSubmitted((prev) => ({ ...prev, [activeLesson.id]: true }));
    markComplete(activeLesson.id);
    completeTask('learning_2');
  };

  const getModuleProgress = (mod) => {
    const done = mod.lessons.filter((l) => completedLessons[l.id]).length;
    return { done, total: mod.lessons.length };
  };

  const goToNextLesson = () => {
    for (const mod of course.modules) {
      for (const les of mod.lessons) {
        if (!completedLessons[les.id]) {
          selectLesson(les);
          setExpandedModules((prev) => ({ ...prev, [mod.id]: true }));
          return;
        }
      }
    }
  };

  return (
    <div className="cd-page">
      {showModuleCelebration && (
        <div className="cd-module-celebration" role="alert">
          <i className="bi bi-trophy-fill" />
          <span>Module complete: {showModuleCelebration}</span>
          <button type="button" onClick={() => setShowModuleCelebration(null)}><i className="bi bi-x" /></button>
        </div>
      )}
      {show100Overlay && (
        <div className="cd-100-overlay">
          <div className="cd-100-content">
            <i className="bi bi-stars" />
            <h2>Course Complete!</h2>
            <p>Congratulations on finishing {course.title}</p>
            <button type="button" className="cd-btn-primary" onClick={() => setShow100Overlay(false)}>Continue</button>
          </div>
        </div>
      )}
      <div className="cd-header">
        <div className="cd-header-inner">
          <div className="cd-header-left">
            <Link href="/learning-center" className="cd-back-link">
              <i className="bi bi-arrow-left" /> Learning Center
            </Link>
            <span className="cd-category-badge">{course.category}</span>
            <h1 className="cd-title">{course.title}</h1>
            <p className="cd-subtitle">{course.subtitle}</p>
            <div className="cd-meta">
              <span>Release Date <strong>{course.releaseDate}</strong></span>
              <span className="cd-meta-dot">·</span>
              <span>Last Updated <strong>{course.lastUpdated}</strong></span>
            </div>
          </div>
          <div className="cd-header-right">
            <div className="cd-instructor">
              <div className="cd-instructor-avatar">
                <i className="bi bi-person-fill" />
              </div>
              <div>
                <div className="cd-instructor-label">Instructor</div>
                <div className="cd-instructor-name">{course.instructor.name}</div>
                <div className="cd-instructor-role">{course.instructor.role}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="cd-stats-bar">
          <div className="cd-stat">
            <span className="cd-stat-label">Modules</span>
            <span className="cd-stat-value">{course.stats.modules} Modules</span>
          </div>
          <div className="cd-stat">
            <span className="cd-stat-label">Materials</span>
            <span className="cd-stat-value">{course.stats.materials} Materials</span>
          </div>
          <div className="cd-stat">
            <span className="cd-stat-label">Total Duration</span>
            <span className="cd-stat-value">{course.stats.duration}</span>
          </div>
          <div className="cd-stat">
            <span className="cd-stat-label">Quizzes</span>
            <span className="cd-stat-value">{course.stats.quizzes} Quizzes</span>
          </div>
          <button className="cd-learning-report-btn" onClick={() => setActiveTab('progress')}>
            <i className="bi bi-bar-chart-line" /> Learning Report
          </button>
        </div>
      </div>

      <div className="cd-body">
        <aside className="cd-sidebar">
          <div className="cd-progress-summary">
            <div className="cd-progress-ring-wrap">
              <svg viewBox="0 0 80 80" className="cd-progress-ring">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth="6" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="#10b981" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPercent / 100)}`}
                  transform="rotate(-90 40 40)"
                />
              </svg>
              <span className="cd-progress-percent">{progressPercent}%</span>
            </div>
            <div className="cd-progress-text">
              <span className="cd-progress-done">{completedCount}/{totalLessons} Completed</span>
              <span className="cd-progress-status">
                {progressPercent === 100 ? 'Completed!' : progressPercent > 0 ? 'In Progress' : 'Not Started'}
              </span>
            </div>
          </div>
          <div className="cd-sidebar-tabs">
            <button className={`cd-sidebar-tab ${activeTab === 'description' ? 'active' : ''}`} onClick={() => setActiveTab('description')}>
              <i className="bi bi-journal-text" /> Course Content
            </button>
            <button className={`cd-sidebar-tab ${activeTab === 'progress' ? 'active' : ''}`} onClick={() => setActiveTab('progress')}>
              <i className="bi bi-graph-up" /> Course Progress
            </button>
          </div>
          <div className="cd-module-list">
            {course.modules.map((mod, modIdx) => {
              const prog = getModuleProgress(mod);
              const isExpanded = expandedModules[mod.id];
              return (
                <div key={mod.id} className="cd-module">
                  <button className="cd-module-header" onClick={() => toggleModule(mod.id)}>
                    <div className="cd-module-info">
                      <span className="cd-module-label">Module {modIdx + 1}</span>
                      <span className="cd-module-title">{mod.title}</span>
                      <span className="cd-module-progress-text">{prog.done}/{prog.total} Done</span>
                    </div>
                    <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} cd-module-chevron`} />
                  </button>
                  {isExpanded && (
                    <div className="cd-lesson-list">
                      {mod.lessons.map((les) => {
                        const isActive = activeLesson?.id === les.id;
                        const isDone = completedLessons[les.id];
                        return (
                          <button
                            key={les.id}
                            className={`cd-lesson-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                            onClick={() => selectLesson(les)}
                          >
                            <div className={`cd-lesson-icon ${les.type}`}>
                              <i className={`bi ${les.type === 'quiz' ? 'bi-question-circle' : les.type === 'video' ? 'bi-play-circle' : 'bi-file-text'}`} />
                            </div>
                            <div className="cd-lesson-info">
                              <span className="cd-lesson-title">{les.title}</span>
                              <span className="cd-lesson-duration">{les.duration}</span>
                            </div>
                            {isDone && <i className="bi bi-check-circle-fill cd-lesson-check" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <main className="cd-content">
          {activeLesson && activeTab !== 'progress' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
              <button type="button" className="cd-btn-secondary" onClick={() => completeTask('learning_3')}>
                <i className="bi bi-bookmark-plus" /> Bookmark lesson
              </button>
            </div>
          )}
          {activeTab === 'progress' ? (
            <div className="cd-progress-report">
              <h2 className="cd-content-title">Learning Report</h2>
              <div className="cd-report-grid">
                <div className="cd-report-card">
                  <div className="cd-report-card-value">{progressPercent}%</div>
                  <div className="cd-report-card-label">Overall Progress</div>
                  <div className="cd-report-bar"><div className="cd-report-bar-fill" style={{ width: `${progressPercent}%` }} /></div>
                </div>
                <div className="cd-report-card">
                  <div className="cd-report-card-value">{completedCount}</div>
                  <div className="cd-report-card-label">Lessons Completed</div>
                </div>
                <div className="cd-report-card">
                  <div className="cd-report-card-value">{totalLessons - completedCount}</div>
                  <div className="cd-report-card-label">Lessons Remaining</div>
                </div>
                <div className="cd-report-card">
                  <div className="cd-report-card-value">{Object.keys(quizSubmitted).length}/{course.stats.quizzes}</div>
                  <div className="cd-report-card-label">Quizzes Passed</div>
                </div>
              </div>
              <h3 className="cd-report-section-title">Module Breakdown</h3>
              {course.modules.map((mod, i) => {
                const prog = getModuleProgress(mod);
                const pct = Math.round((prog.done / prog.total) * 100);
                return (
                  <div key={mod.id} className="cd-report-module">
                    <div className="cd-report-module-header">
                      <span>Module {i + 1}: {mod.title}</span>
                      <span className="cd-report-module-pct">{pct}%</span>
                    </div>
                    <div className="cd-report-bar"><div className="cd-report-bar-fill" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
              {progressPercent < 100 && (
                <button className="cd-btn-primary" onClick={goToNextLesson} style={{ marginTop: '1.5rem' }}>
                  Continue Learning <i className="bi bi-arrow-right" />
                </button>
              )}
            </div>
          ) : !activeLesson ? (
            <div className="cd-description">
              <h2 className="cd-content-title">Course Description</h2>
              <div className="cd-period-card">
                <i className="bi bi-calendar3" />
                <div>
                  <strong>Course Period</strong>
                  <span>{course.period.start} — {course.period.end}</span>
                </div>
              </div>
              <p className="cd-description-text">{course.description}</p>
              <h3 className="cd-content-subtitle">What You&apos;ll Learn</h3>
              <div className="cd-learn-grid">
                {course.modules.map((mod) => (
                  <div key={mod.id} className="cd-learn-item">
                    <i className="bi bi-check-circle-fill" />
                    <span>{mod.title}</span>
                  </div>
                ))}
              </div>
              <button className="cd-btn-primary" onClick={goToNextLesson} style={{ marginTop: '2rem' }}>
                {completedCount > 0 ? 'Continue Learning' : 'Start Course'} <i className="bi bi-arrow-right" />
              </button>
            </div>
          ) : activeLesson.type === 'quiz' ? (
            <div className="cd-quiz">
              <h2 className="cd-content-title">
                <i className="bi bi-question-circle" style={{ color: '#fbbf24', marginRight: '0.5rem' }} />
                {activeLesson.title}
              </h2>
              <div className="cd-quiz-questions">
                {activeLesson.questions.map((q, qIdx) => {
                  const submitted = quizSubmitted[activeLesson.id];
                  const userAnswer = quizAnswers[qIdx];
                  return (
                    <div key={qIdx} className="cd-quiz-question">
                      <div className="cd-quiz-q-label">Question {qIdx + 1}</div>
                      <div className="cd-quiz-q-text">{q.q}</div>
                      <div className="cd-quiz-options">
                        {q.options.map((opt, optIdx) => {
                          let optClass = '';
                          if (submitted) {
                            if (optIdx === q.answer) optClass = 'correct';
                            else if (optIdx === userAnswer && userAnswer !== q.answer) optClass = 'wrong';
                          } else if (userAnswer === optIdx) optClass = 'selected';
                          return (
                            <button
                              key={optIdx}
                              className={`cd-quiz-option ${optClass}`}
                              onClick={() => handleQuizAnswer(qIdx, optIdx)}
                              disabled={submitted}
                            >
                              <span className="cd-quiz-option-letter">{String.fromCharCode(65 + optIdx)}</span>
                              <span>{opt}</span>
                              {submitted && optIdx === q.answer && <i className="bi bi-check-circle-fill" style={{ marginLeft: 'auto', color: '#10b981' }} />}
                              {submitted && optIdx === userAnswer && userAnswer !== q.answer && <i className="bi bi-x-circle-fill" style={{ marginLeft: 'auto', color: '#ef4444' }} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {!quizSubmitted[activeLesson.id] ? (
                <button
                  className="cd-btn-primary"
                  onClick={submitQuiz}
                  disabled={Object.keys(quizAnswers).length < activeLesson.questions.length}
                  style={{ marginTop: '1.5rem' }}
                >
                  Submit Quiz
                </button>
              ) : (
                <div className="cd-quiz-result">
                  <i className="bi bi-trophy-fill" />
                  <span>Quiz completed! {activeLesson.questions.filter((q, i) => quizAnswers[i] === q.answer).length}/{activeLesson.questions.length} correct.</span>
                  <button className="cd-btn-secondary" onClick={goToNextLesson}>
                    Next Lesson <i className="bi bi-arrow-right" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="cd-lesson-view">
              <h2 className="cd-content-title">{activeLesson.title}</h2>
              <div className="cd-lesson-type-badge">
                <i className={`bi ${activeLesson.type === 'video' ? 'bi-play-circle' : 'bi-file-text'}`} />
                {activeLesson.type === 'video' ? 'Video Lesson' : 'Reading Material'}
                <span className="cd-lesson-type-duration">{activeLesson.duration}</span>
              </div>
              {activeLesson.type === 'video' && (
                <div className="cd-video-player">
                  <div className="cd-video-placeholder">
                    <i className="bi bi-play-circle-fill" />
                    <span>Video Player</span>
                    <span className="cd-video-duration">{activeLesson.duration}</span>
                  </div>
                </div>
              )}
              <div className="cd-lesson-content">
                <p>{activeLesson.content}</p>
              </div>
              <div className="cd-lesson-nav">
                {!completedLessons[activeLesson.id] && (
                  <button className="cd-btn-primary" onClick={() => markComplete(activeLesson.id)}>
                    <i className="bi bi-check-circle" /> Mark as Complete
                  </button>
                )}
                <button className="cd-btn-secondary" onClick={goToNextLesson}>
                  Next Lesson <i className="bi bi-arrow-right" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
