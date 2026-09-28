'use client';

/**
 * Contains a navigation crash to the navigation.
 *
 * The nav renders on every page and branches on the signed-in user, so a bug
 * in its authenticated path takes down the root layout and the whole
 * application goes to the global error screen. That is the wrong blast
 * radius: a broken nav should cost the nav.
 *
 * The fallback keeps the two things someone needs when the nav is broken: a
 * way home, and a way out of the session that may be causing it.
 */
import { Component } from 'react';
import * as Sentry from '@sentry/nextjs';

export class NavErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Navigation error:', error, info);
    Sentry.captureException(error, { tags: { boundary: 'navbar' } });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <nav className="nav-fallback" aria-label="Navigation unavailable">
        <a className="nav-fallback-home" href="/">
          Ezana
        </a>
        <span className="nav-fallback-note">Navigation is unavailable on this page.</span>
        {/* Server-side sign-out, the same authoritative route the real nav
            uses, so a session that is provoking the crash can be cleared. */}
        <a className="nav-fallback-out" href="/api/auth/signout">
          Sign out
        </a>
      </nav>
    );
  }
}

export default NavErrorBoundary;
