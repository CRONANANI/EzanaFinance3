'use client';

/**
 * The hard footer every /datasets page ends on, drawn once by the datasets
 * layout under the page content (the pages used to end on their own loose
 * legal lines, or on nothing). Brand block, the dataset dimensions, product
 * links and the standing sources note. Tokens only; light and dark.
 */
import Link from 'next/link';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import './dataset-page-footer.css';

const DIMENSIONS = [
  ['Capitol Watch', '/datasets/politician-tracker'],
  ['Government money', '/datasets/government/contracts'],
  ['Titans Shadow', '/datasets/institutional'],
  ['Eyes Above', '/datasets/supply-chain'],
];
const PRODUCT = [
  ['All datasets', '/datasets'],
  ['EzanaQL', '/ezana-api'],
  ['Pricing', '/pricing'],
  ['Help center', '/help-center'],
];

export default function DatasetPageFooter() {
  return (
    <footer className="dsx-foot" aria-label="Dataset pages footer">
      <div className="dsx-foot-inner">
        <div className="dsx-foot-brand">
          <Link href="/" className="dsx-foot-logo">
            <span className="dsx-foot-wordmark">Ezana</span>
            <EzanaNavLogo width={24} height={27} priority={false} />
          </Link>
          <p className="dsx-foot-tag">
            Public filings and open data, read as datasets. Findings, not investment advice.
          </p>
        </div>
        <nav className="dsx-foot-col" aria-label="Dataset dimensions">
          <h4>Datasets</h4>
          {DIMENSIONS.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <nav className="dsx-foot-col" aria-label="Product">
          <h4>Product</h4>
          {PRODUCT.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="dsx-foot-legal">
        Sources are named on each page beside the data they feed. Figures are reproduced from public
        records as filed; nothing here is investment advice.
      </p>
    </footer>
  );
}
