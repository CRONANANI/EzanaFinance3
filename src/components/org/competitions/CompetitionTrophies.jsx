'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import './competition-trophies.css';

const BADGE = {
  winner: { label: 'Winner', Icon: Trophy, cls: 'ctr-gold' },
  top3: { label: 'Top 3', Icon: Medal, cls: 'ctr-silver' },
  finalist: { label: 'Finalist', Icon: Medal, cls: 'ctr-silver' },
  best_thesis: { label: 'Best thesis', Icon: Award, cls: 'ctr-accent' },
  participant: { label: 'Participant', Icon: Award, cls: 'ctr-mut' },
};

/** Competition trophies for an org member (badge display, reused visual language).
 *  Renders nothing when the member has none. */
export function CompetitionTrophies({ memberId }) {
  const [badges, setBadges] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!memberId) return undefined;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/org/competition-badges?member_id=${encodeURIComponent(memberId)}`, { cache: 'no-store' });
        if (alive && res.ok) {
          const json = await res.json();
          setBadges(json.badges || []);
        }
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [memberId]);

  if (!loaded || badges.length === 0) return null;

  return (
    <div className="ctr-wrap">
      <div className="ctr-title">Competition trophies</div>
      <div className="ctr-grid">
        {badges.map((b) => {
          const meta = BADGE[b.badge_key] || BADGE.participant;
          return (
            <div key={b.id} className={`ctr-badge ${meta.cls}`}>
              <meta.Icon size={20} aria-hidden="true" />
              <div className="ctr-badge-main">
                <div className="ctr-badge-place">
                  {meta.label}
                  {b.placement ? <span className="ctr-badge-rank"> · #{b.placement}</span> : null}
                </div>
                <div className="ctr-badge-comp">{b.competition_name}</div>
                {b.role_at_event === 'portfolio_manager' ? <div className="ctr-badge-role">Team leadership</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
