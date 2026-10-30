import { SonarRailLoader } from '@/components/sonar/SonarRailLoader';
import '@/app/datasets/datasets-loading.css';

/** /sonar route loading: the Sonar ping screen (metallic black ground, the
    rail of dimension icons and the bouncing stack), nothing else. Overrides
    the dashboard skeleton in (dashboard)/loading.js. */
export default function SonarLoading() {
  return (
    <div className="dsl-sonar dsl-sonar--app">
      <SonarRailLoader label="Loading Sonar" />
    </div>
  );
}
