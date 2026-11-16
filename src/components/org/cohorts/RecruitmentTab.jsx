'use client';

import { useMemo, useState } from 'react';
import {
  BOARD_STAGES,
  NA,
  STAGE_LABEL,
  applicantLabel,
  fmtDate,
  fmtPct,
  fmtStar,
} from '@/lib/org-cohorts-model';
import { TextToggle } from '@/components/org/command-center/parts';
import { useResource } from './useCohortsSource';
import { EmptyLine, SectionError, TableSkeleton } from './parts';
import {
  AddApplicantDialog,
  ApplicantDialog,
  FormBuilderDialog,
  ProvisionDialog,
} from './ApplicantDialogs';

const LANES = [
  { key: 'active', label: 'In progress' },
  { key: 'archived', label: 'Rejected and declined' },
];

export function RecruitmentTab({
  cohort,
  applicants,
  canManage,
  request,
  version,
  sample,
  onChanged,
}) {
  const funnel = useResource(request, `/api/org/applicants/funnel?cohort_id=${cohort.id}`, version);
  const forms = useResource(request, `/api/org/cohorts/${cohort.id}/forms`, version);
  const [lane, setLane] = useState('active');
  const [openId, setOpenId] = useState(null);
  const [provisionId, setProvisionId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [building, setBuilding] = useState(false);
  const [blindBusy, setBlindBusy] = useState(false);
  const [blindErr, setBlindErr] = useState('');

  const list = useMemo(() => applicants.data?.applicants || [], [applicants.data]);
  const counts = applicants.data?.stageCounts || {};
  const blind = !!applicants.data?.blind;
  const form = (forms.data?.forms || [])[0] || null;
  const rows = useMemo(
    () =>
      list.filter((a) =>
        lane === 'active'
          ? !['rejected', 'declined'].includes(a.stage)
          : ['rejected', 'declined'].includes(a.stage),
      ),
    [list, lane],
  );
  const archivedN = (counts.rejected || 0) + (counts.declined || 0);
  const open = list.find((a) => a.id === openId) || null;
  const provisioning = list.find((a) => a.id === provisionId) || null;

  const toggleBlind = async () => {
    setBlindBusy(true);
    setBlindErr('');
    const res = form
      ? await request('PATCH', `/api/org/cohorts/${cohort.id}/forms`, {
          form_id: form.id,
          blind_screening: !blind,
        })
      : await request('POST', `/api/org/cohorts/${cohort.id}/forms`, {
          blind_screening: !blind,
          fields: [],
        });
    setBlindBusy(false);
    if (!res.ok) setBlindErr(res.json?.error || 'Blind screening was not changed.');
  };

  const loading = applicants.status === 'loading';
  const failed = applicants.status === 'error';

  let pipeline;
  if (loading) pipeline = <TableSkeleton cols={7} rows={6} />;
  else if (failed)
    pipeline = (
      <SectionError message="Could not load applicant records." onRetry={applicants.reload} />
    );
  else if (list.length === 0)
    pipeline = canManage ? (
      <EmptyLine action="Add applicant" onAction={() => setAdding(true)}>
        No applicants for this cohort yet.
      </EmptyLine>
    ) : (
      <EmptyLine>No applicants for you to score in this cohort.</EmptyLine>
    );
  else if (rows.length === 0)
    pipeline = (
      <EmptyLine action="Show applicants in progress" onAction={() => setLane('active')}>
        {lane === 'archived' ? 'No rejected or declined applicants.' : 'No applicants in progress.'}
      </EmptyLine>
    );
  else
    pipeline = (
      <div className="coh-scroll">
        <table className="coh-table coh-pipeline">
          <caption className="tcc-sr">Applicants to {cohort.name}</caption>
          <thead>
            <tr>
              <th scope="col">Applicant</th>
              <th scope="col">Stage</th>
              <th scope="col">Program</th>
              <th scope="col">Source</th>
              <th scope="col" className="coh-num">
                Applied
              </th>
              <th scope="col" className="coh-num">
                Rubric average
              </th>
              <th scope="col" className="coh-num">
                Scores in
              </th>
              <th scope="col" className="coh-num">
                {lane === 'archived' ? 'Reason' : 'Action'}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>
                  <button type="button" className="coh-rowbtn" onClick={() => setOpenId(a.id)}>
                    <span className={a.blinded ? 'tcc-mono coh-strong' : 'coh-strong'}>
                      {applicantLabel(a)}
                    </span>
                    {a.blinded && (
                      <i
                        className="bi bi-eye-slash coh-dim"
                        title="Identity hidden until the interview"
                        aria-label="Identity hidden"
                      />
                    )}
                  </button>
                </td>
                <td>{STAGE_LABEL[a.stage] || a.stage}</td>
                <td className={a.program ? 'coh-ellipsis' : 'tcc-na'}>
                  {a.blinded ? 'Hidden' : a.program || NA}
                </td>
                <td className={a.source ? 'coh-ellipsis' : 'tcc-na'}>{a.source || NA}</td>
                <td className="coh-num tcc-mono">{fmtDate(a.applied_at)}</td>
                <td className={`coh-num tcc-mono${a.aggregate_star == null ? ' tcc-na' : ''}`}>
                  {fmtStar(a.aggregate_star)}
                </td>
                <td className={`coh-num tcc-mono${a.interviewer_count ? '' : ' tcc-na'}`}>
                  {a.interviewer_count ? `${a.scores_in} of ${a.interviewer_count}` : NA}
                </td>
                <td className="coh-num">
                  {lane === 'archived' ? (
                    <span className={`coh-ellipsis${a.rejected_reason ? '' : ' tcc-na'}`}>
                      {a.rejected_reason || NA}
                    </span>
                  ) : (
                    <button type="button" className="tcc-textbtn" onClick={() => setOpenId(a.id)}>
                      {a.interviewer_count > 0 ? 'Review' : 'Open'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  const sources = funnel.data?.sources || [];
  const reached = funnel.data?.funnel || [];

  return (
    <>
      <section className="coh-section" aria-labelledby="coh-rec-title">
        <div className="coh-head">
          <h2 className="coh-title" id="coh-rec-title">
            Recruitment <span className="coh-title__dim">· {cohort.name}</span>
          </h2>
          <div className="coh-controls">
            {canManage ? (
              <button
                type="button"
                className={`tcc-toggle${blind ? ' is-on' : ''}`}
                aria-pressed={blind}
                disabled={blindBusy || loading || failed}
                onClick={toggleBlind}
                title="Names, programs and files stay hidden until the interview stage, for every viewer"
              >
                <i className={`bi ${blind ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
                Blind screening {blind ? 'on' : 'off'}
              </button>
            ) : (
              <span className="tcc-meta">
                <i className={`bi ${blind ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" /> Blind
                screening {blind ? 'on' : 'off'}
              </span>
            )}
            <button type="button" className="tcc-textbtn" onClick={() => setBuilding(true)}>
              <i className="bi bi-ui-checks" aria-hidden="true" />
              Form builder
            </button>
            {canManage && (
              <button type="button" className="tcc-btn" onClick={() => setAdding(true)}>
                <i className="bi bi-plus-lg" aria-hidden="true" />
                Add applicant
              </button>
            )}
          </div>
        </div>
        {blindErr && (
          <p className="coh-formerr" role="alert">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" />
            {blindErr}
          </p>
        )}

        <div className="coh-stages" role="list" aria-label="Applicants by current stage">
          {BOARD_STAGES.map((s) => (
            <div key={s.key} className="coh-stage" role="listitem">
              <span className="coh-stage__label">{s.label}</span>
              <span className="coh-stage__value tcc-mono">
                {loading || failed ? NA : counts[s.key] || 0}
              </span>
            </div>
          ))}
          <div className="coh-stage" role="listitem">
            <span className="coh-stage__label">Rejected or declined</span>
            <span className="coh-stage__value tcc-mono">{loading || failed ? NA : archivedN}</span>
          </div>
        </div>

        <div className="coh-head coh-head--sub">
          <h3 className="coh-subtitle">Candidate pipeline</h3>
          <div className="tcc-toggles" role="group" aria-label="Pipeline view">
            {LANES.map((l) => (
              <TextToggle key={l.key} pressed={lane === l.key} onClick={() => setLane(l.key)}>
                {l.label}
                {l.key === 'archived' && !loading && (
                  <span className="tcc-mono coh-count">{archivedN}</span>
                )}
              </TextToggle>
            ))}
          </div>
        </div>
        {pipeline}
        {blind && list.some((a) => a.blinded) && (
          <p className="coh-hint">
            Blind screening is on: applied and screened applicants show an ID instead of a name, for
            every viewer, until they reach the interview.
          </p>
        )}
      </section>

      <div className="coh-pair">
        <section className="coh-section coh-pair__cell" aria-labelledby="coh-src-title">
          <div className="coh-head">
            <h3 className="coh-subtitle" id="coh-src-title">
              Funnel and sources
            </h3>
          </div>
          {funnel.status === 'loading' ? (
            <TableSkeleton cols={4} rows={4} />
          ) : funnel.status === 'error' ? (
            <SectionError message="Could not load the funnel." onRetry={funnel.reload} />
          ) : !funnel.data?.total ? (
            <p className="tcc-state">No applications to count yet.</p>
          ) : (
            <>
              <table className="coh-table coh-table--compact">
                <caption className="tcc-sr">Applicants who reached each stage</caption>
                <thead>
                  <tr>
                    <th scope="col">Reached</th>
                    <th scope="col" className="coh-num">
                      Applicants
                    </th>
                    <th scope="col" className="coh-num">
                      Of all applicants
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reached.map((r) => (
                    <tr key={r.stage}>
                      <td>{STAGE_LABEL[r.stage]}</td>
                      <td className="coh-num tcc-mono">{r.count}</td>
                      <td className="coh-num tcc-mono">{fmtPct(r.conversion_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="coh-table coh-table--compact coh-gap">
                <caption className="tcc-sr">Conversion by source</caption>
                <thead>
                  <tr>
                    <th scope="col">Source</th>
                    <th scope="col" className="coh-num">
                      Applied
                    </th>
                    <th scope="col" className="coh-num">
                      Accepted
                    </th>
                    <th scope="col" className="coh-num">
                      Conversion
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.source}>
                      <td>{s.source === 'Unknown' ? 'Not recorded' : s.source}</td>
                      <td className="coh-num tcc-mono">{s.total}</td>
                      <td className="coh-num tcc-mono">{s.accepted}</td>
                      <td className="coh-num tcc-mono">{fmtPct(s.conversion_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="coh-hint">
                Counted from each applicant&apos;s current stage. A rejected or declined applicant
                counts as applied only.
              </p>
            </>
          )}
        </section>
        <div className="coh-vrule" aria-hidden="true" />
        <section className="coh-section coh-pair__cell" aria-labelledby="coh-form-title">
          <div className="coh-head">
            <h3 className="coh-subtitle" id="coh-form-title">
              Application form
            </h3>
          </div>
          {forms.status === 'loading' ? (
            <TableSkeleton cols={2} rows={3} />
          ) : forms.status === 'error' ? (
            <SectionError message="Could not load the application form." onRetry={forms.reload} />
          ) : (
            <>
              <dl className="coh-pairs">
                <div className="coh-pairs__row">
                  <dt>Collection</dt>
                  <dd>{form ? (form.is_open ? 'Open' : 'Closed') : 'No form yet'}</dd>
                </div>
                <div className="coh-pairs__row">
                  <dt>Fields</dt>
                  <dd className="tcc-mono">
                    {form ? `${(form.fields || []).length} configured` : NA}
                  </dd>
                </div>
                <div className="coh-pairs__row">
                  <dt>Blind screening</dt>
                  <dd>{blind ? 'On' : 'Off'}</dd>
                </div>
              </dl>
              <p className="coh-hint">
                Applications are entered by managers with Add applicant. There is no public
                application page.
              </p>
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent"
                onClick={() => setBuilding(true)}
              >
                {canManage ? (form ? 'Edit form' : 'Create form') : 'View form'}
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
            </>
          )}
        </section>
      </div>

      {open && (
        <ApplicantDialog
          applicant={open}
          canManage={canManage}
          request={request}
          version={version}
          sample={sample}
          onClose={() => setOpenId(null)}
          onProvision={() => {
            setOpenId(null);
            setProvisionId(open.id);
          }}
          onChanged={onChanged}
        />
      )}
      {provisioning && (
        <ProvisionDialog
          applicant={provisioning}
          request={request}
          sample={sample}
          onClose={() => setProvisionId(null)}
          onDone={() => {
            setProvisionId(null);
            onChanged?.();
          }}
        />
      )}
      {adding && (
        <AddApplicantDialog
          cohort={cohort}
          request={request}
          sample={sample}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            onChanged?.();
          }}
        />
      )}
      {building && (
        <FormBuilderDialog
          cohort={cohort}
          form={form}
          canManage={canManage}
          request={request}
          sample={sample}
          onClose={() => setBuilding(false)}
        />
      )}
    </>
  );
}
