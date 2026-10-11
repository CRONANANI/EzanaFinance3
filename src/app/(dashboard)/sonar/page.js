'use client';

import { SonarExperience } from '@/components/sonar/SonarExperience';

/** Ezana Sonar for signed-in users. The experience itself lives in
    SonarExperience so the Datasets page can share it. */
export default function SonarPage() {
  return <SonarExperience />;
}
