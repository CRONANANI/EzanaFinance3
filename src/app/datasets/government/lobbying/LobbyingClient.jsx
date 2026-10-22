'use client';

/**
 * Lobbying Activity (Oct 21, 2026 redesign): ten cards under one sticky
 * filter bar. Design: docs/design/lobbying-handoff. Every card reads the
 * real Senate LDA copy through /api/lobbying/page (cache-only aggregates)
 * or an existing route; nothing here is sample data.
 *
 * State lives in the URL. Filters update it in place with
 * history.replaceState (Next syncs useSearchParams without a server round
 * trip); opening the filing or company modal pushes one history entry so
 * Back closes it. Each card fetches with only the filters it applies
 * (FILTERS_APPLY), so a change refetches the cards it affects and no others.
 * Answers are cached by query (ui.jsx), a card keeps its last answer dimmed
 * while the next loads, and the server seeds the above-the-fold cards.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import HubQueryLink from '@/components/datasets/HubQueryLink';
import {
  currentQuarter,
  defaultFilters,
  parseFilters,
  periodCoverage,
  pickFilters,
  serializeFilters,
  viewQuery,
} from '@/lib/lobbying/page-model';
import {
  cardSubtitle,
  coverageChip,
  coverageLine,
  emptyMessage,
  fmtDate,
  fmtPeriod,
  fmtSpend,
} from '@/lib/lobbying/page-format';
import FilterBar from './FilterBar';
import PulseCard from './PulseCard';
import LeaderboardCard from './LeaderboardCard';
import IssuesCard from './IssuesCard';
import PressureCard from './PressureCard';
import RhythmCard from './RhythmCard';
import DoorCard from './DoorCard';
import LensCard from './LensCard';
import RatioCard from './RatioCard';
import MembersCard from './MembersCard';
import DisclosuresCard from './DisclosuresCard';
import { ClientDrawer, CompanyModal, FilingModal } from './Overlays';
import { prefetchView, seedViews, useJson, useNearViewport, useView } from './ui';
import './lobbying.css';

const SOURCE_LINE =
  'Source: Senate LDA (lda.gov). Amounts are as reported by filers. For educational purposes only. Not financial advice.';

/* Filter and modal changes stay on the client: Next 14.1+ syncs
   useSearchParams with the native history API, so no server render runs. */
function replaceUrl(url) {
  window.history.replaceState(window.history.state, '', url);
}
function pushUrl(url) {
  window.history.pushState(null, '', url);
}

