'use client';

/**
 * Recognition (/org-team-hub/recognition). Two things on one page: badges
 * and awards, which managers give by hand or by auto-award, and the Ezana
 * Rating, which moves with scored pitches. An analyst reads who earned what
 * and why, compares records and opens any scorecard. A portfolio manager,
 * executive or faculty advisor also gives awards, runs auto-award,
 * recomputes ratings and sets display weights.
 *
 * Awards lead (the feed and the term honour roll), the ranking sits under
 * them, and the chosen member's scorecard fills the middle. The chosen
 * member is kept in the page address (?member=<id>). One layout for every
 * role; the server checks every write again.
 *
 * Renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { VisuallyHidden } from '@/components/ds';
import { useOrg } from '@/contexts/OrgContext';
import { stripDemoLabel } from '@/lib/org-display';
import { shiftTerm } from '@/lib/org-meetings-model';
import {
  LIST_MODES,
  NA,
  PERIODS,
  ROLE_SHORT,
  awardsByTeam,
  fmtDate,
  fmtInt,
  honourRoll,
  recognitionMetrics,
  signed,
  termOf,
  tierLabelOf,
} from '@/lib/org-recognition-model';
import { Skel, SectionError, TextToggle } from '@/components/org/command-center/parts';
import { useRecognitionData } from './useRecognitionData';
import { AwardRow, Scorecard } from './Scorecard';
import { AwardDialog, ConfirmDialog, WeightsDialog } from './Dialogs';
import '@/components/org/command-center/command-center.css';
import './recognition.css';
import '@/styles/home-canvas.css';

const FEED_STEP = 5;
const RANK_STEP = 10;

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
    <div className="dashboard-page-inset ez-canvas tcc-page orc-page">
      <VisuallyHidden>
        <h1>Recognition</h1>
      </VisuallyHidden>
      <p className="tcc-state" role="status">
        {children}
      </p>
    </div>
  );
}

function Section({ id, title, aside, children, className = '' }) {
  return (
    <section className={`orc-sec ${className}`.trim()} aria-labelledby={id}>
      <div className="tcc-head">
        <h2 className="tcc-title" id={id}>
          {title}
        </h2>
        {aside ? <div className="tcc-head__aside">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

function RowsSkeleton({ rows = 5 }) {
  return (
    <div className="orc-skelrows" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skel key={i} w="100%" h={14} />
      ))}
    </div>
  );
}

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

/* ── Latest recognition ─────────────────────────────────────────────────── */
function LatestRecognition({ status, list, onOpen, onRetry, canAward, onAward }) {
  const [shown, setShown] = useState(FEED_STEP);
  return (
    <Section id="orc-feed-title" title="Latest recognition">
      {status === 'loading' ? (
        <RowsSkeleton rows={6} />
      ) : status === 'error' ? (
        <SectionError message="Recognition could not be loaded." onRetry={onRetry} />
      ) : list.length === 0 ? (
        <p className="tcc-state">
          <span>No badges or awards yet.</span>
          {canAward && (
            <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onAward}>
              Award a badge
            </button>
          )}
        </p>
      ) : (
        <>
          <ul className="orc-feed">
            {list.slice(0, shown).map((r) => (
              <AwardRow key={r.id} r={r} onOpenMember={onOpen} />
            ))}
          </ul>
          {list.length > FEED_STEP && (
            <div className="orc-more">
              <span className="tcc-mono tcc-meta">
                {Math.min(shown, list.length)} of {list.length}
              </span>
              {shown < list.length ? (
                <button
                  type="button"
                  className="tcc-textbtn tcc-textbtn--accent"
                  onClick={() => setShown((s) => s + 10)}
                >
                  Show more
                </button>
              ) : (
                <button type="button" className="tcc-textbtn" onClick={() => setShown(FEED_STEP)}>
                  Show fewer
                </button>
              )}
            </div>
          )}
        </>
      )}
    </Section>
  );
}

