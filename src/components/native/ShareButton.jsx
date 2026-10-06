'use client';

import { useState } from 'react';
import { shareLink } from '@/lib/share';

/** A small Share control; native share sheet in the apps, share or copy on the web. */
export default function ShareButton({ title, url, className = 'share-btn', label = 'Share' }) {
  const [state, setState] = useState(null);
  const onClick = async () => {
    const href = url ? new URL(url, window.location.origin).toString() : window.location.href;
    const r = await shareLink({ title, url: href });
    setState(r === 'copied' ? 'Link copied' : r === 'failed' ? 'Could not share' : null);
    if (r === 'copied' || r === 'failed') window.setTimeout(() => setState(null), 2500);
  };
  return (
    <button type="button" className={className} onClick={onClick} aria-label={`${label}: ${title}`}>
      <i className="bi bi-share" aria-hidden="true" />
      <span>{state || label}</span>
    </button>
  );
}
