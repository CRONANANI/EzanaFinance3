'use client';

/**
 * Activist & Block Positions (Oct 2026 redesign): the threshold ledger,
 * sixteen analysis cards, the filings table, the method section and three
 * side panels, as the sibling of the rebuilt /datasets/institutional page.
 *
 * URL state: ?w= ?form= ?tag= ?type= ?basis= (filters, replace);
 * ?filer= ?campaign= ?target= ?filing= (panels, one pushed entry; opening a
 * panel from a panel replaces in place). Findings, never advice.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import HubQueryLink from '@/components/datasets/HubQueryLink';
import { useJson } from '@/components/datasets/titans/ui';
import { windowRange } from '@/lib/titans/activist-model';
import { PURPOSE_TAG_LABEL, PERSON_TYPE_LABEL, G_RULE_BASIS } from '@/lib/sec/schedule13-meta';
import { pct, shortDate } from '@/lib/titans/format';
import {
  CampaignTapeCard,
  CrowdedTargetsCard,
  IntentShiftCard,
  LedgerRow,
  StakeLadderCard,
  StatedIntentCard,
  SwitchWatchCard,
  mapCampaign,
} from './ActCards';
import {
  AfterTheFilingCard,
  CaveatCard,
  ControlGapCard,
  FilingSpeedCard,
  FilingsTable,
  GSpectrumCard,
  HuntingGroundsCard,
  LeaderboardCard,
  MethodSection,
  RespondCard,
  WhoIsBehindItCard,
  WhoseMoneyCard,
} from './ActBoards';
import { FilingReader, InvestorDossier, TargetFile } from './ActPanels';
import '@/components/datasets/disclosures/disclosures.css';
import './activist.css';

const LEDE =
  'Every Schedule 13D and 13G on EDGAR, read as campaigns: who crossed 5% of which company, what they say in their own words, how the stake develops, and what happened around the event date.';
const WINDOWS = [
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '12m', label: '12 months' },
  { id: 'all', label: 'All on file' },
];

export default function ActivistClient({ overview, sampled }) {
  const router = useRouter();
  const pathname = usePathname() || '/datasets/activist';
  const sp = useSearchParams();
  const pushed = useRef(0);

  const asof = overview?.asof || new Date().toISOString().slice(0, 10);
  const windowKey = ['30d', '90d', '12m', 'all'].includes(sp.get('w')) ? sp.get('w') : '90d';
  const form = ['13d', '13g'].includes(sp.get('form')) ? sp.get('form') : null;
  const tag = PURPOSE_TAG_LABEL[sp.get('tag')] ? sp.get('tag') : null;
  const type = PERSON_TYPE_LABEL[sp.get('type')] ? sp.get('type') : null;
  const basis = ['b', 'c', 'd'].includes(sp.get('basis')) ? sp.get('basis') : null;
  const filerParam = sp.get('filer');
  const campaignParam = sp.get('campaign');
  const targetParam = sp.get('target');
  const filingParam = sp.get('filing');
  const panelOpen = Boolean(filerParam || campaignParam || targetParam || filingParam);
  const filters = { form, tag, type, basis };

  const win = overview?.windows?.[windowKey] || null;
  const range = win?.range || windowRange(windowKey, asof);
  const campaigns = useMemo(() => (overview?.campaigns || []).map(mapCampaign), [overview]);

  /* ── URL writes ───────────────────────────────────────────────────── */
  const urlWith = useCallback(
    (patch) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === '' || v === false) next.delete(k);
        else next.set(k, String(v));
      }
      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [sp, pathname],
  );
  const setFilters = useCallback(
    (patch) => {
      window.history.replaceState(window.history.state, '', urlWith(patch));
      router.refresh();
    },
    [urlWith, router],
  );
  const openPanel = useCallback(
    (patch) => {
      const cleared = { filer: null, campaign: null, target: null, filing: null, ...patch };
      if (panelOpen) {
        window.history.replaceState(window.history.state, '', urlWith(cleared));
        router.refresh();
        return;
      }
      pushed.current += 1;
      router.push(urlWith(cleared), { scroll: false });
    },
    [urlWith, router, panelOpen],
  );
  const closePanel = useCallback(() => {
    if (pushed.current > 0) {
      pushed.current -= 1;
      router.back();
      return;
    }
    router.replace(urlWith({ filer: null, campaign: null, target: null, filing: null }), {
      scroll: false,
    });
  }, [router, urlWith]);
  const openFiler = useCallback((cik) => cik && openPanel({ filer: String(cik) }), [openPanel]);
  const openCampaign = useCallback((key) => key && openPanel({ campaign: key }), [openPanel]);
  const openTarget = useCallback((key) => key && openPanel({ target: key }), [openPanel]);
  const openFiling = useCallback((acc) => acc && openPanel({ filing: acc }), [openPanel]);

  /* ── table and paths (own routes) ─────────────────────────────────── */
  const filterQs = useMemo(() => {
    const p = new URLSearchParams({ w: windowKey });
    if (form) p.set('form', form);
    if (tag) p.set('tag', tag);
    if (type) p.set('type', type);
    if (basis) p.set('basis', basis);
    return p.toString();
  }, [windowKey, form, tag, type, basis]);
  const table = useJson(`/api/titans/activist/filings?${filterQs}`);

  /* ── ticker belt (confirmed investors only) ───────────────────────── */
  const tickerItems = useMemo(() => {
    const items = [];
    for (const c of campaigns) {
      const last = c.filings[c.filings.length - 1];
      if (!last || !c.filer || !c.ticker) continue;
      const lead = last.switch
        ? 'SWITCHED'
        : last.exit
          ? 'EXIT'
          : `${last.form}${last.isAmendment ? '/A' : ''}`;
      items.push({
        id: `${c.key}-${last.accessionNo}`,
        lead,
        main: c.filer,
        value: last.switch
          ? `${c.ticker} 13G to 13D`
          : `${c.ticker} ${last.percentOfClass != null ? pct(last.percentOfClass, 1) : ''}`.trim(),
        _campaign: c.key,
      });
      if (items.length >= 12) break;
    }
    return items;
  }, [campaigns]);
  const onTickerSelect = useCallback((it) => openCampaign(it._campaign), [openCampaign]);
  usePublishTicker({
    items: tickerItems,
    onSelect: onTickerSelect,
    ariaLabel: 'The newest 13D and 13G campaigns',
  });

  const reparse = overview?.reparse;
  const reparsePct =
    reparse?.total && reparse.v2 < reparse.total ? (reparse.v2 / reparse.total) * 100 : null;
  const windowLabel = WINDOWS.find((w) => w.id === windowKey)?.label || windowKey;
  const chip =
    windowKey === 'all'
      ? 'All on file'
      : `${shortDate(range[0])?.replace(/, \d{4}$/, '')} to ${shortDate(range[1])}`;
  const activeFilterChips = [
    tag && { k: 'tag', label: PURPOSE_TAG_LABEL[tag] },
    type && { k: 'type', label: PERSON_TYPE_LABEL[type] },
    basis && { k: 'basis', label: G_RULE_BASIS[`13d-1(${basis})`]?.label || `13d-1(${basis})` },
  ].filter(Boolean);

  return (
    <div className="dsc act">
      <header className="act-header">
        <p className="act-eyebrow act-eyebrow--page">
          DATASETS · SEC EDGAR SCHEDULES 13D AND 13G
          {sampled ? <span className="act-sample-chip">SAMPLE DATA</span> : null}
        </p>
        <h1 className="act-h1">Activist and Block Positions</h1>
        <p className="act-lede">{LEDE}</p>
      </header>

      <HubQueryLink dimension="titans" />

      <div className="act-toolbar">
        <div className="act-toolbar-row">
          <div className="act-qcontrol" role="group" aria-label="Window">
            {WINDOWS.map((w) => (
              <button
                key={w.id}
                type="button"
                aria-pressed={windowKey === w.id}
                className={`act-qbtn${windowKey === w.id ? ' is-on' : ''}`}
                onClick={() => setFilters({ w: w.id === '90d' ? null : w.id })}
              >
                {w.label}
              </button>
            ))}
          </div>
          <span className="act-mono act-muted act-range">{chip}</span>
          <div className="act-toolbar-right">
            <ToolbarSearch campaigns={campaigns} onFiler={openFiler} onTarget={openTarget} />
            <a className="act-link" href="#method">
              How we source it
            </a>
          </div>
        </div>
        <div className="act-toolbar-row act-toolbar-row--filters">
          <span className="act-eyebrow">Form</span>
          <button
            type="button"
            aria-pressed={form === '13d'}
            className={`act-chip${form === '13d' ? ' is-on' : ''}`}
            onClick={() => setFilters({ form: form === '13d' ? null : '13d' })}
          >
            <span className="act-mark act-mark--d" aria-hidden="true" /> 13D
          </button>
          <button
            type="button"
            aria-pressed={form === '13g'}
            className={`act-chip${form === '13g' ? ' is-on' : ''}`}
            onClick={() => setFilters({ form: form === '13g' ? null : '13g' })}
          >
            <span className="act-mark act-mark--g" aria-hidden="true" /> 13G
          </button>
          <span className="act-vrule" aria-hidden="true" />
          <span className="act-eyebrow">Filters</span>
          <FilterMenu
            label="Purpose"
            options={Object.entries(PURPOSE_TAG_LABEL)}
            value={tag}
            onChange={(v) => setFilters({ tag: v })}
          />
          <FilterMenu
            label="Investor type"
            options={Object.entries(PERSON_TYPE_LABEL)}
            value={type}
            onChange={(v) => setFilters({ type: v })}
          />
          <FilterMenu
            label="13G basis"
            options={[
              ['b', '13d-1(b) · qualified institution'],
              ['c', '13d-1(c) · passive investor'],
              ['d', '13d-1(d) · exempt'],
            ]}
            value={basis}
            onChange={(v) => setFilters({ basis: v })}
          />
          {activeFilterChips.map((c) => (
            <button
              key={c.k}
              type="button"
              className="act-chip is-active-filter"
              onClick={() => setFilters({ [c.k]: null })}
            >
              {c.label} <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          ))}
          {reparsePct != null ? (
            <span className="act-mono act-muted act-reparse">
              Detail parsed for {pct(reparsePct, 0)} of filings on file
            </span>
          ) : null}
        </div>
      </div>

      {!overview ? (
        <p className="act-empty act-empty--page" role="status">
          The newest 13D and 13G filings are still being indexed. This page fills as they are
          parsed, usually within an hour of each filing.
        </p>
      ) : null}

      <LedgerRow win={win} windowKey={windowKey} chip={chip} />

      <CampaignTapeCard
        campaigns={campaigns}
        unconfirmed={overview?.unconfirmed || []}
        range={range}
        windowKey={windowKey}
        filters={filters}
        chip={chip}
        onCampaign={openCampaign}
        onFiling={openFiling}
      />

      <StatedIntentCard
        win={win}
        windowKey={windowKey}
        tag={tag}
        setTag={(v) => setFilters({ tag: v })}
        table={table}
        chip={chip}
        onFiler={openFiler}
        onFiling={openFiling}
      />

      <div className="act-row">
        <IntentShiftCard
          campaigns={campaigns}
          range={range}
          chip={chip}
          onFiler={openFiler}
          onTarget={openTarget}
          onFiling={openFiling}
        />
        <SwitchWatchCard
          campaigns={campaigns}
          range={range}
          chip={chip}
          onCampaign={openCampaign}
        />
      </div>

      <div className="act-row">
        <StakeLadderCard
          campaigns={campaigns}
          range={range}
          filters={filters}
          chip={chip}
          onCampaign={openCampaign}
        />
        <CrowdedTargetsCard crowded={overview?.crowded || []} onTarget={openTarget} />
      </div>

      <div className="act-row">
        <WhoIsBehindItCard win={win} table={table} chip={chip} onFiling={openFiling} />
        <WhoseMoneyCard win={win} table={table} chip={chip} onFiling={openFiling} />
      </div>

      <div className="act-row">
        <ControlGapCard table={table} chip={chip} onFiling={openFiling} />
        <GSpectrumCard
          win={win}
          chip={chip}
          basis={basis}
          setBasis={(v) => setFilters({ basis: v })}
          onFiler={openFiler}
        />
      </div>

      <div className="act-row">
        <AfterTheFilingCard windowKey={windowKey} tag={tag} chip={chip} onTarget={openTarget} />
        <RespondCard table={table} chip={chip} onTarget={openTarget} />
      </div>

      <div className="act-row">
        <HuntingGroundsCard win={win} chip={chip} />
        <LeaderboardCard win={win} chip={chip} onFiler={openFiler} onTarget={openTarget} />
      </div>

      <div className="act-row">
        <FilingSpeedCard win={win} chip={chip} />
        <CaveatCard />
      </div>

      <FilingsTable
        table={table}
        windowLabel={windowLabel}
        chip={chip}
        onFiler={openFiler}
        onTarget={openTarget}
        onFiling={openFiling}
      />

      <MethodSection />
      <p className="act-footline">Findings from public filings, not investment advice.</p>

      {filerParam || campaignParam ? (
        <InvestorDossier
          cik={filerParam || String(campaignParam).split(':')[0]}
          campaignKey={campaignParam}
          sampled={sampled}
          onClose={closePanel}
          onCampaign={openCampaign}
          onFiling={openFiling}
          onFiler={openFiler}
        />
      ) : null}
      {targetParam ? (
        <TargetFile
          keyParam={targetParam}
          sampled={sampled}
          onClose={closePanel}
          onFiler={openFiler}
          onFiling={openFiling}
        />
      ) : null}
      {filingParam ? (
        <FilingReader
          accession={filingParam}
          sampled={sampled}
          onClose={closePanel}
          onFiler={openFiler}
        />
      ) : null}
    </div>
  );
}

