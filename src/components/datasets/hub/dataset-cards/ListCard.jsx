import Link from 'next/link';
import './dataset-cards.css';

/**
 * A dataset's component card on a hub: a titled, ranked list with a value
 * per row, in the hub's card chrome. Server-safe (no state); hosts pass the
 * rows already shaped. `empty` is shown when there are no rows; `error`
 * when the read failed.
 */
export default function ListCard({
  id,
  title,
  dataset,
  href,
  desc,
  rows = [],
  empty,
  error = false,
  foot,
}) {
  return (
    <section className="hub-card hdc" aria-labelledby={`hdc-${id}`}>
      <div className="hub-card-head">
        <h3 className="hub-card-title" id={`hdc-${id}`}>
          {title}
        </h3>
        {dataset ? (
          <Link href={href} className="hub-tag hdc-tag">
            {dataset}
          </Link>
        ) : null}
      </div>
      {desc ? <p className="hub-card-desc">{desc}</p> : null}
      {error ? (
        <p className="hub-empty">This card could not load just now. Reload the page in a minute.</p>
      ) : !rows.length ? (
        <p className="hub-empty">{empty}</p>
      ) : (
        <ol className="hdc-rows">
          {rows.map((r, i) => (
            <li key={r.key || i} className="hdc-row">
              <span className="hdc-rank">{i + 1}</span>
              <span className="hdc-main">
                <span className="hdc-name">
                  {r.href ? (
                    r.external ? (
                      <a href={r.href} target="_blank" rel="noopener noreferrer">
                        {r.name}
                      </a>
                    ) : (
                      <Link href={r.href}>{r.name}</Link>
                    )
                  ) : (
                    r.name
                  )}
                </span>
                {r.meta ? <span className="hdc-meta">{r.meta}</span> : null}
              </span>
              {r.value != null ? <span className="hdc-value">{r.value}</span> : null}
            </li>
          ))}
        </ol>
      )}
      {foot ? <p className="hub-card-src">{foot}</p> : null}
    </section>
  );
}
