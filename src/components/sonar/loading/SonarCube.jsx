'use client';

/**
 * SonarCube (Claude Design handoff, Nov 2026): the React wrapper around the
 * Canvas 2D cube engine. The engine reads its colours from tokens on the
 * wrapper (inside the loading state's force-dark-theme scope).
 */
import { useEffect, useRef } from 'react';
import { createSonarCube } from './sonarCubeEngine';
import { DIMENSIONS } from './dimensions';

/**
 * The Sonar research cube. Purely visual; all state comes in through props.
 *
 * @param {number|null} active   focused dimension 0-6, -1 = all, null = self-cycle (standalone use)
 * @param {number}      stage    0-3, grows the synthesis core
 * @param {boolean}     complete result has arrived: core flares, pulses converge
 */
export default function SonarCube({ active = null, stage = 0, complete = false, className = '' }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const engine = createSonarCube(canvas, {
      colorSource: canvas.parentElement,
      dimensionVars: DIMENSIONS.map((d) => d.colorVar),
      reducedMotion,
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setActive(active);
  }, [active]);
  useEffect(() => {
    engineRef.current?.setStage(stage);
  }, [stage]);
  useEffect(() => {
    if (complete) engineRef.current?.complete();
  }, [complete]);

  return (
    <div className={`sl-cube ${className}`.trim()}>
      <div className="sl-cube__halo" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="sl-cube__canvas"
        role="img"
        aria-label="Sonar research engine: a translucent cube with seven coloured data networks linking inside it"
      />
    </div>
  );
}
