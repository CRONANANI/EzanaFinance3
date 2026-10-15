'use client';

/**
 * Sanctions Program x Jurisdiction Explorer. Replaces the flat "Countries
 * under a US sanctions program" table.
 *
 * Rows are the jurisdictions OFAC programs TARGET (curated in programs.js,
 * from OFAC's own program definitions), ranked with compact bars and
 * sortable by listings, entities, individuals, vessels, aircraft or recent
 * listings. A row expands to its programs (plain names, listing counts),
 * entry-type mix, how many of its listings are BASED there, and recent
 * activity. Targeted jurisdiction and address country are different
 * things and are labelled as such; a program's target is never inferred
 * from addresses.
 *
 * Recent activity is new listings in the last 365 days against the 365
 * before, by OFAC's listing date, counted once per jurisdiction. Without
 * listing dates the column is marked unavailable, never zero.
 */
import { useMemo, useState } from 'react';
import { programMeta } from '@/lib/sanctions/programs';
import { pctChange } from '@/lib/sanctions/insights';
import { ProgramChip, Seg, StateNote, TYPES, TypeStrip, fmt, pctOf } from './ui';

const SORTS = [
  { key: 'total', label: 'Listings' },
  { key: 'entity', label: 'Entities' },
  { key: 'individual', label: 'Individuals' },
  { key: 'vessel', label: 'Vessels' },
  { key: 'aircraft', label: 'Aircraft' },
  { key: 'recent', label: 'Recent' },
];
const SHOW = 10;

function Trend({ a }) {
  if (!a) return <span className="snx-muted">n/a</span>;
  const ch = pctChange(a.recent, a.prior);
  return (
    <span className="snx-jx-trend">
      +{fmt(a.recent)}
      {ch != null ? (
        <em className={ch >= 0 ? 'is-up' : 'is-down'}>
          {ch >= 0 ? '+' : ''}
          {ch}%
        </em>
      ) : a.recent ? (
        <em className="is-up">new</em>
      ) : null}
    </span>
  );
}

