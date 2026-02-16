import Link from 'next/link';

export default function InsideTheCapitolPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
      <h1>Inside The Capitol</h1>
      <p style={{ margin: '1rem 0', color: 'var(--muted-foreground)' }}>Congressional trading - React migration in progress.</p>
      <Link href="/" style={{ color: 'var(--primary)' }}>Back to Home</Link>
    </div>
  );
}
