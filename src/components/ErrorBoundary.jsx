'use client';

import { Component } from 'react';
import ErrorScreen from '@/components/errors/ErrorScreen';

/** Catches render errors inside the dashboard shell and shows the branded
    error screen inline; "Try again" re-renders the children. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      return (
        <ErrorScreen
          variant="error"
          layout="inline"
          onRetry={() => this.setState({ hasError: false, error: null })}
          digest={error?.digest}
          homeHref="/home-dashboard"
          homeLabel="Go to Dashboard"
          details={error ? `${error.message || String(error)}\n\n${error.stack || ''}` : undefined}
        />
      );
    }
    return this.props.children;
  }
}
