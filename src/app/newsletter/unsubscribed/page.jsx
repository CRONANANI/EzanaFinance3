import Link from 'next/link';
import { UnsubscribeReason } from './UnsubscribeReason';
import '../newsletter-status.css';

export const metadata = { title: 'Unsubscribed · Ezana' };

export default function NewsletterUnsubscribedPage({ searchParams }) {
  const token = typeof searchParams?.token === 'string' ? searchParams.token : null;

  return (
    <main className="nl-status">
      <div className="nl-status-card">
        <h1 className="nl-status-title">You’ve been unsubscribed</h1>
        <p className="nl-status-body">
          You won’t receive any more Ezana newsletter emails. Changed your mind? You can
          re-subscribe any time from our site.
        </p>
        {token && <UnsubscribeReason token={token} />}
        <Link href="/" className="nl-status-link">
          Back to Ezana
        </Link>
      </div>
    </main>
  );
}
