'use client';

/**
 * SonarFace: a member of Congress's portrait with fallbacks (Nov 21 2026, moved out of
 * SonarSection so the congressional profile report can use it too). `srcs` is tried in order
 * (the mirrored copy, then the public-domain sources) and initials show once every one fails;
 * official portraits are addressed by BioGuide id and a given id can 404. Decorative: the
 * member's name is always printed beside it. Styles: .snr-face in sonar-band.css.
 */
import { useState } from 'react';

export function initialsOf(name) {
  const words = String(name || '')
    .replace(/,.*$/, '')
    .split(/\s+/)
    .filter((w) => w && !/^(jr|sr|ii|iii|iv)\.?$/i.test(w));
  if (!words.length) return '';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}

const PARTY_CLASS = { D: 'snr-face--d', R: 'snr-face--r', I: 'snr-face--i' };

export function Face({ name, src, srcs, party, size = 'sm' }) {
  const list = srcs?.length ? srcs : src ? [src] : [];
  const [at, setAt] = useState(0);
  const current = list[at];
  return (
    <span className={`snr-face snr-face--${size} ${PARTY_CLASS[party] || ''}`} aria-hidden="true">
      {current ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={current}
          src={current}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setAt((i) => i + 1)}
        />
      ) : (
        <span className="snr-face-initials">{initialsOf(name)}</span>
      )}
    </span>
  );
}

export default Face;
