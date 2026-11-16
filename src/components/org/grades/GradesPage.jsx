'use client';

/**
 * Grades (/org-team-hub/grades). One address, two views:
 *
 * - Executives (the faculty advisor and the council's executives, as today)
 *   see the council grade book: every grade, a view by cohort, the members
 *   with no grade yet, one member's record, and they enter and change grades.
 * - Every other member sees only their own grades, letters, feedback,
 *   rubrics and average. Never another member's name, score, rank, average
 *   or distribution: the server sends them nothing else, and nothing here
 *   is worked out from anyone else's records.
 *
 * Visibility is the council-wide switch in Settings. While it is paused,
 * members receive no grades and see why; executives see "Hidden from
 * members" and still work as usual.
 *
 * The page renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { useOrg } from '@/contexts/OrgContext';
import {
  MEMBER_TABS,
  NA,
  TABS,
  VIEWS,
  WORK_KINDS,
  averageOf,
  cohortShort,
  cohortSummary,
  councilMetrics,
  councilSummary,
  filterGrades,
  fmtDay,
  fmtPct,
  fmtScore,
  kindIcon,
  kindLabel,
  lastChangedOf,
  memberMetrics,
  memberRecord,
  membersWithoutGrades,
  roleLabel,
  tabCounts,
} from '@/lib/org-grades-model';
import { Skel, SectionError, TextToggle } from '@/components/org/command-center/parts';
import { useGradesData } from './useGradesData';
import { StudentRecord } from './StudentRecord';
import { GradeDialog } from './GradeDialog';
import '@/components/org/command-center/command-center.css';
import './grades.css';
import '@/styles/home-canvas.css';

const SETTINGS_HREF = '/settings?tab=organization';
const ASSIGNMENTS_HREF = '/org-team-hub/assignments';
const PAGE_SIZE = 25;

function Kpi({ icon, label, loading, na, text = false, title, children }) {
  return (
    <div className="tcc-kpi" role="listitem" title={title}>
      <i className={`bi ${icon} tcc-kpi__icon`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span
        className={`tcc-kpi__value${text ? ' ogr-kpi__text' : ' tcc-mono'}${na ? ' tcc-na' : ''}`}
      >
        {loading ? <Skel w={48} h={16} /> : children}
      </span>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="dashboard-page-inset ez-canvas tcc-page ogr-page">
      <VisuallyHidden>
        <h1>Grades</h1>
      </VisuallyHidden>
      <p className="tcc-state" role="status">
        {children}
      </p>
    </div>
  );
}

function ArrowLink({ href, children }) {
  return (
    <Link href={href} className="tcc-link">
      {children} <i className="bi bi-arrow-right" aria-hidden="true" />
    </Link>
  );
}

function Search({ value, onChange, placeholder, label }) {
  return (
    <label className="ogr-search">
      <i className="bi bi-search" aria-hidden="true" />
      <span className="tcc-sr">{label || placeholder}</span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function FilterList({ label, items, value, onChange }) {
  return (
    <div className="ogr-railsec">
      <h2 className="ogr-railhead">{label}</h2>
      <ul className="ogr-filters">
        {items.map((it) => (
          <li key={it.key}>
            <button
              type="button"
              className={`ogr-filter${value === it.key ? ' is-on' : ''}`}
              aria-pressed={value === it.key}
              onClick={() => onChange(it.key)}
            >
              <span>{it.label}</span>
              {it.n !== undefined && <span className="tcc-mono ogr-filter__n">{it.n}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const Kind = ({ kind }) => (
  <span className="ogr-kind">
    <i className={`bi ${kindIcon(kind)}`} aria-hidden="true" />
    {kindLabel(kind)}
  </span>
);

/** Keep the chosen member in the page address (?member=<id>), executives only. */
function writeAddress(memberId) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (memberId) url.searchParams.set('member', memberId);
  else url.searchParams.delete('member');
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    try {
      window.history.replaceState(window.history.state, '', next);
    } catch {
      /* The address could not be updated; the page itself is unaffected. */
    }
  }
}

