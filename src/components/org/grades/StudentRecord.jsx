'use client';

import {
  NA,
  fmtDay,
  fmtPct,
  fmtScore,
  kindIcon,
  kindLabel,
  rubricRows,
} from '@/lib/org-grades-model';

const num = (v) => (v === null || v === undefined ? NA : String(v));

/** A stored rubric, read only. Points and maximum per criterion. */
export function RubricTable({ rubric, caption }) {
  const rows = rubricRows(rubric);
  if (!rows.length) return null;
  return (
    <table className="ogr-mini ogr-mini--rubric">
      <caption className="tcc-sr">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Criteria</th>
          <th scope="col" className="ogr-num">
            Points
          </th>
          <th scope="col" className="ogr-num">
            Out of
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.name}-${i}`}>
            <td>{r.name}</td>
            <td className="ogr-num tcc-mono">{num(r.points)}</td>
            <td className="ogr-num tcc-mono">{num(r.max)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * One member's record: built only from that member's own entries. For an
 * executive it is any member they pick; for a member it is their own.
 */
export function StudentRecord({
  name,
  meta,
  record,
  visibilityText,
  canGrade,
  selectedEntryId,
  onSelectEntry,
  onEdit,
  own = false,
}) {
  const selected =
    record.entries.find((g) => g.id === selectedEntryId) ||
    record.entries.find((g) => rubricRows(g.rubric).length) ||
    record.entries[0] ||
    null;

  return (
    <div className="ogr-record">
      <div className="ogr-record__head">
        <h2 className="ogr-record__name" id="ogr-record-title">
          {name}
        </h2>
        {meta.length > 0 && (
          <p className="ogr-record__meta">
            {meta.map((m) => (
              <span key={m.text}>
                <i className={`bi ${m.icon}`} aria-hidden="true" />
                {m.text}
              </span>
            ))}
          </p>
        )}
      </div>

      <dl className="ogr-stats">
        <div>
          <dt>Average of scored work</dt>
          <dd className={`tcc-mono${record.average === null ? ' tcc-na' : ''}`}>
            {fmtPct(record.average)}
          </dd>
        </div>
        <div>
          <dt>Graded entries</dt>
          <dd className="tcc-mono">{record.entries.length}</dd>
        </div>
        <div>
          <dt>Last changed</dt>
          <dd className={`tcc-mono${record.lastChanged ? '' : ' tcc-na'}`}>
            {fmtDay(record.lastChanged)}
          </dd>
        </div>
      </dl>
      <p className="ogr-record__vis">
        <span className="ogr-record__label">Visibility</span>
        <span>{visibilityText}</span>
      </p>

      {record.entries.length === 0 ? (
        <p className="tcc-state">
          {own ? 'No grades posted yet.' : 'No grades for this member yet.'}
        </p>
      ) : (
        <>
          <section className="ogr-recsec" aria-labelledby="ogr-bykind">
            <h3 className="ogr-recsec__title" id="ogr-bykind">
              By work kind
            </h3>
            <table className="ogr-mini">
              <caption className="tcc-sr">Latest grade for each kind of work</caption>
              <thead>
                <tr>
                  <th scope="col">Work kind</th>
                  <th scope="col" className="ogr-num">
                    Latest
                  </th>
                  <th scope="col" className="ogr-num">
                    Letter
                  </th>
                  <th scope="col" className="ogr-num">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {record.byKind.map((k) => (
                  <tr key={k.key}>
                    <td>
                      <span className="ogr-kind">
                        <i className={`bi ${k.icon}`} aria-hidden="true" />
                        {k.label}
                        {k.count > 1 && <span className="tcc-mono ogr-kind__n">{k.count}</span>}
                      </span>
                    </td>
                    <td className={`ogr-num tcc-mono${k.latest.score == null ? ' tcc-na' : ''}`}>
                      {fmtScore(k.latest)}
                    </td>
                    <td className={`ogr-num tcc-mono${k.latest.letter ? '' : ' tcc-na'}`}>
                      {k.latest.letter || NA}
                    </td>
                    <td className="ogr-num tcc-mono">
                      {fmtDay(k.latest.updated_at || k.latest.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="ogr-recsec__note">
              Overall is not counted in the average of scored work.
            </p>
          </section>

          {!own && (
            <section className="ogr-recsec" aria-labelledby="ogr-history">
              <h3 className="ogr-recsec__title" id="ogr-history">
                Every grade
              </h3>
              <ul className="ogr-hist">
                {record.entries.map((g) => {
                  const on = selected?.id === g.id;
                  return (
                    <li key={g.id} className={`ogr-hist__row${on ? ' is-on' : ''}`}>
                      <button
                        type="button"
                        className="ogr-hist__pick"
                        aria-pressed={on}
                        onClick={() => onSelectEntry(g.id)}
                      >
                        <span className="ogr-kind">
                          <i className={`bi ${kindIcon(g.work_type)}`} aria-hidden="true" />
                          {kindLabel(g.work_type)}
                        </span>
                        <span className="tcc-mono ogr-hist__score">
                          {fmtScore(g)}
                          {g.letter ? ` ${g.letter}` : ''}
                        </span>
                        <span className="ogr-hist__by">
                          {g.grader_name || NA}
                          <span className="tcc-mono"> {fmtDay(g.updated_at || g.created_at)}</span>
                        </span>
                        <span className={`ogr-hist__fb${g.feedback ? '' : ' tcc-na'}`}>
                          {g.feedback || 'No feedback'}
                        </span>
                      </button>
                      {canGrade && (
                        <button
                          type="button"
                          className="tcc-textbtn ogr-hist__edit"
                          onClick={() => onEdit(g)}
                          aria-label={`Change ${kindLabel(g.work_type).toLowerCase()} grade from ${fmtDay(g.created_at)}`}
                        >
                          <i className="bi bi-pencil" aria-hidden="true" />
                          Change
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {selected && (
            <section className="ogr-recsec" aria-labelledby="ogr-rubric">
              <h3 className="ogr-recsec__title" id="ogr-rubric">
                Rubric breakdown{' '}
                <span className="ogr-recsec__sub">
                  ({kindLabel(selected.work_type)},{' '}
                  <span className="tcc-mono">{fmtScore(selected)}</span>)
                </span>
              </h3>
              {rubricRows(selected.rubric).length ? (
                <RubricTable rubric={selected.rubric} caption="Rubric breakdown" />
              ) : (
                <p className="tcc-state">No rubric is stored for this grade.</p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
