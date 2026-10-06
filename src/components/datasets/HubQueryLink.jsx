import Link from 'next/link';
import ShareButton from '@/components/native/ShareButton';
import { hubHref } from '@/lib/datasets/hubs';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import './hub-query-link.css';

/**
 * The slim row that replaces the EzanaQL bar on dataset pages: EzanaQL lives
 * on the dimension hubs, scoped to that dimension's datasets.
 */
export default function HubQueryLink({ dimension }) {
  const dim = DATASET_TAXONOMY.find((d) => d.id === dimension);
  if (!dim) return null;
  return (
    <p className="hql">
      <i className="bi bi-terminal" aria-hidden="true" />
      <Link className="hql-link" href={hubHref(dimension)}>
        Query this data with EzanaQL
      </Link>
      <span className="hql-meta">on the {dim.label} hub</span>
      <ShareButton className="hql-share" title="Ezana dataset" label="Share this page" />
    </p>
  );
}
