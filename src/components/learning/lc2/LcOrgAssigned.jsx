'use client';

import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';

/* Placeholder assignments until the org assignment API lands; shape matches
   what the table will render from the real endpoint. */
const ASSIGNMENTS = [
  { title: 'Valuation Fundamentals', status: 'In progress', due: 'Apr 12' },
  { title: 'Pitch Deck Writing', status: 'Assigned', due: 'Apr 14' },
  { title: 'Risk & Position Sizing', status: 'Assigned', due: 'Apr 18' },
];

/**
 * Org assignments as an editorial table: thick-ruled header, dotted rows,
 * mono due dates.
 */
export function LcOrgAssigned() {
  const { orgData } = useOrg();
  const label = orgData?.org?.name ? `${orgData.org.name} assignments` : 'Assigned learning';

  return (
    <section>
      <div className="lc3-sec-head">
        <h2 className="lc3-sec-title">{label}</h2>
        <Link href="/org-team-hub" className="lc3-link">
          Team Hub
        </Link>
      </div>

      <div className="lc3-table-scroll">
        <table className="lc3-table">
          <thead>
            <tr>
              <th className="lc3-th">Course</th>
              <th className="lc3-th lc3-th--r">Status</th>
              <th className="lc3-th lc3-th--r">Due</th>
            </tr>
          </thead>
          <tbody>
            {ASSIGNMENTS.map((a) => (
              <tr className="lc3-tr" key={a.title}>
                <td className="lc3-td lc3-td--title">{a.title}</td>
                <td className="lc3-td lc3-td--r lc3-dim">{a.status}</td>
                <td className="lc3-td lc3-td--r lc3-mono">{a.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
