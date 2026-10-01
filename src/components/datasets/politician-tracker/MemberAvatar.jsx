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
 *
 * Avatars are `unoptimized`: every source is already a small JPEG, and
 * /_next/image did a cold AVIF encode per portrait on first view.
 * theunitedstates.io URLs are rewritten to unitedstates.github.io (where
 * they redirect). A portrait that has painted is kept when a later photoUrl
 * arrives, so a face on screen never reloads.
 */
export const AVATAR_SIZE = { row: 40, card: 64, profile: 120 };

function initials(name) {
  const p = String(name || '')
    .replace(/[[\]]/g, '')
    .trim()
    .split(/\s+/);
  return ((p[0]?.[0] || '') + (p[p.length - 1]?.[0] || '')).toUpperCase() || '?';
}

const UNITEDSTATES = 'https://unitedstates.github.io/images/congress/225x275';

/* theunitedstates.io 301s to unitedstates.github.io; go straight there. */
function direct(url) {
  return String(url).replace(/^https:\/\/theunitedstates\.io\//, 'https://unitedstates.github.io/');
}

export function avatarSources({ name, bioguideId, photoUrl }) {
  const out = [];
  const shot = resolveHeadshot({ name, bioguideId });
  if (shot?.source === 'override') out.push(shot.src);
  if (photoUrl) out.push(direct(photoUrl));
  if (bioguideId) {
    out.push(`${UNITEDSTATES}/${bioguideId}.jpg`);
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
  /* The src that actually painted. Kept across later source-list changes
     for the same member so a late photoUrl does not reload a visible face. */
  const [shown, setShown] = useState(null);
  const who = bioguideId || name || '';
  useEffect(() => {
    setIdx(0);
    setLoaded(false);
    setShown(null);
  }, [who]);
  useEffect(() => {
    if (!shown) setIdx(0);
  }, [sources, shown]);

  const src = shown || sources[idx] || null;
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
          unoptimized
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          onLoad={() => {
            setLoaded(true);
            setShown(src);
          }}
          onError={() => {
            setLoaded(false);
            setShown(null);
            setIdx((i) => i + 1);
          }}
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
