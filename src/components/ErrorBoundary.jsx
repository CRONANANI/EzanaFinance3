'use client';

import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            An unexpected error occurred. Please refresh the page.
          </p>
          <button
            type="button"
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ padding: '0.5rem 1.5rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
