/**
 * Privacy Policy content — read at module load (build/server boot), not per-request.
 * Ensures Vercel's NFT tracer bundles privacy-policy-source.html with the route.
 */
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'src/app/privacy-policy/privacy-policy-source.html');
const RAW = fs.readFileSync(FILE, 'utf8');

function extract(raw) {
  const styles = [];
  const re = /<style>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(raw)) !== null) {
    styles.push(m[1]);
  }
  const html = raw.replace(/<style>[\s\S]*?<\/style>\s*/gi, '');
  return { css: styles.join('\n\n'), html };
}

export const { css: PRIVACY_POLICY_CSS, html: PRIVACY_POLICY_HTML } = extract(RAW);
