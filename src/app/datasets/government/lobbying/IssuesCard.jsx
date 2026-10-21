'use client';

/**
 * Card 3, Issue Landscape: share of filings citing each issue. Counts only;
 * the LDA does not report dollars per issue. A row sets the page filter.
 */
import { issueShareRows } from '@/lib/lobbying/page-model';
import { fmtCount, fmtPct } from '@/lib/lobbying/page-format';
import { Card, SkelRows } from './ui';

export default function IssuesCard({ view, selected, onPick, sub, partial, empty }) {
  const { rows } = issueShareRows(view.data, 12);
  const isEmpty = view.status === 'ready' && !rows.length;
  return (
    <Card
      id="lbx-issues"
      className="lbx-card--fill"
      title="Share of filings by issue"
      sub={sub}
      status={view.status}
      onRetry={view.retry}
      empty={isEmpty ? empty : null}
      partial={partial}
      skeleton={<SkelRows n={12} h={42} />}
      footer={
        <div className="lbx-notes">
          <p>The LDA does not report dollars per issue, so this shows activity, not spend.</p>
          <p>Filings cite several issues, so shares total more than 100%.</p>
        </div>
      }
    >
      <ul className="lbx-iss">
        {rows.map((r) => {
          const on = selected === r.code;
          return (
            <li key={r.code}>
              <button
                type="button"
                className={`lbx-iss-row lbx-row${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => onPick(on ? null : r.code)}
                aria-label={`${r.label}: ${fmtPct(r.share)} of filings, ${fmtCount(r.filings)} filings. ${on ? 'Clear the issue filter.' : 'Filter the page to this issue.'}`}
              >
                <span className="lbx-iss-name lbx-ellipsis" title={r.label}>
                  {r.label}
                </span>
                <span className="lbx-iss-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(2, r.bar)}%` }} />
                </span>
                <span className="lbx-iss-val">
                  <span className="lbx-mono lbx-iss-share">{fmtPct(r.share)}</span>
                  <span className="lbx-mono lbx-iss-n">{fmtCount(r.filings)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