/* ── toolbar pieces ──────────────────────────────────────────────────── */

function FilterMenu({ label, options, value, onChange }) {
  return (
    <label className="act-menu">
      <span className="act-sr">{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{label}</option>
        {options.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToolbarSearch({ campaigns, onFiler, onTarget }) {
  return (
    <SearchBox
      placeholder="Find an investor, company, ticker or CUSIP"
      resolve={(t) => {
        const investors = [];
        const seen = new Set();
        const targets = [];
        const seenT = new Set();
        for (const c of campaigns) {
          if (c.filer && c.filer.toLowerCase().includes(t) && !seen.has(c.filerCik)) {
            seen.add(c.filerCik);
            investors.push({
              kind: 'investor',
              id: c.filerCik,
              label: c.filer,
              meta: `CIK ${c.filerCik}`,
            });
          }
          const hitT =
            (c.ticker && c.ticker.toLowerCase().includes(t)) ||
            (c.subject && c.subject.toLowerCase().includes(t)) ||
            (c.cusip && c.cusip.toLowerCase() === t);
          const key = c.ticker || c.cusip;
          if (hitT && key && !seenT.has(key)) {
            seenT.add(key);
            targets.push({
              kind: 'company',
              id: key,
              label: c.ticker || c.subject,
              meta: c.subject,
            });
          }
        }
        return [...investors.slice(0, 4), ...targets.slice(0, 5)];
      }}
      onPick={(r) => (r.kind === 'investor' ? onFiler(r.id) : onTarget(r.id))}
    />
  );
}

function SearchBox({ placeholder, resolve, onPick }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const t = q.trim().toLowerCase();
  const results = t ? resolve(t) : [];
  const pick = (r) => {
    setQ('');
    onPick(r);
  };
  let lastKind = null;
  return (
    <div className="act-search">
      <i className="bi bi-search" aria-hidden="true" />
      <input
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        role="combobox"
        aria-expanded={Boolean(t)}
        aria-controls="act-search-list"
        aria-activedescendant={results.length ? `act-search-opt-${active}` : undefined}
        value={q}
        maxLength={60}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') return setQ('');
          if (!results.length) return undefined;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(results[Math.min(active, results.length - 1)]);
          }
          return undefined;
        }}
      />
      {t ? (
        <ul className="act-results" id="act-search-list" role="listbox" aria-label="Search results">
          {results.map((r, i) => {
            const header = r.kind !== lastKind;
            lastKind = r.kind;
            return (
              <li key={`${r.kind}-${r.id}`}>
                {header ? (
                  <p className="act-results-group" aria-hidden="true">
                    {r.kind === 'investor' ? 'Investors' : 'Companies'}
                  </p>
                ) : null}
                <button
                  type="button"
                  role="option"
                  id={`act-search-opt-${i}`}
                  aria-selected={i === active}
                  className={`act-result${i === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(r)}
                >
                  <span className="act-ellipsis">{r.label}</span>
                  <span className="act-mono act-muted act-ellipsis">{r.meta}</span>
                </button>
              </li>
            );
          })}
          {!results.length ? (
            <li className="act-results-none">Nothing in the loaded campaigns matches.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
