'use client';

import { useEffect, useState } from 'react';
import './social.css';

const EMOJI_CHOICES = ['👍', '🔥', '💡', '📈', '👀', '✅'];

/**
 * Reusable reaction bar. Reads + toggles reactions for a (targetType,targetId)
 * via /api/org/reactions. Used by notes, threads, posts, pitches.
 */
export function ReactionBar({ targetType, targetId, compact = false }) {
  const [counts, setCounts] = useState({});
  const [mine, setMine] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!targetId) return undefined;
    (async () => {
      try {
        const res = await fetch(
          `/api/org/reactions?target_type=${targetType}&target_id=${targetId}`,
          { cache: 'no-store' },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setCounts(data.counts || {});
        setMine(data.mine || []);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetType, targetId]);

  const toggle = async (emoji) => {
    if (busy) return;
    setBusy(true);
    setMenuOpen(false);
    try {
      const res = await fetch('/api/org/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        setCounts(data.counts || {});
        setMine(data.mine || []);
      }
    } catch {
      /* non-fatal */
    } finally {
      setBusy(false);
    }
  };

  const active = Object.entries(counts).filter(([, n]) => n > 0);

  return (
    <div className="sc2-reactions">
      {active.map(([emoji, n]) => (
        <button
          key={emoji}
          type="button"
          className={`sc2-reaction${mine.includes(emoji) ? ' is-mine' : ''}`}
          onClick={() => toggle(emoji)}
          aria-pressed={mine.includes(emoji)}
        >
          <span aria-hidden>{emoji}</span>
          <span className="sc2-reaction-count">{n}</span>
        </button>
      ))}
      <div className="sc2-reaction-add">
        <button
          type="button"
          className="sc2-reaction"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Add reaction"
        >
          <i className="bi bi-emoji-smile" aria-hidden />
          {!compact && active.length === 0 && <span>React</span>}
        </button>
        {menuOpen && (
          <div className="sc2-emoji-menu" role="menu">
            {EMOJI_CHOICES.map((e) => (
              <button key={e} type="button" onClick={() => toggle(e)} aria-label={`React ${e}`}>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
