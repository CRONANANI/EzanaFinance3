'use client';

import { useMemo, useState } from 'react';
import { Button, Checkbox, Input, Modal, Select } from '@/components/ds';
import {
  FLAG_LABEL,
  INDUSTRY_LABEL,
  NA,
  alumniSummary,
  filterAlumni,
  fmtInt,
  fmtPct,
} from '@/lib/org-cohorts-model';
import { EmptyLine, Kpi, Pairs, SampleNote, SectionError, TableSkeleton, TextMenu } from './parts';
import { ErrorLine } from './CohortDialogs';

function EditPlacementDialog({ alum, request, sample, onClose, onDone }) {
  const [f, setF] = useState({
    employer: alum.employer || '',
    employer_industry: alum.employer_industry || '',
    role_title: alum.role_title || '',
    linkedin_url: alum.linkedin_url || '',
    placed_within_6mo: !!alum.placed_within_6mo,
    engagement_flags: alum.engagement_flags || [],
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleFlag = (k) =>
    set(
      'engagement_flags',
      f.engagement_flags.includes(k)
        ? f.engagement_flags.filter((x) => x !== k)
        : [...f.engagement_flags, k],
    );
  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setErr('');
    const res = await request('PATCH', '/api/org/alumni', {
      id: alum.id,
      ...f,
      employer_industry: f.employer_industry || null,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.json?.error || 'The placement was not saved. Try again.');
      return;
    }
    onDone();
  };
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={`Placement · ${alum.display_name}`}
      size={520}
      className="coh-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <Button
            variant="primary"
            className="tcc-flatbtn"
            type="submit"
            form="coh-place"
            loading={busy}
          >
            Save placement
          </Button>
        </>
      }
    >
      <form id="coh-place" className="coh-form" onSubmit={submit} noValidate>
        <SampleNote on={sample} />
        <div className="coh-form__pair">
          <Input
            id="coh-place-employer"
            label="Employer"
            value={f.employer}
            onChange={(e) => set('employer', e.target.value)}
          />
          <Input
            id="coh-place-role"
            label="Role"
            value={f.role_title}
            onChange={(e) => set('role_title', e.target.value)}
          />
        </div>
        <Select
          id="coh-place-industry"
          label="Industry"
          value={f.employer_industry}
          onChange={(e) => set('employer_industry', e.target.value)}
          options={[
            { value: '', label: 'Not recorded' },
            ...Object.entries(INDUSTRY_LABEL).map(([value, label]) => ({ value, label })),
          ]}
        />
        <Input
          id="coh-place-link"
          label="Profile link"
          type="url"
          value={f.linkedin_url}
          onChange={(e) => set('linkedin_url', e.target.value)}
        />
        <Checkbox
          checked={f.placed_within_6mo}
          onChange={(e) => set('placed_within_6mo', e.target.checked)}
          label="Placed within 6 months of graduating"
        />
        <fieldset className="coh-fieldset">
          <legend className="ds-field-label">Engagement</legend>
          {Object.entries(FLAG_LABEL).map(([k, label]) => (
            <Checkbox
              key={k}
              checked={f.engagement_flags.includes(k)}
              onChange={() => toggleFlag(k)}
              label={label}
            />
          ))}
        </fieldset>
        <ErrorLine>{err}</ErrorLine>
      </form>
    </Modal>
  );
}

