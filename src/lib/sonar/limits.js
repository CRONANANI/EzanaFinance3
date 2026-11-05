/**
 * Sonar input limits, shared by every Sonar input and route (client-safe).
 * Nov 2026: raised from 300 to 600 characters, so a research assignment with
 * its instructions ("... Compare semiconductors, data centers, power ...
 * Do not make unsupported investment recommendations.") fits.
 */
export const SONAR_QUERY_MAX = 600;
export const SONAR_QUERY_MIN = 2;
