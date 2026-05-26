'use client';

import { useState } from 'react';

export function EchoFooterByline({ author }) {
  const [following, setFollowing] = useState(false);

  if (!author?.name) return null;

  return (
    <>
      <span className="echo-footer-diamond" aria-hidden />
      <div className="echo-footer-byline">
        <span>by</span>
        <span className="echo-footer-byline-dot" aria-hidden />
        <span className="echo-footer-byline-author">{author.name}</span>
        {author.date && (
          <>
            <span className="echo-footer-byline-dot" aria-hidden />
            <span>{author.date}</span>
          </>
        )}
        <span className="echo-footer-byline-dot" aria-hidden />
        <button
          type="button"
          className="echo-footer-byline-follow"
          onClick={() => setFollowing((v) => !v)}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      </div>
    </>
  );
}
