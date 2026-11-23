'use client';

/**
 * Apply to Write for Ezana Echo (Content Studio, Ezana Echo tab).
 *
 * Nov 23 2026 (Help Center audit):
 *   - The submit button is no longer silently disabled. Submitting checks every
 *     field with the same rules the API uses and shows each problem next to its
 *     field (src/lib/echo/writer-application.js).
 *   - Answers are kept in this browser until the application is accepted, so
 *     signing in again or reloading never loses them.
 *   - Every failure says what happened and what to do. When the outcome is
 *     unknown (a dropped connection or a server error), the form says so and
 *     offers "Check status" before any second submit.
 *   - A failed status check no longer shows a blank form (which invited a
 *     duplicate application); it shows a retry.
 *   - No promised review time: there is no service-level commitment.
 * Help article: /help-center/partner/article/applying-to-write
 */
import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import {
  LIMITS,
  SPECIALIZATIONS,
  parseSampleUrls,
  validateWriterApplication,
} from '@/lib/echo/writer-application';

const DRAFT_KEY = 'ezana:echo-writer-application:draft';
const HELP = '/help-center/partner/article/applying-to-write';
const EMPTY = {
  writingExperience: '',
  sampleUrls: '',
  specialization: '',
  reasonToWrite: '',
  portfolioUrl: '',
};

function readDraft() {
  try {
    const d = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || 'null');
    return d && typeof d === 'object' ? { ...EMPTY, ...d } : null;
  } catch {
    return null;
  }
}
function writeDraft(form) {
  try {
    const empty = Object.values(form).every((v) => !String(v || '').trim());
    if (empty) window.localStorage.removeItem(DRAFT_KEY);
    else window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  } catch {
    /* storage unavailable: no draft */
  }
}

/** A failed submit, turned into a message and whether the outcome is known. */
function describeFailure(res, data) {
  const code = data?.code;
  if (res.status === 401) {
    return {
      kind: 'session',
      text: 'Your session has ended, so the application was not sent. Sign in again and come back to this tab. Your answers are saved in this browser.',
    };
  }
  if (code === 'not_partner' || res.status === 403) {
    return {
      kind: 'eligibility',
      text: 'Only active Ezana partners can apply. This account is not an active partner yet. If your partner application is still in review, wait for the decision email; if you were approved, sign out and back in with the email you applied with.',
    };
  }
  if (code === 'already_pending') {
    return {
      kind: 'pending',
      text: 'You already have an application under review, so this one was not sent again.',
    };
  }
  if (code === 'already_approved') {
    return { kind: 'approved', text: 'You are already an approved Echo writer.' };
  }
  if (res.status === 429) {
    const wait = Number(res.headers.get('Retry-After')) || 60;
    return {
      kind: 'rate',
      text: `Too many attempts in a short time, so this one was not sent. Wait about ${wait} seconds, then submit once.`,
    };
  }
  if (code === 'invalid_body') {
    return {
      kind: 'retry',
      text: 'The application did not reach us intact and was not saved. Submit it again.',
    };
  }
  return {
    kind: 'unknown',
    text: "We couldn't confirm whether your application was saved. Check its status before submitting again.",
  };
}