/* ── Executive: the council grade table ─────────────────────────────────── */
function GradeTable({ rows, cohortName, selectedMember, selectedEntry, onPick, member = false }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const shown = rows.slice(0, limit);
  return (
    <>
      <table className={`ogr-table${member ? ' ogr-table--member' : ''}`}>
        <caption className="tcc-sr">
          {member ? 'Your grades, newest first' : 'Council grades, newest first'}
        </caption>
        <thead>
          <tr>
            {!member && (
              <th scope="col" className="ogr-c-name">
                Student
              </th>
            )}
            {!member && (
              <th scope="col" className="ogr-c-cohort">
                Cohort
              </th>
            )}
            <th scope="col" className="ogr-c-work">
              Work
            </th>
            <th scope="col" className="ogr-c-score ogr-num">
              Score
            </th>
            <th scope="col" className="ogr-c-letter">
              Letter
            </th>
            <th
              scope="col"
              className="ogr-c-grader"
              title="The executive who entered or last changed it"
            >
              Grader
            </th>
            <th scope="col" className="ogr-c-date">
              {member ? 'Date' : 'Last changed'}
            </th>
            <th scope="col" className="ogr-c-fb">
              Feedback
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((g) => {
            const on = member ? selectedEntry === g.id : selectedMember === g.student_id;
            return (
              <tr
                key={g.id}
                className={on ? 'is-on' : undefined}
                onClick={() => onPick(g)}
                aria-selected={on || undefined}
              >
                {!member && (
                  <td className="ogr-c-name">
                    <button
                      type="button"
                      className="ogr-rowbtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPick(g);
                      }}
                    >
                      {g.student_name}
                      {g.student_former && <span className="ogr-former"> (former)</span>}
                    </button>
                  </td>
                )}
                {!member && (
                  <td className="ogr-c-cohort tcc-mono" title={cohortName(g.cohort_id)}>
                    {cohortShort(g.cohort_id ? cohortName(g.cohort_id) : null)}
                  </td>
                )}
                <td className="ogr-c-work">
                  {member ? (
                    <button
                      type="button"
                      className="ogr-rowbtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPick(g);
                      }}
                    >
                      <Kind kind={g.work_type} />
                    </button>
                  ) : (
                    <Kind kind={g.work_type} />
                  )}
                </td>
                <td
                  className={`ogr-c-score ogr-num tcc-mono ogr-neutral${g.score == null ? ' tcc-na' : ''}`}
                >
                  {fmtScore(g)}
                </td>
                <td className={`ogr-c-letter tcc-mono ogr-neutral${g.letter ? '' : ' tcc-na'}`}>
                  {g.letter || NA}
                </td>
                <td className={`ogr-c-grader${g.grader_name ? '' : ' tcc-na'}`}>
                  {g.grader_name || NA}
                </td>
                <td className="ogr-c-date tcc-mono">{fmtDay(lastChangedOf(g))}</td>
                <td className={`ogr-c-fb${g.feedback ? '' : ' tcc-na'}`}>
                  <span className="ogr-clamp">{g.feedback || NA}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > limit && (
        <button
          type="button"
          className="tcc-textbtn tcc-textbtn--accent ogr-more"
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
        >
          Show {Math.min(PAGE_SIZE, rows.length - limit)} more of{' '}
          <span className="tcc-mono">{rows.length - limit}</span>
        </button>
      )}
    </>
  );
}

function TableSkeleton({ rows = 6 }) {
  return (
    <div className="ogr-skel" aria-hidden="true">
      <Skel w="100%" h={12} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skel key={i} w={`${100 - (i % 3) * 6}%`} h={14} />
      ))}
    </div>
  );
}

function RecordSkeleton() {
  return (
    <div className="ogr-skel" aria-hidden="true">
      <Skel w="70%" h={24} />
      <Skel w="50%" h={12} />
      <Skel w="100%" h={36} />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skel key={i} w={`${94 - i * 7}%`} h={12} />
      ))}
    </div>
  );
}

