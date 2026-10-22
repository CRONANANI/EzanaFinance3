'use client';

/**
 * Institutional Holdings (13F), Oct 2026 redesign: the quarter ledger, the
 * filing clock, ten analysis cards, two search tables, the method section
 * and two side panels, under the shared datasets chrome.
 *
 * URL state: ?q= (quarter, replace), ?manager= / ?security= (panels, one
 * pushed history entry so Back closes; opening one replaces the other).
 * Design: institutional-handoff. Findings, never advice.
 */
import { useCallback, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import HubQueryLink from '@/components/datasets/HubQueryLink';
import { netBreadth, pctFiled, filingDay } from '@/lib/titans/institutional-model';
import { int, pct, quarterShort, usd } from '@/lib/titans/format';
import {
  FilingClockCard,
  FreshExitsCard,
  LedgerRow,
  NetFlowCard,
  SectorRotationCard,
} from './Cards';
import {
  ConsensusMapCard,
  ConvergenceCard,
  HedgeOverlayCard,
  LagTaxCard,
  ManagerUniverseCard,
} from './Boards';
import { ManagersTable, MethodSection, SecuritiesTable } from './Tables';
import { ManagerFingerprint, SecurityXray } from './Panels';
import { GroupedToolbarSearch } from './Toolbar';
import '@/components/datasets/disclosures/disclosures.css';
import './institutional.css';

const LEDE =
  'Every 13F-HR on EDGAR, from every manager above $100M in US equities. What they held at quarter end, what changed against the prior quarter, and who is filing for the quarter now underway.';

export default function InstitutionalClient({
  overview,
  openOverview,
  curve,
  lag,
  convergence,
  openQuarter,
  sampled,
}) {
  const router = useRouter();
  const pathname = usePathname() || '/datasets/institutional';
  const sp = useSearchParams();
  const pushed = useRef(0);

  const completeQ = overview?.quarter || null;
  const qParam = sp.get('q');
  const partialSelected = Boolean(
    openQuarter && qParam === quarterShort(openQuarter)?.replace(' ', ''),
  );
  const active = partialSelected ? openOverview : overview;
  const activeQuarter = partialSelected ? openQuarter : completeQ;
  const chip = partialSelected ? `${quarterShort(openQuarter)} · partial` : quarterShort(completeQ);
  const chipPartial = partialSelected;
  const managerParam = sp.get('manager');
  const securityParam = sp.get('security');

  const urlWith = useCallback(
    (patch) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === '') next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [sp, pathname],
  );
  const setQuarter = useCallback(
    (id) => {
      window.history.replaceState(
        window.history.state,
        '',
        urlWith({ q: id === 'partial' ? quarterShort(openQuarter)?.replace(' ', '') : null }),
      );
      router.refresh();
    },
    [urlWith, openQuarter, router],
  );
  const openManager = useCallback(
    (cik) => {
      if (!cik) return;
      const padded = String(cik).replace(/\D/g, '').padStart(10, '0');
      if (managerParam || securityParam) {
        window.history.replaceState(
          window.history.state,
          '',
          urlWith({ manager: padded, security: null }),
        );
        router.refresh();
        return;
      }
      pushed.current += 1;
      router.push(urlWith({ manager: padded, security: null }), { scroll: false });
    },
    [urlWith, router, managerParam, securityParam],
  );
  const openSecurity = useCallback(
    (key) => {
      if (!key) return;
      if (managerParam || securityParam) {
        window.history.replaceState(
          window.history.state,
          '',
          urlWith({ security: key, manager: null }),
        );
        router.refresh();
        return;
      }
      pushed.current += 1;
      router.push(urlWith({ security: key, manager: null }), { scroll: false });
    },
    [urlWith, router, managerParam, securityParam],
  );
  const closePanel = useCallback(() => {
    if (pushed.current > 0) {
      pushed.current -= 1;
      router.back();
      return;
    }
    router.replace(urlWith({ manager: null, security: null }), { scroll: false });
  }, [router, urlWith]);

  /* ── filing progress for the quarter control badge ────────────────── */
  const openFiled = curve?.open?.length ? curve.open[curve.open.length - 1][1] : 0;
  const filedShare = pctFiled(
    openFiled,
    overview?.filers || curve?.priorFinal || curve?.prior_final,
  );
  const daysSince = completeQ ? filingDay(completeQ, new Date().toISOString().slice(0, 10)) : null;

  /* ── ticker belt ──────────────────────────────────────────────────── */
  const tickerItems = useMemo(() => {
    const items = [];
    for (const b of (overview?.breadth || []).slice(0, 4)) {
      if (!b.ticker) continue;
      items.push({
        id: `nb-${b.cusip}`,
        lead: 'NET BUYERS',
        main: b.ticker,
        value: `+${netBreadth(b)}`,
        _security: b.ticker,
      });
    }
    for (const r of (overview?.newPositions || []).slice(0, 4)) {
      items.push({
        id: `np-${r.cik}-${r.cusip}`,
        lead: 'NEW POSITION',
        main: r.filer || r.cik,
        value: `${r.ticker || ''} ${usd(r.valueUsd) || ''}`.trim(),
        _security: r.ticker || r.cusip,
      });
    }
    for (const r of (overview?.exits || []).slice(0, 2)) {
      items.push({
        id: `ex-${r.cik}-${r.cusip}`,
        lead: 'EXIT',
        main: r.filer || r.cik,
        value: `${r.ticker || ''} ${usd(r.valuePrior) || ''}`.trim(),
        _security: r.ticker || r.cusip,
      });
    }
    for (const m of (curve?.earlyMovers || curve?.early_movers || []).slice(0, 2)) {
      items.push({
        id: `q3-${m.cik || m.filer_name}`,
        lead: `${quarterShort(openQuarter) || 'OPEN'} FILED`,
        main: m.filer || m.filer_name,
        value: usd(m.valueUsd ?? m.value_usd) || '',
        _manager: m.cik,
      });
    }
    return items.slice(0, 12);
  }, [overview, curve, openQuarter]);
  const onTickerSelect = useCallback(
    (it) => {
      if (it._manager) openManager(it._manager);
      else if (it._security) openSecurity(it._security);
    },
    [openManager, openSecurity],
  );
  usePublishTicker({
    items: tickerItems,
    onSelect: onTickerSelect,
    ariaLabel: 'The newest institutional holdings signals',
  });

  const partialUnavailable = partialSelected && !openOverview;
  const bodyOverview = partialUnavailable ? null : active;
  const deadlineLabel = curve?.deadline || null;

  return (
    <div className="dsc inst">
      <header className="inst-header">
        <p className="inst-eyebrow inst-eyebrow--page">
          DATASETS · SEC EDGAR FORM 13F-HR
          {sampled ? <span className="inst-sample-chip">SAMPLE DATA</span> : null}
        </p>
        <h1 className="inst-h1">Institutional Holdings</h1>
        <p className="inst-lede">{LEDE}</p>
      </header>

      <HubQueryLink dimension="titans" />

      <div className="inst-toolbar">
        {openQuarter ? (
          <div className="inst-qcontrol" role="group" aria-label="Quarter">
            <button
              type="button"
              aria-pressed={!partialSelected}
              className={`inst-qbtn${!partialSelected ? ' is-on' : ''}`}
              onClick={() => setQuarter('complete')}
            >
              {quarterShort(completeQ)}
            </button>
            <button
              type="button"
              aria-pressed={partialSelected}
              className={`inst-qbtn${partialSelected ? ' is-on' : ''}`}
              onClick={() => setQuarter('partial')}
            >
              {quarterShort(openQuarter)}
              <span className="inst-qbadge inst-mono">
                filing{filedShare != null ? ` · ${pct(filedShare * 100, 1)} filed` : ''}
              </span>
            </button>
          </div>
        ) : (
          <span className="inst-qchip">{quarterShort(completeQ)}</span>
        )}
        <div className="inst-toolbar-right">
          <GroupedToolbarSearch
            overview={overview}
            onManager={openManager}
            onSecurity={openSecurity}
          />
          <a className="inst-link" href="#method">
            How we source it
          </a>
        </div>
      </div>

      {partialSelected ? (
        <p className="inst-banner" role="status">
          <i className="bi bi-hourglass-split" aria-hidden="true" /> {quarterShort(openQuarter)} is
          still filing. {int(openFiled)} managers have filed so far, against {int(overview?.filers)}{' '}
          for {quarterShort(completeQ)}. Every figure below is partial until the deadline on{' '}
          {deadlineLabel ? deadlineLabel : 'day 45'}, and changes are measured against the
          managers&apos; {quarterShort(completeQ)} filings.
        </p>
      ) : null}

      {!overview ? (
        <p className="inst-empty inst-empty--page" role="status">
          The latest 13F filings are still being indexed. This page fills as they are parsed,
          usually within an hour of each filing.
        </p>
      ) : null}

      <LedgerRow
        overview={bodyOverview}
        chip={quarterShort(activeQuarter)}
        chipPartial={chipPartial}
      />

      <div className="inst-row">
        {openQuarter ? (
          <FilingClockCard
            curve={curve}
            openQuarter={openQuarter}
            priorQuarterLabel={quarterShort(completeQ)}
            onManager={openManager}
            loading={!curve}
          />
        ) : null}
        {partialUnavailable ? (
          <PartialUnavailable
            id="inst-flow"
            title="Which stocks are more managers buying than selling?"
            openQuarter={openQuarter}
            deadline={deadlineLabel}
          />
        ) : (
          <NetFlowCard
            overview={bodyOverview}
            chip={chip}
            chipPartial={chipPartial}
            onSecurity={openSecurity}
          />
        )}
      </div>

      {partialUnavailable ? (
        <PartialUnavailable
          id="inst-map"
          title="Is a stock widely owned, or deeply owned?"
          openQuarter={openQuarter}
          deadline={deadlineLabel}
        />
      ) : (
        <ConsensusMapCard
          overview={bodyOverview}
          chip={chip}
          chipPartial={chipPartial}
          onSecurity={openSecurity}
        />
      )}

      <div className="inst-row">
        {partialUnavailable ? (
          <PartialUnavailable
            id="inst-sectors"
            title="Where did institutional money move between sectors?"
            openQuarter={openQuarter}
            deadline={deadlineLabel}
          />
        ) : (
          <SectorRotationCard overview={bodyOverview} chip={chip} chipPartial={chipPartial} />
        )}
        {partialUnavailable ? (
          <PartialUnavailable
            id="inst-moves"
            title="What were the boldest new bets and the full exits this quarter?"
            openQuarter={openQuarter}
            deadline={deadlineLabel}
          />
        ) : (
          <FreshExitsCard
            overview={bodyOverview}
            chip={chip}
            chipPartial={chipPartial}
            onManager={openManager}
            onSecurity={openSecurity}
          />
        )}
      </div>

      <div className="inst-row">
        <ConvergenceCard
          overview={overview}
          convergence={convergence}
          chip={quarterShort(completeQ)}
          chipPartial={false}
          onSecurity={openSecurity}
        />
        <LagTaxCard
          overview={overview}
          lag={lag}
          daysSince={daysSince}
          chip={`${quarterShort(completeQ)} → today`}
          onSecurity={openSecurity}
        />
      </div>

      <div className="inst-row">
        {partialUnavailable ? (
          <PartialUnavailable
            id="inst-universe"
            title="Diversified giants or focused stock pickers?"
            openQuarter={openQuarter}
            deadline={deadlineLabel}
          />
        ) : (
          <ManagerUniverseCard
            overview={bodyOverview}
            chip={chip}
            chipPartial={chipPartial}
            selectedCik={managerParam}
            onManager={openManager}
          />
        )}
        {partialUnavailable ? (
          <PartialUnavailable
            id="inst-hedge"
            title="Where do managers hold puts and calls, and how big are they?"
            openQuarter={openQuarter}
            deadline={deadlineLabel}
          />
        ) : (
          <HedgeOverlayCard
            overview={bodyOverview}
            chip={chip}
            chipPartial={chipPartial}
            onSecurity={openSecurity}
          />
        )}
      </div>

      <div className="inst-row">
        <ManagersTable
          overview={bodyOverview || overview}
          chip={chip}
          chipPartial={chipPartial}
          onManager={openManager}
          onSecurity={openSecurity}
        />
        <SecuritiesTable
          overview={bodyOverview || overview}
          chip={chip}
          chipPartial={chipPartial}
          onSecurity={openSecurity}
        />
      </div>

      <MethodSection />
      <p className="inst-footline">Findings from public filings, not investment advice.</p>

      {managerParam ? (
        <ManagerFingerprint
          cik={managerParam}
          effNMedian={overview?.effNMedian}
          allSectorWeights={overview?.sectorWeights}
          sampled={sampled}
          onClose={closePanel}
        />
      ) : null}
      {securityParam ? (
        <SecurityXray keyParam={securityParam} sampled={sampled} onClose={closePanel} />
      ) : null}
    </div>
  );
}

function PartialUnavailable({ id, title, openQuarter, deadline }) {
  return (
    <section id={id} className="inst-card">
      <header className="inst-card-head">
        <div className="inst-card-head-text">
          <h2 className="inst-h2">{title}</h2>
        </div>
        <span className="inst-qchip is-partial">{quarterShort(openQuarter)} · partial</span>
      </header>
      <div className="inst-card-body">
        <p className="inst-empty">
          Available for completed quarters. {quarterShort(openQuarter)} completes after{' '}
          {deadline || 'its filing deadline'}.
        </p>
      </div>
    </section>
  );
}
