import { notFound } from 'next/navigation';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { getCircuitEntry } from '@/lib/competitions/pitch-circuit';
import { PitchCircuitDetail } from '@/components/org/competitions/circuit/PitchCircuitDetail';

export const dynamic = 'force-dynamic';

function todayIso() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date());
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const entry = getCircuitEntry(slug);
  return { title: entry ? `${entry.name} | Pitch Circuit | Ezana` : 'Pitch Circuit | Ezana' };
}

export default async function PitchCircuitEntryPage({ params }) {
  const { slug } = await params;
  const entry = getCircuitEntry(slug);
  if (!entry) notFound();

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
      <PitchCircuitDetail entry={entry} todayIso={todayIso()} />
    </div>
  );
}
