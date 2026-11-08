import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { PitchCircuitClient } from '@/components/org/competitions/circuit/PitchCircuitClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pitch Circuit | Ezana' };

// Status pills and countdowns are computed against this one date on the server
// and passed down, so server and client render identically.
function todayIso() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date());
}

export default async function PitchCircuitPage() {
  const member = await getCurrentOrgMember(getUserClient());
  if (!member) {
    return (
      <div className="dashboard-page-inset">
        <div className="pcc-empty-page">This page is for organizational members only.</div>
      </div>
    );
  }
  return (
    <div className="dashboard-page-inset">
      <PitchCircuitClient todayIso={todayIso()} />
    </div>
  );
}
