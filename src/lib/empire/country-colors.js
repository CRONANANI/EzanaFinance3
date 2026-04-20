/**
 * @fileoverview
 * Deterministic country-color palette for the Big Cycle — Rise & Fall
 * overlay chart. With 40-60 lines on one canvas, a naive "pick the next
 * color from a list" approach produces visually similar neighbors; the
 * golden-angle hue rotation spreads colors maximally around the hue
 * circle so adjacent-rank countries always look different.
 *
 * Anchor countries (USA/CHN/GBR/DEU/JPN) use canonical colors regardless
 * of the hash so the "reference five" keep a stable look as the country
 * set grows.
 */

/** @type {Readonly<Record<string, string>>} */
const ANCHOR_COLORS = Object.freeze({
  USA: 'hsl(210, 85%, 55%)',
  CHN: 'hsl(0, 80%, 55%)',
  GBR: 'hsl(270, 65%, 55%)',
  DEU: 'hsl(45, 95%, 50%)',
  JPN: 'hsl(340, 75%, 55%)',
});

/**
 * Hash an ISO-3 code to a deterministic, visually-distinct HSL color.
 * Uses the golden angle (137.508°) so successive hashes land on maximally
 * separated points of the hue circle.
 *
 * @param {string} iso3
 * @returns {string} CSS hsl() string
 */
export function colorForCountry(iso3) {
  let h = 0;
  for (let i = 0; i < iso3.length; i += 1) {
    h = (Math.imul(h, 31) + iso3.charCodeAt(i)) | 0;
  }
  const hue = (Math.abs(h) * 137.508) % 360;
  // Alternate sat/lightness bands so neighboring-hue countries don't
  // flatten into the same visual weight.
  const satBand = Math.abs(h) % 3;
  const saturation = [70, 60, 80][satBand];
  const lightness = satBand === 2 ? 55 : 50;
  return `hsl(${hue.toFixed(1)}, ${saturation}%, ${lightness}%)`;
}

/**
 * Public color resolver. Anchor countries always win over the hash
 * palette so the page's "reference five" keep a canonical look.
 *
 * @param {string} iso3
 * @returns {string}
 */
export function colorFor(iso3) {
  return ANCHOR_COLORS[iso3] ?? colorForCountry(iso3);
}

/** ISO-3 codes of the default anchor set. */
export const ANCHOR_ISO3S = Object.freeze(['USA', 'CHN', 'GBR', 'DEU', 'JPN']);
