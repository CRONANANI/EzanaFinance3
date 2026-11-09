'use client';

/**
 * Keeps one broken settings panel from taking down the page (Nov 2026): the
 * failing section shows a small inline card with a retry, and the rest of
 * /settings keeps working. Key it by section so switching tabs clears it:
 *   <SectionBoundary key={tab} label="Billing"><BillingPanel /></SectionBoundary>
 */
import { Component } from 'react';
import * as Sentry from '@sentry/nextjs';
import styles from './SectionBoundary.module.css';

export default class SectionBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error(`[settings:${this.props.label ?? 'section'}]`, error, info?.componentStack);
    Sentry.captureException(error, { tags: { settings_section: this.props.label ?? 'section' } });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className={styles.card} role="alert">
        <i className={`bi bi-exclamation-circle ${styles.icon}`} aria-hidden="true" />
        <div className={styles.text}>
          <p className={styles.title}>
            {this.props.label ? `${this.props.label} couldn't load` : "This section couldn't load"}
          </p>
          <p className={styles.sub}>The rest of your settings still work.</p>
        </div>
        <button
          type="button"
          className={styles.retry}
          onClick={() => this.setState({ error: null })}
        >
          Retry
        </button>
      </div>
    );
  }
}
