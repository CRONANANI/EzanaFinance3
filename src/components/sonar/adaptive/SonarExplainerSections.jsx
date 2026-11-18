'use client';

/**
 * Sonar adaptive research: financial explainer blocks (Nov 18, 2026). Family 08, built by
 * lib/sonar/adaptive/explainer.js from the reviewed glossary (methodology-glossary.js).
 *
 *   ExDefinitions  numbered terms
 *   ExEquations    formulas in the mono face, each with its convention
 *   ExMeasures     which measure answers which question (a two-column table)
 *   ExDiagram      the conceptual path, observed or method-stated at each step; no series
 *   ExMethod       numbered method notes with their caution
 *   ExSources      the kinds of source to verify against
 *
 * Flat sections on the canvas (Branding and UI Guide, sections 4 and 22): no fill, border or
 * radius; hairlines divide rows. Classes are page-scoped under .sex-.
 */

export function ExDefinitions({ s }) {
  return (
    <>
      <div className="sex-head">
        <h3 className="sex-title">{s.title}</h3>
        {s.note ? <span className="sex-note">{s.note}</span> : null}
      </div>
      <ol className="sex-rows">
        {s.items.map((d, i) => (
          <li key={d.term} className="sex-row">
            <span className="sex-n">{String(i + 1).padStart(2, '0')}</span>
            <span>
              <strong>{d.term}</strong> {d.text}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

export function ExEquations({ s }) {
  return (
    <>
      <div className="sex-head">
        <h3 className="sex-title">{s.title}</h3>
        {s.note ? <span className="sex-note">{s.note}</span> : null}
      </div>
      <ul className="sex-rows">
        {s.items.map((e) => (
          <li key={e.expr} className="sex-eq">
            <span className="sex-expr">{e.expr}</span>
            {e.note ? <span className="sex-eq-note">{e.note}</span> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

export function ExMeasures({ s }) {
  return (
    <>
      <div className="sex-head">
        <h3 className="sex-title">{s.title}</h3>
      </div>
      <table className="sex-table">
        <caption className="sxb-sr">Which measure answers which question</caption>
        <thead>
          <tr>
            <th scope="col">Question</th>
            <th scope="col">Suitable measure</th>
          </tr>
        </thead>
        <tbody>
          {s.items.map((m) => (
            <tr key={m.question}>
              <th scope="row">{m.question}</th>
              <td>{m.measure}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function ExDiagram({ s }) {
  return (
    <>
      <div className="sex-head">
        <h3 className="sex-title">{s.title}</h3>
      </div>
      <ol className="sex-path">
        {s.nodes.map((n, i) => (
          <li key={n.label} className="sex-step">
            <span className="sex-step-label">{n.label}</span>
            <span className="sex-step-basis">{n.basis}</span>
            {i < s.nodes.length - 1 ? (
              <i className="bi bi-chevron-right sex-step-go" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>
      {s.caption ? <p className="sex-caption">{s.caption}</p> : null}
    </>
  );
}

export function ExMethod({ s }) {
  return (
    <>
      <div className="sex-head">
        <h3 className="sex-title">{s.title}</h3>
      </div>
      <ol className="sex-method">
        {s.items.map((m, i) => (
          <li key={m.title} className="sex-method-item">
            <span className="sex-n">{String(i + 1).padStart(2, '0')}</span>
            <h4 className="sex-method-title">{m.title}</h4>
            <p className="sex-method-text">{m.text}</p>
            {m.caution ? <p className="sex-caption">{m.caution}</p> : null}
          </li>
        ))}
      </ol>
    </>
  );
}

export function ExSources({ s }) {
  return (
    <>
      <div className="sex-head">
        <h3 className="sex-title">{s.title}</h3>
      </div>
      <ul className="sex-verify">
        {s.items.map((v) => (
          <li key={v.title}>
            <span className="sex-verify-title">{v.title}</span>
            <span className="sex-caption">{v.sub}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
