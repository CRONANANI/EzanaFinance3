'use client';

/**
 * Community terms, shown once before a user's first post or comment.
 *   const { ensureAccepted, termsModal } = useCommunityTerms();
 *   if (!(await ensureAccepted())) return;   // before submitting
 *   ...render {termsModal}
 * The server enforces the same rule (403 community_terms_required).
 */
import { useCallback, useRef, useState } from 'react';
import './moderation.css';

export function useCommunityTerms() {
  const [open, setOpen] = useState(false);
  const accepted = useRef(null);
  const resolver = useRef(null);

  const ensureAccepted = useCallback(async () => {
    if (accepted.current === true) return true;
    try {
      const res = await fetch('/api/moderation/terms', { credentials: 'include' });
      const d = await res.json().catch(() => ({}));
      if (d.accepted) {
        accepted.current = true;
        return true;
      }
    } catch {
      /* fall through to asking */
    }
    setOpen(true);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = async (ok) => {
    if (ok) {
      const res = await fetch('/api/moderation/terms', { method: 'POST', credentials: 'include' });
      ok = res.ok;
      if (ok) accepted.current = true;
    }
    setOpen(false);
    resolver.current?.(ok);
    resolver.current = null;
  };

  const termsModal = open ? (
    <div className="modm-overlay">
      <div className="modm-dialog" role="dialog" aria-modal="true" aria-labelledby="modt-title">
        <h2 id="modt-title" className="modm-title">
          Community guidelines
        </h2>
        <p className="modm-msg">
          Ezana has zero tolerance for objectionable content or abusive users. Posts, comments and
          messages that harass, threaten, spread hate, share sexual or illegal content, or mislead
          other members are removed, and their authors can be suspended. You can report content and
          block members from the menu on any post, comment, message or profile.
        </p>
        <p className="modm-msg">
          <a
            href="/help-center/user/article/posting-rules"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the full guidelines
          </a>
        </p>
        <div className="modm-actions">
          <button type="button" onClick={() => finish(false)}>
            Not now
          </button>
          <button type="button" className="modm-primary" onClick={() => finish(true)}>
            I agree
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { ensureAccepted, termsModal };
}
