'use client';

/**
 * Sonar's in-flight state (Oct 29): the seven dimension icons from the
 * /datasets console rail, connected by one bus line, with a pulse sweeping
 * the bus and lighting each dimension as it passes. Icons and order come from
 * the taxonomy (biIcon), so the loader can never drift from the rail.
 *
 * Oct 30: on a metallic black ground (the overlay that holds it), with the
 * icons in Ezana green, and the bouncing dataset stack (SonarLoader, bare)
 * hovering centred above the rail, feeding the beam into the bus.
 *
 * Decorative stage (aria-hidden) plus a visually hidden live label. Under
 * prefers-reduced-motion the rail and the stack are static.
 */
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import { SonarLoader } from '@/components/sonar/SonarLoader';
import './sonar-rail-loader.css';

const NODES = DATASET_TAXONOMY.map((d) => ({ id: d.id, icon: d.biIcon }));

export function SonarRailLoader({ label = 'Sonar is pinging' }) {
  return (
    <div className="srl-wrap" role="status" aria-live="polite">
      <div className="srl-hover" aria-hidden="true">
        <SonarLoader size="md" label={label} bare />
      </div>
      <div className="srl-rail" aria-hidden="true" style={{ '--srl-n': NODES.length }}>
        <span className="srl-beam" />
        <span className="srl-bus" />
        <span className="srl-pulse" />
        {NODES.map((n, i) => (
          <span key={n.id} className="srl-node" style={{ '--srl-i': i }}>
            <span className="srl-stem" />
            <span className="srl-tile">
              <i className={`bi ${n.icon}`} />
            </span>
          </span>
        ))}
      </div>
      <span className="srl-sr">{label}</span>
    </div>
  );
}

export default SonarRailLoader;
