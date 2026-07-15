import Link from 'next/link';
import '../newsletter-status.css';

export const metadata = { title: 'Subscription confirmed · Ezana' };

export default function NewsletterConfirmedPage({ searchParams }) {
  const status = searchParams?.status;

  let title = 'You’re subscribed 🎉';
  let body =
    'Your email is confirmed — you’ll now receive Ezana Echo articles and product updates. You can unsubscribe from any email at any time.';

  if (status === 'expired') {
    title = 'That link has expired';
    body =
      'Confirmation links are valid for 7 days. Please subscribe again from the site footer to get a fresh link.';
  } else if (status === 'invalid') {
    title = 'That link looks invalid';
    body = 'We couldn’t read that confirmation link. Try subscribing again from the site footer.';
  }

  return (
    <main className="nl-status">
      <div className="nl-status-card">
        <h1 className="nl-status-title">{title}</h1>
        <p className="nl-status-body">{body}</p>
        <Link href="/" className="nl-status-link">
          Back to Ezana
        </Link>
      </div>
    </main>
  );
}
