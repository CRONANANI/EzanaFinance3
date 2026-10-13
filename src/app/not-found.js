import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#0f1419',
        color: '#ffffff',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <h1 style={{ fontSize: '4rem', fontWeight: 700, margin: 0, color: '#10b981' }}>404</h1>
      <p style={{ fontSize: '1.25rem', color: '#9ca3af', margin: '1rem 0 2rem' }}>
        This page could not be found.
      </p>
      <Link
        href="/"
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#10b981',
          color: '#ffffff',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Go to Home
      </Link>
    </div>
  );
}
