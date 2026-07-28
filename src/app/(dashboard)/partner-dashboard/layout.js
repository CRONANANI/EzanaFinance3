import { requirePartner } from '@/lib/partner-server';

/**
 * Server-side partner gate — a non-partner is redirected to /home before any
 * partner chrome renders (defense-in-depth with the partner data's RLS). Access
 * is by partner status, enforced server-side, not by which login form was used.
 */
export default async function PartnerRouteLayout({ children }) {
  await requirePartner();
  return children;
}
