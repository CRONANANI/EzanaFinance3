'use client';

/** The shared Trades by state card, opening the hub's member drawer. */
import StateMap from '@/components/datasets/hub/StateMap';
import { useCwh } from './CwhProvider';

export default function CapitolStateMap({ data }) {
  const { openMember } = useCwh();
  return (
    <StateMap data={data} onMember={(m) => openMember(m.id, { name: m.name, party: m.party })} />
  );
}
