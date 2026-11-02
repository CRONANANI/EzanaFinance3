import { SonarRouteLoader } from '@/components/sonar/SonarRouteLoader';
import '@/app/datasets/datasets-loading.css';

/** /sonar route loading: the Sonar ping screen on its own ground, nothing
    else (overrides the dashboard skeleton in (dashboard)/loading.js). */
export default function SonarLoading() {
  return (
    <div className="dsl-sonar dsl-sonar--app">
      <SonarRouteLoader />
    </div>
  );
}
