'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getCourseById, getLevelLabel, TRACKS } from '@/lib/learning-curriculum';
import { getOrderedCoursesForTrack } from '@/lib/learning-progress-logic';

export function LearningCoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId;
  const startedRef = useRef(false);

  const [payload, setPayload] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [readAck, setReadAck] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState([null, null, null, null, null]);
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
    (async () => {
      await fetch('/api/learning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, action: 'start' }),
      });
      await load();
    })();
  }, [payload, courseId, load]);

  const course = payload?.course || getCourseById(courseId);
  const content = payload?.content;
  const progress = payload?.progress;

  const trackLabel = TRACKS.find((t) => t.id === course?.track)?.label || course?.track;
  const ordered = course ? getOrderedCoursesForTrack(course.track) : [];
  const pos = course ? ordered.findIndex((c) => c.id === course.id) + 1 : 0;

  const goNextCourse = () => {
    if (!course) return;
    const idx = ordered.findIndex((c) => c.id === course.id);
    const next = ordered[idx + 1];
    if (next) router.push(`/learning-center/course/${next.id}`);
    else router.push('/learning-center');
  };

  const onReadingDone = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/learning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, action: 'reading_complete' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setReadAck(true);
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
  const quizPassed = progress?.quiz_passed === true;

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
          {content?.sections?.map((sec, i) => (
            <section key={i} className="lc3-section">
              <h2 className="lc3-h2">{sec.title}</h2>
              <div className="lc3-body">{sec.content}</div>
              {sec.callout && <div className="lc3-callout">{sec.callout}</div>}
              {sec.keyTerms?.length > 0 && (
                <div className="lc3-terms">
                  <strong>Key terms:</strong> {sec.keyTerms.join(', ')}
                </div>
              )}
            </section>
          ))}

          {!quizPassed && (
            <>
              <div className="lc3-read-row">
                <label className="lc3-check">
                  <input
                    type="checkbox"
                    checked={readAck}
                    onChange={(e) => setReadAck(e.target.checked)}
                    disabled={progress?.reading_complete}
                  />
                  <span>I&apos;ve finished reading</span>
                </label>
                <button
                  type="button"
                  className="lc3-btn lc3-btn-primary"
                  disabled={!readAck || progress?.reading_complete || submitting}
                  onClick={onReadingDone}
                >
                  {progress?.reading_complete ? 'Reading complete ✓' : 'Confirm & unlock quiz'}
                </button>
              </div>

              {progress?.reading_complete && (
                <button
                  type="button"
                  className="lc3-btn lc3-btn-primary"
                  style={{ marginTop: '0.75rem' }}
                  onClick={() => setQuizMode(true)}
                  data-task-target="learning-quiz-button"
                >
                  Take Quiz →
                </button>
              )}
            </>
          )}
        </article>
      )}

      {quizMode && (
        <div className="lc3-quiz db-card">
          <h2 className="lc3-h2">
            Quiz: {course.title} ({qIdx + 1} of 5)
          </h2>
          <p className="lc3-qtext">{quiz[qIdx]?.question}</p>
          <div className="lc3-options">
            {quiz[qIdx]?.options?.map((opt, oi) => (
              <label key={oi} className={`lc3-opt ${answers[qIdx] === oi ? 'sel' : ''}`}>
                <input
                  type="radio"
                  name={`q-${qIdx}`}
                  checked={answers[qIdx] === oi}
                  onChange={() => {
                    const next = [...answers];
                    next[qIdx] = oi;
                    setAnswers(next);
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
          <div className="lc3-quiz-actions">
            {qIdx < 4 ? (
              <button
                type="button"
                className="lc3-btn lc3-btn-primary"
                disabled={answers[qIdx] == null}
                onClick={() => setQIdx((i) => i + 1)}
              >
                Next question →
              </button>
            ) : (
              <button
                type="button"
                className="lc3-btn lc3-btn-primary"
                data-task-target="learning-quiz-button"
                disabled={answers[qIdx] == null || submitting}
                onClick={submitQuiz}
              >
                Submit quiz
              </button>
            )}
          </div>
          <button type="button" className="lc3-link" onClick={() => setQuizMode(false)}>
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
                <button
                  type="button"
                  className="lc3-btn lc3-btn-primary"
                  onClick={() => {
                    setResult(null);
                    setAnswers([null, null, null, null, null]);
                    setQIdx(0);
                    setQuizMode(true);
                  }}
                >
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
