'use client';

import { useState } from 'react';
import ProbabilityLatticeCard from './ProbabilityLatticeCard';
import TailProbabilityRidgeCard from './TailProbabilityRidgeCard';
import RelationshipGraphCard from './RelationshipGraphCard';

/**
 * The animated simulation visuals. They run on generated sample data, not on
 * a stored backtest, so they sit apart under a Sample data label.
 */
export function SampleSimulations() {
  const [seed, setSeed] = useState(7);
  return (
    <section className="ftq-sim-section" aria-label="Strategy simulation visuals">
      <div className="qlx-head">
        <div className="qlx-row">
          <h2 className="qlx-title">Simulation visuals</h2>
          <span className="qlx-tag">Sample data</span>
        </div>
        <button type="button" className="qlx-btn qlx-btn--sm" onClick={() => setSeed((s) => s + 1)}>
          <i className="bi bi-shuffle" aria-hidden /> New sample
        </button>
      </div>
      <p className="qlx-note" style={{ marginBottom: '0.875rem' }}>
        Illustrations of how outcomes can spread. They are not connected to the run above.
      </p>
      <div className="ftq-sim-grid">
        <ProbabilityLatticeCard seed={seed} />
        <TailProbabilityRidgeCard seed={seed} />
      </div>
      <RelationshipGraphCard seed={seed} />
    </section>
  );
}

export default SampleSimulations;