/* ── Rankings ───────────────────────────────────────────────────────────── */
function Rankings({
  listMode,
  setListMode,
  period,
  setPeriod,
  state,
  selectedId,
  viewerId,
  onOpen,
  onRetry,
  canAward,
  onRecompute,
}) {
  const [all, setAll] = useState(false);
  const movers = listMode === 'movers';
  const data = state.data;
  const rows = data?.rows || [];
  const shown = all ? rows : rows.slice(0, RANK_STEP);
  const undated = movers && data && data.summary && data.summary.dated === false;
  return (
    <Section id="orc-rank-title" title="Rankings">
      <div className="tcc-toggles orc-listtabs" role="group" aria-label="Ranked list">
        {LIST_MODES.map((m) => (
          <TextToggle key={m.key} pressed={listMode === m.key} onClick={() => setListMode(m.key)}>
            {m.label}
          </TextToggle>
        ))}
      </div>
      {movers && (
        <div className="tcc-toggles orc-periods" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <TextToggle
              key={p.key}
              mono
              pressed={period === p.key}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </TextToggle>
          ))}
        </div>
      )}
      {state.status === 'loading' && !data ? (
        <RowsSkeleton rows={5} />
      ) : state.status === 'error' ? (
        <SectionError message="Rankings could not be loaded." onRetry={onRetry} />
      ) : undated ? (
        <p className="tcc-state">
          <span>
            Changes by period appear after the next recompute. Older changes carry the date of the
            recompute that wrote them, not the day their pitch was scored.
          </span>
          {canAward && (
            <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onRecompute}>
              Recompute ratings
            </button>
          )}
        </p>
      ) : rows.length === 0 ? (
        <p className="tcc-state">
          {movers ? 'No rating movement in this period.' : 'No members in this list.'}
        </p>
      ) : (
        <>
          <table className="orc-table orc-rank">
            <thead>
              <tr>
                <th scope="col" className="orc-num">
                  #
                </th>
                <th scope="col">Member</th>
                <th scope="col">Role</th>
                <th scope="col" className="orc-num">
                  {movers ? 'Change' : 'Rating'}
                </th>
                <th scope="col">Tier</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => {
                const on = r.member_id === selectedId;
                return (
                  <tr key={r.member_id} className={on ? 'is-on' : ''}>
                    <td className="orc-num tcc-mono tcc-meta">{i + 1}</td>
                    <td className="orc-ellipsis">
                      <button
                        type="button"
                        className="orc-namebtn"
                        aria-current={on ? 'true' : undefined}
                        onClick={() => onOpen(r.member_id)}
                        title={r.is_provisional ? 'Provisional: fewer than 10 scored pitches' : ''}
                      >
                        {stripDemoLabel(r.name)}
                        {r.member_id === viewerId && <span className="orc-you">You</span>}
                      </button>
                    </td>
                    <td>{ROLE_SHORT[r.weight_role] || NA}</td>
                    <td
                      className={`orc-num tcc-mono ${
                        movers
                          ? r.delta > 0
                            ? 'tcc-pos'
                            : 'tcc-neg'
                          : r.is_provisional
                            ? 'orc-dim'
                            : ''
                      }`}
                    >
                      {movers ? signed(r.delta) : fmtInt(r.rating)}
                    </td>
                    <td className={r.tier === 'unranked' ? 'tcc-na' : ''}>{tierLabelOf(r.tier)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="orc-note">
            Ratings under 10 scored pitches are provisional and shown dimmed. Faculty advisors are
            not ranked.
          </p>
          {rows.length > RANK_STEP && (
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={() => setAll((a) => !a)}
            >
              {all ? 'Show the top 10' : `Show all ${rows.length}`}
            </button>
          )}
        </>
      )}
    </Section>
  );
}

