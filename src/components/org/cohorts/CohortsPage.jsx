'use client';

/**
 * Cohorts (/org-team-hub/cohorts). One analyst class at a time, from
 * recruiting through onboarding and the roster to graduation into the alumni
 * record. Four tabs on one address; the chosen cohort and tab are kept in the
 * address (?cohort=<id>&tab=<tab>).
 *
 * Rights (the routes check every one again):
 * - every member reads cohorts, the roster, onboarding and alumni, and scores
 *   applicants they are assigned to;
 * - executives and portfolio managers recruit, onboard, change lifecycle
 *   status and edit placements;
 * - executives create a cohort, make one current and graduate one.
 *
 * Graduation graduates only the flagged members of the cohort being
 * graduated, and the dialog lists exactly them. A new cohort is never made
 * current on creation; "Set as current" is the explicit step.
 *
 * The page renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dropdown, MenuItem, VisuallyHidden } from '@/components/ds';
import { useOrg } from '@/contexts/OrgContext';
import {
  COHORT_STATUS_LABEL,
  NA,
  TABS,
  TAB_KEYS,
  defaultCohortId,
  readAddress,
  termLine,
} from '@/lib/org-cohorts-model';
import { useCohortsSource, useResource } from './useCohortsSource';
import { Kpi, SectionError, TableSkeleton } from './parts';
import { RosterTab } from './RosterTab';
import { RecruitmentTab } from './RecruitmentTab';
import { OnboardingTab } from './OnboardingTab';
import { AlumniTab } from './AlumniTab';
import {
  GraduateDialog,
  NewCohortDialog,
  SetCurrentDialog,
  TrackRecordDialog,
} from './CohortDialogs';
import '@/components/org/command-center/command-center.css';
import './cohorts.css';
import '@/styles/home-canvas.css';

function writeAddress(cohortId, tab) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (cohortId) url.searchParams.set('cohort', cohortId);
  else url.searchParams.delete('cohort');
  if (tab && tab !== 'roster') url.searchParams.set('tab', tab);
  else url.searchParams.delete('tab');
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    try {
      window.history.replaceState(window.history.state, '', next);
    } catch {
      /* The address could not be updated; the page itself is unaffected. */
    }
  }
}

function Notice({ children }) {
  return (
    <div className="dashboard-page-inset ez-canvas tcc-page coh-page">
      <VisuallyHidden>
        <h1>Cohorts</h1>
      </VisuallyHidden>
      <p className="tcc-state" role="status">
        {children}
      </p>
    </div>
  );
}

