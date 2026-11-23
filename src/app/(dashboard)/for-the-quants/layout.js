/**
 * Quant Lab: one frame for every workspace under /for-the-quants. The sidebar
 * and the shared styles live here, so each workspace page renders only its
 * own content.
 *
 * Flat home canvas: QuantLabShell's root carries `ez-canvas ql-app`, and
 * home-canvas.css loads last. No legacy stylesheet is imported here.
 */
import { QuantLabShell } from '@/components/quants/shell/QuantLabShell';
import './for-the-quants.css';
import './simulation-visuals.css';
import './model-library.css';
import './quant-lab.css';
import './quant-risk.css';
import './quant-factors.css';
import '@/styles/home-canvas.css';
import { BRAND_COPY } from '@/lib/brand';

export const metadata = {
  title: BRAND_COPY.quant.title,
  description: BRAND_COPY.quant.description,
};

export default function QuantLabLayout({ children }) {
  return <QuantLabShell>{children}</QuantLabShell>;
}
