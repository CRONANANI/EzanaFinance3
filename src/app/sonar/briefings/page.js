import SonarV2Client from './SonarV2Client';

/**
 * Sonar v2 briefings (sonar-templates-spec.md): a signed-in surface where a
 * ping routes to one of 21 templates, sweeps that template's datasets and
 * renders the three-column block briefing with follow-ups. The landing-page
 * Sonar demo keeps its own pipeline; this page is the template engine's
 * first full surface.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sonar briefings | Ezana',
  description:
    'Ping a company, politician, fund, industry, policy or question; Sonar routes it to the right research template, sweeps Ezana datasets and writes a cited brief.',
};

export default function SonarV2Page() {
  return <SonarV2Client />;
}
