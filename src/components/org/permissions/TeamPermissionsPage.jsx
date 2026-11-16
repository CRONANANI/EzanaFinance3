'use client';

/**
 * Team Permissions (/org-team-hub/permissions). A supervisor switches on
 * extra rights for the people who report to them in the org chart, on top
 * of their role defaults.
 *
 * Who sees what (the server checks every change again; hiding is only a
 * convenience):
 *   executive, senior PM, PM   grant rights they hold to direct reports, revoke extras
 *   junior PM, analysts        view only: their own access, and their reports if any
 *
 * The page renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useMemo, useState } from 'react';
import { Button, Modal, VisuallyHidden } from '@/components/ds';
import { ArrowLink, Skel, SectionError, TextToggle } from '@/components/org/command-center/parts';
import {
  CELL_ICON,
  CELL_TEXT,
  CONFIRM_RIGHTS,
  MATRIX_RIGHTS,
  NA,
  RIGHTS,
  UNIVERSAL_RIGHT,
  cellState,
  fmtDay,
  reviewItems,
  reviewText,
  rightLabel,
  summarize,
} from '@/lib/org-permissions-model';
import { useTeamPermissions } from './useTeamPermissions';
import '@/components/org/command-center/command-center.css';
import './team-permissions.css';
import '@/styles/home-canvas.css';

const ORG_CHART_HREF = '/org-team-hub/org-chart';
const COMPLIANCE_HREF = '/org-team-hub/compliance';

function Kpi({ icon, label, loading, value, title, tone }) {
  const na = value == null;
  return (
    <div className="tcc-kpi" role="listitem" title={title}>
      <i className={`bi ${icon} tcc-kpi__icon`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${na ? ' tcc-na' : tone ? ` ${tone}` : ''}`}>
        {loading ? <Skel w={32} h={16} /> : na ? NA : value}
      </span>
    </div>
  );
}

function Head({ id, title, count, aside }) {
  return (
    <div className="tcc-head">
      <h2 className="tcc-title" id={id}>
        {title}
        {count != null && <span className="tcc-mono tpm-count"> {count}</span>}
      </h2>
      {aside ? <div className="tcc-head__aside">{aside}</div> : null}
    </div>
  );
}

const firstName = (name) => String(name || '').split(' ')[0] || name;

function cellHint(state, member, key) {
  if (state === 'default') return `${rightLabel(key)} comes with the ${member.roleLabel} role.`;
  if (state === 'needs_manager') {
    return `${rightLabel(key)} works only with a manager role, so it would do nothing for ${firstName(member.name)}.`;
  }
  if (state === 'cannot') return `You do not hold ${rightLabel(key)}, so you cannot grant it.`;
  return undefined;
}

/** One matrix cell: text and icon, never colour alone. */
function Cell({ member, right, viewer, saving, onGrant, onRevoke }) {
  const state = cellState({
    member,
    key: right.key,
    canGrant: viewer.canGrant,
    grantable: viewer.grantable,
  });
  const extra = member.extras.find((e) => e.key === right.key);
  const busy = saving === `${member.id}:${right.key}` || extra?.pending;

  if (busy) {
    return (
      <span className="tpm-cell tpm-cell--busy" role="status">
        <i className="bi bi-arrow-repeat" aria-hidden="true" />
        Saving
      </span>
    );
  }
  if (state === 'grant') {
    return (
      <button
        type="button"
        className="tpm-cell tpm-cell--grant"
        onClick={() => onGrant(member, right)}
        aria-label={`Grant ${right.label} to ${member.name}`}
      >
        <i className={`bi ${CELL_ICON.grant}`} aria-hidden="true" />
        {CELL_TEXT.grant}
      </button>
    );
  }
  if (state === 'extra' && viewer.canGrant) {
    const by = extra?.grantedByName ? ` by ${extra.grantedByName}` : '';
    return (
      <button
        type="button"
        className="tpm-cell tpm-cell--extra"
        onClick={() => onRevoke(member, right)}
        aria-label={`Revoke ${right.label} from ${member.name}`}
        title={`Granted extra${by} on ${fmtDay(extra?.grantedAt)}. Select to revoke.`}
      >
        <span className="tpm-cell__on">
          <i className={`bi ${CELL_ICON.extra}`} aria-hidden="true" />
          {CELL_TEXT.extra}
        </span>
        <span className="tpm-cell__off">
          <i className="bi bi-x-circle" aria-hidden="true" />
          Revoke
        </span>
      </button>
    );
  }
  return (
    <span className={`tpm-cell tpm-cell--${state}`} title={cellHint(state, member, right.key)}>
      <i className={`bi ${CELL_ICON[state]}`} aria-hidden="true" />
      {CELL_TEXT[state]}
    </span>
  );
}

