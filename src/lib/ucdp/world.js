/**
 * The Armed Conflict Tracker's map outlines (built once on the server from world-atlas
 * countries-110m; see world-core.js).
 */
import world from 'world-atlas/countries-110m.json';
import { buildConflictWorld } from './world-core';

let cached = null;

export function conflictWorld() {
  if (!cached) cached = buildConflictWorld(world);
  return cached;
}
