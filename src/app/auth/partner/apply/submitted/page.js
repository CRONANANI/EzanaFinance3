import Link from 'next/link';
import '../partner-apply.css';

export default function PartnerApplySubmittedPage() {
  return (
    <div
      className="signin-dark-lock partner-apply-page"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        className="partner-apply-container"
        style={{ textAlign: 'center', padding: '3rem 2rem' }}
      >
        <i className="bi bi-envelope-check" style={{ fontSize: '3rem', color: '#059669' }} />
        <h1 style={{ color: '#0f172a', marginTop: '1.5rem', fontSize: '1.5rem', fontWeight: 700 }}>
          Application Submitted
        </h1>
        <p
          style={{ color: '#475569', maxWidth: '480px', margin: '1rem auto 2rem', lineHeight: 1.7 }}
        >
          We&apos;ve sent a verification link to your email. Click it to confirm your address and
          complete your application.
        </p>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Did not receive the email? Check your spam folder or{' '}
          <Link href="/auth/partner/apply/form" style={{ color: '#059669', fontWeight: 600 }}>
            resubmit your application
          </Link>
          .
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginTop: '2rem',
            color: '#059669',
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
