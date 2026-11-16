'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LIFECYCLE_LABEL,
  NA,
  filterRoster,
  fmtDate,
  fmtInt,
  lifecycleActions,
  roleLabel,
  rosterRoles,
  rosterSectors,
} from '@/lib/org-cohorts-model';
import { TextToggle } from '@/components/org/command-center/parts';
import {
  EmptyLine,
  Initials,
  Lifecycle,
  Pairs,
  SectionError,
  SortHead,
  TableSkeleton,
  TextMenu,
} from './parts';
import { ReasonDialog } from './CohortDialogs';

const LIBRARY_HREF = '/org-team-hub/research-library';
const ORG_CHART_HREF = '/org-team-hub/org-chart';

function Rating({ m }) {
  if (m.rating == null) return <span className="tcc-na">{NA}</span>;
  return (
    <span className="coh-rating">
      <span>{fmtInt(m.rating)}</span>
      {m.rating_provisional && <span className="coh-prov">Provisional</span>}
    </span>
  );
}

export function RosterTab({
  cohort,
  roster,
  graduation,
  canManage,
  request,
  sample,
  onGoRecruit,
  onChanged,
}) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sector, setSector] = useState('');
  const [role, setRole] = useState('');
  const [view, setView] = useState('table');
  const [sort, setSort] = useState({ key: 'display_name', dir: 1 });
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState('');
  const [departing, setDeparting] = useState(null);

  const members = useMemo(() => roster.data?.members || [], [roster.data]);
  const rows = useMemo(
    () => filterRoster(members, { q, status, sector, role, sort }),
    [members, q, status, sector, role, sort],
  );
  const selected = members.find((m) => m.id === picked) || rows[0] || null;
  const onSort = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }));
  const filtersOn = q || status || sector || role;

  const move = async (m, to, extra = {}) => {
    setBusy(true);
    setActionErr('');
    const res = await request('PATCH', `/api/org/cohorts/${cohort.id}/lifecycle`, {
      member_id: m.id,
      lifecycle_status: to,
      ...extra,
    });
    setBusy(false);
    if (!res.ok) {
      const error = res.json?.error || 'Nothing changed. Try again.';
      setActionErr(error);
      return { ok: false, error };
    }
    onChanged?.();
    return { ok: true };
  };

  const loading = roster.status === 'loading';
  const failed = roster.status === 'error';

  const controls = (
    <div className="coh-controls">
      <label className="coh-search">
        <i className="bi bi-search" aria-hidden="true" />
        <span className="tcc-sr">Search members</span>
        <input
          type="search"
          placeholder="Search members"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <TextMenu
        label="All statuses"
        value={status}
        onChange={setStatus}
        options={[
          { value: '', label: 'All statuses' },
          ...Object.entries(LIFECYCLE_LABEL).map(([value, label]) => ({ value, label })),
        ]}
      />
      <TextMenu
        label="All sectors"
        value={sector}
        onChange={setSector}
        options={[
          { value: '', label: 'All sectors' },
          ...rosterSectors(members).map((s) => ({ value: s, label: s })),
        ]}
      />
      <TextMenu
        label="All roles"
        value={role}
        onChange={setRole}
        align="right"
        options={[
          { value: '', label: 'All roles' },
          ...rosterRoles(members).map((r) => ({ value: r, label: roleLabel(r) })),
        ]}
      />
      <div className="tcc-toggles coh-viewtoggle" role="group" aria-label="Roster view">
        <TextToggle pressed={view === 'table'} onClick={() => setView('table')}>
          <i className="bi bi-list-ul" aria-hidden="true" />
          Table
        </TextToggle>
        <TextToggle pressed={view === 'grid'} onClick={() => setView('grid')}>
          <i className="bi bi-grid" aria-hidden="true" />
          Grid
        </TextToggle>
      </div>
    </div>
  );

  let body;
  if (loading) body = <TableSkeleton cols={7} rows={6} />;
  else if (failed) body = <SectionError message="Could not load roster." onRetry={roster.reload} />;
  else if (members.length === 0)
    body = (
      <EmptyLine action="Open recruitment" onAction={onGoRecruit}>
        No members in this cohort yet.
      </EmptyLine>
    );
  else if (rows.length === 0)
    body = (
      <EmptyLine
        action="Clear filters"
        onAction={() => {
          setQ('');
          setStatus('');
          setSector('');
          setRole('');
        }}
      >
        No members match these filters.
      </EmptyLine>
    );
  else if (view === 'grid')
    body = (
      <ul className="coh-grid">
        {rows.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              className={`coh-gridcell${selected?.id === m.id ? ' is-on' : ''}`}
              aria-pressed={selected?.id === m.id}
              onClick={() => setPicked(m.id)}
            >
              <Initials name={m.display_name} />
              <span className="coh-gridcell__main">
                <span className="coh-gridcell__name">{m.display_name}</span>
                <span className="coh-gridcell__sub">
                  {roleLabel(m.role)}, <Lifecycle status={m.lifecycle_status} />
                </span>
              </span>
              <span className="tcc-mono coh-gridcell__rating">
                <Rating m={m} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  else
    body = (
      <div className="coh-scroll">
        <table className="coh-table coh-roster">
          <caption className="tcc-sr">{cohort.name} roster</caption>
          <thead>
            <tr>
              <SortHead label="Member" k="display_name" sort={sort} onSort={onSort} />
              <SortHead label="Role" k="role" sort={sort} onSort={onSort} />
              <SortHead label="Status" k="lifecycle_status" sort={sort} onSort={onSort} />
              <SortHead label="Ezana rating" k="rating" sort={sort} onSort={onSort} numeric />
              <SortHead label="Pitches" k="pitch_count" sort={sort} onSort={onSort} numeric />
              <th scope="col">Sector</th>
              <SortHead label="Joined" k="joined_at" sort={sort} onSort={onSort} numeric />
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const on = selected?.id === m.id;
              return (
                <tr
                  key={m.id}
                  className={on ? 'is-on' : undefined}
                  aria-selected={on}
                  onClick={() => setPicked(m.id)}
                >
                  <td>
                    <button
                      type="button"
                      className="coh-rowbtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPicked(m.id);
                      }}
                    >
                      <Initials name={m.display_name} />
                      <span className="coh-ellipsis">{m.display_name}</span>
                    </button>
                  </td>
                  <td className="coh-ellipsis">{m.title || roleLabel(m.role)}</td>
                  <td>
                    <Lifecycle status={m.lifecycle_status} />
                  </td>
                  <td className="coh-num tcc-mono">
                    <Rating m={m} />
                  </td>
                  <td className="coh-num tcc-mono">{m.pitch_count}</td>
                  <td className={`coh-ellipsis${m.sectors.length ? '' : ' tcc-na'}`}>
                    {m.sectors.length ? m.sectors.map((s) => s.sector).join(', ') : NA}
                  </td>
                  <td className="coh-num tcc-mono">{fmtDate(m.joined_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

  const side = selected ? (
    <div className="coh-member">
      <h3 className="coh-sidehead">Selected member</h3>
      <div className="coh-member__who">
        <Initials name={selected.display_name} size="lg" />
        <div>
          <p className="coh-member__name">{selected.display_name}</p>
          <p className="coh-member__sub">
            {selected.title || roleLabel(selected.role)},{' '}
            <Lifecycle status={selected.lifecycle_status} />
          </p>
        </div>
      </div>
      <Pairs
        rows={[
          [
            'Ezana rating',
            selected.rating == null
              ? NA
              : `${fmtInt(selected.rating)}${selected.rating_provisional ? ', provisional' : ''}`,
            { mono: true, na: selected.rating == null },
          ],
          ['Pitches', String(selected.pitch_count), { mono: true }],
          [
            'Sector coverage',
            selected.sectors.length ? selected.sectors.map((s) => s.sector).join(', ') : NA,
            { na: !selected.sectors.length },
          ],
          ['Mentor', selected.mentor_name || NA, { na: !selected.mentor_name }],
          ['Joined', fmtDate(selected.joined_at), { mono: true }],
          ...(selected.departed_at
            ? [
                ['Departed', fmtDate(selected.departed_at), { mono: true }],
                ['Reason', selected.departure_reason || NA, { na: !selected.departure_reason }],
              ]
            : []),
        ]}
      />
      {canManage && lifecycleActions(selected.lifecycle_status).length > 0 && (
        <div className="coh-member__actions">
          <h4 className="coh-caps">Manager actions</h4>
          <div className="coh-actionrow">
            {lifecycleActions(selected.lifecycle_status).map((a) => (
              <button
                key={a.to}
                type="button"
                className={`tcc-textbtn${a.danger ? ' coh-danger' : ''}`}
                disabled={busy}
                onClick={() => (a.danger ? setDeparting(selected) : move(selected, a.to))}
              >
                {a.label}
              </button>
            ))}
          </div>
          {actionErr && (
            <p className="coh-formerr" role="alert">
              <i className="bi bi-exclamation-triangle" aria-hidden="true" />
              {actionErr}
            </p>
          )}
          <p className="coh-hint">
            Begin graduation flags the member, as the Org Chart does. Graduating the class moves
            flagged members of this cohort to alumni.
          </p>
        </div>
      )}
      {!canManage && (
        <p className="coh-hint">Lifecycle changes are made by executives and portfolio managers.</p>
      )}
    </div>
  ) : loading ? (
    <TableSkeleton cols={1} rows={6} />
  ) : null;

  /* ── Graduation readiness (this cohort only) ── */
  const gm = graduation.data?.members || [];
  const handoffsVisible = !!graduation.data?.handoffs_visible;
  const missingN = graduation.data?.missing?.length ?? 0;
  let readiness;
  if (graduation.status === 'loading') readiness = <TableSkeleton cols={6} rows={2} />;
  else if (graduation.status === 'error')
    readiness = (
      <SectionError message="Could not load graduation readiness." onRetry={graduation.reload} />
    );
  else if (gm.length === 0)
    readiness = (
      <p className="tcc-state">
        <span>No members of this cohort are flagged for graduation.</span>
        <Link href={ORG_CHART_HREF} className="tcc-link">
          Open Org Chart <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </p>
    );
  else
    readiness = (
      <div className="coh-scroll">
        <table className="coh-table coh-ready">
          <caption className="tcc-sr">Members of {cohort.name} flagged to graduate</caption>
          <thead>
            <tr>
              <th scope="col">Member</th>
              <th scope="col">Role</th>
              <th scope="col">Coverage</th>
              <th scope="col">Handoff</th>
              <th scope="col">Research</th>
              <th scope="col" className="coh-num">
                Graduation flag
              </th>
            </tr>
          </thead>
          <tbody>
            {gm.flatMap((m) => {
              const sectors = m.sectors.length ? m.sectors : [{ sector: null, published: null }];
              return sectors.map((s, i) => (
                <tr key={`${m.member_id}-${s.sector || 'none'}`}>
                  <td className="coh-strong">{i === 0 ? m.display_name : ''}</td>
                  <td>{i === 0 ? m.title || roleLabel(m.role) : ''}</td>
                  <td className={s.sector ? '' : 'tcc-na'}>{s.sector || 'No sector on file'}</td>
                  <td>
                    {!s.sector ? (
                      <span className="tcc-na">Not needed</span>
                    ) : !handoffsVisible || s.published == null ? (
                      <span className="tcc-na">{NA}</span>
                    ) : s.published ? (
                      <span className="coh-status coh-tone--pos">
                        <i className="bi bi-check-lg" aria-hidden="true" />
                        Published
                      </span>
                    ) : (
                      <span className="coh-status coh-tone--warn">
                        <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                        Missing
                      </span>
                    )}
                  </td>
                  <td>
                    {s.sector ? (
                      <Link href={LIBRARY_HREF} className="tcc-link">
                        Research Library <i className="bi bi-arrow-right" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </td>
                  <td className="coh-num">{i === 0 ? 'Graduating' : ''}</td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    );

  return (
    <>
      <section className="coh-section" aria-labelledby="coh-roster-title">
        <div className="coh-head">
          <h2 className="coh-title" id="coh-roster-title">
            {cohort.name} <span className="coh-title__dim">· Roster</span>
          </h2>
          {controls}
        </div>
        <div className="coh-split">
          <div className="coh-split__main">
            {body}
            {!loading && !failed && members.length > 0 && (
              <p className="coh-hint">
                A rating is provisional under 10 rated ideas. Missing values read {NA}.
                {filtersOn ? ` Showing ${rows.length} of ${members.length}.` : ''}
              </p>
            )}
          </div>
          <div className="coh-vrule" aria-hidden="true" />
          <aside className="coh-split__side" aria-label="Selected member">
            {side}
          </aside>
        </div>
      </section>

      <section className="coh-section" aria-labelledby="coh-ready-title">
        <div className="coh-head">
          <h2 className="coh-subtitle" id="coh-ready-title">
            Graduation readiness <span className="coh-title__dim">· This cohort only</span>
          </h2>
          {graduation.status === 'ready' && gm.length > 0 && (
            <p className="tcc-meta">
              <span className="tcc-mono">{gm.length}</span> flagged
              {handoffsVisible && (
                <>
                  , <span className="tcc-mono">{missingN}</span> missing a published handoff
                </>
              )}
            </p>
          )}
        </div>
        {readiness}
        {graduation.status === 'ready' && gm.length > 0 && (
          <p className="coh-hint">
            {handoffsVisible
              ? 'Graduating the class checks this list. An executive may override a missing handoff, and the override is recorded.'
              : 'Handoff status is shown to executives and portfolio managers.'}
          </p>
        )}
      </section>

      {departing && (
        <ReasonDialog
          title={`Depart ${departing.display_name}`}
          body={`${departing.display_name} is marked departed and loses access to the council. Their record stays in this cohort.`}
          label="Departure reason"
          confirm="Depart member"
          sample={sample}
          onClose={() => setDeparting(null)}
          onConfirm={async (reason) => {
            const res = await move(departing, 'departed', { departure_reason: reason || null });
            if (res.ok) setDeparting(null);
            return res;
          }}
        />
      )}
    </>
  );
}