export function WriterApplication({ getToken }) {
  const ids = {
    exp: useId(),
    samples: useId(),
    spec: useId(),
    portfolio: useId(),
    reason: useId(),
  };
  const [status, setStatus] = useState('loading'); // loading | error | none | pending | rejected | approved | not_partner
  const [application, setApplication] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const u = (k, v) => {
    setForm((p) => {
      const next = { ...p, [k]: v };
      writeDraft(next);
      return next;
    });
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const checkStatus = useCallback(async () => {
    setStatus('loading');
    try {
      const token = await getToken();
      if (!token) {
        setFailure(describeFailure({ status: 401, headers: new Headers() }, {}));
        setStatus('error');
        return;
      }
      const res = await fetch('/api/echo/writer-application', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error('status');
      setFailure(null);
      if (data.isApprovedWriter) return setStatus('approved');
      if (data.application && data.application.application_status !== 'withdrawn') {
        setApplication(data.application);
        if (data.application.application_status === 'pending') return setStatus('pending');
        if (data.application.application_status === 'rejected') return setStatus('rejected');
      }
      if (data.isActivePartner === false) return setStatus('not_partner');
      setStatus('none');
    } catch {
      setStatus('error');
    }
  }, [getToken]);

  useEffect(() => {
    const d = readDraft();
    if (d) setForm(d);
    checkStatus();
  }, [checkStatus]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (loading) return;
    setFailure(null);
    const check = validateWriterApplication(form);
    if (!check.ok) {
      setErrors(check.errors);
      const first = [
        'writingExperience',
        'sampleUrls',
        'specialization',
        'portfolioUrl',
        'reasonToWrite',
      ].find((k) => check.errors[k]);
      const map = {
        writingExperience: ids.exp,
        sampleUrls: ids.samples,
        specialization: ids.spec,
        portfolioUrl: ids.portfolio,
        reasonToWrite: ids.reason,
      };
      document.getElementById(map[first])?.focus();
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setFailure(describeFailure({ status: 401, headers: new Headers() }, {}));
        return;
      }
      const res = await fetch('/api/echo/writer-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, sampleUrls: parseSampleUrls(form.sampleUrls) }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        writeDraft(EMPTY);
        setApplication(data.application);
        setJustSubmitted(true);
        setStatus('pending');
        return;
      }
      if (data?.code === 'invalid_fields' && data.fields) {
        setErrors(data.fields);
        return;
      }
      const f = describeFailure(res, data);
      if (f.kind === 'pending' || f.kind === 'approved') {
        await checkStatus();
      }
      setFailure(f);
    } catch {
      /* The request may or may not have reached the server. */
      setFailure(describeFailure({ status: 0, headers: new Headers() }, {}));
    } finally {
      setLoading(false);
    }
  };

  const helpLink = (
    <Link href={HELP} className="echo-help-link">
      Troubleshooting guide
    </Link>
  );

  if (status === 'loading') {
    return (
      <div className="echo-app-card" aria-busy="true">
        <p>Checking your application status…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="echo-app-card echo-app-rejected" role="alert">
        <i className="bi bi-exclamation-triangle" aria-hidden="true" />
        <h3>We couldn&apos;t load your application status</h3>
        <p>
          {failure?.kind === 'session'
            ? failure.text
            : 'Nothing has been submitted from this screen. Try again in a moment. If this keeps happening, contact partner support.'}
        </p>
        <div className="echo-app-actions">
          <button type="button" className="echo-btn-secondary" onClick={checkStatus}>
            Try again
          </button>
          {helpLink}
        </div>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="echo-app-card echo-app-approved">
        <i className="bi bi-patch-check-fill" aria-hidden="true" />
        <h3>Approved Echo Writer</h3>
        <p>
          You have permission to write and submit articles to Ezana Echo. If the article editor does
          not appear, reload this page.
        </p>
      </div>
    );
  }

  if (status === 'not_partner') {
    return (
      <div className="echo-app-card echo-app-rejected">
        <i className="bi bi-person-lock" aria-hidden="true" />
        <h3>Partner approval comes first</h3>
        <p>
          Only active Ezana partners can apply to write for Ezana Echo, and this account is not an
          active partner yet. If your partner application is in review, wait for the decision email.
          If you were approved, sign out and back in with the email you applied with.
        </p>
        <div className="echo-app-actions">{helpLink}</div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="echo-app-card echo-app-pending" role={justSubmitted ? 'status' : undefined}>
        <i className="bi bi-hourglass-split" aria-hidden="true" />
        <h3>{justSubmitted ? 'Application submitted' : 'Application Under Review'}</h3>
        <p>
          Submitted on{' '}
          {application?.submitted_at
            ? new Date(application.submitted_at).toLocaleDateString()
            : 'an earlier date'}
          . The editorial team is reviewing your experience and samples. Review times vary; this tab
          shows the decision as soon as it is made. There is no need to submit again.
        </p>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="echo-app-card echo-app-rejected">
        <i className="bi bi-x-circle" aria-hidden="true" />
        <h3>Application Not Approved</h3>
        <p>
          {application?.reviewer_notes ||
            'Your application did not meet our requirements at this time. We suggest reapplying once you have new or stronger published samples.'}
        </p>
        <button
          type="button"
          className="echo-btn-secondary"
          onClick={() => {
            setStatus('none');
            setApplication(null);
          }}
        >
          Reapply
        </button>
      </div>
    );
  }

  const sampleCount = parseSampleUrls(form.sampleUrls).length;
  const expLen = form.writingExperience.trim().length;

  return (
    <form className="echo-app-form" onSubmit={handleSubmit} noValidate>
      <div className="echo-app-form-header">
        <h2>Apply to Write for Ezana Echo</h2>
        <p>
          Submit proof of your finance writing experience. Once approved, you can publish articles
          to Ezana Echo from Content Studio. Fields marked * are required. Your answers are saved in
          this browser until you submit.
        </p>
      </div>

      {failure ? (
        <div className="echo-msg echo-msg-error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <div>
            <p style={{ margin: 0 }}>{failure.text}</p>
            <div className="echo-app-actions">
              {failure.kind === 'unknown' || failure.kind === 'pending' ? (
                <button type="button" className="echo-btn-secondary" onClick={checkStatus}>
                  Check status
                </button>
              ) : null}
              {helpLink}
            </div>
          </div>
        </div>
      ) : null}
      {Object.values(errors).some(Boolean) ? (
        <div className="echo-msg echo-msg-error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          Some fields need attention. Nothing was submitted.
        </div>
      ) : null}

      <div className="echo-app-form-body">
        <div className="echo-field">
          <label htmlFor={ids.exp}>Writing Experience *</label>
          <textarea
            id={ids.exp}
            className="echo-input echo-textarea-md"
            value={form.writingExperience}
            onChange={(e) => u('writingExperience', e.target.value)}
            placeholder="Describe your experience writing about finance, markets, investing, or economics. Include publications, years of experience, and any relevant credentials (CFA, MBA, etc.)..."
            rows={5}
            aria-invalid={Boolean(errors.writingExperience)}
            aria-describedby={`${ids.exp}-hint`}
          />
          <span
            id={`${ids.exp}-hint`}
            className={errors.writingExperience ? 'echo-field-error' : 'echo-field-hint'}
          >
            {errors.writingExperience ||
              `At least ${LIMITS.experienceMin} characters (${expLen.toLocaleString('en-US')} so far).`}
          </span>
        </div>

        <div className="echo-field">
          <label htmlFor={ids.samples}>Sample Article URLs *</label>
          <textarea
            id={ids.samples}
            className="echo-input echo-textarea-sm"
            value={form.sampleUrls}
            onChange={(e) => u('sampleUrls', e.target.value)}
            placeholder={'https://example.com/your-article\nhttps://example.com/another-article'}
            rows={3}
            aria-invalid={Boolean(errors.sampleUrls)}
            aria-describedby={`${ids.samples}-hint`}
          />
          <span
            id={`${ids.samples}-hint`}
            className={errors.sampleUrls ? 'echo-field-error' : 'echo-field-hint'}
          >
            {errors.sampleUrls ||
              `${LIMITS.samplesMin} to ${LIMITS.samplesMax} links to published finance articles, one per line, each starting with https:// (${sampleCount} added). Reviewers open them, so use links that work without a login.`}
          </span>
        </div>

        <div className="echo-field-row">
          <div className="echo-field">
            <label htmlFor={ids.spec}>Specialization</label>
            <select
              id={ids.spec}
              className="echo-input"
              value={form.specialization}
              onChange={(e) => u('specialization', e.target.value)}
              aria-invalid={Boolean(errors.specialization)}
            >
              <option value="">Select your specialty...</option>
              {SPECIALIZATIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {errors.specialization ? (
              <span className="echo-field-error">{errors.specialization}</span>
            ) : null}
          </div>
          <div className="echo-field">
            <label htmlFor={ids.portfolio}>Portfolio/Website URL</label>
            <input
              id={ids.portfolio}
              className="echo-input"
              value={form.portfolioUrl}
              onChange={(e) => u('portfolioUrl', e.target.value)}
              placeholder="https://yoursite.com"
              inputMode="url"
              aria-invalid={Boolean(errors.portfolioUrl)}
            />
            {errors.portfolioUrl ? (
              <span className="echo-field-error">{errors.portfolioUrl}</span>
            ) : null}
          </div>
        </div>

        <div className="echo-field">
          <label htmlFor={ids.reason}>Why do you want to write for Ezana Echo?</label>
          <textarea
            id={ids.reason}
            className="echo-input echo-textarea-sm"
            value={form.reasonToWrite}
            onChange={(e) => u('reasonToWrite', e.target.value)}
            placeholder="Tell us what kind of content you'd create and why Ezana Echo's audience would benefit..."
            rows={3}
            aria-invalid={Boolean(errors.reasonToWrite)}
          />
          {errors.reasonToWrite ? (
            <span className="echo-field-error">{errors.reasonToWrite}</span>
          ) : null}
        </div>
      </div>

      <div className="echo-app-form-actions">
        <button type="submit" className="echo-btn-primary" disabled={loading} aria-busy={loading}>
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
        {helpLink}
      </div>
    </form>
  );
}
