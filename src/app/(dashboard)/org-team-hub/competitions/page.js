import { redirect } from 'next/navigation';

/**
 * The old fund return competition page. Fund challenges now live on the
 * Competitions page, in its Fund challenges tab, so this address sends the
 * reader there.
 */
export default function OldFundCompetitionsPage() {
  redirect('/org-competitions?tab=fund');
}
