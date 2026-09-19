/**
 * SonarOrbital, the orbital map centre piece for the Sonar band.
 *
 * This is NOT a re-implementation: it renders the original
 * PersonalizationRadar (the 7-dimension orbital card from the retired
 * Data and Resources section) unchanged, fed by the same shared taxonomy.
 * The wrapper only provides a sized, scoped container; every visual
 * adaptation for the dark band (label fill, grid stroke, SVG text sizes)
 * lives in sonar-band.css under .snr-orbital so the component itself stays
 * byte identical for any other consumer.
 *
 * PersonalizationRadar seeds its drift parameters with Math.random, but it
 * does so inside a mount effect that writes to a ref, so nothing random
 * reaches the server-rendered markup and hydration stays clean.
 */

'use client';

import PersonalizationRadar from '@/components/landing/PersonalizationRadar';
import { DIMENSION_SOURCE_DETAILS } from '@/lib/datasets/taxonomy';

export function SonarOrbital() {
  return (
    <div className="snr-orbital">
      <PersonalizationRadar sourceDetails={DIMENSION_SOURCE_DETAILS} />
    </div>
  );
}

export default SonarOrbital;
