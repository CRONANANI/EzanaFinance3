import { SonarLoader } from '@/components/sonar/SonarLoader';
import '@/app/datasets/datasets-loading.css';

/** /sonar route loading: the green ground and the bouncing stack, nothing else
    (overrides the dashboard skeleton in (dashboard)/loading.js). */
export default function SonarLoading() {
  return (
    <div className="dsl-sonar dsl-sonar--app">
      <SonarLoader size="md" label="Loading Sonar" bare />
    </div>
  );
}
