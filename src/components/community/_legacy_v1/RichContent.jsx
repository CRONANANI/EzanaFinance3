'use client';

export function RichContent({ text }) {
  if (!text) return null;
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((p, i) => {
        if (/^\$[A-Z]{1,5}$/.test(p))
          return (
            <span key={i} className="ez-cashtag">
              {p}
            </span>
          );
        if (/^#[a-z0-9_]+$/i.test(p))
          return (
            <span key={i} className="ez-hashtag">
              {p}
            </span>
          );
        if (/^@[a-z0-9_]+$/i.test(p)) {
          return (
            <span key={i} style={{ color: 'var(--info)', fontWeight: 500 }}>
              {p}
            </span>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
