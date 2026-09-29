'use client';

import { useState } from 'react';
import { resolveHeadshot } from '@/lib/politicians/headshots';

function initials(name) {
  const p = String(name || '')
    .replace(/[[\]]/g, '')
    .trim()
    .split(/\s+/);
  return ((p[0]?.[0] || '') + (p[p.length - 1]?.[0] || '')).toUpperCase() || '?';
}

/**
 * Official public-domain portrait by BioGuide ID; initials when none resolves
 * or the image fails. The ring is the CHAMBER colour (House emerald, Senate
 * info blue), never the party: party is a neutral letter tag (PartyTag).
 * `ring` is the ring width in px; the spec uses 3 on cards and the panel,
 * 2 in the list and the similar-traders rows.
 */
export default function Headshot({ name, bioguideId, chamber, size = 32, ring = 2 }) {
  const shot = resolveHeadshot({ name, bioguideId });
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImg = Boolean(shot) && !failed;
  return (
    <span
      className={`ptk-shot ptk-shot--${String(chamber || '').toLowerCase() || 'none'}${
        showImg && !loaded ? ' ptk-shot--loading' : ''
      }`}
      style={{
        width: size,
        height: size,
        borderWidth: ring,
        fontSize: Math.max(10, Math.round(size * 0.3)),
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shot.src}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}

/** Neutral bordered letter tag, identical for D, R and I. */
export function PartyTag({ party }) {
  if (!party) return null;
  return (
    <span className="ptk-party dsc-mn" aria-label={`Party ${party}`}>
      {party}
    </span>
  );
}

/** HOUSE / SENATE chip in the chamber's tint. */
export function ChamberChip({ chamber }) {
  if (!chamber) return null;
  return (
    <span className={`ptk-chamber ptk-chamber--${String(chamber).toLowerCase()} dsc-mn`}>
      {chamber}
    </span>
  );
}