export function AlumniTab({
  alumni,
  cohorts,
  canManage,
  request,
  sample,
  onOpenTrackRecord,
  onChanged,
}) {
  const [cls, setCls] = useState('');
  const [industry, setIndustry] = useState('');
  const [flag, setFlag] = useState('');
  const [picked, setPicked] = useState(null);
  const [editing, setEditing] = useState(null);

  const all = useMemo(() => alumni.data?.alumni || [], [alumni.data]);
  const cohortById = useMemo(() => new Map(cohorts.map((c) => [c.id, c])), [cohorts]);
  const rows = useMemo(
    () => filterAlumni(all, { cohort: cls, industry, flag }),
    [all, cls, industry, flag],
  );
  const sum = useMemo(() => alumniSummary(rows), [rows]);
  const selected = rows.find((a) => a.id === picked) || rows[0] || null;
  const loading = alumni.status === 'loading';
  const failed = alumni.status === 'error';
  const classOptions = [
    { value: '', label: 'All classes' },
    ...[...new Set(all.map((a) => a.cohort_id))].map((id) => ({
      value: id,
      label: cohortById.get(id)?.name || 'Unknown class',
    })),
  ];
  const selectedCohort = selected ? cohortById.get(selected.cohort_id) : null;
  const clear = () => {
    setCls('');
    setIndustry('');
    setFlag('');
  };

  let table;
  if (loading) table = <TableSkeleton cols={7} rows={4} />;
  else if (failed)
    table = <SectionError message="Could not load alumni records." onRetry={alumni.reload} />;
  else if (all.length === 0)
    table = <EmptyLine>No alumni yet. Graduating a class adds its graduates here.</EmptyLine>;
  else if (rows.length === 0)
    table = (
      <EmptyLine action="Show all classes" onAction={clear}>
        No alumni found for these filters.
      </EmptyLine>
    );
  else
    table = (
      <div className="coh-scroll">
        <table className="coh-table coh-alumni">
          <caption className="tcc-sr">Graduates, their frozen record and placement</caption>
          <thead>
            <tr>
              <th scope="col">Alumnus, class</th>
              <th scope="col">Former role</th>
              <th scope="col" className="coh-num">
                Final rating
              </th>
              <th scope="col" className="coh-num">
                Pitches
              </th>
              <th scope="col">Employer, role</th>
              <th scope="col">Industry</th>
              <th scope="col" className="coh-num">
                Engagement
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const on = selected?.id === a.id;
              return (
                <tr
                  key={a.id}
                  className={on ? 'is-on' : undefined}
                  aria-selected={on}
                  onClick={() => setPicked(a.id)}
                >
                  <td>
                    <button
                      type="button"
                      className="coh-rowbtn coh-two"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPicked(a.id);
                      }}
                    >
                      <span className="coh-strong coh-ellipsis">{a.display_name}</span>
                      <span className="coh-two__sub coh-ellipsis">
                        {cohortById.get(a.cohort_id)?.name || a.grad_term || NA}
                      </span>
                    </button>
                  </td>
                  <td className={`coh-ellipsis${a.was_role ? '' : ' tcc-na'}`}>
                    {a.was_role || NA}
                  </td>
                  <td className={`coh-num tcc-mono${a.final_rating == null ? ' tcc-na' : ''}`}>
                    {fmtInt(a.final_rating)}
                  </td>
                  <td className={`coh-num tcc-mono${a.final_pitch_count == null ? ' tcc-na' : ''}`}>
                    {a.final_pitch_count ?? NA}
                  </td>
                  <td>
                    <span className="coh-two">
                      <span className={`coh-ellipsis${a.employer ? '' : ' tcc-na'}`}>
                        {a.employer || NA}
                      </span>
                      <span className="coh-two__sub coh-ellipsis">{a.role_title || NA}</span>
                    </span>
                  </td>
                  <td className={a.employer_industry ? 'coh-ellipsis' : 'tcc-na'}>
                    {INDUSTRY_LABEL[a.employer_industry] || NA}
                  </td>
                  <td
                    className={`coh-num coh-ellipsis${a.engagement_flags.length ? '' : ' tcc-na'}`}
                  >
                    {a.engagement_flags.length
                      ? a.engagement_flags.map((x) => FLAG_LABEL[x] || x).join(', ')
                      : NA}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

  return (
    <>
      <section className="coh-section" aria-labelledby="coh-alu-title">
        <div className="coh-head">
          <h2 className="coh-title" id="coh-alu-title">
            Alumni{' '}
            <span className="coh-title__dim">
              · {cls ? cohortById.get(cls)?.name || 'One class' : 'All classes'}
            </span>
          </h2>
          <div className="coh-controls coh-noprint">
            <TextMenu label="All classes" value={cls} onChange={setCls} options={classOptions} />
            <TextMenu
              label="All industries"
              value={industry}
              onChange={setIndustry}
              options={[
                { value: '', label: 'All industries' },
                ...Object.entries(INDUSTRY_LABEL).map(([value, label]) => ({ value, label })),
                { value: 'none', label: 'No placement recorded' },
              ]}
            />
            <TextMenu
              label="All engagement"
              value={flag}
              onChange={setFlag}
              align="right"
              options={[
                { value: '', label: 'All engagement' },
                ...Object.entries(FLAG_LABEL).map(([value, label]) => ({ value, label })),
              ]}
            />
            <button
              type="button"
              className="tcc-textbtn"
              onClick={() => window.print()}
              disabled={loading || failed}
            >
              <i className="bi bi-printer" aria-hidden="true" />
              Print placement summary
            </button>
          </div>
        </div>
        <div className="coh-kpis" aria-busy={loading || undefined}>
          <div className="tcc-kpistrip coh-kpistrip--4" role="list" aria-label="Alumni figures">
            <Kpi icon="bi-mortarboard" label="Total alumni" loading={loading} na={failed}>
              {failed ? NA : sum.total}
            </Kpi>
            <Kpi
              icon="bi-briefcase"
              label="Placed in finance within 6 months"
              loading={loading}
              na={failed || sum.placedFinancePct == null}
              title="Alumni placed within 6 months in investment banking, private equity, asset management or consulting, over all alumni shown"
            >
              {failed ? NA : fmtPct(sum.placedFinancePct)}
            </Kpi>
            <Kpi
              icon="bi-signpost"
              label="Top destination"
              loading={loading}
              na={failed || !sum.top}
              text
            >
              {failed || !sum.top ? (
                NA
              ) : (
                <>
                  {sum.top.label}
                  {sum.top.caption && <span className="coh-kpi__caption">{sum.top.caption}</span>}
                </>
              )}
            </Kpi>
            <Kpi
              icon="bi-people"
              label="Engaged"
              loading={loading}
              na={failed}
              title="Alumni with at least one engagement on file"
            >
              {failed ? NA : sum.engaged}
            </Kpi>
          </div>
        </div>
        <div className="coh-head coh-head--sub">
          <h3 className="coh-subtitle">Graduate placement and frozen record</h3>
        </div>
        {table}
      </section>

      {!loading && !failed && rows.length > 0 && (
        <div className="coh-pair">
          <section className="coh-section coh-pair__cell" aria-labelledby="coh-dest-title">
            <div className="coh-head">
              <h3 className="coh-subtitle" id="coh-dest-title">
                Placement destinations
              </h3>
            </div>
            {sum.destinations.length === 0 ? (
              <EmptyLine>No placements recorded yet.</EmptyLine>
            ) : (
              <ul className="coh-plain coh-dest">
                {sum.destinations.map((x) => (
                  <li key={x.key}>
                    <span>{x.label}</span>
                    <span className="tcc-mono">{x.count}</span>
                  </li>
                ))}
              </ul>
            )}
            {sum.unrecorded > 0 && (
              <p className="coh-hint">
                <span className="tcc-mono">{sum.unrecorded}</span>{' '}
                {sum.unrecorded === 1 ? 'alumnus has' : 'alumni have'} no placement recorded.
              </p>
            )}
          </section>
          <div className="coh-vrule" aria-hidden="true" />
          <section
            className="coh-section coh-pair__cell coh-noprint"
            aria-labelledby="coh-alum-title"
          >
            <div className="coh-head">
              <h3 className="coh-subtitle" id="coh-alum-title">
                Alumni detail <span className="coh-title__dim">· {selected?.display_name}</span>
              </h3>
            </div>
            {selected && (
              <>
                <Pairs
                  rows={[
                    [
                      'Class',
                      selectedCohort?.name || selected.grad_term || NA,
                      { na: !selectedCohort && !selected.grad_term },
                    ],
                    ['Graduated', selected.grad_term || NA, { na: !selected.grad_term }],
                    [
                      'Frozen rating',
                      fmtInt(selected.final_rating),
                      { mono: true, na: selected.final_rating == null },
                    ],
                    ['Final pitches', selected.final_pitch_count ?? NA, { mono: true }],
                    [
                      'Coverage',
                      selected.sectors?.length ? selected.sectors.join(', ') : NA,
                      { na: !selected.sectors?.length },
                    ],
                    [
                      'Placed within 6 months',
                      selected.placed_within_6mo == null
                        ? NA
                        : selected.placed_within_6mo
                          ? 'Yes'
                          : 'No',
                      { na: selected.placed_within_6mo == null },
                    ],
                  ]}
                />
                <div className="coh-actionrow">
                  {canManage && (
                    <button
                      type="button"
                      className="tcc-textbtn"
                      onClick={() => setEditing(selected)}
                    >
                      <i className="bi bi-pencil" aria-hidden="true" />
                      Edit placement
                    </button>
                  )}
                  {selected.linkedin_url && (
                    <a
                      className="tcc-link"
                      href={selected.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Profile <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                    </a>
                  )}
                  {selectedCohort?.archived && (
                    <button
                      type="button"
                      className="tcc-textbtn tcc-textbtn--accent"
                      onClick={() => onOpenTrackRecord(selectedCohort)}
                    >
                      Open archived track record{' '}
                      <i className="bi bi-arrow-right" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {editing && (
        <EditPlacementDialog
          alum={editing}
          request={request}
          sample={sample}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            onChanged?.();
          }}
        />
      )}
    </>
  );
}
