import Link from 'next/link';
import '../partner-apply.css';

export default function ApplicationSubmitted() {
  return (
    <div className="partner-form-page">
      <div className="partner-form-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>
          <i className="bi bi-envelope-check" style={{ color: '#10b981' }} />
        </div>
        <h1>Application Submitted</h1>
        <p style={{ color: '#8b949e', maxWidth: '480px', margin: '1rem auto 2rem', lineHeight: 1.7 }}>
          We have sent a secure link to your email address. Click the link to verify your identity and upload your documents. The link expires in 72 hours.
        </p>
        <p style={{ color: '#4b5563', fontSize: '0.75rem' }}>
          Did not receive the email? Check your spam folder or <Link href="/auth/partner/apply/form" style={{ color: '#10b981' }}>resubmit your application</Link>.
        </p>
        <Link href="/" style={{ display: 'inline-block', marginTop: '2rem', color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
