'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import '../partner-apply.css';

function VerifyAndUploadContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying');
  const [applicant, setApplicant] = useState(null);
  const [error, setError] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [finFile, setFinFile] = useState(null);

  useEffect(() => {
    if (!token) { setStatus('error'); setError('No verification token found.'); return; }
    fetch(`/api/partner-application/verify?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setApplicant(data);
          setStatus(data.status === 'under_review' ? 'complete' : 'verified');
        } else {
          setStatus('error');
          setError(data.error);
        }
      })
      .catch(() => { setStatus('error'); setError('Verification failed.'); });
  }, [token]);

  const handleUpload = async () => {
    if (!idFile || !finFile) { setError('Both documents are required.'); return; }
    setStatus('uploading');
    setError(null);
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('idDocument', idFile);
      formData.append('financialDocument', finFile);
      const res = await fetch('/api/partner-application/documents', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus('complete');
    } catch (err) {
      setError(err.message);
      setStatus('verified');
    }
  };

  if (status === 'verifying') {
    return (
      <div className="partner-form-page">
        <div className="partner-form-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <p style={{ color: '#64748b' }}>Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="partner-form-page">
        <div className="partner-form-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <i className="bi bi-x-circle" style={{ fontSize: '2.5rem', color: '#ef4444' }} />
          <h2 style={{ marginTop: '1rem', color: '#0f172a' }}>Verification Failed</h2>
          <p style={{ color: '#64748b' }}>{error}</p>
          <Link href="/auth/partner/apply" style={{ color: '#059669', marginTop: '1.5rem', display: 'inline-block' }}>Start a new application</Link>
        </div>
      </div>
    );
  }

  if (status === 'complete') {
    return (
      <div className="partner-form-page">
        <div className="partner-form-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <i className="bi bi-check-circle-fill" style={{ fontSize: '3rem', color: '#059669' }} />
          <h1 style={{ marginTop: '1rem', color: '#0f172a' }}>Application Complete</h1>
          <p style={{ color: '#64748b', maxWidth: '480px', margin: '1rem auto' }}>
            Your documents have been submitted. Our team will review your application within 5–7 business days. You&apos;ll receive an email once a decision has been made.
          </p>
          <Link href="/" style={{ color: '#059669', marginTop: '2rem', display: 'inline-block' }}>← Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="partner-form-page">
      <div className="partner-form-container">
        <i className="bi bi-shield-check" style={{ fontSize: '2rem', color: '#059669', display: 'block', marginBottom: '1rem' }} />
        <h1 style={{ color: '#0f172a' }}>Email Verified</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
          Hi {applicant?.fullName}. Please upload the following documents to complete your application.
        </p>

        {error && <div className="partner-form-error">{error}</div>}

        <div className="partner-form-step">
          <label>Government-Issued ID *</label>
          <p style={{ color: '#64748b', fontSize: '0.6875rem', marginBottom: '0.5rem' }}>
            Passport, driver&apos;s license, or national ID card. Clear photo of the front side.
          </p>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setIdFile(e.target.files?.[0])} />
          {idFile && <span style={{ fontSize: '0.625rem', color: '#059669' }}>{idFile.name}</span>}

          <label style={{ marginTop: '1.5rem' }}>Proof of Financial Activity *</label>
          <p style={{ color: '#64748b', fontSize: '0.6875rem', marginBottom: '0.5rem' }}>
            Brokerage statement (last 3 months), CFA/CFP/FRM certificate, or professional registration document.
          </p>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFinFile(e.target.files?.[0])} />
          {finFile && <span style={{ fontSize: '0.625rem', color: '#059669' }}>{finFile.name}</span>}

          <button
            type="button"
            className="partner-form-submit"
            style={{ marginTop: '2rem' }}
            onClick={handleUpload}
            disabled={!idFile || !finFile || status === 'uploading'}
          >
            {status === 'uploading' ? 'Uploading...' : 'Submit Documents'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyAndUpload() {
  return (
    <Suspense fallback={
      <div className="partner-form-page">
        <div className="partner-form-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <p style={{ color: '#64748b' }}>Loading...</p>
        </div>
      </div>
    }>
      <VerifyAndUploadContent />
    </Suspense>
  );
}