export default function LobbyingClient({ initialViews = null }) {
  /* Seed the view cache before any card reads it, so server-read cards
     render ready on the first pass (and hydrate without a refetch). */
  useState(() => seedViews(initialViews));
  const router = useRouter();
  const pathname = usePathname() || '/datasets/government/lobbying';
  const sp = useSearchParams();
  const [nowMs] = useState(() => Date.now());
  const { isAuthenticated } = useAuth() || {};

  const filters = useMemo(() => parseFilters(sp, nowMs), [sp, nowMs]);
  const filingId = sp.get('filing');
  const companyTicker = (sp.get('company') || '').toUpperCase() || null;

  /* ── URL ─────────────────────────────────────────────────────────────── */
  const pushed = useRef(0);
  const urlWith = useCallback(
    (f, extra = {}) => {
      const params = serializeFilters(f, nowMs);
      for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
      const s = params.toString();
      return s ? `${pathname}?${s}` : pathname;
    },
    [pathname, nowMs],
  );
  const setFilters = useCallback(
    (patch) => {
      const next = { ...filters, ...patch };
      replaceUrl(urlWith(next, { filing: filingId, company: companyTicker }));
    },
    [filters, urlWith, filingId, companyTicker],
  );
  const resetFilters = useCallback(
    () => replaceUrl(urlWith(defaultFilters(nowMs))),
    [urlWith, nowMs],
  );
  const openFiling = useCallback(
    (uuid) => {
      pushed.current += 1;
      pushUrl(urlWith(filters, { filing: uuid, company: companyTicker }));
    },
    [urlWith, filters, companyTicker],
  );
  const openCompany = useCallback(
    (ticker) => {
      pushed.current += 1;
      pushUrl(urlWith(filters, { company: ticker }));
    },
    [urlWith, filters],
  );
  const closeParam = useCallback(
    (name) => {
      if (pushed.current > 0) {
        pushed.current -= 1;
        router.back();
        return;
      }
      replaceUrl(
        urlWith(filters, {
          filing: name === 'filing' ? null : filingId,
          company: name === 'company' ? null : companyTicker,
        }),
      );
    },
    [router, urlWith, filters, filingId, companyTicker],
  );
  const closeFiling = useCallback(() => closeParam('filing'), [closeParam]);
  const closeCompany = useCallback(() => closeParam('company'), [closeParam]);

  /* ── per-card queries ────────────────────────────────────────────────── */
  const qs = useCallback(
    (view) => serializeFilters(pickFilters(filters, view), nowMs).toString(),
    [filters, nowMs],
  );
  const [by, setBy] = useState('client');
  const [mode, setMode] = useState('public');
  const [types, setTypes] = useState([]);
  const tableKey = `${qs('filings')}|${mode}`;
  const [page, setPageState] = useState({ key: tableKey, n: 1 });
  const tablePage = page.key === tableKey ? page.n : 1;
  const setPage = (n) => setPageState({ key: tableKey, n });
  const [drawer, setDrawer] = useState(null);

  /* Every card query comes from viewQuery, the same builder the server
     uses to seed the first paint, so cache keys always line up. */
  const vq = useCallback(
    (view, extra, f = filters) => viewQuery(view, f, nowMs, extra),
    [filters, nowMs],
  );
  const keep = { keepPrevious: true, seed: initialViews };
  const issues = useView(vq('issues'), true, keep);
  const pulse = useView(vq('pulse'), true, keep);
  const leaders = useView(vq('leaders', { by }), true, keep);
  /* Above the fold load at once; the rest load as they near the viewport. */
  const [pressureRef, pressureNear] = useNearViewport();
  const [midRef, midNear] = useNearViewport();
  const [lensRef, lensNear] = useNearViewport();
  const [lowRef, lowNear] = useNearViewport();
  const [tableRef, tableNear] = useNearViewport();
  const pressure = useView(vq('pressure'), pressureNear, keep);
  const rhythm = useView(vq('rhythm'), midNear, keep);
  const door = useView(vq('door'), midNear, keep);
  const lens = useView(vq('lens'), lensNear, keep);
  const members = useView(vq('members', { types: types.join(',') }), lowNear, keep);
  const tableBase = vq('filings', { mode });
  const table = useView(`${tableBase}&page=${tablePage}`, tableNear, keep);

  /* Hovering or focusing an issue warms the cards that issue would change,
     so the click usually lands on a cached answer. Short intent delay so a
     pointer sweeping across the list does not fire a request per row. */
  const previewTimer = useRef(null);
  const previewIssue = useCallback(
    (code) => {
      clearTimeout(previewTimer.current);
      previewTimer.current = setTimeout(() => {
        const next = { ...filters, issue: code };
        prefetchView(vq('pulse', {}, next));
        prefetchView(vq('leaders', { by }, next));
        if (midNear) {
          prefetchView(vq('rhythm', {}, next));
          prefetchView(vq('door', {}, next));
        }
        if (lensNear) prefetchView(vq('lens', {}, next));
      }, 150);
    },
    [filters, vq, by, midNear, lensNear],
  );
  useEffect(() => () => clearTimeout(previewTimer.current), []);

  /* ── coverage ─────────────────────────────────────────────────────────── */
  const { year: cy } = currentQuarter(nowMs);
  const cov = useJson(`/api/lobbying/ingest-status?years=${cy - 2},${cy - 1},${cy}`);
  const covRows = cov.data?.quarters || [];
  const periodCov = periodCoverage(filters.period, covRows, nowMs);
  const priorCov = periodCoverage(filters.period, covRows, nowMs, 'prior');
  const partial = coverageChip(filters.period, periodCov, nowMs);

  /* ── labels ───────────────────────────────────────────────────────────── */
  const issueList = useMemo(() => issues.data?.issues || [], [issues.data]);
  const issueLabel = useMemo(
    () =>
      filters.issue
        ? issueList.find((i) => i.code === filters.issue)?.label || filters.issue
        : null,
    [issueList, filters.issue],
  );
  const sub = (view) =>
    cardSubtitle(pickFilters(filters, view), nowMs, issueLabel) || 'All filings';
  const empty = (view, what) => emptyMessage(pickFilters(filters, view), nowMs, issueLabel, what);

  /* ── ticker belt: CLIENT · $AMOUNT · ISSUE ────────────────────────────── */
  const feed = useJson('/api/lobbying/feed?limit=24');
  const feedRows = useMemo(() => (Array.isArray(feed.data) ? feed.data : []), [feed.data]);
  const tickerItems = useMemo(
    () =>
      feedRows
        .filter((r) => r.Client && r.Amount > 0)
        .map((r) => {
          const issue = String(r.Issue || '').split(', ')[0];
          return {
            id: r.uuid,
            main: r.Client,
            value: issue ? `${fmtSpend(r.Amount)} · ${issue.toUpperCase()}` : fmtSpend(r.Amount),
          };
        }),
    [feedRows],
  );
  const onTicker = useCallback((it) => openFiling(it.id), [openFiling]);
  usePublishTicker({
    items: tickerItems,
    onSelect: onTicker,
    ariaLabel: 'Latest lobbying filings',
  });
  const asOf = feedRows[0]?.Date || null;

  const covLine = coverageLine(covRows, cov.data?.updatedAt, nowMs);
  const entityQuery = qs('entity');
  const returnTo = encodeURIComponent(urlWith(filters));

  return (
    <div className="lbx-page">
      <header className="lbx-header">
        <div className="lbx-header-main">
          <p className="lbx-kicker">Datasets · Lobbying activity</p>
          <h1 className="lbx-h1">Lobbying activity</h1>
          <p className="lbx-lead">
            Who pays to influence Washington, on which issues, through which firms, and how that
            reaches public companies and the members they fund.
          </p>
        </div>
        <p className="lbx-asof lbx-mono">
          {asOf ? (
            <>
              Filings as of <span>{fmtDate(asOf)}</span>
            </>
          ) : null}
        </p>
      </header>

      <HubQueryLink dimension="capitol" />

      <FilterBar
        filters={filters}
        set={setFilters}
        reset={resetFilters}
        nowMs={nowMs}
        issues={issueList}
        onPreviewIssue={previewIssue}
        filingCount={pulse.data?.now?.filings ?? null}
      />

      <div className="lbx-stack">
        <PulseCard
          view={pulse}
          filters={filters}
          nowMs={nowMs}
          sub={sub('pulse')}
          partial={partial}
          empty={empty('pulse')}
          onReset={resetFilters}
          coverage={periodCov}
          priorCoverage={priorCov}
        />

        <div className="lbx-pair lbx-pair--7-5">
          <LeaderboardCard
            view={leaders}
            by={by}
            setBy={setBy}
            filters={filters}
            nowMs={nowMs}
            sub={sub('leaders')}
            partial={partial}
            empty={empty('leaders', 'filings with a reported amount')}
            onOpen={setDrawer}
          />
          <IssuesCard
            view={issues}
            selected={filters.issue}
            onPick={(code) => setFilters({ issue: code })}
            onPreview={previewIssue}
            sub={sub('issues')}
            partial={partial}
            empty={empty('issues')}
          />
        </div>

        <div ref={pressureRef} className="lbx-lazy">
          <PressureCard
            view={pressure}
            selected={filters.issue}
            onPick={(code) => setFilters({ issue: code })}
            sub={sub('pressure')}
            partial={partial}
            empty={empty('pressure')}
          />
        </div>

        <div className="lbx-pair" ref={midRef}>
          <RhythmCard
            view={rhythm}
            coverageRows={covRows}
            nowMs={nowMs}
            sub={
              cardSubtitle(pickFilters(filters, 'rhythm'), nowMs, issueLabel) ||
              `2024 Q1 to ${cy} Q4 · all filings`
            }
            empty={empty('rhythm')}
          />
          <DoorCard view={door} sub={sub('door')} empty={empty('door')} />
        </div>

        <div ref={lensRef} className="lbx-lazy">
          <LensCard
            view={lens}
            sub={sub('lens')}
            empty={empty('lens', 'public companies')}
            onOpen={openCompany}
          />
        </div>

        <div className="lbx-pair" ref={lowRef}>
          <RatioCard />
          <MembersCard
            view={members}
            types={types}
            setTypes={setTypes}
            sub={`${fmtPeriod(filters.period, nowMs)}${filters.min > 0 ? ` · ${cardSubtitle({ min: filters.min }, nowMs)}` : ''}`}
            empty={empty('members', 'contributions')}
          />
        </div>

        <div ref={tableRef} className="lbx-lazy">
          <DisclosuresCard
            view={table}
            mode={mode}
            setMode={setMode}
            page={tablePage}
            setPage={setPage}
            baseQuery={tableBase}
            signedIn={Boolean(isAuthenticated)}
            sub={sub('filings')}
            empty={empty('filings')}
            onReset={resetFilters}
            onOpenFiling={openFiling}
          />
        </div>

        {!isAuthenticated ? (
          <section className="lbx-band" aria-labelledby="lbx-band-title">
            <div className="lbx-band-copy">
              <p className="lbx-kicker lbx-kicker--accent">Free account</p>
              <h2 id="lbx-band-title">Follow the money behind the markets</h2>
              <p>Create a free account to export disclosures to CSV.</p>
            </div>
            <div className="lbx-band-actions">
              <a className="lbx-btn" href={`/auth/signup?redirect=${returnTo}`}>
                Sign up free
              </a>
              <a className="lbx-btn lbx-btn--ghost" href={`/auth/login?redirect=${returnTo}`}>
                Log in
              </a>
            </div>
          </section>
        ) : null}

        <footer className="lbx-foot">
          <p className="lbx-legal">{SOURCE_LINE}</p>
          {covLine ? <p className="lbx-legal lbx-mono lbx-legal--cov">{covLine}</p> : null}
        </footer>
      </div>

      {drawer ? (
        <ClientDrawer
          entity={drawer}
          query={entityQuery}
          nowMs={nowMs}
          onClose={() => setDrawer(null)}
          onOpenFiling={openFiling}
        />
      ) : null}
      {companyTicker && /^[A-Z][A-Z0-9.-]{0,9}$/.test(companyTicker) ? (
        <CompanyModal
          ticker={companyTicker}
          query={entityQuery}
          nowMs={nowMs}
          onClose={closeCompany}
          onOpenFiling={openFiling}
        />
      ) : null}
      {filingId ? <FilingModal uuid={filingId} onClose={closeFiling} /> : null}
    </div>
  );
}
