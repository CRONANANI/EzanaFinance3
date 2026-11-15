'use client';

/**
 * Trading Desk (/org-trading): the fund's shared book and its written review
 * loop. It is a record, not an order screen: nothing here buys, sells or
 * simulates a trade. Positions are entered by hand, by spreadsheet or by
 * importing a linked brokerage account, and members challenge them with flags
 * that the covering analyst or sector head must answer in writing.
 *
 * One layout for every role. What a member sees follows the existing checks:
 * an executive sees the whole fund, a portfolio manager their team, an analyst
 * the sectors they cover (the rest of their team read only). Flagging, adding
 * and removing positions follow the member's rights, and the server checks
 * every request again.
 *
 * The page renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button, Modal, VisuallyHidden } from '@/components/ds';
import { useOrg } from '@/contexts/OrgContext';
import { benchmarkInfo, fmtDate, fmtMoney, fmtSignedPct, toneOf } from '@/lib/org-command-center';
import {
  NA,
  SCOPE_LABEL,
  accountabilityGaps,
  buildHoldingRows,
  fmtSignedMoney,
  holdingsTotals,
  pricesAsOf,
  scopeHoldings,
  todayChange,
} from '@/lib/org-trading-desk';
import { Skel } from '@/components/org/command-center/parts';
import { AddPositionModal } from '../add-position/AddPositionModal';
import { useTradingDeskData } from './useTradingDeskData';
import { FundBook } from './FundBook';
import { FlagQueue } from './FlagQueue';
import { Holdings } from './Holdings';
import { Discussion } from './Discussion';
import { CoverageGaps, MemberAccuracy } from './Accountability';
import '@/components/org/command-center/command-center.css';
import './trading-desk.css';
import '@/styles/home-canvas.css';

/* The composer only mounts while a flag is being written. */
const FlagComposerModal = dynamic(
  () => import('../FlagComposerModal').then((m) => ({ default: m.FlagComposerModal })),
  { loading: () => null },
);

