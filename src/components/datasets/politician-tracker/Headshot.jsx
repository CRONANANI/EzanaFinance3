'use client';

/* The portrait itself lives in MemberAvatar.jsx; Headshot stays as its name
   for existing imports. */
export { default, AVATAR_SIZE } from './MemberAvatar';

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
