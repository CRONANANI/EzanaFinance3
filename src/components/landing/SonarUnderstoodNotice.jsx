'use client';

/**
 * What Sonar understood, under the brief's title. A spelling fix shows
 * "Showing results for X. Search instead for Y" (the raw words, re-pinged
 * with corrections off). A low-confidence reading shows its alternatives as
 * chips that re-ping with that entity forced. Copy: findings only.
 */
import './sonar-understood.css';

const KIND_LABEL = {
  ticker: 'Ticker',
  country: 'Country',
  industry: 'Industry',
  sector: 'Sector',
  state_province: 'State',
  theme: 'Theme',
};

export function SonarUnderstoodNotice({ understood, rawQuery, onSearchInstead, onForce }) {
  const corrected = (understood?.corrections || []).length > 0;
  const ambiguities = (understood?.ambiguities || []).filter((a) => a.alternatives?.length);
  if (!corrected && !ambiguities.length) return null;
  return (
    <div className="snr-understood" role="status">
      {corrected ? (
        <p className="snr-understood-line">
          Showing results for <strong>{understood.display || understood.corrected}</strong>.{' '}
          <button type="button" className="snr-understood-link" onClick={onSearchInstead}>
            Search instead for “{rawQuery}”
          </button>
        </p>
      ) : null}
      {ambiguities.map((a) => (
        <p key={a.surface} className="snr-understood-line">
          Read “{a.surface}” as{' '}
          {a.chosen.startsWith('country:') ? 'a country' : a.chosen.split(':')[0]}. Also:
          {a.alternatives.slice(0, 3).map((alt) => (
            <button
              key={`${alt.kind}:${alt.id}`}
              type="button"
              className="snr-understood-chip"
              onClick={() =>
                onForce({ kind: alt.kind, id: alt.id, label: alt.label, surface: a.surface })
              }
            >
              {KIND_LABEL[alt.kind] || alt.kind}: {alt.label || alt.id}
            </button>
          ))}
        </p>
      ))}
    </div>
  );
}

export default SonarUnderstoodNotice;
