'use client';

/**
 * Start here as a numbered ladder: each Start here article is a step card in
 * a three column grid, read left to right and top to bottom (1 2 3, 4 5 6,
 * 7 8 9, and on in rows of three). Signed out, every step is unmarked and a
 * line invites the reader to sign in to save progress (reads are kept on the
 * device meanwhile). Signed in, read steps fill emerald, the next unread step
 * is marked Up next, and the header counts N of M complete. Local reads merge
 * into the account on the first signed-in visit. Phones get a single column.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import { clearLocal, postReads, readLocal } from './help-reads';

export default function StartHerePath({ milestones }) {
  const { isAuthenticated, loading } = useAuth();
  const [reads, setReads] = useState(() => new Set());

  useEffect(() => {
    if (loading) return undefined;
    let alive = true;
    const local = readLocal();
    if (!isAuthenticated) {
      setReads(new Set(local));
      return undefined;
    }
    (async () => {
      let account = [];
      let stored = false;
      try {
        const r = await fetch('/api/help/reads', { cache: 'no-store' });
        if (r.ok) {
          const d = await r.json();
          account = Array.isArray(d?.slugs) ? d.slugs : [];
          stored = Boolean(d?.stored);
        }
      } catch {
        /* offline: the local record below still shows */
      }
      if (!alive) return;
      const pending = local.filter((s) => !account.includes(s));
      setReads(new Set([...account, ...local]));
      if (pending.length && stored) {
        try {
          if (await postReads(pending)) clearLocal();
        } catch {
          /* keep the local copy for the next visit */
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAuthenticated, loading]);

  const n = milestones.length;
  const done = milestones.filter((m) => reads.has(m.slug)).length;
  const nextIdx = milestones.findIndex((m) => !reads.has(m.slug));

  if (!n) return null;
  return (
    <section className="hcs-path" aria-labelledby="hcs-start-title">
      <div className="hcs-sec-head">
        <h2 id="hcs-start-title" className="hcs-h2">
          Start here
        </h2>
        {isAuthenticated ? (
          <span className="hcs-cap hcs-mono hcs-path-progress">
            {done} of {n} complete
          </span>
        ) : (
          <span className="hcs-cap hcs-path-hint">
            <Link href="/auth/login" className="hcs-link">
              Sign in
            </Link>{' '}
            to save your progress
          </span>
        )}
      </div>

      <ol className="hcs-path-list">
        {milestones.map((m, i) => {
          const isRead = reads.has(m.slug);
          const isNext = i === nextIdx;
          const state = isRead ? 'read' : isNext ? 'next' : 'todo';
          return (
            <li key={m.slug} className="hcs-path-node" data-state={state}>
              <Link href={m.url} className="hcs-path-link">
                <span className="hcs-path-top">
                  <span className="hcs-path-dot hcs-mono" aria-hidden="true">
                    {i + 1}
                  </span>
                  {isRead ? (
                    <span className="hcs-path-status hcs-path-status--done" aria-hidden="true">
                      <i className="bi bi-check-lg" />
                      Read
                    </span>
                  ) : isNext ? (
                    <em className="hcs-path-status hcs-path-upnext" aria-hidden="true">
                      Up next
                    </em>
                  ) : null}
                </span>
                <strong className="hcs-path-title">{m.title}</strong>
                {m.blurb ? <small className="hcs-path-blurb">{m.blurb}</small> : null}
                <span className="hcs-sr">{isRead ? ', read' : isNext ? ', up next' : ''}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
