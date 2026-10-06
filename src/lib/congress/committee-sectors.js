/**
 * Committee -> sector map: STATIC, human-curated, EDITORIAL.
 *
 * Parent committee thomas ID -> sector keys from SECTORS in
 * policy-sector-map.js. Each entry rests on the committee's published
 * jurisdiction (committees-current, congress-legislators project) and covers
 * only committees with a clear market remit. Every ID was checked against the
 * fetched committee list (Oct 2026). Anywhere this shows on screen it carries
 * COMMITTEE_SECTOR_NOTE.
 */
import { SECTORS } from './policy-sector-map';

export const COMMITTEE_SECTOR_NOTE =
  "Sector links are Ezana's reading of each committee's published jurisdiction.";

export const COMMITTEE_SECTORS = {
  HSAS: ['defense'], // House Armed Services: military and defense
  SSAS: ['defense'], // Senate Armed Services: military and defense
  HSIF: ['energy', 'pharma', 'providers', 'tech'], // Energy and Commerce: energy, FDA, health, telecom
  HSBA: ['banks', 'fintech'], // Financial Services: banking, securities
  SSBK: ['banks', 'fintech'], // Banking, Housing, and Urban Affairs
  SSEG: ['energy', 'cleanEnergy'], // Energy and Natural Resources: energy, nuclear
  HSII: ['energy'], // House Natural Resources: energy production, mineral lands
  HSAG: ['agriculture'], // House Agriculture
  SSAF: ['agriculture'], // Senate Agriculture, Nutrition, and Forestry
  SSCM: ['tech', 'autos', 'industrials'], // Commerce, Science, and Transportation
  HSPW: ['industrials', 'autos'], // Transportation and Infrastructure
  SSEV: ['industrials'], // Environment and Public Works: public infrastructure
  SSHR: ['pharma', 'providers'], // HELP: HHS, FDA
  HSSY: ['tech', 'semis'], // Science, Space, and Technology: NIST, research
};

/** Sector keys a committee (or a subcommittee, via its parent) oversees. */
export function sectorsForCommittee(thomasId, parentThomasId = null) {
  return COMMITTEE_SECTORS[parentThomasId || thomasId] || [];
}

/** Sector key -> display label. */
export function sectorLabel(key) {
  return SECTORS[key]?.label || key;
}
