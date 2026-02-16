import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
      <h1>Sign Up</h1>
      <p style={{ margin: '1rem 0', color: 'var(--muted-foreground)' }}>Sign up page - React migration in progress.</p>
      <Link href="/" style={{ color: 'var(--primary)' }}>Back to Home</Link>
    </div>
  );
}
