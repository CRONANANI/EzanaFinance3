#!/usr/bin/env node
/**
 * Wrapper for `backfill-changelog.mjs` (ESM). Run: node scripts/backfill-changelog.js
 */
const { spawnSync } = require('child_process');
const path = require('path');

const r = spawnSync(process.execPath, [path.join(__dirname, 'backfill-changelog.mjs')], {
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
