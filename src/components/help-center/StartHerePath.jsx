'use client';

/**
 * Start here as a curved milestone path: each Start here article is a node
 * on a zig-zag curve, read in order. Signed out, every node is unmarked and
 * a line invites the reader to sign in to save progress (reads are kept on
 * the device meanwhile). Signed in, read nodes fill emerald, the next unread
 * node is marked Up next, and the header counts N of M complete. Local reads
 * merge into the account on the first signed-in visit. Under 700px the curve
 * gives way to a vertical timeline.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import { clearLocal, postReads, readLocal } from './help-reads';

const W = 600;
const ROW_H = 112;

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

  /* Zig-zag curve: nodes alternate left and right down the drawing. */
  const { pts, d, H } = useMemo(() => {
    const height = ROW_H * Math.max(0, n - 1) + 80;
    const points = milestones.map((_, i) => ({
      x: i % 2 === 0 ? W * 0.25 : W * 0.75,
      y: 40 + i * ROW_H,
    }));
    const path = points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const midY = (prev.y + p.y) / 2;
      return `${acc} C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
    }, '');
    return { pts: points, d: path, H: height };
  }, [milestones, n]);

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

      <div className="hcs-path-box">
        <svg viewBox={`0 0 ${W} ${H}`} className="hcs-path-svg" aria-hidden="true">
          <path d={d} className="hcs-path-track" />
        </svg>
        <ol className="hcs-path-list">
          {milestones.map((m, i) => {
            const isRead = reads.has(m.slug);
            const isNext = i === nextIdx;
            const state = isRead ? 'read' : isNext ? 'next' : 'todo';
            return (
              <li
                key={m.slug}
                className="hcs-path-node"
                data-state={state}
                style={{ left: `${(pts[i].x / W) * 100}%`, top: `${(pts[i].y / H) * 100}%` }}
              >
                <Link href={m.url} className="hcs-path-link">
                  <span className="hcs-path-dot hcs-mono" aria-hidden="true">
                    {isRead ? <i className="bi bi-check-lg" /> : i + 1}
                  </span>
                  <span className="hcs-path-text">
                    {isNext ? <em className="hcs-path-upnext">Up next</em> : null}
                    <strong className="hcs-path-title">{m.title}</strong>
                    {m.blurb ? <small className="hcs-path-blurb">{m.blurb}</small> : null}
                    <span className="hcs-sr">{isRead ? ', read' : isNext ? ', up next' : ''}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
