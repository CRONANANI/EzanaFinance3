'use client';

import { useState } from 'react';
import { resolveHeadshot } from '@/lib/politicians/headshots';

const PARTY_RING = { D: 'var(--info)', R: 'var(--negative)', I: 'var(--purple)' };

function initials(name) {
  const p = String(name || '')
    .trim()
    .split(/\s+/);
  return ((p[0]?.[0] || '') + (p[p.length - 1]?.[0] || '')).toUpperCase() || '?';
}

/** Official public-domain portrait by BioGuide ID; initials when none resolves. */
export default function Headshot({ name, bioguideId, party, size = 32 }) {
  const shot = resolveHeadshot({ name, bioguideId });
  const [failed, setFailed] = useState(false);
  return (
    <span
      className="ptk-shot"
      style={{
        width: size,
        height: size,
        borderColor: PARTY_RING[party] || 'var(--border-primary)',
        fontSize: Math.max(10, Math.round(size * 0.34)),
      }}
    >
      {shot && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shot.src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