function Legend({ canGrant }) {
  const states = canGrant
    ? ['default', 'extra', 'grant', 'needs_manager', 'cannot']
    : ['default', 'extra', 'none'];
  const text = {
    ...CELL_TEXT,
    default: 'Role default, not changeable here',
    extra: canGrant ? 'Granted extra, select to revoke' : 'Granted extra',
    cannot: 'Cannot grant, you do not hold it',
  };
  return (
    <ul className="tpm-legend" aria-label="What each cell means">
      {states.map((s) => (
        <li key={s} className={`tpm-legend__item tpm-cell--${s}`}>
          <i className={`bi ${CELL_ICON[s]}`} aria-hidden="true" />
          {text[s]}
        </li>
      ))}
    </ul>
  );
}

function MatrixSkeleton() {
  return (
    <div className="tpm-skel" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="tpm-skel__row">
          <Skel w="22%" h={i === 0 ? 10 : 14} />
          <Skel w="14%" h={12} />
          <Skel w="14%" h={12} />
          <Skel w="14%" h={12} />
        </div>
      ))}
    </div>
  );
}

function Matrix({ payload, saving, onGrant, onRevoke }) {
  const { viewer, reports } = payload;
  return (
    <>
      <div className="tpm-matrix" role="region" aria-label="Rights by direct report" tabIndex={0}>
        <table className="tpm-table">
          <thead>
            <tr>
              <th scope="col" className="tpm-table__right">
                Right
              </th>
              {reports.map((m) => (
                <th key={m.id} scope="col" className="tpm-table__member">
                  <span className="tpm-table__name">{m.name}</span>
                  <span className="tpm-table__role">{m.roleLabel}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_RIGHTS.map((r) => (
              <tr key={r.key}>
                <th scope="row" className="tpm-table__right">
                  <span className="tpm-table__label">{r.label}</span>
                  <span className="tpm-table__desc">{r.description}</span>
                </th>
                {reports.map((m) => (
                  <td key={m.id}>
                    <Cell
                      member={m}
                      right={r}
                      viewer={viewer}
                      saving={saving}
                      onGrant={onGrant}
                      onRevoke={onRevoke}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tpm-line">
        <i className="bi bi-lock" aria-hidden="true" />
        <span>
          <strong>{rightLabel(UNIVERSAL_RIGHT)}</strong> is a role default for every role and is
          always on.
        </span>
      </p>
      <Legend canGrant={viewer.canGrant} />
    </>
  );
}

function YourAccess({ viewer }) {
  return (
    <section className="tcc-section" aria-labelledby="tpm-access">
      <Head id="tpm-access" title="Your access" />
      <p className="tpm-lede">
        You can see your rights here. Only a supervisor whose role can grant may change them.
      </p>
      <table className="tpm-list">
        <thead>
          <tr>
            <th scope="col">Right</th>
            <th scope="col">Your access ({viewer.roleLabel})</th>
          </tr>
        </thead>
        <tbody>
          {viewer.rights.map((r) => (
            <tr key={r.key}>
              <th scope="row">{rightLabel(r.key)}</th>
              <td className={r.state === 'extra' ? 'tpm-on' : r.state === 'none' ? 'tcc-na' : ''}>
                {r.state === 'default' && 'Role default'}
                {r.state === 'none' && 'Not granted'}
                {r.state === 'extra' && (
                  <>
                    Granted extra
                    {r.grantedByName ? ` by ${r.grantedByName}` : ''}
                    <span className="tcc-mono tpm-date"> {fmtDay(r.grantedAt)}</span>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function GrantRules({ viewer }) {
  const cannot = MATRIX_RIGHTS.filter((r) => !viewer.grantable.includes(r.key)).map((r) => r.label);
  return (
    <section className="tcc-section" aria-labelledby="tpm-rules">
      <Head id="tpm-rules" title="What you can grant" />
      <p className="tpm-prose">
        You can grant only rights you hold yourself, only to people who report to you in the org
        chart, and never to yourself. Role defaults are always on; to change them, change the
        member&apos;s role in the org chart.
      </p>
      <p className="tpm-prose">
        {cannot.length
          ? `You do not hold ${cannot.join(', ')}, so you cannot grant ${cannot.length === 1 ? 'it' : 'them'}.`
          : 'Your role holds every right on this page, so you can grant any of them.'}{' '}
        A change applies the next time the member uses that right.
      </p>
      {viewer.isExecutive && (
        <p className="tpm-prose">
          Every grant and revoke is recorded in the council activity log.{' '}
          <ArrowLink href={COMPLIANCE_HREF}>Open the activity log in Compliance</ArrowLink>
        </p>
      )}
    </section>
  );
}

function Review({ payload, onRevoke, saving }) {
  const items = reviewItems(payload.reports, payload.viewer.id);
  return (
    <section className="tcc-section" aria-labelledby="tpm-review">
      <Head id="tpm-review" title="Extras to review" count={items.length} />
      {items.length === 0 ? (
        <p className="tcc-state">
          Nothing to review. Every stored extra does something and was granted by you.
        </p>
      ) : (
        <ul className="tpm-review">
          {items.map((it) => {
            const busy = saving === `${it.member.id}:${it.extra.key}`;
            return (
              <li key={`${it.member.id}:${it.extra.key}`} className="tpm-review__row">
                <div className="tpm-review__main">
                  <span className="tpm-review__what">
                    {rightLabel(it.extra.key)}
                    <span className="tpm-review__who"> for {it.member.name}</span>
                  </span>
                  <span className="tpm-review__why">{reviewText(it)}</span>
                  <span className="tpm-review__when">
                    Granted <span className="tcc-mono">{fmtDay(it.extra.grantedAt)}</span>
                  </span>
                </div>
                <button
                  type="button"
                  className="tcc-textbtn tpm-revoke"
                  disabled={busy}
                  onClick={() =>
                    onRevoke(
                      it.member,
                      RIGHTS.find((r) => r.key === it.extra.key),
                    )
                  }
                  aria-label={`Revoke ${rightLabel(it.extra.key)} from ${it.member.name}`}
                >
                  {busy ? 'Saving' : 'Revoke'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MemberDetails({ payload, selectedId, onSelect }) {
  const { reports } = payload;
  const m = reports.find((r) => r.id === selectedId) || reports[0];
  if (!m) return null;
  const defaults = RIGHTS.filter((r) => m.defaults.includes(r.key));
  return (
    <>
      <section className="tcc-section" aria-labelledby="tpm-member">
        <Head id="tpm-member" title="Member details" />
        {reports.length > 1 && (
          <div className="tcc-toggles tpm-pick" role="group" aria-label="Choose a member">
            {reports.map((r) => (
              <TextToggle key={r.id} pressed={r.id === m.id} onClick={() => onSelect(r.id)}>
                {r.name}
              </TextToggle>
            ))}
          </div>
        )}
        <dl className="tpm-dl">
          <dt>Name</dt>
          <dd>{m.name}</dd>
          <dt>Role</dt>
          <dd>{m.roleLabel}</dd>
          <dt>
            Role defaults <span className="tcc-mono">({defaults.length})</span>
          </dt>
          <dd>{defaults.map((r) => r.label).join(', ') || 'None'}</dd>
          <dt>
            Extras <span className="tcc-mono">({m.extras.length})</span>
          </dt>
          <dd>
            {m.extras.length === 0
              ? 'None'
              : m.extras.map((e) => (
                  <span key={e.key} className="tpm-dl__line">
                    <span className="tpm-on">{rightLabel(e.key)}</span>
                    {e.grantedByName ? `, granted by ${e.grantedByName}` : ''} on{' '}
                    <span className="tcc-mono">{fmtDay(e.grantedAt)}</span>
                  </span>
                ))}
          </dd>
        </dl>
      </section>
      <span className="tcc-vrule" aria-hidden="true" />
      <section className="tcc-section" aria-labelledby="tpm-defaults">
        <Head id="tpm-defaults" title={`Role defaults: ${m.roleLabel}`} />
        <table className="tpm-list">
          <thead>
            <tr>
              <th scope="col">Right</th>
              <th scope="col">With this role</th>
            </tr>
          </thead>
          <tbody>
            {RIGHTS.map((r) => {
              const on = m.defaults.includes(r.key);
              return (
                <tr key={r.key}>
                  <th scope="row">{r.label}</th>
                  <td className={on ? '' : 'tcc-na'}>
                    {on ? (
                      <>
                        <i className="bi bi-lock" aria-hidden="true" /> Always on
                      </>
                    ) : (
                      'Not included'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

function WhereUsed() {
  return (
    <section className="tcc-section" aria-labelledby="tpm-used">
      <Head id="tpm-used" title="Where each right is used" />
      <ul className="tpm-used">
        {RIGHTS.map((r) => (
          <li key={r.key}>
            <span className="tpm-used__label">{r.label}</span>
            <span className="tpm-used__where">{r.usedIn}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConfirmGrant({ pending, sample, onConfirm, onClose, busy }) {
  const { member, right } = pending;
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={`Confirm grant: ${right.label}`}
      size={480}
      className="tpm-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <Button variant="primary" className="tcc-flatbtn" loading={busy} onClick={onConfirm}>
            Grant access
          </Button>
        </>
      }
    >
      <p className="tpm-dialog__q">
        Grant {right.label} to {member.name}?
      </p>
      <p className="tpm-dialog__body">
        {right.key === 'view_analytics'
          ? 'They will see fund data health, the council attention map and every member’s scorecard.'
          : 'They will be able to add holdings by hand, by spreadsheet or from a brokerage link, and remove holdings.'}{' '}
        It is stored as an extra on top of their role, you can revoke it at any time, and the change
        is recorded.
      </p>
      {sample && (
        <p className="tpm-dialog__note">
          Sample content is showing. This is applied to the page only and is not saved.
        </p>
      )}
    </Modal>
  );
}

export function TeamPermissionsPage({ initialData, sampleViewer }) {
  const data = useTeamPermissions({ initialData, sampleViewer });
  const { payload, status, sampleActive } = data;
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const loading = status === 'loading';
  const failed = status === 'error' || status === 'forbidden';
  const counts = useMemo(() => (payload ? summarize(payload) : null), [payload]);
  const viewer = payload?.viewer;
  const reports = payload?.reports || [];

  const run = async (member, right, action) => {
    setError(null);
    setNotice(null);
    const res = await data.change(member.id, right.key, action);
    if (res.ok) {
      const verb = action === 'grant' ? `Granted ${right.label} to` : `Revoked ${right.label} from`;
      setNotice(
        `${verb} ${member.name}.${res.sample ? ' Sample content: nothing was saved.' : ''}`,
      );
    } else {
      setError(`${res.error || 'The change was not saved.'} Nothing was changed.`);
    }
    return res;
  };

  const onGrant = (member, right) => {
    if (CONFIRM_RIGHTS.has(right.key)) setPending({ member, right });
    else run(member, right, 'grant');
  };
  const onRevoke = (member, right) => run(member, right, 'revoke');
  const confirm = async () => {
    setBusy(true);
    await run(pending.member, pending.right, 'grant');
    setBusy(false);
    setPending(null);
  };

  const top = (
    <div className="tcc-top">
      <div className="tcc-kpis" aria-busy={loading || undefined}>
        <div className="tcc-kpistrip tpm-kpis" role="list" aria-label="Permission figures">
          <Kpi
            icon="bi-people"
            label="Direct reports"
            loading={loading}
            value={failed ? null : counts?.reports}
            title="Active members who report to you in the org chart"
          />
          <Kpi
            icon="bi-check2-circle"
            label="Active extras"
            loading={loading}
            value={failed ? null : counts?.extras}
            title="Stored extras across your direct reports"
          />
          <Kpi
            icon="bi-key"
            label="Rights you can grant"
            loading={loading}
            value={failed || !viewer?.canGrant ? null : counts?.grantable}
            title="Rights on this page you hold yourself"
          />
          <Kpi
            icon="bi-dash-circle"
            label="Rights you cannot grant"
            loading={loading}
            value={failed ? null : counts?.restricted}
            title="Rights on this page you do not hold"
          />
          <Kpi
            icon="bi-hourglass-split"
            label="Extras to review"
            loading={loading}
            value={failed ? null : counts?.review}
            tone={counts?.review > 0 ? 'tcc-warn' : ''}
            title="Extras that do nothing, or were granted by someone else"
          />
        </div>
      </div>
      <div className="tcc-actions">
        {(sampleActive || data.sampleAvailable) && (
          <div className="tcc-actions__context">
            {sampleActive && <span className="tcc-sample">Sample content</span>}
            {data.sampleAvailable && (
              <button
                type="button"
                className="tcc-textbtn"
                onClick={() => data.setShowSample(!sampleActive)}
              >
                {sampleActive ? 'Show council data' : 'Show sample content'}
              </button>
            )}
          </div>
        )}
        {!sampleActive && (
          <button type="button" className="tcc-textbtn" onClick={data.refresh} disabled={loading}>
            <i className="bi bi-arrow-clockwise" aria-hidden="true" />
            Refresh
          </button>
        )}
        <ArrowLink href={ORG_CHART_HREF}>Org chart</ArrowLink>
      </div>
    </div>
  );

  const previews = sampleActive && data.views.length > 1 && (
    <div className="tpm-preview" role="group" aria-label="Preview the sample as">
      <span className="tpm-preview__label">Preview as</span>
      <div className="tcc-toggles">
        {data.views.map((v) => (
          <TextToggle
            key={v.key}
            pressed={data.viewKey === v.key}
            onClick={() => {
              data.setView(v.key);
              setSelected(null);
              setNotice(null);
              setError(null);
            }}
          >
            {v.label}
          </TextToggle>
        ))}
      </div>
    </div>
  );

  let body;
  if (loading) {
    body = (
      <div className="tcc-row tcc-row--single" aria-busy="true">
        <section className="tcc-section">
          <Head id="tpm-matrix" title="Direct reports" />
          <MatrixSkeleton />
        </section>
      </div>
    );
  } else if (failed || !payload) {
    body = (
      <div className="tcc-row tcc-row--single">
        <SectionError message="Could not load team permissions." onRetry={data.retry} />
      </div>
    );
  } else {
    const hasReports = reports.length > 0;
    body = (
      <>
        {!viewer.canGrant && (
          <div className="tcc-row tcc-row--single">
            <YourAccess viewer={viewer} />
          </div>
        )}
        {(viewer.canGrant || hasReports) && (
          <div className="tcc-row tcc-row--single">
            <section className="tcc-section" aria-labelledby="tpm-matrix">
              <Head id="tpm-matrix" title="Direct reports" count={reports.length} />
              <p className="tpm-lede">
                {viewer.canGrant
                  ? `People who report to ${sampleActive ? viewer.name : 'you'} (${viewer.roleLabel}) in the org chart. Grant or revoke extras; role defaults stay on.`
                  : 'People who report to you in the org chart. Your role cannot grant rights, so this is view only.'}
              </p>
              {error && (
                <p className="tpm-msg tpm-msg--error" role="alert">
                  <i className="bi bi-exclamation-circle" aria-hidden="true" />
                  <span>{error}</span>
                </p>
              )}
              {notice && (
                <p className="tpm-msg" role="status">
                  <i className="bi bi-check2-circle" aria-hidden="true" />
                  <span>{notice}</span>
                  <button type="button" className="tcc-textbtn" onClick={() => setNotice(null)}>
                    Dismiss
                  </button>
                </p>
              )}
              {hasReports ? (
                <Matrix
                  payload={payload}
                  saving={data.saving}
                  onGrant={onGrant}
                  onRevoke={onRevoke}
                />
              ) : (
                <p className="tcc-state">
                  <span>Nobody reports to you in the org chart yet.</span>
                  <ArrowLink href={ORG_CHART_HREF}>Set reporting lines in the org chart</ArrowLink>
                </p>
              )}
            </section>
          </div>
        )}
        {viewer.canGrant && (
          <div className="tcc-row tpm-row--half">
            <GrantRules viewer={viewer} />
            <span className="tcc-vrule" aria-hidden="true" />
            <Review payload={payload} onRevoke={onRevoke} saving={data.saving} />
          </div>
        )}
        <div className={`tcc-row ${hasReports ? 'tpm-row--three' : 'tcc-row--single'}`}>
          {hasReports && (
            <>
              <MemberDetails payload={payload} selectedId={selected} onSelect={setSelected} />
              <span className="tcc-vrule" aria-hidden="true" />
            </>
          )}
          <WhereUsed />
        </div>
        {sampleActive && (
          <p className="tpm-footnote">
            Sample content only. Names and dates shown here are invented, and nothing done to them
            is saved.
          </p>
        )}
      </>
    );
  }

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page tpm-page">
      <VisuallyHidden>
        <h1>Team permissions</h1>
      </VisuallyHidden>
      {top}
      {previews}
      {body}
      {pending && (
        <ConfirmGrant
          pending={pending}
          sample={sampleActive}
          busy={busy}
          onConfirm={confirm}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  );
}

export default TeamPermissionsPage;
