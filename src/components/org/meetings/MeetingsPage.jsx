'use client';

/**
 * Meetings (/org-team-hub/meetings): the council's meeting library. An
 * analyst sees what the council is meeting about, whether they are expected
 * and what will be voted, and replies. A portfolio manager, executive or
 * faculty advisor also schedules, builds the agenda, invites, checks quorum,
 * votes at IC meetings and completes the record.
 *
 * One layout for every role. What a member sees and can do follows the
 * existing rules (section 1 of the page description); the server checks
 * every request again. The committee vote never shows a running count:
 * until a meeting is completed, members see ballots received, quorum and
 * their own vote only.
 *
 * The page renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { useOrg } from '@/contexts/OrgContext';
import { stripDemoLabel } from '@/lib/org-display';
import {
  CATEGORIES,
  NA,
  TABS,
  TAB_KEYS,
  categoryCounts,
  categoryLabel,
  filterByCategory,
  fmtDay,
  fmtTime,
  isNotClosed,
  meetingsForTab,
  metricsOf,
  nextMeeting,
  shiftTerm,
  statusLabel,
  termByKey,
  termOf,
} from '@/lib/org-meetings-model';
import { Skel, SectionError, TextToggle } from '@/components/org/command-center/parts';
import { useMeetingsData } from './useMeetingsData';
import { MeetingDetail } from './MeetingDetail';
import { SideColumn } from './SideColumn';
import { MeetingFormDialog, RecordersDialog } from './Dialogs';
import '@/components/org/command-center/command-center.css';
import './meetings.css';
import '@/styles/home-canvas.css';

const PAGE_SIZE = 5;

function Kpi({ icon, label, loading, tone, title, children }) {
  return (
    <div className="tcc-kpi" role="listitem" title={title}>
      <i className={`bi ${icon} tcc-kpi__icon${tone ? ` tcc-${tone}` : ''}`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${tone ? ` tcc-${tone}` : ''}`}>
        {loading ? <Skel w={48} h={16} /> : children}
      </span>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="dashboard-page-inset ez-canvas tcc-page omt-page">
      <VisuallyHidden>
        <h1>Meetings</h1>
      </VisuallyHidden>
      <p className="tcc-state" role="status">
        {children}
      </p>
    </div>
  );
}

const cleanTab = (t) => (TAB_KEYS.includes(t) ? t : 'upcoming');
const cleanCat = (c) => (CATEGORIES.some((x) => x.key === c) ? c : 'all');

/** Keep the open meeting, tab, category and term in the page address. */
function writeAddress({ meetingId, tab, category, termKey, currentTermKey }) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const set = (k, v) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
  set('m', meetingId || null);
  set('tab', tab === 'upcoming' ? null : tab);
  set('cat', category === 'all' ? null : category);
  set('term', tab === 'term' && termKey !== currentTermKey ? termKey : null);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    try {
      window.history.replaceState(window.history.state, '', next);
    } catch {
      /* The address could not be updated; the page itself is unaffected. */
    }
  }
}

