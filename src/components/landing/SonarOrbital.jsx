/**
 * SonarOrbital, the orbital map centre piece for the Sonar band.
 *
 * It renders SonarOrbitalMap, the band's fork of PersonalizationRadar: the
 * same 7-dimension orbital card from the retired Data and Resources section,
 * with the axis titles replaced by the Datasets-menu icons and the trailing
 * arcs and dashboard pill removed. PersonalizationRadar itself is untouched
 * and still serves ResourcesSection.
 *
 * The wrapper only provides a sized, scoped container; the remaining visual
 * adaptation for the dark band (grid stroke, icon states) lives in
 * sonar-band.css under .snr-orbital.
 *
 * The map seeds its drift parameters with Math.random, but inside a mount
 * effect that writes to a ref, so nothing random reaches the server-rendered
 * markup and hydration stays clean.
 *
 * `relevance` is the per-dimension 0..1 vector a ping returns. It is passed
 * straight through: the map turns it into each dot's resting radius, so after
 * a ping the dimensions that actually matched sit out by their icons.
 */

'use client';

import SonarOrbitalMap from '@/components/landing/SonarOrbitalMap';
import { DIMENSION_SOURCE_DETAILS } from '@/lib/datasets/taxonomy';

export function SonarOrbital({ relevance = null }) {
  return (
    <div className="snr-orbital">
      <SonarOrbitalMap sourceDetails={DIMENSION_SOURCE_DETAILS} relevance={relevance} />
    </div>
  );
}

export default SonarOrbital;
