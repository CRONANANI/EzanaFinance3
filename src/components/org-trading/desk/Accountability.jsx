'use client';

import { fmtShare, convictionWord, NA } from '@/lib/org-trading-desk';
import {
  ArrowLink,
  Empty,
  Section,
  SectionError,
  Skel,
} from '@/components/org/command-center/parts';

/**
 * Member flag accuracy: how each member's flags have turned out once scored
 * (90 days after the flag, against the flag's benchmark). Kept apart from any
 * other rating. Executives and portfolio managers see the council; everyone
 * else sees their own line.
 */
export function MemberAccuracy({ accuracy, scope, memberId, onRetry }) {
  const loading = accuracy.status === 'loading';
  const rows = (accuracy.data?.members || []).filter(
    (m) => scope === 'council' || m.member_id === memberId,
  );
  return (
    <Section
      id="otd-accuracy"
      title={scope === 'council' ? 'Member flag accuracy' : 'Your flag accuracy'}
      className="otd-accuracy"
    >
      {accuracy.status === 'error' ? (
        <SectionError message="Could not load flag accuracy." onRetry={onRetry} />
      ) : loading ? (
        <div className="otd-skelrows" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skel key={i} h={14} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Empty>
          {scope === 'council'
            ? 'No flags have been raised yet, so there is nothing to score.'
            : 'You have not raised a flag yet, so there is nothing to score.'}
        </Empty>
      ) : (
        <>
          <div className="otd-scroll">
            <table className="otd-table otd-table--accuracy">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col" className="otd-num">
                    Flags
                  </th>
                  <th scope="col" className="otd-num">
                    Correct
                  </th>
                  <th scope="col" className="otd-num">
                    Green / red
                  </th>
                  <th scope="col">Conviction</th>
                  <th scope="col" className="otd-num">
                    Rejected, proved right
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.member_id}>
                    <td role="rowheader" className="otd-strong">
                      {m.display_name || 'Member'}
                    </td>
                    <td className="otd-num tcc-mono">{m.flags_raised}</td>
                    <td
                      className="otd-num tcc-mono"
                      title={
                        m.scored > 0
                          ? `${m.correct} of ${m.scored} scored flags`
                          : 'No flag has reached its 90 day score yet'
                      }
                    >
                      {m.accuracy_pct == null ? (
                        <span className="tcc-na">{NA}</span>
                      ) : (
                        fmtShare(m.accuracy_pct)
                      )}
                    </td>
                    <td className="otd-num tcc-mono">
                      <span className="tcc-pos">{m.green}</span> /{' '}
                      <span className="tcc-neg">{m.red}</span>
                    </td>
                    <td
                      title={
                        m.avg_conviction == null
                          ? undefined
                          : `Average ${m.avg_conviction.toFixed(2)} on a scale of 1 (low) to 3 (high)`
                      }
                    >
                      {convictionWord(m.avg_conviction)}
                    </td>
                    <td className="otd-num tcc-mono">{m.rejected_and_wrong}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="otd-foot">
            Flags counts every flag a member has raised. A flag is scored 90 days after it is
            raised. Conviction is the average of the member&apos;s flags. The last column counts
            flags a member rejected that later proved right.
          </p>
        </>
      )}
    </Section>
  );
}

/** Compliance and coverage gaps, counted from the holdings in the member's scope. */
export function CoverageGaps({ book, gaps, scopeLabel, breaches, breachesLoading }) {
  const loading = book.status === 'loading';
  const failed = book.status === 'error';
  const cell = (v) => (failed || v == null ? NA : String(v));
  const rows = [
    { key: 'uncovered', label: 'Positions with no covering analyst', value: gaps.uncovered },
    { key: 'noHead', label: 'Positions with no sector head', value: gaps.noHead },
    { key: 'noTeam', label: 'Positions on no team', value: gaps.noTeam },
    { key: 'noThesis', label: 'Positions with no thesis on file', value: gaps.noThesis },
    { key: 'unpriced', label: 'Positions not priced yet', value: gaps.unpriced },
  ];
  return (
    <Section
      id="otd-gaps"
      title="Compliance and coverage gaps"
      className="otd-gaps"
      aside={<span className="otd-scope">{scopeLabel}</span>}
    >
      <dl className="tcc-pairs" aria-busy={loading || undefined}>
        {breaches !== undefined && (
          <div className="tcc-pair">
            <dt>Open compliance breaches (whole fund)</dt>
            <dd className={`tcc-mono${Number(breaches) > 0 ? ' tcc-neg' : ''}`}>
              {breachesLoading ? <Skel w={24} h={12} /> : breaches == null ? NA : String(breaches)}
            </dd>
          </div>
        )}
        {rows.map((r) => (
          <div className="tcc-pair" key={r.key}>
            <dt>{r.label}</dt>
            <dd className="tcc-mono">{loading ? <Skel w={24} h={12} /> : cell(r.value)}</dd>
          </div>
        ))}
      </dl>
      <div className="otd-gaps__links">
        {breaches !== undefined && (
          <ArrowLink href="/org-team-hub/compliance">Open compliance</ArrowLink>
        )}
        <ArrowLink href="/org-team-hub/org-chart">Open org chart</ArrowLink>
      </div>
    </Section>
  );
}
