'use client';

import Link from 'next/link';

export function LcGreeting({ firstName, subline, onResume, onSavedClick }) {
  return (
    <section className="lc-greeting">
      <div>
        <p className="lc-greeting-eyebrow">Learning Center</p>
        <h1 className="lc-greeting-heading">
          Welcome back, <span className="lc-greeting-heading-accent">{firstName}</span>.
        </h1>
        {subline && <p className="lc-greeting-sub">{subline}</p>}
      </div>
      <div className="lc-greeting-actions">
        <button type="button" className="lc-btn" onClick={onSavedClick}>
          Saved
        </button>
        <Link href="/learning-center/badges" className="lc-btn">
          Badges
        </Link>
        <button type="button" className="lc-btn lc-btn-primary" onClick={onResume}>
          Resume lesson
        </button>
      </div>
    </section>
  );
}
