import Link from 'next/link';

export function LandingHero() {
  return (
    <div className="content-container hero-container">
      <div className="hero-content">
        <h1 className="hero-tagline">Your Network Is Your Net Worth</h1>
        <p className="hero-subtitle">
          Track congressional trades, analyze market intelligence, and manage your portfolio
          with institutional-grade tools designed for individual investors.
        </p>
        <div className="hero-cta">
          <Link href="/signup" className="btn-hero-primary">
            <span>Sign Up</span>
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
          <Link href="/signin" className="btn-hero-secondary">
            <span>Sign In</span>
          </Link>
          <a href="#features" className="btn-hero-secondary">
            <span>Learn More</span>
          </a>
        </div>
      </div>
      <div className="card-preview antigravity-center-component" id="antigravityCenterComponent">
        <div id="card-swap-container" style={{ opacity: 0, transition: 'opacity 0.5s ease', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#10b981' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, border: '3px solid #10b981', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
              <div>Loading preview...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
