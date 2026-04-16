'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getCourseById, getLevelLabel, TRACKS } from '@/lib/learning-curriculum';
import { getOrderedCoursesForTrack } from '@/lib/learning-progress-logic';
import CourseVisual from './visuals/CourseVisual';

export function LearningCoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId;
  const startedRef = useRef(false);

  const [payload, setPayload] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [readAck, setReadAck] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [sectionCompleted, setSectionCompleted] = useState({});
  const [quizMode, setQuizMode] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/learning/courses/${courseId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setPayload(json);
      if (json.progress?.reading_complete) setReadAck(true);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!payload?.unlocked || startedRef.current) return;
    if (payload.progress) {
      startedRef.current = true;
      return;
    }
    startedRef.current = true;
    fetch('/api/learning/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, action: 'start' }),
    }).then(() => load());
  }, [payload, courseId, load]);

  const course = getCourseById(courseId);
  const content = payload?.content;
  const progress = payload?.progress;

  useEffect(() => {
    const quizLen = content?.quiz?.length || 0;
    if (quizLen > 0 && answers.length !== quizLen) {
      setAnswers(new Array(quizLen).fill(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.quiz?.length]);

  useEffect(() => {
    const n = content?.sections?.length ?? 0;
    if (n > 0 && progress?.reading_complete) {
      setReadAck(true);
      setSectionCompleted(Object.fromEntries(Array.from({ length: n }, (_, i) => [i, true])));
      setCurrentSection(Math.max(0, n - 1));
    }
  }, [content?.sections?.length, progress?.reading_complete]);

  const trackLabel = TRACKS.find((t) => t.id === course?.track)?.label || 'Track';
  const ordered = course ? getOrderedCoursesForTrack(course.track, course.level) : [];
  const pos = course ? ordered.findIndex((c) => c.id === course.id) + 1 : 0;

  const goNextCourse = () => {
    const nextIdx = pos;
    const next = ordered[nextIdx];
    if (next) router.push(`/learning-center/course/${next.id}`);
    else router.push('/learning-center');
  };

  const onReadingDone = async () => {
    if (!readAck || progress?.reading_complete) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/learning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, action: 'reading_done' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitQuiz = async () => {
    if (answers.some((a) => a === null || a === undefined)) {
      setErr('Answer all questions');
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch('/api/learning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, action: 'quiz_submit', answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setResult(json);
      setQuizMode(false);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !payload) {
    return (
      <div className="lc3-page dashboard-page-inset db-page">
        <p className="lc3-muted">Loading…</p>
      </div>
    );
  }

  if (!course || err === 'Course not found') {
    return (
      <div className="lc3-page dashboard-page-inset db-page">
        <p>Course not found.</p>
        <Link href="/learning-center">Back to Learning Center</Link>
      </div>
    );
  }

  if (payload && !payload.unlocked) {
    return (
      <div className="lc3-page dashboard-page-inset db-page">
        <Link href="/learning-center" className="lc3-back">
          ← Back to Learning Center
        </Link>
        <h1 className="lc3-title">{course.title}</h1>
        <p style={{ color: '#f87171' }}>{payload.unlockReason || 'This course is locked.'}</p>
      </div>
    );
  }

  const pct = progress?.progress_pct ?? 0;
  const quiz = content?.quiz || [];
  const quizLen = quiz.length;
  const quizPassed = progress?.quiz_passed === true;

  const currentQuestion = quiz[qIdx];
  const currentAnswer = answers[qIdx];
  const isLastQuestion = qIdx === quizLen - 1;
  const isCorrect = confirmed && currentAnswer === currentQuestion?.correctIndex;
  const quizProgressPct = quizLen > 0 ? Math.round(((qIdx + (confirmed ? 1 : 0)) / quizLen) * 100) : 0;

  const handleOptionPick = (optionIndex) => {
    if (confirmed) return;
    const next = [...answers];
    next[qIdx] = optionIndex;
    setAnswers(next);
    setConfirmed(true);
  };

  const handleNextQuestion = () => {
    setConfirmed(false);
    setQIdx((i) => i + 1);
  };

  const handleRetakeQuiz = () => {
    setResult(null);
    setAnswers(new Array(quizLen).fill(null));
    setQIdx(0);
    setConfirmed(false);
    setQuizMode(true);
  };

  return (
    <div className="lc3-page dashboard-page-inset db-page">
      <Link href="/learning-center" className="lc3-back">
        ← Back to Learning Center
      </Link>

      <p className="lc3-breadcrumb">
        {TRACKS.find((t) => t.id === course.track)?.icon} {trackLabel} &gt; {getLevelLabel(course.level)} &gt; Course{' '}
        {pos} of {ordered.length}
      </p>
      <h1 className="lc3-title">{course.title}</h1>
      <p className="lc3-meta">
        Duration: {course.duration_minutes} min · Progress:{' '}
        <span className="lc3-pct">{pct}%</span>
      </p>
      <div className="lc3-bar">
        <div className="lc3-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      {quizPassed && !result && (
        <div className="lc3-banner">
          ✅ Course completed · Quiz {progress.quiz_score}%
          <button type="button" className="lc3-btn lc3-btn-primary" onClick={goNextCourse}>
            Next course →
          </button>
        </div>
      )}

      {!quizMode && !result && (
        <article className="lc3-article db-card">
          {content?.sections?.length > 0 ? (
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ width: '220px', flexShrink: 0 }}>
                {content.sections.map((sec, i) => {
                  const canOpen = i <= currentSection || (i > 0 && sectionCompleted[i - 1]);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (canOpen) setCurrentSection(i);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        border: 'none',
                        borderLeft: i === currentSection ? '3px solid #10b981' : '3px solid transparent',
                        background: i === currentSection ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                        color:
                          i === currentSection
                            ? '#10b981'
                            : sectionCompleted[i]
                              ? 'var(--text-primary, #f0f6fc)'
                              : '#6b7280',
                        fontSize: '0.8125rem',
                        fontWeight: i === currentSection ? 700 : 500,
                        textAlign: 'left',
                        cursor: canOpen ? 'pointer' : 'not-allowed',
                        opacity: canOpen ? 1 : 0.5,
                        borderRadius: '0 6px 6px 0',
                        transition: 'all 0.15s',
                        marginBottom: 4,
                      }}
                    >
                      {sectionCompleted[i] ? (
                        <i className="bi bi-check-circle-fill" style={{ color: '#10b981' }} />
                      ) : (
                        <span
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: `2px solid ${i === currentSection ? '#10b981' : '#4b5563'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.625rem',
                            fontWeight: 700,
                          }}
                        >
                          {i + 1}
                        </span>
                      )}
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sec.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {content.sections[currentSection] && (
                  <section className="lc3-section">
                    <h2 className="lc3-h2">{content.sections[currentSection].title}</h2>
                    <div className="lc3-body">{content.sections[currentSection].content}</div>
                    {content.sections[currentSection].visual && (
                      <CourseVisual
                        type={content.sections[currentSection].visual.type}
                        data={content.sections[currentSection].visual.data}
                        caption={content.sections[currentSection].visual.caption}
                      />
                    )}
                    {content.sections[currentSection].callout && (
                      <div className="lc3-callout">{content.sections[currentSection].callout}</div>
                    )}
                    {content.sections[currentSection].keyTerms?.length > 0 && (
                      <div className="lc3-terms">
                        <strong>Key terms:</strong> {content.sections[currentSection].keyTerms.join(', ')}
                      </div>
                    )}

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                      {currentSection < content.sections.length - 1 ? (
                        <button
                          type="button"
                          className="lc3-btn lc3-btn-primary"
                          onClick={() => {
                            setSectionCompleted((prev) => ({ ...prev, [currentSection]: true }));
                            setCurrentSection((prev) => prev + 1);
                          }}
                        >
                          Continue to next section →
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="lc3-btn lc3-btn-primary"
                          onClick={() => {
                            setSectionCompleted((prev) => ({ ...prev, [currentSection]: true }));
                            setReadAck(true);
                          }}
                        >
                          Complete reading ✓
                        </button>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </div>
          ) : (
            <p className="lc3-muted">No sections for this course.</p>
          )}

          {!quizPassed && (
            <>
              {readAck && !progress?.reading_complete && (
                <div className="lc3-read-row" style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="lc3-btn lc3-btn-primary"
                    disabled={submitting}
                    onClick={onReadingDone}
                  >
                    {progress?.reading_complete ? 'Reading complete ✓' : 'Confirm & unlock quiz'}
                  </button>
                </div>
              )}

              {progress?.reading_complete && (
                <button
                  type="button"
                  className="lc3-btn lc3-btn-primary"
                  style={{ marginTop: '0.75rem' }}
                  onClick={() => {
                    setQuizMode(true);
                    setQIdx(0);
                    setConfirmed(false);
                    setAnswers(new Array(quizLen).fill(null));
                  }}
                  data-task-target="learning-quiz-button"
                >
                  Take Quiz →
                </button>
              )}
            </>
          )}
        </article>
      )}

      {quizMode && currentQuestion && (
        <div className="lc3-quiz db-card">
          <h2 className="lc3-h2">
            Quiz: {course.title} ({qIdx + 1} of {quizLen})
          </h2>

          <div className="lc3-quiz-progress-wrap">
            <div className="lc3-quiz-progress-label">
              <span>
                Question {qIdx + 1} / {quizLen}
              </span>
              <span>{quizProgressPct}% complete</span>
            </div>
            <div className="lc3-quiz-progress-track">
              <div className="lc3-quiz-progress-fill" style={{ width: `${quizProgressPct}%` }} />
            </div>
          </div>

          <p className="lc3-qtext">{currentQuestion.question}</p>
          <div className="lc3-options">
            {currentQuestion.options?.map((opt, oi) => {
              let cls = 'lc3-opt';
              if (currentAnswer === oi && !confirmed) cls += ' sel';
              if (confirmed) {
                cls += ' locked';
                if (oi === currentQuestion.correctIndex) cls += ' correct';
                else if (oi === currentAnswer) cls += ' incorrect';
              }
              return (
                <label key={oi} className={cls}>
                  <input
                    type="radio"
                    name={`q-${qIdx}`}
                    checked={currentAnswer === oi}
                    disabled={confirmed}
                    onChange={() => handleOptionPick(oi)}
                  />
                  <span style={{ flex: 1 }}>{opt}</span>
                  {confirmed && oi === currentQuestion.correctIndex && (
                    <span className="lc3-opt-mark" style={{ color: '#10b981' }}>
                      ✓
                    </span>
                  )}
                  {confirmed && oi === currentAnswer && oi !== currentQuestion.correctIndex && (
                    <span className="lc3-opt-mark" style={{ color: '#ef4444' }}>
                      ✗
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {confirmed && (
            <div className={`lc3-feedback ${isCorrect ? 'right' : 'wrong'}`}>
              <span className="lc3-feedback-icon">{isCorrect ? '✓' : '✗'}</span>
              <div className="lc3-feedback-text">
                <strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong>
                {currentQuestion.explanation}
              </div>
            </div>
          )}

          <div className="lc3-quiz-actions">
            {!isLastQuestion ? (
              <button
                type="button"
                className="lc3-btn lc3-btn-primary"
                disabled={!confirmed}
                onClick={handleNextQuestion}
              >
                Next question →
              </button>
            ) : (
              <button
                type="button"
                className="lc3-btn lc3-btn-primary"
                data-task-target="learning-quiz-button"
                disabled={!confirmed || submitting}
                onClick={submitQuiz}
              >
                {submitting ? 'Submitting…' : 'Submit quiz'}
              </button>
            )}
          </div>
          <button
            type="button"
            className="lc3-link"
            onClick={() => {
              setQuizMode(false);
              setConfirmed(false);
              setQIdx(0);
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {result && (
        <div className="lc3-results db-card">
          <h2 className="lc3-h2">Quiz Results</h2>
          <p className={result.passed ? 'lc3-pass' : 'lc3-fail'}>
            Score: {result.correct}/{result.total} ({result.scorePct}%) {result.passed ? '✅ Passed' : '❌ Not passed'}
          </p>
          <p className="lc3-muted">Passing score: {result.passThreshold}%</p>

          <div className="lc3-results-chart">
            <div className="lc3-results-chart-title">Performance Summary</div>
            <div className="lc3-results-ring">
              <ResultsRing correct={result.correct} total={result.total} />
              <div className="lc3-results-stats">
                <div className="lc3-results-stat-row">
                  <span className="lc3-results-stat-dot right" />
                  <span className="lc3-results-stat-label">Correct answers</span>
                  <span className="lc3-results-stat-value">{result.correct}</span>
                </div>
                <div className="lc3-results-stat-row">
                  <span className="lc3-results-stat-dot wrong" />
                  <span className="lc3-results-stat-label">Incorrect answers</span>
                  <span className="lc3-results-stat-value">{result.total - result.correct}</span>
                </div>
                <div className="lc3-results-stat-row">
                  <span className="lc3-results-stat-label" style={{ marginLeft: '18px' }}>
                    Final score
                  </span>
                  <span className="lc3-results-stat-value">{result.scorePct}%</span>
                </div>
              </div>
            </div>
          </div>

          <ul className="lc3-review">
            {result.quiz?.map((q, i) => {
              const ok = Number(answers[i]) === q.correctIndex;
              return (
                <li key={i} className={ok ? 'ok' : 'bad'}>
                  {ok ? '✅' : '❌'} Q{i + 1}: {ok ? 'Correct' : `Incorrect — ${q.explanation}`}
                </li>
              );
            })}
          </ul>
          <div className="lc3-results-actions">
            {result.passed ? (
              <button type="button" className="lc3-btn lc3-btn-primary" onClick={goNextCourse}>
                Continue to next course →
              </button>
            ) : (
              <>
                <Link href="/learning-center" className="lc3-btn">
                  Review Learning Center
                </Link>
                <button type="button" className="lc3-btn lc3-btn-primary" onClick={handleRetakeQuiz}>
                  Retake quiz
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {err && err !== 'Course not found' && (
        <p style={{ color: '#f87171', marginTop: '1rem' }}>{err}</p>
      )}
    </div>
  );
}

function ResultsRing({ correct, total }) {
  const size = 120;
  const cx = 60;
  const cy = 60;
  const outerR = 50;
  const innerR = 34;
  const pct = total > 0 ? correct / total : 0;

  const correctAngle = pct * 2 * Math.PI;
  const startAngle = -Math.PI / 2;
  const correctEnd = startAngle + correctAngle;

  const arcPath = (start, end, color) => {
    const x1 = cx + outerR * Math.cos(start);
    const y1 = cy + outerR * Math.sin(start);
    const x2 = cx + outerR * Math.cos(end);
    const y2 = cy + outerR * Math.sin(end);
    const x3 = cx + innerR * Math.cos(end);
    const y3 = cy + innerR * Math.sin(end);
    const x4 = cx + innerR * Math.cos(start);
    const y4 = cy + innerR * Math.sin(start);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return (
      <path
        d={`M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`}
        fill={color}
      />
    );
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={cx} cy={cy} r={outerR} fill="#ef4444" />
      {correct > 0 && arcPath(startAngle, correctEnd, '#10b981')}
      <circle cx={cx} cy={cy} r={innerR} fill="var(--db-card-bg, #ffffff)" />
      <text
        x={cx}
        y={cy + 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="22"
        fontWeight="700"
        fill="currentColor"
      >
        {Math.round(pct * 100)}%
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.6">
        score
      </text>
    </svg>
  );
}