/* ── Term honour roll ───────────────────────────────────────────────────── */
function HonourRoll({ status, recognitions, members, teams, onOpen, onRetry }) {
  const [term, setTerm] = useState(() => termOf());
  const teamName = new Map((teams || []).map((t) => [t.id, t.name]));
  const rows = honourRoll(recognitions, members, term);
  return (
    <Section
      id="orc-honour-title"
      title="Term honour roll"
      aside={
        <span className="orc-term">
          <button
            type="button"
            className="tcc-textbtn"
            aria-label="Previous term"
            onClick={() => setTerm((t) => shiftTerm(t, -1))}
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <span className="orc-term__name">{term.label}</span>
          <button
            type="button"
            className="tcc-textbtn"
            aria-label="Next term"
            onClick={() => setTerm((t) => shiftTerm(t, 1))}
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </span>
      }
    >
      <p className="orc-note">Members with the most badges and awards this term.</p>
      {status === 'loading' ? (
        <RowsSkeleton rows={5} />
      ) : status === 'error' ? (
        <SectionError message="The honour roll could not be loaded." onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <p className="tcc-state">No badges or awards in {term.label}.</p>
      ) : (
        <table className="orc-table orc-honour">
          <thead>
            <tr>
              <th scope="col" className="orc-num">
                #
              </th>
              <th scope="col">Member</th>
              <th scope="col">Team</th>
              <th scope="col" className="orc-num">
                Awards
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.user_id}>
                <td className="orc-num tcc-mono tcc-meta">{i + 1}</td>
                <td className="orc-ellipsis">
                  {r.member_id ? (
                    <button
                      type="button"
                      className="orc-namebtn"
                      onClick={() => onOpen(r.member_id)}
                    >
                      {stripDemoLabel(r.name)}
                    </button>
                  ) : (
                    stripDemoLabel(r.name)
                  )}
                </td>
                <td className={r.team_id && teamName.get(r.team_id) ? '' : 'tcc-na'}>
                  {teamName.get(r.team_id) || 'Unassigned'}
                </td>
                <td className="orc-num tcc-mono">
                  {r.awards}
                  {r.gold > 0 && (
                    <span className="orc-gold" title={`${r.gold} gold`}>
                      {' '}
                      <i className="bi bi-trophy" aria-hidden="true" />
                      <span className="tcc-sr">{`, ${r.gold} gold`}</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

/* ── Side column ────────────────────────────────────────────────────────── */
function SideColumn({ status, recognitions, members, teams, onRetry }) {
  const term = termOf();
  const byTeam =
    status === 'ready' || status === 'refreshing'
      ? awardsByTeam(recognitions, members, teams, term)
      : undefined;
  return (
    <aside className="orc-side" aria-label="About the rating">
      {byTeam !== null && (
        <Section id="orc-teams-title" title="Awards by sector team">
          <p className="orc-note">
            Badges and awards in {term.label}, by the recipient&rsquo;s team.
          </p>
          {status === 'loading' ? (
            <RowsSkeleton rows={4} />
          ) : status === 'error' ? (
            <SectionError message="Awards by team could not be loaded." onRetry={onRetry} />
          ) : byTeam.every((t) => t.awards === 0) ? (
            <p className="tcc-state">No badges or awards in {term.label} yet.</p>
          ) : (
            <table className="orc-table">
              <thead>
                <tr>
                  <th scope="col">Team</th>
                  <th scope="col" className="orc-num">
                    Awards
                  </th>
                </tr>
              </thead>
              <tbody>
                {byTeam.map((t) => (
                  <tr key={t.id}>
                    <td className={t.id === 'unassigned' ? 'tcc-na' : ''}>{t.name}</td>
                    <td className="orc-num tcc-mono">{t.awards}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      )}

      <Section id="orc-method-title" title="How the rating is worked out">
        <ul className="orc-method">
          <li>
            <strong>Start.</strong> Every member starts at <span className="tcc-mono">1,250</span>.
          </li>
          <li>
            <strong>Scored pitches.</strong> An accepted pitch is scored 30 days after the decision.
            Its excess return over the broad market, held between{' '}
            <span className="tcc-mono">-25%</span> and <span className="tcc-mono">+40%</span>, is
            multiplied by <span className="tcc-mono">18</span>. A declared conviction adds or
            removes up to <span className="tcc-mono">16</span> points.
          </li>
          <li>
            <strong>Not counted.</strong> Rejected, deferred and watchlist pitches, meetings,
            grades, votes and badges. Awards do not change the rating.
          </li>
          <li>
            <strong>Inactivity.</strong> After <span className="tcc-mono">30</span> days with no
            change the rating loses <span className="tcc-mono">25</span> points, never below{' '}
            <span className="tcc-mono">1,250</span>.
          </li>
          <li>
            <strong>Provisional.</strong> Under <span className="tcc-mono">10</span> scored pitches.
          </li>
          <li>
            <strong>Updates.</strong> Ratings move when a manager presses Recompute ratings, not on
            their own.
          </li>
          <li>
            <strong>Display weights.</strong> Set the percentages in the breakdown only.
          </li>
        </ul>
        <div className="orc-links">
          <Link href="/org-team-hub/fund-analytics" className="tcc-link">
            Fund Analytics leaderboard <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
          <Link href="/org-team-hub/pitches" className="tcc-link">
            Pitch Pipeline <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </Section>
    </aside>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export function RecognitionPage({
  initialBase = null,
  initialRatings = null,
  sampleViewer = false,
  initialMember = null,
}) {
  const { isOrgUser, isLoading: orgLoading } = useOrg();
  const enabled = Boolean(initialBase) || isOrgUser;
  const data = useRecognitionData({ enabled, initialBase, initialRatings, sampleViewer });
  const [listMode, setListMode] = useState('movers');
  const [period, setPeriod] = useState('30d');
  const [picked, setPicked] = useState(initialMember);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(null);

  const base = data.base;
  const d = base.data;
  const viewer = d?.viewer || {};
  const ratingsState = data.ratingsOf(listMode, period);
  const allState = data.ratingsOf('all', '30d');
  const summaryState = ratingsState.data?.summary ? ratingsState : allState;

  /* Fetch the shown list (and the full list, for the default scorecard). */
  useEffect(() => {
    if (!enabled || data.sampleActive) return;
    if (ratingsState.status === 'idle') data.loadRatings(listMode, period);
  }, [enabled, data, listMode, period, ratingsState.status]);
  useEffect(() => {
    if (!enabled || data.sampleActive) return;
    if (allState.status === 'idle') data.loadRatings('all', '30d');
  }, [enabled, data, allState.status]);

  /* The open scorecard: the address, else the viewer when rated, else the
     top of the full ranking. */
  const defaultId = useMemo(() => {
    const rows = allState.data?.rows || [];
    const me = rows.find((r) => r.member_id === viewer.memberId);
    if (me && me.rated_thesis_count > 0) return me.member_id;
    if (allState.status !== 'ready' && !data.sampleActive) return null;
    return rows[0]?.member_id || viewer.memberId || null;
  }, [allState, viewer.memberId, data.sampleActive]);
  const selectedId = picked || defaultId;
  const cardState = data.cardOf(selectedId);

  useEffect(() => {
    if (!enabled || data.sampleActive || !selectedId) return;
    if (cardState.status === 'idle') data.loadCard(selectedId);
  }, [enabled, data, selectedId, cardState.status]);

  useEffect(() => {
    writeAddress(picked);
  }, [picked]);

  const open = (id) => {
    setPicked(id);
    if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 900px)').matches) {
      document.getElementById('orc-scorecard')?.scrollIntoView({ block: 'start' });
    }
  };

  if (!initialBase && orgLoading) {
    return (
      <Notice>
        <span>Loading recognition</span>
      </Notice>
    );
  }
  if ((!initialBase && !isOrgUser) || base.status === 'forbidden') {
    return (
      <Notice>
        <span>This page is for organizational members only.</span>
        <Link href="/home" className="tcc-link">
          Go to home <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </Notice>
    );
  }

  const status = base.status === 'refreshing' ? 'ready' : base.status;
  const baseFailed = base.status === 'error' && !d;
  const recognitions = d?.recognitions || [];
  const members = d?.members || [];
  const teams = d?.teams || [];
  const canAward = Boolean(viewer.canAward);
  const metrics = recognitionMetrics({ recognitions, summary: summaryState.data?.summary });
  const summaryLoading = !summaryState.data && summaryState.status !== 'error';
  const summaryFailed = !summaryState.data && summaryState.status === 'error';
  const recLoading = status === 'loading';

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page orc-page">
      <VisuallyHidden>
        <h1>Recognition</h1>
      </VisuallyHidden>

      {/* Row 1: the figures and the page actions */}
      <div className="tcc-top orc-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip orc-kpistrip" role="list" aria-label="Recognition figures">
            <Kpi
              icon="bi-award"
              label="Awards (7D)"
              loading={recLoading}
              tone={baseFailed ? 'na' : undefined}
              title="Badges and awards given in the last 7 days"
            >
              {baseFailed ? NA : metrics.awards7d}
            </Kpi>
            <Kpi
              icon="bi-people"
              label="Rated members"
              loading={summaryLoading}
              tone={summaryFailed ? 'na' : undefined}
              title="Members with at least one scored pitch, of the members who can be rated (faculty advisors are not rated)"
            >
              {summaryFailed || metrics.rated == null ? NA : `${metrics.rated}/${metrics.ratable}`}
            </Kpi>
            <Kpi
              icon="bi-graph-up-arrow"
              label="Top mover (30D)"
              loading={summaryLoading}
              tone={metrics.topMover ? (metrics.topMover.delta > 0 ? 'pos' : 'neg') : 'na'}
              title={
                metrics.dated
                  ? 'The largest signed change in rating over the last 30 days'
                  : 'Available after the next recompute dates every rating change'
              }
            >
              {metrics.topMover ? (
                <>
                  {signed(metrics.topMover.delta)}
                  <button
                    type="button"
                    className="orc-kpiname"
                    onClick={() => open(metrics.topMover.member_id)}
                  >
                    {stripDemoLabel(metrics.topMover.name)}
                  </button>
                </>
              ) : (
                NA
              )}
            </Kpi>
            <Kpi
              icon="bi-arrow-repeat"
              label="Last recompute"
              loading={summaryLoading}
              tone={metrics.lastRecompute ? undefined : 'na'}
              title="When ratings were last recomputed"
            >
              {metrics.lastRecompute ? fmtDate(metrics.lastRecompute) : NA}
            </Kpi>
            <Kpi
              icon="bi-stars"
              label="Auto-awards (term)"
              loading={recLoading}
              tone={baseFailed ? 'na' : undefined}
              title={`Badges given by auto-award in ${metrics.term.label}`}
            >
              {baseFailed ? NA : metrics.autoTerm}
            </Kpi>
          </div>
        </div>

        <div className="tcc-actions">
          {(data.sampleActive || data.sampleAvailable) && (
            <div className="tcc-actions__context">
              {data.sampleActive && <span className="tcc-sample">Sample content</span>}
              <button type="button" className="tcc-textbtn" onClick={data.toggleSample}>
                {data.sampleActive ? 'Show council data' : 'Show sample content'}
              </button>
            </div>
          )}
          {canAward && (
            <>
              <button type="button" className="tcc-textbtn" onClick={() => setDialog('recompute')}>
                <i className="bi bi-arrow-repeat" aria-hidden="true" />
                Recompute ratings
              </button>
              <button type="button" className="tcc-textbtn" onClick={() => setDialog('auto')}>
                <i className="bi bi-stars" aria-hidden="true" />
                Auto-award
              </button>
              <button type="button" className="tcc-textbtn" onClick={() => setDialog('weights')}>
                <i className="bi bi-sliders" aria-hidden="true" />
                Weights
              </button>
              <button type="button" className="tcc-btn" onClick={() => setDialog('award')}>
                <i className="bi bi-award" aria-hidden="true" />
                Award
              </button>
            </>
          )}
        </div>
      </div>

      {notice && (
        <p
          className={`orc-notice${notice.tone === 'error' ? ' orc-notice--error' : ''}`}
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

      {/* Row 2: awards and rankings | scorecard | about the rating */}
      <div className="orc-body">
        <div className="orc-left">
          <LatestRecognition
            status={baseFailed ? 'error' : status}
            list={recognitions}
            onOpen={open}
            onRetry={data.retryBase}
            canAward={canAward}
            onAward={() => setDialog('award')}
          />
          <Rankings
            listMode={listMode}
            setListMode={setListMode}
            period={period}
            setPeriod={setPeriod}
            state={ratingsState}
            selectedId={selectedId}
            viewerId={viewer.memberId}
            onOpen={open}
            onRetry={() => data.loadRatings(listMode, period)}
            canAward={canAward}
            onRecompute={() => setDialog('recompute')}
          />
          <HonourRoll
            status={baseFailed ? 'error' : status}
            recognitions={recognitions}
            members={members}
            teams={teams}
            onOpen={open}
            onRetry={data.retryBase}
          />
        </div>
        <span className="tcc-vrule orc-vrule orc-vrule--left" aria-hidden="true" />

        <section className="orc-main" id="orc-scorecard" aria-labelledby="orc-scorecard-title">
          {!selectedId && allState.status === 'error' ? (
            <>
              <h2 className="tcc-sr" id="orc-scorecard-title">
                Scorecard
              </h2>
              <SectionError
                message="The scorecard could not be loaded."
                onRetry={() => data.loadRatings('all', '30d')}
              />
            </>
          ) : (
            <Scorecard
              key={`${selectedId}:${data.sampleActive ? 's' : 'l'}:${data.version}`}
              state={cardState}
              isViewer={selectedId === viewer.memberId}
              onRetry={() => data.loadCard(selectedId)}
              sample={data.sampleActive}
            />
          )}
        </section>

        <span className="tcc-vrule orc-vrule orc-vrule--side" aria-hidden="true" />
        <SideColumn
          status={baseFailed ? 'error' : status}
          recognitions={recognitions}
          members={members}
          teams={teams}
          onRetry={data.retryBase}
        />
      </div>

      {dialog === 'award' && (
        <AwardDialog
          baseStatus={baseFailed ? 'error' : status}
          members={members}
          onRetry={data.retryBase}
          sample={data.sampleActive}
          act={data.act}
          onClose={() => setDialog(null)}
          onDone={(text) => setNotice({ tone: 'ok', text })}
        />
      )}
      {dialog === 'weights' && (
        <WeightsDialog
          load={data.loadWeights}
          act={data.act}
          sample={data.sampleActive}
          onClose={() => setDialog(null)}
          onDone={(text) => setNotice({ tone: 'ok', text })}
        />
      )}
      {(dialog === 'recompute' || dialog === 'auto') && (
        <ConfirmDialog
          kind={dialog}
          sample={data.sampleActive}
          act={data.act}
          onClose={() => setDialog(null)}
          onDone={(text) => setNotice({ tone: 'ok', text })}
        />
      )}
    </div>
  );
}

export default RecognitionPage;
