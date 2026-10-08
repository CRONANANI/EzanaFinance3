import { getNightLights } from '@/lib/eyes/store';
import { worldLandPath } from '@/lib/eyes/world-path';
import NightLightsClient from './NightLightsClient';

/**
 * Night lights from satellites (Eyes Above). Server component; reads are cached for an hour under
 * the `eyes` tag. No sample data.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Night lights from satellites | Ezana',
  description:
    'Monthly night-time light brightness over ports, industrial areas, energy basins and cities from NASA Black Marble (VIIRS), a proxy for economic activity.',
};

export default async function Page() {
  let data = null;
  let error = false;
  try {
    data = await getNightLights();
  } catch (e) {
    console.error('[eyes] night-lights:', e?.message || e);
    error = true;
  }
  return <NightLightsClient data={data} error={error} landPath={worldLandPath()} />;
}