/* ── The page ───────────────────────────────────────────────────────────── */
export function GradesPage({ initialData = null, sampleViewer = false, initialMember = null }) {
  const { orgRole } = useOrg();
  const data = useGradesData({ initialData, sampleViewer });
  const { state, act, sampleActive } = data;
  const d = state.data;
  const loading = state.status === 'loading';
  const failed = state.status === 'error';
  const ready = state.status === 'ready' && d;
  const canGrade = ready ? Boolean(d.viewer?.canGrade) : orgRole === 'executive';
  const paused = ready && d.visibility === 'paused';
  const hiddenForMe = ready && !canGrade && d.gradingHidden;

  const [view, setView] = useState('grades');
  const [tab, setTab] = useState('all');
  const [cohort, setCohort] = useState('all');
  const [kind, setKind] = useState('all');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState(initialMember);
  const [entry, setEntry] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(null);
  const [now] = useState(() => Date.now());

  const grades = useMemo(() => (ready ? d.grades || [] : []), [ready, d]);
  const roster = useMemo(() => (ready ? d.roster || [] : []), [ready, d]);
  const cohorts = useMemo(() => (ready ? d.cohorts || [] : []), [ready, d]);
  const cohortName = useMemo(() => {
    const m = new Map(cohorts.map((c) => [c.id, c.name]));
    return (id) => (id ? m.get(id) || NA : NA);
  }, [cohorts]);

  /* Switching between sample content and council data starts fresh. */
  const lastSample = useRef(sampleActive);
  useEffect(() => {
    if (lastSample.current === sampleActive) return;
    lastSample.current = sampleActive;
    setPicked(null);
    setEntry(null);
    setNotice(null);
  }, [sampleActive]);

  const filtered = useMemo(
    () => filterGrades(grades, { tab, cohort, kind, search, now }),
    [grades, tab, cohort, kind, search, now],
  );
  const counts = useMemo(() => tabCounts(grades, now), [grades, now]);
  const cohortRows = useMemo(
    () => (canGrade ? cohortSummary(roster, grades, cohorts) : []),
    [canGrade, roster, grades, cohorts],
  );
  const ungraded = useMemo(
    () => (canGrade ? membersWithoutGrades(roster, grades) : []),
    [canGrade, roster, grades],
  );
  const metrics = canGrade ? councilMetrics(roster, grades) : memberMetrics(grades);

  /* The member whose record is open (executives). Defaults to the first row. */
  const selectedMember = useMemo(() => {
    if (!canGrade || !ready) return null;
    const known = (id) =>
      id && (roster.some((m) => m.user_id === id) || grades.some((g) => g.student_id === id));
    if (known(picked)) return picked;
    return filtered[0]?.student_id || roster[0]?.user_id || null;
  }, [canGrade, ready, picked, roster, grades, filtered]);

  useEffect(() => {
    if (canGrade && ready && !sampleActive)
      writeAddress(picked && selectedMember === picked ? picked : null);
  }, [canGrade, ready, sampleActive, picked, selectedMember]);

  const record = useMemo(() => {
    if (!ready) return null;
    if (!canGrade) return memberRecord(grades);
    if (!selectedMember) return null;
    return memberRecord(grades.filter((g) => g.student_id === selectedMember));
  }, [ready, canGrade, grades, selectedMember]);

  const recordPerson = canGrade
    ? roster.find((m) => m.user_id === selectedMember) ||
      (() => {
        const g = grades.find((x) => x.student_id === selectedMember);
        return g
          ? {
              user_id: g.student_id,
              display_name: g.student_name,
              role: null,
              cohort_id: g.cohort_id,
              former: true,
            }
          : null;
      })()
    : null;

  const chooseMember = (id) => {
    setPicked(id);
    setEntry(null);
  };

  if (state.status === 'forbidden') {
    return <Notice>This page is for council members only.</Notice>;
  }

  const visibilityText = canGrade
    ? paused
      ? 'Hidden from members'
      : 'Visible to members'
    : hiddenForMe
      ? 'Paused by your council'
      : 'Visible to you';

  const openNew = (studentId = '') => setDialog({ mode: 'new', studentId });
  const savedNotice = (res) => {
    if (res.mode === 'new' && res.studentId) {
      setPicked(res.studentId);
      setEntry(res.id || null);
    }
    setNotice(
      `${res.mode === 'new' ? 'Grade saved' : 'Change saved'}${res.name ? ` for ${res.name}` : ''}.${
        sampleActive
          ? ' Sample content: it is not saved.'
          : paused
            ? ' Members cannot see it while visibility is paused.'
            : ''
      }`,
    );
  };

  const kindItems = [
    { key: 'all', label: 'All' },
    ...WORK_KINDS.map((k) => ({ key: k.key, label: k.label })),
  ];
  const clearFilters = () => {
    setTab('all');
    setCohort('all');
    setKind('all');
    setSearch('');
  };
  const filtersOn = tab !== 'all' || cohort !== 'all' || kind !== 'all' || search.trim();

  /* ── Row 1: figures and page actions ── */
  const top = (
    <div className="tcc-top">
      <div className="tcc-kpis" aria-busy={loading || undefined}>
        <div className="tcc-kpistrip ogr-kpistrip" role="list" aria-label="Grade figures">
          {canGrade ? (
            <>
              <Kpi
                icon="bi-people"
                label="Graded members"
                loading={loading}
                na={failed}
                title="Active analysts and portfolio managers with at least one grade"
              >
                {failed ? NA : `${metrics.gradedMembers}/${metrics.rosterCount}`}
              </Kpi>
              <Kpi
                icon="bi-percent"
                label="Average of scored work"
                loading={loading}
                na={failed || metrics.average === null}
                title="Unweighted mean of score over maximum across every scored grade. Overall entries are left out."
              >
                {failed ? NA : fmtPct(metrics.average)}
              </Kpi>
              <Kpi
                icon="bi-person-dash"
                label="No grade yet"
                loading={loading}
                na={failed}
                title="Active analysts and portfolio managers with no grade"
              >
                {failed ? NA : metrics.noGrade}
              </Kpi>
              <Kpi
                icon="bi-chat-left"
                label="No feedback"
                loading={loading}
                na={failed}
                title="Grades with no written feedback"
              >
                {failed ? NA : metrics.noFeedback}
              </Kpi>
            </>
          ) : (
            <>
              <Kpi
                icon="bi-percent"
                label="Average of scored work"
                loading={loading}
                na={failed || hiddenForMe || metrics.average === null}
                title="Unweighted mean of score over maximum across your scored grades. Overall entries are left out."
              >
                {failed || hiddenForMe ? NA : fmtPct(metrics.average)}
              </Kpi>
              <Kpi
                icon="bi-journal-check"
                label="Graded entries"
                loading={loading}
                na={failed || hiddenForMe}
              >
                {failed || hiddenForMe ? NA : metrics.entries}
              </Kpi>
              <Kpi
                icon="bi-clock-history"
                label="Last changed"
                loading={loading}
                na={failed || hiddenForMe || !metrics.lastChanged}
              >
                {failed || hiddenForMe ? NA : fmtDay(metrics.lastChanged)}
              </Kpi>
            </>
          )}
          <Kpi
            icon={paused || hiddenForMe ? 'bi-eye-slash' : 'bi-eye'}
            label="Visibility"
            loading={loading}
            na={failed}
            text
            title="Whether members can see their own grades. Executives change this in Settings."
          >
            {failed ? NA : visibilityText}
          </Kpi>
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
        {canGrade && (
          <Link href={SETTINGS_HREF} className="tcc-textbtn ogr-textlink">
            <i className="bi bi-gear" aria-hidden="true" />
            Settings
          </Link>
        )}
        {canGrade && (
          <button type="button" className="tcc-btn" onClick={() => openNew()} disabled={!ready}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Enter grade
          </button>
        )}
      </div>
    </div>
  );

  /* ── Left rail ── */
  const rail = canGrade ? (
    <nav className="ogr-rail" aria-label="Grade views and filters">
      <div className="ogr-views" role="group" aria-label="View">
        {VIEWS.map((v) => (
          <TextToggle key={v.key} pressed={view === v.key} onClick={() => setView(v.key)}>
            {v.label}
            {v.key === 'ungraded' && ready && ungraded.length > 0 && (
              <span className="tcc-mono ogr-views__n">{ungraded.length}</span>
            )}
          </TextToggle>
        ))}
      </div>
      <Search
        value={search}
        onChange={setSearch}
        placeholder="Search"
        label={view === 'grades' ? 'Search members or feedback' : 'Search members'}
      />
      {view === 'grades' && (
        <FilterList label="Work kind" items={kindItems} value={kind} onChange={setKind} />
      )}
      <div className="ogr-railsec">
        <div className="ogr-railhead ogr-railhead--row">
          <h2 className="ogr-railhead">Cohorts</h2>
          {cohort !== 'all' && (
            <button
              type="button"
              className="tcc-textbtn ogr-railclear"
              onClick={() => setCohort('all')}
            >
              All cohorts
            </button>
          )}
        </div>
        {loading ? (
          <TableSkeleton rows={2} />
        ) : failed ? (
          <p className="tcc-meta">N/A</p>
        ) : cohortRows.length === 0 ? (
          <p className="ogr-railnote">No analysts or portfolio managers yet.</p>
        ) : (
          <ul className="ogr-cohorts">
            {cohortRows.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`ogr-filter ogr-cohorts__name${cohort === c.id ? ' is-on' : ''}`}
                  aria-pressed={cohort === c.id}
                  onClick={() => setCohort(cohort === c.id ? 'all' : c.id)}
                >
                  {c.name}
                </button>
                <span className="ogr-cohorts__line">
                  <span className="tcc-mono">
                    {c.graded}/{c.size}
                  </span>{' '}
                  graded, avg{' '}
                  <span className={`tcc-mono${c.average === null ? ' tcc-na' : ''}`}>
                    {fmtPct(c.average)}
                  </span>
                </span>
                <span className="ogr-cohorts__line">
                  <span className="tcc-mono">{c.noGrade}</span> with no grade
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="ogr-railsec">
        <h2 className="ogr-railhead">Visibility</h2>
        <p className="ogr-railnote">
          {paused
            ? 'Hidden from members. Members see a pause notice until visibility is turned back on.'
            : 'Executives see every grade. Members see only their own.'}{' '}
          Student record downloads are in Settings.
        </p>
        <ArrowLink href={SETTINGS_HREF}>Go to Settings</ArrowLink>
      </div>
    </nav>
  ) : (
    <nav className="ogr-rail" aria-label="Grade filters">
      <div className="ogr-views" role="group" aria-label="View">
        <TextToggle pressed onClick={() => {}}>
          My grades
        </TextToggle>
      </div>
      {!hiddenForMe && (
        <Search value={search} onChange={setSearch} placeholder="Search my feedback" />
      )}
      {!hiddenForMe && (
        <FilterList label="Work kind" items={kindItems} value={kind} onChange={setKind} />
      )}
      <div className="ogr-railsec">
        <h2 className="ogr-railhead">Visibility</h2>
        <p className="ogr-railnote">
          {hiddenForMe
            ? 'Your council has paused grade visibility. Your record is kept and returns when visibility is turned back on.'
            : 'You see only your own grades, feedback and rubrics. Council executives enter and change grades.'}
        </p>
      </div>
    </nav>
  );

  /* ── Main column ── */
  let main;
  if (loading) {
    main = (
      <div className="ogr-skel" aria-busy="true">
        <Skel w="40%" h={22} />
        <Skel w="60%" h={12} />
        <TableSkeleton rows={8} />
      </div>
    );
  } else if (failed) {
    main = <SectionError message="Grades could not be loaded." onRetry={data.retry} />;
  } else if (hiddenForMe) {
    main = (
      <div className="ogr-paused" role="status">
        <i className="bi bi-pause-circle" aria-hidden="true" />
        <h2 className="ogr-main__title">Your council has paused grade visibility</h2>
        <p>
          Your grades and feedback are kept. They appear here again when your council executives
          turn visibility back on.
        </p>
      </div>
    );
  } else if (!canGrade) {
    const tabbed = filtered;
    main = (
      <>
        <div className="ogr-mainhead">
          <h2 className="ogr-main__title" id="ogr-main-title">
            My grades
          </h2>
          <div className="tcc-toggles ogr-tabs" role="group" aria-label="Show">
            {MEMBER_TABS.map((t) => (
              <TextToggle key={t.key} pressed={tab === t.key} onClick={() => setTab(t.key)}>
                <span title={t.title}>{t.label}</span>
                <span className="tcc-mono ogr-tabs__n">{counts[t.key]}</span>
              </TextToggle>
            ))}
          </div>
          <p className="ogr-note">
            <span>Only you and your council executives can see these grades.</span>
            <ArrowLink href={ASSIGNMENTS_HREF}>Open Assignments</ArrowLink>
          </p>
        </div>
        {grades.length === 0 ? (
          <p className="tcc-state">
            <span>No grades posted yet.</span>
            <ArrowLink href={ASSIGNMENTS_HREF}>Open Assignments</ArrowLink>
          </p>
        ) : tabbed.length === 0 ? (
          <p className="tcc-state">
            <span>No grades match these filters.</span>
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </p>
        ) : (
          <GradeTable
            key={`${tab}:${kind}:${search}`}
            rows={tabbed}
            cohortName={cohortName}
            selectedEntry={entry}
            onPick={(g) => setEntry(g.id)}
            member
          />
        )}
      </>
    );
  } else if (view === 'grades') {
    const summary = councilSummary(grades);
    main = (
      <>
        <div className="ogr-mainhead">
          <h2 className="ogr-main__title" id="ogr-main-title">
            Council grade book
          </h2>
          <div className="tcc-toggles ogr-tabs" role="group" aria-label="Show">
            {TABS.map((t) => (
              <TextToggle key={t.key} pressed={tab === t.key} onClick={() => setTab(t.key)}>
                <span title={t.title}>{t.label}</span>
                <span className="tcc-mono ogr-tabs__n">{counts[t.key]}</span>
              </TextToggle>
            ))}
          </div>
          {paused ? (
            <p className="ogr-note ogr-note--paused">
              <i className="bi bi-eye-slash" aria-hidden="true" />
              <span>
                <strong>Hidden from members.</strong> Executives can still enter and review every
                grade.
              </span>
              <ArrowLink href={SETTINGS_HREF}>Go to Settings</ArrowLink>
            </p>
          ) : (
            <p className="ogr-note">
              <span>Executives see every grade. Members see only their own.</span>
              <ArrowLink href={ASSIGNMENTS_HREF}>Open Assignments</ArrowLink>
            </p>
          )}
        </div>

        {grades.length > 0 && (
          <section className="ogr-summary" aria-labelledby="ogr-summary-title">
            <h3 className="ogr-subtitle" id="ogr-summary-title">
              Council summary (scored work)
            </h3>
            <table className="ogr-mini ogr-mini--summary">
              <caption className="tcc-sr">
                Members graded and average for each kind of scored work
              </caption>
              <thead>
                <tr>
                  <th scope="col">Work kind</th>
                  <th scope="col" className="ogr-num">
                    Members graded
                  </th>
                  <th scope="col" className="ogr-num">
                    Average
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.key}>
                    <td>
                      <span className="ogr-kind">
                        <i className={`bi ${s.icon}`} aria-hidden="true" />
                        {s.label}
                      </span>
                    </td>
                    <td className="ogr-num tcc-mono">{s.graded}</td>
                    <td className={`ogr-num tcc-mono${s.average === null ? ' tcc-na' : ''}`}>
                      {fmtPct(s.average)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {grades.length === 0 ? (
          <div className="ogr-empty">
            <i className="bi bi-journal-x" aria-hidden="true" />
            <p className="tcc-state">
              <span>No grades yet.</span>
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent"
                onClick={() => openNew()}
              >
                Enter the first grade
              </button>
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="tcc-state">
            <span>No grades match these filters.</span>
            {filtersOn && (
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </p>
        ) : (
          <GradeTable
            key={`${tab}:${cohort}:${kind}:${search}:${sampleActive ? 's' : 'l'}`}
            rows={filtered}
            cohortName={cohortName}
            selectedMember={selectedMember}
            onPick={(g) => {
              setPicked(g.student_id);
              setEntry(g.id);
            }}
          />
        )}
      </>
    );
  } else if (view === 'cohort') {
    const q = search.trim().toLowerCase();
    const groups = cohortRows
      .filter((c) => cohort === 'all' || c.id === cohort)
      .map((c) => ({
        ...c,
        shownMembers: c.members.filter((m) => !q || m.display_name.toLowerCase().includes(q)),
      }));
    main = (
      <>
        <div className="ogr-mainhead">
          <h2 className="ogr-main__title" id="ogr-main-title">
            By cohort
          </h2>
          <p className="ogr-note">
            <span>Each member&apos;s graded entries and average of scored work.</span>
          </p>
        </div>
        {groups.length === 0 ? (
          <p className="tcc-state">No analysts or portfolio managers yet.</p>
        ) : (
          groups.map((c) => (
            <section key={c.id} className="ogr-cohort" aria-labelledby={`ogr-cohort-${c.id}`}>
              <h3 className="ogr-subtitle ogr-cohort__head" id={`ogr-cohort-${c.id}`}>
                <span>{c.name}</span>
                <span className="tcc-meta">
                  <span className="tcc-mono">
                    {c.graded}/{c.size}
                  </span>{' '}
                  graded, average <span className="tcc-mono">{fmtPct(c.average)}</span>
                </span>
              </h3>
              {c.shownMembers.length === 0 ? (
                <p className="tcc-state">No members match this search.</p>
              ) : (
                <table className="ogr-mini ogr-mini--members">
                  <caption className="tcc-sr">{`Members of ${c.name}`}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Member</th>
                      <th scope="col" className="ogr-c-role">
                        Role
                      </th>
                      <th scope="col" className="ogr-num">
                        Entries
                      </th>
                      <th scope="col" className="ogr-num">
                        Average
                      </th>
                      <th scope="col" className="ogr-num">
                        Last changed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.shownMembers.map((m) => {
                      const own = grades.filter((g) => g.student_id === m.user_id);
                      const mm = memberMetrics(own);
                      const on = selectedMember === m.user_id;
                      return (
                        <tr
                          key={m.user_id}
                          className={`ogr-pickrow${on ? ' is-on' : ''}`}
                          onClick={() => chooseMember(m.user_id)}
                        >
                          <td>
                            <button
                              type="button"
                              className="ogr-rowbtn"
                              aria-pressed={on}
                              onClick={(e) => {
                                e.stopPropagation();
                                chooseMember(m.user_id);
                              }}
                            >
                              {m.display_name}
                            </button>
                          </td>
                          <td className="ogr-c-role">{roleLabel(m.role)}</td>
                          <td className="ogr-num tcc-mono">{own.length}</td>
                          <td
                            className={`ogr-num tcc-mono ogr-neutral${averageOf(own).value === null ? ' tcc-na' : ''}`}
                          >
                            {fmtPct(averageOf(own).value)}
                          </td>
                          <td className="ogr-num tcc-mono">{fmtDay(mm.lastChanged)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          ))
        )}
      </>
    );
  } else {
    const q = search.trim().toLowerCase();
    const list = ungraded.filter(
      (m) =>
        (cohort === 'all' || (cohort === 'none' ? !m.cohort_id : m.cohort_id === cohort)) &&
        (!q || m.display_name.toLowerCase().includes(q)),
    );
    main = (
      <>
        <div className="ogr-mainhead">
          <h2 className="ogr-main__title" id="ogr-main-title">
            Members without grades
          </h2>
          <p className="ogr-note">
            <span>Active analysts and portfolio managers with no grade yet.</span>
          </p>
        </div>
        {ungraded.length === 0 ? (
          <p className="tcc-state">Every analyst and portfolio manager has at least one grade.</p>
        ) : list.length === 0 ? (
          <p className="tcc-state">
            <span>No members match these filters.</span>
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </p>
        ) : (
          <table className="ogr-mini ogr-mini--members">
            <caption className="tcc-sr">Members with no grade yet</caption>
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col" className="ogr-c-role">
                  Role
                </th>
                <th scope="col">Cohort</th>
                <th scope="col" className="ogr-num">
                  <span className="tcc-sr">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.user_id} className={selectedMember === m.user_id ? 'is-on' : undefined}>
                  <td>
                    <button
                      type="button"
                      className="ogr-rowbtn"
                      onClick={() => chooseMember(m.user_id)}
                    >
                      {m.display_name}
                    </button>
                  </td>
                  <td className="ogr-c-role">{roleLabel(m.role)}</td>
                  <td>{cohortName(m.cohort_id)}</td>
                  <td className="ogr-num">
                    <button
                      type="button"
                      className="tcc-textbtn tcc-textbtn--accent"
                      onClick={() => openNew(m.user_id)}
                      aria-label={`Enter a grade for ${m.display_name}`}
                    >
                      Enter grade
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    );
  }

  /* ── Side column: one member's record ── */
  let side = null;
  if (!hiddenForMe) {
    if (loading) side = <RecordSkeleton />;
    else if (failed) side = null;
    else if (canGrade && !record) {
      side = (
        <div className="ogr-record">
          <h2 className="ogr-record__name ogr-record__name--empty">No member selected</h2>
          <p className="ogr-railnote">
            A member record appears here when you select a row in the grade book.
          </p>
        </div>
      );
    } else if (record) {
      const meta =
        canGrade && recordPerson
          ? [
              recordPerson.role ? { icon: 'bi-person', text: roleLabel(recordPerson.role) } : null,
              recordPerson.former ? { icon: 'bi-person-x', text: 'Former member' } : null,
              recordPerson.cohort_id
                ? { icon: 'bi-people', text: cohortName(recordPerson.cohort_id) }
                : null,
            ].filter(Boolean)
          : [];
      side = (
        <StudentRecord
          key={`${selectedMember || 'me'}:${sampleActive ? 's' : 'l'}`}
          name={canGrade ? recordPerson?.display_name || 'Member' : d.viewer?.name || 'Your record'}
          meta={meta}
          record={record}
          visibilityText={visibilityText}
          canGrade={canGrade}
          own={!canGrade}
          selectedEntryId={entry}
          onSelectEntry={setEntry}
          onEdit={(g) => setDialog({ mode: 'edit', grade: g })}
        />
      );
    }
  }

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page ogr-page">
      <VisuallyHidden>
        <h1>{canGrade ? 'Grade book' : 'My grades'}</h1>
      </VisuallyHidden>
      {top}
      <div className={`ogr-body${side ? '' : ' ogr-body--noside'}`}>
        {rail}
        <span className="tcc-vrule ogr-vrule ogr-vrule--rail" aria-hidden="true" />
        <div className="ogr-main" aria-labelledby={ready ? 'ogr-main-title' : undefined}>
          {notice && (
            <p className="ogr-notice" role="status">
              <i className="bi bi-check2-circle" aria-hidden="true" />
              <span>{notice}</span>
              <button type="button" className="tcc-textbtn" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            </p>
          )}
          {main}
        </div>
        {side && (
          <>
            <span className="tcc-vrule ogr-vrule ogr-vrule--side" aria-hidden="true" />
            <aside className="ogr-side" aria-labelledby={record ? 'ogr-record-title' : undefined}>
              {side}
            </aside>
          </>
        )}
      </div>

      {dialog && canGrade && (
        <GradeDialog
          mode={dialog.mode}
          grade={dialog.grade || null}
          roster={roster}
          presetStudent={dialog.studentId || ''}
          sample={sampleActive}
          act={act}
          onClose={() => setDialog(null)}
          onSaved={savedNotice}
        />
      )}
    </div>
  );
}

export default GradesPage;
