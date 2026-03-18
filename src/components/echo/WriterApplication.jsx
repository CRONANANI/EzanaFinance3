'use client';

import { useState, useEffect } from 'react';

export function WriterApplication({ getToken }) {
  const [status, setStatus] = useState(null);
  const [application, setApplication] = useState(null);
  const [form, setForm] = useState({
    writingExperience: '', sampleUrls: '', specialization: '', reasonToWrite: '', portfolioUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const u = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => { checkStatus(); }, []);

  const checkStatus = async () => {
    try {
      const token = await getToken();
      const res = await fetch('/api/echo/writer-application', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.isApprovedWriter) { setStatus('approved'); return; }
      if (data.application) {
        setApplication(data.application);
        setStatus(data.application.application_status);
      } else {
        setStatus('none');
      }
    } catch { setStatus('none'); }
  };

  const handleSubmit = async () => {
    if (!form.writingExperience.trim()) { setError('Writing experience is required'); return; }
    setLoading(true); setError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/echo/writer-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Application submitted! We will review it within 2-3 business days.');
      setStatus('pending');
      setApplication(data.application);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (status === 'approved') {
    return (
      <div className="echo-app-card echo-app-approved">
        <i className="bi bi-patch-check-fill" />
        <h3>Approved Echo Writer</h3>
        <p>You have permission to write and submit articles to Ezana Echo. Head to the article editor to get started.</p>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="echo-app-card echo-app-pending">
        <i className="bi bi-hourglass-split" />
        <h3>Application Under Review</h3>
        <p>Your writer application was submitted on {application?.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : '—'}. Our editorial team is reviewing your experience and samples. This typically takes 2-3 business days.</p>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="echo-app-card echo-app-rejected">
        <i className="bi bi-x-circle" />
        <h3>Application Not Approved</h3>
        <p>{application?.reviewer_notes || 'Your application did not meet our requirements at this time. You may reapply after 30 days with updated samples.'}</p>
        <button className="echo-btn-secondary" onClick={() => { setStatus('none'); setApplication(null); }}>Reapply</button>
      </div>
    );
  }

  return (
    <div className="echo-app-form">
      <div className="echo-app-form-header">
        <h2>Apply to Write for Ezana Echo</h2>
        <p>Submit proof of your finance writing experience. Once approved, you can publish articles directly to Ezana Echo from your Content Studio.</p>
      </div>

      {error && <div className="echo-msg echo-msg-error"><i className="bi bi-exclamation-triangle" /> {error}</div>}
      {success && <div className="echo-msg echo-msg-success"><i className="bi bi-check-circle" /> {success}</div>}

      <div className="echo-app-form-body">
        <div className="echo-field">
          <label>Writing Experience *</label>
          <textarea className="echo-input echo-textarea-md" value={form.writingExperience} onChange={(e) => u('writingExperience', e.target.value)} placeholder="Describe your experience writing about finance, markets, investing, or economics. Include publications, years of experience, and any relevant credentials (CFA, MBA, etc.)..." rows={5} />
        </div>

        <div className="echo-field">
          <label>Sample Article URLs *</label>
          <textarea className="echo-input echo-textarea-sm" value={form.sampleUrls} onChange={(e) => u('sampleUrls', e.target.value)} placeholder="Paste links to 2-3 published articles you have written (one per line)..." rows={3} />
          <span className="echo-field-hint">Provide at least 2 links to published finance articles</span>
        </div>

        <div className="echo-field-row">
          <div className="echo-field">
            <label>Specialization</label>
            <select className="echo-input" value={form.specialization} onChange={(e) => u('specialization', e.target.value)}>
              <option value="">Select your specialty...</option>
              <option value="markets">Market Analysis</option>
              <option value="investing">Investing & Portfolio</option>
              <option value="trading">Trading Strategies</option>
              <option value="crypto">Cryptocurrency</option>
              <option value="economy">Economy & Policy</option>
              <option value="education">Financial Education</option>
              <option value="politics">Politics & Markets</option>
            </select>
          </div>
          <div className="echo-field">
            <label>Portfolio/Website URL</label>
            <input className="echo-input" value={form.portfolioUrl} onChange={(e) => u('portfolioUrl', e.target.value)} placeholder="https://yoursite.com" />
          </div>
        </div>

        <div className="echo-field">
          <label>Why do you want to write for Ezana Echo?</label>
          <textarea className="echo-input echo-textarea-sm" value={form.reasonToWrite} onChange={(e) => u('reasonToWrite', e.target.value)} placeholder="Tell us what kind of content you'd create and why Ezana Echo's audience would benefit..." rows={3} />
        </div>
      </div>

      <div className="echo-app-form-actions">
        <button className="echo-btn-primary" onClick={handleSubmit} disabled={loading || !form.writingExperience.trim()}>
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </div>
  );
}
