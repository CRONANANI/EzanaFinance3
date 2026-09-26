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
 * `hubLabel` names what was pinged, in the hub, for as long as a result is
 * live. The app's /sonar page renders no orbital today, so this lands in the
 * fork only; an app orbital should import this component to inherit it.
 */

'use client';

import { useEffect, useState } from 'react';
import SonarOrbitalMap from '@/components/landing/SonarOrbitalMap';
import { DIMENSION_SOURCE_DETAILS } from '@/lib/datasets/taxonomy';

export function SonarOrbital({
  relevance = null,
  hubLabel = null,
  hubTicker = null,
  compact = false,
}) {
  /* Nothing below 1024. The map's phone fallback is a seven-pill grid, which
     is not what the band's mobile composition wants, and the map also runs a
     requestAnimationFrame drift loop and framer-motion timers. display: none
     would hide the grid and keep both running on the device least able to
     afford them, so the component is UNMOUNTED instead.

     The query is read after mount, never during render, so the server output
     and the first client render agree and hydration stays clean; the phone
     then drops it on the next commit. */
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(max-width: 1023px)');
    const apply = () => setIsPhone(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  if (isPhone) return null;

  return (
    <div className="snr-orbital">
      <SonarOrbitalMap
        sourceDetails={DIMENSION_SOURCE_DETAILS}
        relevance={relevance}
        hubLabel={hubLabel}
        hubTicker={hubTicker}
        compact={compact}
      />
    </div>
  );
}

export default SonarOrbital;
