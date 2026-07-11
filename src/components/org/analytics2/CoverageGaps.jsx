'use client';

/** Holdings with no assigned analyst — actionable, each with an Assign affordance. */
export function CoverageGaps({ data = [], onAssign }) {
  const gaps = data || [];
  return (
    <div className="fa-card fa-card-pad">
      <div className="fa-card-head" style={{ padding: 0, marginBottom: '0.5rem' }}>
        <h3 className="fa-card-t">Coverage gaps</h3>
        <span className="fa-card-mut">{gaps.length} unassigned</span>
      </div>
      {gaps.length === 0 ? (
        <div className="fa-empty" style={{ padding: '1rem' }}>
          Every holding has an analyst.
        </div>
      ) : (
        gaps.map((g) => (
          <div className="fa-gap" key={`${g.ticker}-${g.team_id ?? ''}`}>
            <div>
              <div className="gt">{g.ticker}</div>
              <div className="gs">{g.sector || 'Unclassified'}</div>
            </div>
            <button type="button" className="fa-assign" onClick={() => onAssign?.(g)}>
              Assign
            </button>
          </div>
        ))
      )}
    </div>
  );
}
