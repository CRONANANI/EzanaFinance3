/**
 * The /datasets page backdrop (Oct 28 redesign, datasets-index-handoff): a
 * large dotted world map and a faint perspective grid floor under the Sonar
 * stage. Both are CSS: the map is a mask over a token colour, so the dots take
 * the emerald from the theme (orbital-map.css, .dsi-backdrop).
 *
 * The map is generated from Natural Earth land outlines (110m) and lives at
 * public/images/datasets/worldmap-bg.svg. Decorative: aria-hidden.
 *
 * Replaces the looping globe video (public/videos/datasets-globe.mp4), which
 * nothing else uses.
 */
export default function GlobeBackground() {
  return (
    <div className="dsi-backdrop" aria-hidden="true">
      <div className="dsi-worldmap" />
      <div className="dsi-floor" />
    </div>
  );
}
