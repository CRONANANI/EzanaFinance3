/**
 * The DMCA designated agent, from env so the page always matches the
 * registration at dmca.copyright.gov. Until all four are set, the copyright
 * page shows the fallback address and the build logs a warning.
 */
export const DMCA_FALLBACK_EMAIL = 'legal@ezana.world';

export function dmcaAgent() {
  const agent = {
    name: process.env.DMCA_AGENT_NAME || '',
    address: process.env.DMCA_AGENT_ADDRESS || '',
    email: process.env.DMCA_AGENT_EMAIL || '',
    phone: process.env.DMCA_AGENT_PHONE || '',
  };
  return agent.name && agent.address && agent.email && agent.phone ? agent : null;
}
