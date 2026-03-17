/**
 * Optimize presidential portrait images for the S&P 500 chart.
 * Resizes to 224x224 for crisp display on retina/high-DPI screens.
 * Run: node scripts/optimize-president-images.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC_DIR = path.join(__dirname, '../public/images/ezana-echo');
const SIZE = 224; // 2x the 112px display size for retina

const IMAGES = [
  'bill-clinton.png',
  'george-w-bush.png',
  'barack-obama.png',
  'donald-trump.png',
  'joe-biden.png',
  'george-hw-bush.png',
];

async function optimize() {
  for (const file of IMAGES) {
    const srcPath = path.join(SRC_DIR, file);
    if (!fs.existsSync(srcPath)) {
      console.warn(`Skipping ${file} (not found)`);
      continue;
    }
    const metadata = await sharp(srcPath).metadata();
    const { width, height } = metadata;
    const destPath = path.join(SRC_DIR, file.replace('.png', '-opt.png'));
    await sharp(srcPath)
      .resize(SIZE, SIZE, {
        fit: 'cover',
        position: 'center',
        kernel: sharp.kernel.lanczos3,
      })
      .png({ quality: 95, compressionLevel: 6 })
      .toFile(destPath);
    console.log(`Optimized ${file} (${width}x${height} -> ${SIZE}x${SIZE})`);
    fs.renameSync(destPath, srcPath);
  }
  console.log('Done.');
}

optimize().catch((e) => {
  console.error(e);
  process.exit(1);
});
