'use client';

const TERM_COLORS = {
  amber: '#E89B2F',
  blue: '#3E7AD8',
  red: '#D8513D',
  violet: '#7B6CD4',
  coralDeep: '#E47A65',
  green: '#10A06A',
};

export function KeyTermCards({ eyebrow, pillLabel, terms = [] }) {
  return (
    <section className="lc-edit-keyterms">
      <header className="lc-edit-keyterms-head">
        <span className="lc-edit-keyterms-eyebrow">
          <i className="bi bi-tag-fill" /> {eyebrow || 'Key terms unlocked'}
        </span>
        {pillLabel && (
          <span className="lc-edit-keyterms-pill">
            <i className="bi bi-stars" /> {pillLabel}
          </span>
        )}
      </header>
      <div className="lc-edit-keyterms-grid">
        {terms.map((t, i) => {
          const color = TERM_COLORS[t.color] || TERM_COLORS.green;
          return (
            <article key={i} className="lc-edit-keyterm">
              <span className="lc-edit-keyterm-swatch" style={{ background: `${color}22` }}>
                <span style={{ background: color }} />
              </span>
              <div className="lc-edit-keyterm-name">{t.name}</div>
              <div className="lc-edit-keyterm-def">{t.definition}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