/* ── Left rail: tabs, categories, term ──────────────────────────────────── */
function Rail({ tab, onTab, category, onCategory, counts, term, onTerm, loading }) {
  return (
    <nav className="omt-rail" aria-label="Meeting filters">
      <div className="tcc-toggles omt-tabs" role="group" aria-label="Show">
        {TABS.map((t) => (
          <TextToggle key={t.key} pressed={tab === t.key} onClick={() => onTab(t.key)}>
            {t.label}
          </TextToggle>
        ))}
      </div>

      <div className="omt-railsec">
        <h2 className="omt-railhead">Categories</h2>
        <ul className="omt-cats" aria-busy={loading || undefined}>
          {[{ key: 'all', label: 'All' }, ...CATEGORIES].map((c) => (
            <li key={c.key}>
              <button
                type="button"
                className={`omt-cat${category === c.key ? ' is-on' : ''}`}
                aria-pressed={category === c.key}
                onClick={() => onCategory(c.key)}
              >
                <span>{c.label}</span>
                <span className="tcc-mono omt-cat__n">
                  {loading ? <Skel w={14} h={10} /> : (counts[c.key] ?? 0)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="omt-railsec">
        <h2 className="omt-railhead">Term</h2>
        <div className="omt-term">
          <button
            type="button"
            className="tcc-textbtn omt-term__step"
            aria-label="Previous term"
            onClick={() => onTerm(-1)}
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <div className="omt-term__name">
            <span>{term.label}</span>
            <span className="tcc-mono omt-term__dates">
              {fmtDay(new Date(term.start).toISOString())} to{' '}
              {fmtDay(new Date(term.end).toISOString())}
            </span>
          </div>
          <button
            type="button"
            className="tcc-textbtn omt-term__step"
            aria-label="Next term"
            onClick={() => onTerm(1)}
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </div>
        {tab !== 'term' && (
          <button type="button" className="tcc-textbtn omt-railnote" onClick={() => onTab('term')}>
            Show this term by category
          </button>
        )}
      </div>
    </nav>
  );
}

/* ── Meeting strip (Upcoming and Past) ──────────────────────────────────── */
function Strip({ meetings, selectedId, onSelect, tab, now }) {
  const selIndex = meetings.findIndex((m) => m.id === selectedId);
  const [start, setStart] = useState(() =>
    selIndex >= 0 ? Math.floor(selIndex / PAGE_SIZE) * PAGE_SIZE : 0,
  );
  useEffect(() => {
    if (selIndex >= 0 && (selIndex < start || selIndex >= start + PAGE_SIZE)) {
      setStart(Math.floor(selIndex / PAGE_SIZE) * PAGE_SIZE);
    }
  }, [selIndex, start]);
  const shown = meetings.slice(start, start + PAGE_SIZE);
  const label = tab === 'past' ? 'Completed meetings, latest first' : 'Upcoming, soonest first';

  return (
    <section className="omt-strip" aria-labelledby="omt-strip-title">
      <div className="omt-strip__head">
        <h2 className="omt-strip__title" id="omt-strip-title">
          {label}
          <span className="tcc-mono omt-count">{meetings.length}</span>
        </h2>
        {meetings.length > PAGE_SIZE && (
          <div className="omt-strip__nav">
            <span className="tcc-mono tcc-meta">
              {start + 1} to {Math.min(start + PAGE_SIZE, meetings.length)} of {meetings.length}
            </span>
            <button
              type="button"
              className="tcc-textbtn"
              aria-label="Previous meetings"
              disabled={start === 0}
              onClick={() => setStart(Math.max(0, start - PAGE_SIZE))}
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="tcc-textbtn"
              aria-label="More meetings"
              disabled={start + PAGE_SIZE >= meetings.length}
              onClick={() => setStart(start + PAGE_SIZE)}
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <ul className="omt-strip__list">
        {shown.map((m) => {
          const notClosed = isNotClosed(m, now);
          return (
            <li key={m.id}>
              <button
                type="button"
                className={`omt-pick${m.id === selectedId ? ' is-on' : ''}`}
                aria-current={m.id === selectedId ? 'true' : undefined}
                onClick={() => onSelect(m.id)}
              >
                <span className="omt-pick__title">{stripDemoLabel(m.title)}</span>
                <span className="omt-pick__meta">
                  <span className="tcc-mono">
                    {m.scheduled_at
                      ? `${fmtDay(m.scheduled_at)} ${fmtTime(m.scheduled_at)}`
                      : 'No time set'}
                  </span>
                  <span>{categoryLabel(m.category)}</span>
                </span>
                {notClosed && (
                  <span className="omt-pick__flag tcc-warn">
                    <i className="bi bi-exclamation-triangle" aria-hidden="true" /> Not closed
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ── Term view: the term's meetings by category ─────────────────────────── */
function TermList({ meetings, selectedId, onSelect, term, now }) {
  const groups = CATEGORIES.map((c) => ({
    ...c,
    rows: meetings.filter((m) => (m.category || 'general') === c.key),
  })).filter((g) => g.rows.length);
  return (
    <section className="omt-termlist" aria-labelledby="omt-termlist-title">
      <div className="omt-strip__head">
        <h2 className="omt-strip__title" id="omt-termlist-title">
          {term.label} by category
          <span className="tcc-mono omt-count">{meetings.length}</span>
        </h2>
      </div>
      {groups.map((g) => (
        <div key={g.key} className="omt-termgroup">
          <h3 className="omt-termgroup__head">
            {g.label}
            <span className="tcc-mono omt-count">{g.rows.length}</span>
          </h3>
          <ul className="omt-termrows">
            {g.rows.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`omt-termrow${m.id === selectedId ? ' is-on' : ''}`}
                  aria-current={m.id === selectedId ? 'true' : undefined}
                  onClick={() => onSelect(m.id)}
                >
                  <span className="tcc-mono omt-termrow__date">
                    {m.scheduled_at ? fmtDay(m.scheduled_at) : NA}
                  </span>
                  <span className="omt-termrow__title">{stripDemoLabel(m.title)}</span>
                  <span className={`omt-termrow__status${isNotClosed(m, now) ? ' tcc-warn' : ''}`}>
                    {statusLabel(m, now)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export function MeetingsPage({
  initialData = null,
  sampleViewer = false,
  initialMeeting = null,
  initialTab = 'upcoming',
  initialCategory = 'all',
  initialTerm = null,
}) {
  const { isOrgUser, isLoading } = useOrg();
  /* The layout has already checked membership on the server, so a page that
     arrived with data does not wait for the member context to load. */
  const enabled = Boolean(initialData) || Boolean(isOrgUser && !isLoading);
  const data = useMeetingsData({ enabled, initialData, sampleViewer });
  const { list, sampleActive, act } = data;

  const [now] = useState(() => Date.now());
  const currentTerm = useMemo(() => termOf(now), [now]);
  /* A link to a completed meeting opens on Past, so the strip shows it. */
  const [tab, setTab] = useState(() => {
    if (initialTab) return cleanTab(initialTab);
    const linked = initialMeeting
      ? (initialData?.meetings || []).find((m) => m.id === initialMeeting)
      : null;
    return linked?.status === 'closed' ? 'past' : 'upcoming';
  });
  const [category, setCategory] = useState(() => cleanCat(initialCategory));
  const [termKey, setTermKey] = useState(() => termByKey(initialTerm, now).key);
  const [picked, setPicked] = useState(initialMeeting);
  const [form, setForm] = useState(null); // { mode: 'new' } | { mode: 'edit', meeting }
  const [recordersOpen, setRecordersOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(t);
  }, []);

  const d = list.data;
  const viewer = d?.viewer || {};
  const meetings = useMemo(() => d?.meetings || [], [d]);
  const term = useMemo(() => termByKey(termKey, now), [termKey, now]);
  const inTab = useMemo(() => meetingsForTab(meetings, tab, term), [meetings, tab, term]);
  const counts = useMemo(() => categoryCounts(inTab), [inTab]);
  const shown = useMemo(() => filterByCategory(inTab, category), [inTab, category]);
  const metrics = useMemo(
    () => metricsOf(meetings, { now, eligible: d?.eligible_voters || 0 }),
    [meetings, now, d],
  );

  /* The open meeting: the one in the address, else the next meeting when it
     is in view, else the first one shown. */
  const selectedId = useMemo(() => {
    if (picked && meetings.some((m) => m.id === picked)) return picked;
    if (picked && list.status !== 'ready') return picked;
    const next = nextMeeting(shown, now);
    return (next || shown[0])?.id || null;
  }, [picked, meetings, shown, now, list.status]);
  const missingPick = Boolean(
    picked && list.status === 'ready' && !meetings.some((m) => m.id === picked),
  );

  useEffect(() => {
    writeAddress({
      meetingId: picked && !missingPick ? selectedId : null,
      tab,
      category,
      termKey,
      currentTermKey: currentTerm.key,
    });
  }, [picked, missingPick, selectedId, tab, category, termKey, currentTerm.key]);

  /* Live detail loads when a meeting opens. */
  const { loadDetail } = data;
  useEffect(() => {
    if (!sampleActive && selectedId && list.status === 'ready') loadDetail(selectedId);
  }, [sampleActive, selectedId, list.status, loadDetail]);

  const toggleSample = () => {
    setNotice(null);
    setForm(null);
    setPicked(null);
    data.setShowSample((v) => !v);
  };

  const choose = (id) => {
    setNotice(null);
    setPicked(id);
  };

  if (!initialData && isLoading) {
    return (
      <Notice>
        {slow ? (
          <>
            <span>Meetings is taking longer than expected to load.</span>
            <button type="button" className="tcc-btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </>
        ) : (
          <span>Loading meetings</span>
        )}
      </Notice>
    );
  }
  if ((!initialData && !isOrgUser) || list.status === 'forbidden') {
    return (
      <Notice>
        <span>This page is for organizational members only.</span>
        <Link href="/home" className="tcc-link">
          Go to home <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </Notice>
    );
  }

  const loading = list.status === 'loading';
  const failed = list.status === 'error';
  const canCreate = Boolean(viewer.canCreateEvents);
  const num = (v) => (failed ? NA : String(v ?? 0));
  const next = metrics.next;
  const openNew = () => setForm({ mode: 'new' });

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page omt-page">
      <VisuallyHidden>
        <h1>Meetings</h1>
      </VisuallyHidden>

      {/* Row 1: the figures and the page actions */}
      <div className="tcc-top">
        <div className="tcc-kpis" aria-busy={loading || undefined}>
          <div className="tcc-kpistrip omt-kpistrip" role="list" aria-label="Meeting figures">
            <Kpi
              icon="bi-calendar3"
              label="Next meeting"
              loading={loading}
              tone={failed || !next ? 'na' : undefined}
              title="The earliest scheduled meeting from now on"
            >
              {failed || !next ? (
                NA
              ) : (
                <button
                  type="button"
                  className="omt-kpilink tcc-mono"
                  onClick={() => {
                    setTab('upcoming');
                    setCategory('all');
                    choose(next.id);
                  }}
                >
                  {fmtDay(next.scheduled_at)} {fmtTime(next.scheduled_at)}
                </button>
              )}
            </Kpi>
            <Kpi
              icon="bi-calendar-event"
              label="Upcoming this term"
              loading={loading}
              tone={failed ? 'na' : undefined}
              title={`Scheduled meetings in ${currentTerm.label} that are not completed`}
            >
              {num(metrics.upcomingTerm)}
            </Kpi>
            <Kpi
              icon="bi-reply"
              label="Awaiting your reply"
              loading={loading}
              tone={failed ? 'na' : metrics.awaitingReply > 0 ? 'warn' : undefined}
              title="Meetings you are invited to and have not replied to"
            >
              {num(metrics.awaitingReply)}
            </Kpi>
            <Kpi
              icon="bi-exclamation-triangle"
              label="Quorum at risk"
              loading={loading}
              tone={failed ? 'na' : metrics.quorumAtRisk > 0 ? 'warn' : undefined}
              title="Upcoming IC meetings where fewer voting members have confirmed than quorum needs"
            >
              {num(metrics.quorumAtRisk)}
            </Kpi>
            <Kpi
              icon="bi-check2-circle"
              label="Completed this term"
              loading={loading}
              tone={failed ? 'na' : undefined}
              title={`Meetings in ${currentTerm.label} marked completed`}
            >
              {num(metrics.completedTerm)}
            </Kpi>
          </div>
        </div>

        <div className="tcc-actions">
          {(sampleActive || data.sampleAvailable) && (
            <div className="tcc-actions__context">
              {sampleActive && <span className="tcc-sample">Sample content</span>}
              {data.sampleAvailable && (
                <button type="button" className="tcc-textbtn" onClick={toggleSample}>
                  {sampleActive ? 'Show council data' : 'Show sample content'}
                </button>
              )}
            </div>
          )}
          {viewer.canManage && (
            <button type="button" className="tcc-textbtn" onClick={() => setRecordersOpen(true)}>
              <i className="bi bi-gear" aria-hidden="true" />
              Recorders
            </button>
          )}
          {canCreate && (
            <button type="button" className="tcc-btn" onClick={openNew}>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              New meeting
            </button>
          )}
        </div>
      </div>

      {/* Row 2: filters, the open meeting, and the side column */}
      <div className="omt-body">
        <Rail
          tab={tab}
          onTab={(t) => {
            setTab(t);
            setPicked(null);
          }}
          category={category}
          onCategory={(c) => {
            setCategory(c);
            setPicked(null);
          }}
          counts={counts}
          term={term}
          onTerm={(step) => {
            setTermKey(shiftTerm(term, step).key);
            if (tab !== 'term') setTab('term');
            setPicked(null);
          }}
          loading={loading}
        />
        <span className="tcc-vrule omt-vrule omt-vrule--rail" aria-hidden="true" />

        <div className="omt-main">
          {notice && (
            <p
              className={`omt-notice${notice.tone === 'error' ? ' omt-notice--error' : ''}`}
              role={notice.tone === 'error' ? 'alert' : 'status'}
            >
              <i
                className={`bi ${notice.tone === 'error' ? 'bi-exclamation-circle' : 'bi-check2-circle'}`}
                aria-hidden="true"
              />
              <span>{notice.text}</span>
              <button type="button" className="tcc-textbtn" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            </p>
          )}

          {loading ? (
            <div className="omt-skel" aria-busy="true">
              <Skel w="100%" h={32} />
              <Skel w="55%" h={22} />
              <Skel w="35%" h={12} />
              {Array.from({ length: 6 }).map((_, i) => (
                <Skel key={i} w="100%" h={14} />
              ))}
            </div>
          ) : failed ? (
            <SectionError message="Meetings could not be loaded." onRetry={data.retry} />
          ) : meetings.length === 0 ? (
            <p className="tcc-state">
              <span>No meetings yet.</span>
              {canCreate && (
                <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={openNew}>
                  New meeting
                </button>
              )}
            </p>
          ) : (
            <>
              {shown.length === 0 ? (
                <p className="tcc-state">
                  <span>
                    {tab === 'past'
                      ? 'No completed meetings in this category.'
                      : tab === 'term'
                        ? `No meetings in ${term.label}${category === 'all' ? '' : ' in this category'}.`
                        : 'No upcoming meetings in this category.'}
                  </span>
                  {category !== 'all' ? (
                    <button
                      type="button"
                      className="tcc-textbtn tcc-textbtn--accent"
                      onClick={() => setCategory('all')}
                    >
                      Show all categories
                    </button>
                  ) : tab !== 'past' && canCreate ? (
                    <button
                      type="button"
                      className="tcc-textbtn tcc-textbtn--accent"
                      onClick={openNew}
                    >
                      New meeting
                    </button>
                  ) : null}
                </p>
              ) : tab === 'term' ? (
                <TermList
                  meetings={shown}
                  selectedId={selectedId}
                  onSelect={choose}
                  term={term}
                  now={now}
                />
              ) : (
                <Strip
                  key={`${tab}:${category}:${sampleActive ? 's' : 'l'}`}
                  meetings={shown}
                  selectedId={selectedId}
                  onSelect={choose}
                  tab={tab}
                  now={now}
                />
              )}

              {missingPick ? (
                <p className="tcc-state">
                  <span>The linked meeting was not found. It may have been removed.</span>
                  <button
                    type="button"
                    className="tcc-textbtn tcc-textbtn--accent"
                    onClick={() => setPicked(null)}
                  >
                    Show the next meeting
                  </button>
                </p>
              ) : (
                selectedId && (
                  <MeetingDetail
                    key={`${selectedId}:${sampleActive ? 's' : 'l'}`}
                    id={selectedId}
                    row={meetings.find((m) => m.id === selectedId) || null}
                    state={data.detailOf(selectedId)}
                    listViewer={viewer}
                    pitches={d?.pitches || []}
                    sample={sampleActive}
                    now={now}
                    act={act}
                    onRetry={() => loadDetail(selectedId)}
                    onEdit={(meeting) => setForm({ mode: 'edit', meeting })}
                    onNotice={setNotice}
                  />
                )
              )}
            </>
          )}
        </div>

        <span className="tcc-vrule omt-vrule omt-vrule--side" aria-hidden="true" />
        <SideColumn
          status={list.status}
          data={d}
          meetings={meetings}
          next={next}
          now={now}
          canCreate={canCreate}
          onOpen={(id) => {
            const m = meetings.find((x) => x.id === id);
            if (m) setTab(m.status === 'closed' ? 'past' : 'upcoming');
            setCategory('all');
            choose(id);
          }}
          onNew={openNew}
          onShowPast={() => {
            setTab('past');
            setCategory('all');
            setPicked(null);
          }}
          onRetry={data.retry}
        />
      </div>

      {form && (
        <MeetingFormDialog
          mode={form.mode}
          meeting={form.meeting || null}
          pitches={d?.pitches || []}
          sample={sampleActive}
          act={act}
          onClose={() => setForm(null)}
          onSaved={(id, title) => {
            if (form.mode === 'new' && id) {
              setTab('upcoming');
              setCategory('all');
              setPicked(id);
            }
            setNotice({
              tone: 'ok',
              text:
                form.mode === 'new'
                  ? `"${title}" was scheduled.${sampleActive ? ' Sample content: it is not saved.' : ''}`
                  : `"${title}" was updated.${sampleActive ? ' Sample content: it is not saved.' : ''}`,
            });
          }}
        />
      )}
      {recordersOpen && (
        <RecordersDialog sample={sampleActive} onClose={() => setRecordersOpen(false)} />
      )}
    </div>
  );
}

export default MeetingsPage;