export default function JurisdictionExplorer({
  targets,
  activity,
  program,
  onPickProgram,
  onClearProgram,
}) {
  const [sort, setSort] = useState('total');
  const [open, setOpen] = useState(null);
  const [all, setAll] = useState(false);
  const hasActivity = Boolean(activity);

  const rows = useMemo(() => {
    const list = program ? targets.filter((t) => t.codes.includes(program)) : targets.slice();
    const val = (t) => (sort === 'recent' ? activity?.[t.name]?.recent || 0 : t[sort] || 0);
    return list
      .sort((a, b) => val(b) - val(a) || b.total - a.total)
      .map((t) => ({ ...t, value: val(t) }));
  }, [targets, program, sort, activity]);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const visible = all ? rows : rows.slice(0, SHOW);

  return (
    <section className="snx-card snx-jx" aria-labelledby="snx-targets">
      <div className="snx-card-head">
        <div>
          <h2 id="snx-targets" className="snx-card-title">
            Program × jurisdiction explorer
          </h2>
          <p className="snx-card-sub">
            Jurisdictions OFAC programs are aimed at, with every listing filed under those programs.
            Expand a row for its programs and mix; select a program to filter the page.
          </p>
        </div>
        <Seg
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={SORTS.map((s) =>
            s.key === 'recent' && !hasActivity
              ? { ...s, disabled: true, title: 'Needs OFAC listing dates' }
              : s,
          )}
        />
      </div>

      {program ? (
        <p className="snx-focus">
          <span>
            Jurisdictions with listings under <b>{program}</b> · {programMeta(program).label}
          </span>
          <button type="button" className="snx-focus-clear" onClick={onClearProgram}>
            All programs
          </button>
        </p>
      ) : null}

      {rows.length === 0 ? (
        <StateNote kind="empty">
          {program
            ? `${program} is a global program: it does not target one jurisdiction.`
            : 'No jurisdiction-targeted programs on the list.'}
        </StateNote>
      ) : (
        <>
          <div className="snx-jx-headrow" aria-hidden="true">
            <span />
            <span>Jurisdiction</span>
            <span />
            <span>{SORTS.find((x) => x.key === sort)?.label}</span>
            <span>Programs</span>
            <span>{hasActivity ? 'New, 365 days' : ''}</span>
          </div>
          <ol className="snx-jx-list">
            {visible.map((t) => {
              const isOpen = open === t.name;
              const a = activity?.[t.name] || (hasActivity ? { recent: 0, prior: 0 } : null);
              return (
                <li key={t.name} className={isOpen ? 'is-open' : undefined}>
                  <button
                    type="button"
                    className="snx-jx-row"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : t.name)}
                  >
                    <i
                      className={`bi bi-chevron-${isOpen ? 'down' : 'right'}`}
                      aria-hidden="true"
                    />
                    <span className="snx-jx-name">{t.name}</span>
                    <span className="snx-jx-bar" aria-hidden="true">
                      <span style={{ width: `${(t.value / max) * 100}%` }} />
                    </span>
                    <span className="snx-jx-n snx-mono">{fmt(t.value)}</span>
                    <span className="snx-jx-meta snx-mono">
                      {t.codes.length} program{t.codes.length === 1 ? '' : 's'}
                    </span>
                    <span className="snx-jx-recent snx-mono">
                      {hasActivity ? <Trend a={a} /> : null}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="snx-jx-detail">
                      <div className="snx-jx-col">
                        <span className="snx-country-label">Programs aimed at {t.name}</span>
                        <ul className="snx-jx-programs">
                          {t.codes.map((c) => (
                            <li key={c}>
                              <ProgramChip code={c} active={program === c} onPick={onPickProgram} />
                              <span className="snx-jx-pname">{programMeta(c).label}</span>
                              <span className="snx-mono">{fmt(t.codeCounts?.[c] || 0)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="snx-jx-col">
                        <span className="snx-country-label">Who is listed</span>
                        <TypeStrip
                          counts={t}
                          total={t.total}
                          label={TYPES.map((x) => `${x.label} ${fmt(t[x.key])}`).join(', ')}
                        />
                        <span className="snx-strip-legend snx-country-legend">
                          {TYPES.map((x) => (
                            <span key={x.key}>
                              <i style={{ background: x.color }} aria-hidden="true" />
                              {x.label} {fmt(t[x.key])}
                            </span>
                          ))}
                        </span>
                        <dl className="snx-jx-facts">
                          <div>
                            <dt>Listings under these programs</dt>
                            <dd className="snx-mono">{fmt(t.total)}</dd>
                          </div>
                          <div>
                            <dt>Of those, based in {t.name}</dt>
                            <dd className="snx-mono">
                              {t.basedThere
                                ? `${fmt(t.basedThere)} (${pctOf(t.basedThere, t.total)})`
                                : 'none stated'}
                            </dd>
                          </div>
                          <div>
                            <dt>New in the last 365 days</dt>
                            <dd className="snx-mono">
                              {a
                                ? `${fmt(a.recent)} (${fmt(a.prior)} the year before)`
                                : 'needs OFAC listing dates'}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </>
      )}

      {rows.length > SHOW ? (
        <button
          type="button"
          className="snx-action-btn"
          aria-expanded={all}
          onClick={() => setAll((v) => !v)}
        >
          {all ? 'Show fewer' : `Show all ${rows.length} jurisdictions`}
        </button>
      ) : null}
      <p className="snx-fine">
        A listing can fall under programs aimed at several jurisdictions, so rows overlap.
        &quot;Based in&quot; uses addresses OFAC publishes, which is a different question from which
        jurisdiction a program targets: most listings under a program can be based elsewhere. Global
        programs (counter-terrorism, narcotics, cyber, Global Magnitsky) target no single
        jurisdiction and are not rows here.
      </p>
    </section>
  );
}
