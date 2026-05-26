'use client';

import Link from 'next/link';

export function EchoFooterDiscuss({ articleId }) {
  const communityHref = `/community?article=${encodeURIComponent(articleId)}`;

  return (
    <p className="echo-footer-discuss">
      Or pull up a chair —{' '}
      <Link href={communityHref} className="echo-footer-discuss-link">
        start the conversation in the community thread →
      </Link>
    </p>
  );
}
