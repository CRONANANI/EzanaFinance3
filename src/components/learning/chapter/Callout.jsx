'use client';

export function Callout({ body }) {
  return (
    <aside className="lc-edit-callout">
      <i className="bi bi-lightbulb" aria-hidden />
      <p>{body}</p>
    </aside>
  );
}
