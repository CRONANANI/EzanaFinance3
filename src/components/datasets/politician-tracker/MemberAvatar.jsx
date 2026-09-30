'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { resolveHeadshot } from '@/lib/politicians/headshots';

/*
 * Member portrait inside the chamber ring (House emerald, Senate info blue;
 * never party, which is the neutral PartyTag beside it).
 *
 * Source order: congress_members.photo_url (a mirrored Storage copy, or the
 * public-domain theunitedstates.io set) → the official
 * bioguide.congress.gov/photo/{id}.jpg on error → initials. A licensed
 * override from headshots.js wins over both when one exists.
 *
 * Sizes per the brief: 40 in table rows, 64 on the Top-eight cards, 120 in
 * the member profile. `priority` on the Top eight only; lazy elsewhere.
 */
export const AVATAR_SIZE = { row: 40, card: 64, profile: 120 };

function initials(name) {
  const p = String(name || '')
    .replace(/[[\]]/g, '')
    .trim()
    .split(/\s+/);
  return ((p[0]?.[0] || '') + (p[p.length - 1]?.[0] || '')).toUpperCase() || '?';
}

export function avatarSources({ name, bioguideId, photoUrl }) {
  const out = [];
  const shot = resolveHeadshot({ name, bioguideId });
  if (shot?.source === 'override') out.push(shot.src);
  if (photoUrl) out.push(photoUrl);
  if (bioguideId) {
    if (!photoUrl) out.push(`https://theunitedstates.io/images/congress/225x275/${bioguideId}.jpg`);
    out.push(`https://bioguide.congress.gov/photo/${bioguideId}.jpg`);
  }
  return [...new Set(out)];
}

export default function MemberAvatar({
  name,
  bioguideId,
  chamber,
  photoUrl = null,
  size = AVATAR_SIZE.row,
  ring = 2,
  priority = false,
}) {
  const sources = useMemo(
    () => avatarSources({ name, bioguideId, photoUrl }),
    [name, bioguideId, photoUrl],
  );
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setIdx(0);
    setLoaded(false);
  }, [sources]);

  const src = sources[idx] || null;
  const inner = Math.max(1, size - ring * 2);
  return (
    <span
      className={`ptk-shot ptk-shot--${String(chamber || '').toLowerCase() || 'none'}${
        src && !loaded ? ' ptk-shot--loading' : ''
      }`}
      style={{
        width: size,
        height: size,
        borderWidth: ring,
        fontSize: Math.max(10, Math.round(size * 0.3)),
      }}
    >
      {src ? (
        <Image
          key={src}
          src={src}
          alt={name || ''}
          width={inner}
          height={inner}
          sizes={`${inner}px`}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setIdx((i) => i + 1);
          }}
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
