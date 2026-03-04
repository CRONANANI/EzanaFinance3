#!/usr/bin/env node
/**
 * Copies app-legacy to public/app-legacy so the HTML/CSS playground and pages
 * are served by Next.js at /app-legacy/playground.html, /app-legacy/pages/*, etc.
 * Run before build so Vercel deployment includes the legacy pages.
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'app-legacy');
const dest = path.join(__dirname, '..', 'public', 'app-legacy');

function copyRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.warn('app-legacy not found, skipping copy');
    return;
  }
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true });
  }
  copyRecursive(src, dest);
  console.log('Copied app-legacy to public/app-legacy');
} catch (err) {
  console.error('Error copying app-legacy:', err.message);
  process.exit(1);
}