export function CohortsPage({ initialData = null, sampleViewer = false, initialAddress = null }) {
  const { orgRole } = useOrg();
  const src = useCohortsSource({ sampleViewer });
  const { request, version, sampleActive } = src;

  const cohortsRes = useResource(request, '/api/org/cohorts', version, { skip: src.sampleLoading });
  const seeded = !sampleActive && !src.sampleLoading ? initialData : null;
  const cohortsData = cohortsRes.data || (cohortsRes.status === 'loading' ? seeded : null);
  const cohorts = useMemo(() => cohortsData?.cohorts || [], [cohortsData]);
  const viewer = cohortsData?.viewer || {
    role: orgRole,
    canManage: orgRole === 'executive' || orgRole === 'portfolio_manager',
    isExecutive: orgRole === 'executive',
  };
  const canManage = !!viewer.canManage;
  const isExec = !!viewer.isExecutive;
  const listLoading = !cohortsData && (cohortsRes.status === 'loading' || src.sampleLoading);
  const listFailed = !cohortsData && cohortsRes.status === 'error';

  const start = initialAddress || { cohort: null, tab: null };
  const [tab, setTab] = useState(start.tab && TAB_KEYS.includes(start.tab) ? start.tab : 'roster');
  const [picked, setPicked] = useState(start.cohort || null);
  const userPicked = useRef(Boolean(start.cohort));
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(null);

  /* Switching between sample content and council data starts fresh. */
  const lastSample = useRef(sampleViewer ? null : sampleActive);
  useEffect(() => {
    if (src.sampleLoading) return;
    /* The first answer of the sample route keeps the address the page opened on. */
    if (lastSample.current === null) {
      lastSample.current = sampleActive;
      return;
    }
    if (lastSample.current === sampleActive) return;
    lastSample.current = sampleActive;
    userPicked.current = false;
    setPicked(null);
    setNotice(null);
  }, [sampleActive, src.sampleLoading]);

  /* The cohort shown: a hand pick sticks; otherwise the default for the tab. */
  const selected = useMemo(() => {
    if (!cohorts.length) return null;
    const hand = userPicked.current && cohorts.find((c) => c.id === picked);
    if (hand) return hand;
    const id = defaultCohortId(cohorts, tab);
    return cohorts.find((c) => c.id === id) || null;
  }, [cohorts, picked, tab]);
  const current = cohorts.find((c) => c.is_current) || null;

  useEffect(() => {
    if (!sampleActive && selected) writeAddress(userPicked.current ? selected.id : null, tab);
    else if (!sampleActive && !listLoading) writeAddress(null, tab);
  }, [sampleActive, selected, tab, listLoading]);

  /* Address changed by the browser (back or forward). */
  useEffect(() => {
    const onPop = () => {
      const a = readAddress(window.location.search);
      if (a.tab) setTab(a.tab);
      if (a.cohort) {
        userPicked.current = true;
        setPicked(a.cohort);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const cid = selected?.id || null;
  const roster = useResource(request, cid && `/api/org/cohorts/${cid}/roster`, version, {
    skip: !cid,
  });
  const graduation = useResource(request, cid && `/api/org/cohorts/${cid}/graduation`, version, {
    skip: !cid,
  });
  const applicants = useResource(request, cid && `/api/org/applicants?cohort_id=${cid}`, version, {
    skip: !cid,
  });
  const onboarding = useResource(request, cid && `/api/org/cohorts/${cid}/onboarding`, version, {
    skip: !cid,
  });
  const alumni = useResource(request, cohortsData ? '/api/org/alumni' : null, version, {
    skip: !cohortsData,
  });

  const pickCohort = (id) => {
    userPicked.current = true;
    setPicked(id);
    setNotice(null);
  };
  const changeTab = (k) => {
    if (!userPicked.current && selected) {
      /* Keep the default rule: Recruitment opens on the recruiting cohort. */
      setPicked(null);
    }
    setTab(k);
  };
  const onTabKey = (e, i) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End')
      return;
    e.preventDefault();
    const n = TABS.length;
    const j =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? n - 1
          : (i + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
    changeTab(TABS[j].key);
    document.getElementById(`coh-tab-${TABS[j].key}`)?.focus();
  };
  const refresh = useCallback(() => setNotice(null), []);

  if (cohortsRes.status === 'forbidden')
    return <Notice>This page is for council members only.</Notice>;

  const counts = {
    roster: roster.status === 'ready' ? (roster.data?.members?.length ?? null) : null,
    recruitment:
      applicants.status === 'ready' ? (applicants.data?.applicants?.length ?? null) : null,
    onboarding: onboarding.status === 'ready' ? (onboarding.data?.stats?.enrolled ?? null) : null,
    alumni: alumni.status === 'ready' ? (alumni.data?.alumni?.length ?? null) : null,
  };
  const blocked = onboarding.status === 'ready' ? (onboarding.data?.stats?.blocked ?? 0) : null;
  const term = termLine(selected);
  const sampleNote = sampleActive ? ' Sample content: it is not saved.' : '';

  /* ── Row 1: context and page actions ── */
  const control = (
    <div className="coh-control">
      <div className="coh-control__left">
        {(sampleActive || src.sampleAvailable) && (
          <span className="coh-samplebox">
            {sampleActive && <span className="tcc-sample coh-samplelabel">Sample content</span>}
            {src.sampleAvailable && (
              <button
                type="button"
                className="tcc-textbtn coh-small"
                onClick={() => src.setShowSample(!sampleActive)}
              >
                {sampleActive ? 'Show council data' : 'Show sample content'}
              </button>
            )}
          </span>
        )}
        {(sampleActive || src.sampleAvailable) && cohorts.length > 0 && (
          <span className="coh-hrule" aria-hidden="true" />
        )}
        {cohorts.length > 0 && (
          <Dropdown
            className="coh-selector"
            trigger={
              <span
                className="coh-selector__trigger"
                aria-label={`Cohort: ${selected?.name || 'none'}. Change cohort`}
              >
                <span className="coh-selector__name">{selected?.name || 'Choose a cohort'}</span>
                {selected && (
                  <span
                    className={`coh-selector__status${selected.archived ? ' coh-dim' : ' coh-tone--pos'}`}
                  >
                    {COHORT_STATUS_LABEL[selected.status] || selected.status}
                  </span>
                )}
                <i className="bi bi-chevron-down" aria-hidden="true" />
              </span>
            }
          >
            {cohorts.map((c) => (
              <MenuItem
                key={c.id}
                icon={c.id === selected?.id ? 'bi-check-lg' : undefined}
                className={c.id === selected?.id ? 'coh-menu__on' : 'coh-menu__off'}
                aria-current={c.id === selected?.id || undefined}
                onClick={() => pickCohort(c.id)}
              >
                <span className="coh-menu__name">{c.name}</span>
                <span className="coh-menu__meta">
                  {COHORT_STATUS_LABEL[c.status] || c.status}
                  {c.is_current ? ', current' : ''}
                </span>
              </MenuItem>
            ))}
          </Dropdown>
        )}
      </div>
      <div className="coh-control__right">
        {isExec && (
          <button
            type="button"
            className="tcc-textbtn"
            onClick={() => setDialog({ kind: 'new' })}
            disabled={listLoading || listFailed}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            New cohort
          </button>
        )}
        {isExec && selected && !selected.is_current && !selected.archived && (
          <button
            type="button"
            className="tcc-textbtn"
            onClick={() => setDialog({ kind: 'current' })}
          >
            <i className="bi bi-pin-angle" aria-hidden="true" />
            Set as current
          </button>
        )}
        {selected?.archived && (
          <button
            type="button"
            className="tcc-textbtn"
            onClick={() => setDialog({ kind: 'track', cohort: selected })}
          >
            <i className="bi bi-archive" aria-hidden="true" />
            Track record
          </button>
        )}
        {isExec && selected && !selected.archived && (
          <button type="button" className="tcc-btn" onClick={() => setDialog({ kind: 'graduate' })}>
            <i className="bi bi-mortarboard" aria-hidden="true" />
            Graduate class
          </button>
        )}
      </div>
    </div>
  );

  const kpis = (
    <div className="coh-kpis coh-kpis--top" aria-busy={listLoading || undefined}>
      <div className="tcc-kpistrip coh-kpistrip--5" role="list" aria-label="Cohort figures">
        <Kpi icon="bi-pin-angle" label="Current cohort" loading={listLoading} na={!current} text>
          {current ? current.name : 'None set'}
        </Kpi>
        <Kpi
          icon="bi-people"
          label="Roster members"
          loading={roster.status === 'loading'}
          na={counts.roster == null}
        >
          {counts.roster ?? NA}
        </Kpi>
        <Kpi
          icon="bi-person-lines-fill"
          label="Applicants"
          loading={applicants.status === 'loading'}
          na={counts.recruitment == null}
        >
          {counts.recruitment ?? NA}
        </Kpi>
        <Kpi
          icon="bi-exclamation-triangle"
          label="Onboarding blocked"
          loading={onboarding.status === 'loading'}
          na={blocked == null}
          warn={blocked > 0}
          title="Onboarding members of this cohort blocked from a first live pitch by the gate"
        >
          {blocked ?? NA}
        </Kpi>
        <Kpi
          icon="bi-mortarboard"
          label="Total alumni"
          loading={alumni.status === 'loading'}
          na={counts.alumni == null}
          title="Alumni of every class"
        >
          {counts.alumni ?? NA}
        </Kpi>
      </div>
    </div>
  );

  const tabs = (
    <div className="coh-tabsrow">
      <div className="coh-tabs" role="tablist" aria-label="Cohort sections">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            id={`coh-tab-${t.key}`}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-controls="coh-panel"
            tabIndex={tab === t.key ? 0 : -1}
            className={`coh-tab${tab === t.key ? ' is-on' : ''}`}
            onClick={() => changeTab(t.key)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            {t.label}
            {counts[t.key] ? <span className="tcc-mono coh-tab__n">{counts[t.key]}</span> : null}
          </button>
        ))}
      </div>
      {term && <p className="tcc-meta coh-term">{term}</p>}
    </div>
  );

  let panel;
  if (listLoading)
    panel = (
      <div className="coh-section">
        <TableSkeleton cols={7} rows={6} />
      </div>
    );
  else if (listFailed)
    panel = <SectionError message="Could not load cohorts." onRetry={cohortsRes.reload} />;
  else if (!cohorts.length)
    panel = (
      <p className="tcc-state">
        <span>No cohorts yet.</span>
        {isExec ? (
          <button
            type="button"
            className="tcc-textbtn tcc-textbtn--accent"
            onClick={() => setDialog({ kind: 'new' })}
          >
            Create the first cohort
          </button>
        ) : (
          <span>An executive creates the first cohort.</span>
        )}
      </p>
    );
  else if (!selected) panel = null;
  else if (tab === 'roster')
    panel = (
      <RosterTab
        key={`r-${selected.id}-${sampleActive}`}
        cohort={selected}
        roster={roster}
        graduation={graduation}
        canManage={canManage}
        request={request}
        sample={sampleActive}
        onGoRecruit={() => changeTab('recruitment')}
        onChanged={refresh}
      />
    );
  else if (tab === 'recruitment')
    panel = (
      <RecruitmentTab
        key={`a-${selected.id}-${sampleActive}`}
        cohort={selected}
        applicants={applicants}
        canManage={canManage}
        request={request}
        version={version}
        sample={sampleActive}
        onChanged={refresh}
      />
    );
  else if (tab === 'onboarding')
    panel = (
      <OnboardingTab
        key={`o-${selected.id}-${sampleActive}`}
        cohort={selected}
        onboarding={onboarding}
        canManage={canManage}
        viewer={viewer}
        request={request}
        sample={sampleActive}
        onChanged={refresh}
      />
    );
  else
    panel = (
      <AlumniTab
        key={`l-${sampleActive}`}
        alumni={alumni}
        cohorts={cohorts}
        canManage={canManage}
        request={request}
        sample={sampleActive}
        onOpenTrackRecord={(c) => setDialog({ kind: 'track', cohort: c })}
        onChanged={refresh}
      />
    );

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page coh-page">
      <VisuallyHidden>
        <h1>Cohorts</h1>
      </VisuallyHidden>
      {control}
      {kpis}
      {notice && (
        <p className="coh-notice" role="status">
          <i className="bi bi-check-lg" aria-hidden="true" />
          {notice}
          <button type="button" className="tcc-textbtn coh-small" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </p>
      )}
      {cohorts.length > 0 && tabs}
      <div
        id="coh-panel"
        role={cohorts.length ? 'tabpanel' : undefined}
        aria-labelledby={cohorts.length ? `coh-tab-${tab}` : undefined}
      >
        {panel}
      </div>
      {sampleActive && (
        <p className="coh-footnote">
          Sample content: invented people, classes and figures, shown to review the page. Nothing
          done here is saved. Access rules are still checked by the server.
        </p>
      )}

      {dialog?.kind === 'new' && (
        <NewCohortDialog
          request={request}
          sample={sampleActive}
          onClose={() => setDialog(null)}
          onCreated={(id) => {
            setDialog(null);
            if (id) pickCohort(id);
            setNotice(
              `Cohort created as recruiting. ${current ? `${current.name} is still current.` : 'No cohort is current yet.'} Use Set as current to change that.${sampleNote}`,
            );
          }}
        />
      )}
      {dialog?.kind === 'current' && selected && (
        <SetCurrentDialog
          cohort={selected}
          current={current}
          request={request}
          sample={sampleActive}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            setNotice(`${selected.name} is now the current cohort.${sampleNote}`);
          }}
        />
      )}
      {dialog?.kind === 'graduate' && selected && (
        <GraduateDialog
          cohort={selected}
          preview={graduation}
          request={request}
          sample={sampleActive}
          onClose={() => setDialog(null)}
          onReload={graduation.reload}
          onDone={(n) => {
            setDialog(null);
            setNotice(
              `${selected.name} graduated. ${n} ${n === 1 ? 'member moved' : 'members moved'} to alumni.${sampleNote}`,
            );
          }}
        />
      )}
      {dialog?.kind === 'track' && dialog.cohort && (
        <TrackRecordDialog cohort={dialog.cohort} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
