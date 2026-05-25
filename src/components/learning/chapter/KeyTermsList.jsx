'use client';

export function KeyTermsList({ terms = [] }) {
  return (
    <div className="lc-edit-keyterms-legacy">
      <strong>Key terms:</strong>{' '}
      {terms.map((t, i) => (
        <span key={i}>
          {typeof t === 'string' ? t : t.name}
          {i < terms.length - 1 ? ', ' : ''}
        </span>
      ))}
    </div>
  );
}
