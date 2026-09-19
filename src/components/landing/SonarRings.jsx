/**
 * SonarRings, the restored sonar centre piece for the landing band.
 *
 * Ports the concentric-ring recipe from the retired /sonar hero backdrop
 * (.sonar-rings, removed in the dashboard redesign): thin repeating radial
 * ring lines over a soft radial glow, faded out by a radial mask. Rescoped
 * from a fixed full-viewport layer to a sized square that sits in the band's
 * centre column, with a hub ping and an expanding pulse ring.
 *
 * Pure CSS, zero randomness, SSR-safe. Decorative only, so the whole thing is
 * aria-hidden: the mechanic it illustrates is described in the band's subhead.
 */

'use client';

export function SonarRings() {
  return (
    <div className="snr-rings-wrap" aria-hidden="true">
      <div className="snr-rings" />
      <div className="snr-rings-pulse snr-anim-ringpulse" />
      <div className="snr-rings-hub" />
    </div>
  );
}

export default SonarRings;