function Kpi({ icon, label, loading, tone, title, children }) {
  return (
    <div className="tcc-kpi" role="listitem">
      <i className={`bi ${icon} tcc-kpi__icon`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${tone ? ` tcc-${tone}` : ''}`} title={title}>
        {loading ? <Skel w={64} h={16} /> : children}
      </span>
    </div>
  );
}

const UNREALIZED_LABEL = {
  fund: 'Unrealized gain',
  team: 'Team unrealized gain',
  coverage: 'Coverage unrealized gain',
};

/** One-line page states share the frame, so nothing jumps when the desk loads. */
export function DeskNotice({ children }) {
  return (
    <div className="dashboard-page-inset ez-canvas tcc-page otd-page">
      <VisuallyHidden>
        <h1>Trading Desk</h1>
      </VisuallyHidden>
      <p className="tcc-state" role="status">
        {children}
      </p>
    </div>
  );
}

export function useSlowFlag(ms = 10000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return slow;
}

export function TradingDesk() {
  const {
    isOrgUser,
    orgRole,
    orgData,
    isLoading,
    canManage,
    canFlagPositions,
    canManagePositions,
  } = useOrg();
  const member = orgData?.member || null;
  const data = useTradingDeskData({
    enabled: Boolean(isOrgUser && !isLoading),
    member,
    role: orgRole,
    canFlag: Boolean(canFlagPositions),
    accuracyScope: canManage ? 'council' : 'self',
  });
  const slow = useSlowFlag();

  const { resource, retry, viewer, sampleActive } = data;
  const summary = resource('summary');
  const book = resource('book');
  const roster = resource('roster');
  const dossier = resource('dossier');
  const openFlags = resource('openFlags');
  const inbox = resource('inbox');
  const accuracy = resource('accuracy');

  /* Sample content always carries the accountability payload, so the sample
     reads the same whatever the viewer's own rights are. */
  const canFlag = Boolean(canFlagPositions);
  const canManagePos = Boolean(canManagePositions);

  const [flagTab, setFlagTab] = useState('inbox');
  const [flagTicker, setFlagTicker] = useState(null);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [discussTicker, setDiscussTicker] = useState(null);
  const [composer, setComposer] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [teamFilter, setTeamFilter] = useState('all');
  const flagsRef = useRef(null);
  const discussRef = useRef(null);

  /* Switching between sample and council data starts the page over. */
  useEffect(() => {
    setSelectedFlag(null);
    setFlagTicker(null);
    setFlagTab('inbox');
    setDiscussTicker(null);
    setTeamFilter('all');
    setNotice(null);
  }, [sampleActive]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const positions = book.data?.positions;
  const coverage = book.data?.coverage;
  const rows = useMemo(
    () =>
      buildHoldingRows({
        positions,
        dossier: dossier.data?.positions,
        coverage,
        members: roster.data?.members,
        teams: roster.data?.teams || summary.data?.sectors,
        openFlags: openFlags.data?.flags,
      }),
    [positions, dossier.data, coverage, roster.data, summary.data, openFlags.data],
  );
  const scoped = useMemo(
    () =>
      scopeHoldings(rows, {
        role: viewer.role,
        teamId: viewer.teamId,
        memberId: viewer.memberId,
        coverage,
      }),
    [rows, viewer.role, viewer.teamId, viewer.memberId, coverage],
  );
  const totals = useMemo(() => holdingsTotals(scoped.mine), [scoped.mine]);
  const gaps = useMemo(() => accountabilityGaps(scoped.mine), [scoped.mine]);

  const openFlagFor = useCallback((row) => {
    if (!row.flags.length) return;
    setFlagTicker(row.ticker);
    setSelectedFlag(row.flags[0].id);
    flagsRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);
  const discuss = useCallback((row) => {
    setDiscussTicker(row.ticker);
    discussRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);
  const raise = useCallback((row) => {
    setComposer({ ticker: row.ticker, teamDbId: row.teamId, position: row.position });
  }, []);

  const confirmRemove = async () => {
    if (!removing || removeBusy) return;
    setRemoveBusy(true);
    setRemoveError(null);
    const out = await data.removePosition(removing);
    setRemoveBusy(false);
    if (!out.ok) {
      setRemoveError(out.error);
      return;
    }
    setNotice(
      out.sample
        ? `${removing.ticker} was removed from the sample book. Nothing was saved.`
        : `${removing.ticker} was removed from the book.`,
    );
    if (discussTicker === removing.ticker) setDiscussTicker(null);
    setRemoving(null);
  };

  if (isLoading) {
    return (
      <DeskNotice>
        {slow ? (
          <>
            <span>The Trading Desk is taking longer than expected to load.</span>
            <button type="button" className="tcc-btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </>
        ) : (
          <span>Loading the Trading Desk</span>
        )}
      </DeskNotice>
    );
  }
  if (!isOrgUser) {
    return (
      <DeskNotice>
        <span>This page is for organizational members only.</span>
        <Link href="/home" className="tcc-link">
          Go to home <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </DeskNotice>
    );
  }

  const sLoading = summary.status === 'loading';
  const bLoading = book.status === 'loading';
  const perf = summary.data?.performance || null;
  const bench = benchmarkInfo(perf);
  const today = todayChange(summary.data?.snapshots);
  const breaches = summary.data?.statStrip?.openViolations;
  const asOf = pricesAsOf(positions);
  const openCount = openFlags.data?.flags?.length;
  const inboxCount = inbox.status === 'ready' ? (inbox.data?.flags || []).length : null;
  const count = (v) => (v == null ? NA : String(v));
  /* A new position goes to the team in view: the team filter for an
     executive, the member's own team for everyone else. */
  const addTeamId =
    viewer.role === 'executive'
      ? teamFilter !== 'all' && teamFilter !== 'unassigned'
        ? teamFilter
        : null
      : viewer.teamId;
  const bookKnown = book.status === 'ready';

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page otd-page">
      <VisuallyHidden>
        <h1>Trading Desk</h1>
      </VisuallyHidden>

      {/* Row 1: KPI strips and the page actions */}
      <div className="tcc-top otd-top">
        <div className="tcc-kpis" aria-busy={sLoading || bLoading || undefined}>
          <div className="tcc-kpistrip" role="list" aria-label="Fund and review figures">
            <Kpi icon="bi-wallet2" label="Fund value" loading={sLoading}>
              {fmtMoney(perf?.total_value)}
            </Kpi>
            <Kpi
              icon="bi-bar-chart-line"
              label={bench.estimated ? 'Benchmark (est.)' : 'Benchmark'}
              loading={sLoading}
              title={sLoading ? undefined : bench.sourceText}
            >
              {bench.estimated ? null : <span>{bench.label}</span>}
              {perf?.benchmark_return_pct != null && (
                <span className={`tcc-${toneOf(perf.benchmark_return_pct)}`}>
                  {fmtSignedPct(perf.benchmark_return_pct)}
                </span>
              )}
              {bench.estimated && perf?.benchmark_return_pct == null ? NA : null}
            </Kpi>
            <Kpi
              icon="bi-calendar-day"
              label="Today"
              loading={sLoading}
              tone={today ? toneOf(today.dollar) : 'na'}
              title="The last two daily fund records compared"
            >
              {today ? (
                <>
                  <span>{fmtSignedMoney(today.dollar)}</span>
                  <span className="otd-kpi__sub">{fmtSignedPct(today.pct)}</span>
                </>
              ) : (
                NA
              )}
            </Kpi>
            <Kpi
              icon="bi-graph-up-arrow"
              label={UNREALIZED_LABEL[scoped.scope]}
              loading={bLoading}
              tone={bookKnown && totals.count ? toneOf(totals.pl) : 'na'}
              title="Market value less cost. Positions that are not priced yet add nothing."
            >
              {bookKnown && totals.count ? fmtSignedMoney(totals.pl) : NA}
            </Kpi>
            <Kpi
              icon="bi-inbox"
              label="Awaiting your response"
              loading={inbox.status === 'loading'}
              title="Open flags routed to you"
            >
              {count(inboxCount)}
            </Kpi>
            <Kpi
              icon="bi-flag"
              label="Open flags on the fund"
              loading={openFlags.status === 'loading'}
            >
              {openCount == null ? NA : openCount >= 100 ? '100+' : String(openCount)}
            </Kpi>
            {canManage && (
              <Kpi
                icon="bi-shield-exclamation"
                label="Open breaches"
                loading={sLoading}
                tone={Number(breaches) > 0 ? 'neg' : undefined}
              >
                {count(breaches)}
              </Kpi>
            )}
            <Kpi
              icon="bi-tag"
              label="Unpriced positions"
              loading={bLoading}
              title="Carried at cost until the next price update"
            >
              {bookKnown ? String(gaps.unpriced) : NA}
            </Kpi>
          </div>
        </div>
        <div className="tcc-actions">
          {(data.sampleActive || data.sampleAvailable) && (
            <div className="tcc-actions__context">
              {data.sampleActive && <span className="tcc-sample">Sample content</span>}
              <button
                type="button"
                className="tcc-textbtn"
                onClick={() => data.setShowSample((v) => !v)}
              >
                {data.sampleActive ? 'Show council data' : 'Show sample content'}
              </button>
            </div>
          )}
          {canManagePos && (
            <button
              type="button"
              className="tcc-textbtn otd-action"
              onClick={() => setShowAdd(true)}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              Add position
            </button>
          )}
          <Link href="/org-trading/inbox" className="tcc-btn otd-linkbtn">
            <i className="bi bi-inbox" aria-hidden="true" />
            Flag inbox
            {inboxCount ? <span className="tcc-mono">{inboxCount}</span> : null}
          </Link>
        </div>
      </div>

      <p className="otd-note">
        <span>
          This desk records the fund&apos;s holdings. No orders are placed here: trades are executed
          at the fund&apos;s broker, then recorded by hand, by spreadsheet or from a linked
          brokerage account.
        </span>{' '}
        <span>
          {asOf ? (
            <>
              Prices as of <span className="tcc-mono">{fmtDate(asOf)}</span>, updated after the
              market closes.
            </>
          ) : (
            'Prices are updated after the market closes.'
          )}
        </span>
      </p>

      {notice && (
        <p className="tcc-state otd-toast" role="status">
          <i className="bi bi-check-lg" aria-hidden="true" />
          <span>{notice}</span>
        </p>
      )}

      {/* Row 2: the fund, beside the flags waiting for an answer */}
      <div className="tcc-row otd-row--even">
        <FundBook
          summary={summary}
          book={book}
          onRetry={() => retry('summary', 'book')}
          canAdd={canManagePos}
          onAdd={() => setShowAdd(true)}
        />
        <span className="tcc-vrule" aria-hidden="true" />
        <div ref={flagsRef} className="otd-anchor">
          <FlagQueue
            data={data}
            tab={flagTab}
            onTab={(t) => {
              setFlagTab(t);
              setFlagTicker(null);
              setSelectedFlag(null);
            }}
            ticker={flagTicker}
            onClearTicker={() => {
              setFlagTicker(null);
              setSelectedFlag(null);
            }}
            selectedId={selectedFlag}
            onSelect={setSelectedFlag}
          />
        </div>
      </div>

      {/* Row 3: every holding with the people accountable for it */}
      <div className="tcc-row tcc-row--single">
        <Holdings
          book={book}
          scoped={scoped}
          scopeLabel={SCOPE_LABEL[scoped.scope]}
          onRetry={() => retry('book', 'roster', 'dossier', 'openFlags')}
          canFlag={canFlag}
          canManage={canManagePos}
          team={teamFilter}
          onTeam={setTeamFilter}
          onRaise={raise}
          onOpenFlags={openFlagFor}
          onDiscuss={discuss}
          onRemove={(row) => {
            setRemoveError(null);
            setRemoving(row);
          }}
          onAdd={() => setShowAdd(true)}
          sample={sampleActive}
        />
      </div>

      {/* Row 4: discussion, beside accuracy and the gaps */}
      <div className="tcc-row otd-row--even">
        <div ref={discussRef} className="otd-anchor">
          <Discussion
            data={data}
            rows={scoped.mine}
            loading={bLoading}
            failed={book.status === 'error'}
            ticker={discussTicker}
            onTicker={setDiscussTicker}
          />
        </div>
        <span className="tcc-vrule" aria-hidden="true" />
        <div className="otd-stack">
          <MemberAccuracy
            accuracy={accuracy}
            scope={canManage ? 'council' : 'self'}
            memberId={viewer.memberId}
            onRetry={() => retry('accuracy')}
          />
          <CoverageGaps
            book={book}
            gaps={gaps}
            scopeLabel={SCOPE_LABEL[scoped.scope]}
            breaches={canManage ? (breaches ?? null) : undefined}
            breachesLoading={sLoading}
          />
        </div>
      </div>

      {composer && (
        <FlagComposerModal
          ticker={composer.ticker}
          teamDbId={composer.teamDbId}
          position={composer.position}
          currentMember={sampleActive ? { id: viewer.memberId } : member}
          sample={data.composerSample}
          onClose={() => setComposer(null)}
          onSuccess={() => {
            const t = composer.ticker;
            setComposer(null);
            data.refreshFlags();
            setFlagTab('sent');
            setFlagTicker(null);
            setSelectedFlag(null);
            setNotice(
              sampleActive
                ? `Your flag on ${t} was added to the sample queue. Nothing was saved.`
                : `Your flag on ${t} was raised and routed. It is under Sent.`,
            );
          }}
        />
      )}

      <AddPositionModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        teamId={addTeamId}
        sample={sampleActive ? { onAdd: data.addSamplePosition } : null}
        onAdded={() => data.refreshBook()}
      />

      <Modal
        open={Boolean(removing)}
        onClose={removeBusy ? undefined : () => setRemoving(null)}
        title={removing ? `Remove ${removing.ticker} from the book?` : 'Remove position'}
        size={440}
        footer={
          <>
            <button
              type="button"
              className="tcc-textbtn"
              onClick={() => setRemoving(null)}
              disabled={removeBusy}
            >
              Cancel
            </button>
            <Button
              variant="danger"
              className="tcc-flatbtn"
              loading={removeBusy}
              onClick={confirmRemove}
            >
              Remove position
            </Button>
          </>
        }
      >
        {removing && (
          <div className="otd-confirm">
            <p>
              <span className="tcc-mono">{removing.ticker}</span>
              {removing.shares != null ? (
                <>
                  , <span className="tcc-mono">{removing.shares.toLocaleString('en-US')}</span>{' '}
                  shares at a market value of{' '}
                  <span className="tcc-mono">{fmtMoney(removing.value)}</span>,
                </>
              ) : null}{' '}
              will leave the fund book, the allocation and every total. This records that the fund
              no longer holds it. It does not sell anything.
            </p>
            <p className="tcc-form__note">
              {sampleActive
                ? 'Sample content is showing. The row is removed from the page only and nothing is saved.'
                : 'Flags and discussion on this position are kept.'}
            </p>
            {removeError && (
              <p className="tcc-state tcc-state--error" role="alert">
                <i className="bi bi-exclamation-circle" aria-hidden="true" />
                <span>{removeError}</span>
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default TradingDesk;
