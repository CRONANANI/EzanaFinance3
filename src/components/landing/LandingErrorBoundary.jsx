'use client';

import React from 'react';

export class LandingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[LandingErrorBoundary]', this.props.name, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
          We couldn&apos;t load this section right now.{' '}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
