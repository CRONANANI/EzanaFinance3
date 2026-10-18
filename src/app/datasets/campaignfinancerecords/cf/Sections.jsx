'use client';

/**
 * Sections 05 to 09. Every card here keeps its approved place and size; the
 * ones whose data layer is not built yet render the shared "Not available
 * yet" state (no chart, no zeros), and flip to live without layout changes
 * as each layer lands.
 *
 *   05 DigitalAdObservatory, AdMomentum, BroadcastFilings
 *   06 CommitteeOversightMoney, IdeologyVsMoney, CommitteeSectorLandscape
 *   07 RaceProfile, MoneyVsMargin, DistrictContext
 *   08 CampaignVsPersonalWealth, LoansAndDebt, PoliticalOrganizations
 *   09 LatestFilings, ReportingCalendar
 */
import { useState } from 'react';
import { longDate, money } from './format';
import { CardFoot, CFCardState, Kpi, Pills } from './ui';
import { FORTY_EIGHT_HOUR_WINDOW, upcomingDeadlines } from './reporting-calendar';

const Pending = ({ span, title, sub, height = 260 }) => (
  <CFCardState span={span} title={title} sub={sub} state="unavailable" bodyHeight={height} />
);

/* ── 05 Political advertising intelligence ───────────────────────────── */

export const DigitalAdObservatory = () => (
  <Pending
    span={12}
    title="Digital political ad observatory"
    sub="Online political ad spending by advertiser, week, place and format. A share of all political advertising, not the total."
    height={420}
  />
);

export const AdMomentum = () => (
  <Pending
    span={8}
    title="Advertising momentum"
    sub="Timing and intensity across the cycle. Lanes share a time axis, not a value axis."
    height={200}
  />
);

export const BroadcastFilings = () => (
  <Pending
    span={4}
    title="Broadcast ad filings"
    sub="TV and radio political ad filings by station"
    height={200}
  />
);

/* ── 06 Money, committees and voting records ─────────────────────────── */

export const CommitteeOversightMoney = () => (
  <Pending
    span={6}
    title="Money from industries a committee oversees"
    sub="Committee members against all other members, for the sector tied to that committee"
    height={360}
  />
);

export const IdeologyVsMoney = () => (
  <Pending
    span={6}
    title="Voting ideology and campaign money"
    sub="A roll call based ideology estimate against a money measure"
    height={360}
  />
);

export const CommitteeSectorLandscape = () => (
  <Pending
    span={12}
    title="Committee and sector landscape"
    sub="Committees, their members and the sectors their jurisdiction touches"
    height={200}
  />
);

/* ── 07 Elections and district context ───────────────────────────────── */

export const RaceProfile = () => (
  <Pending
    span={4}
    title="The race behind the member"
    sub="Latest completed general election"
    height={340}
  />
);

export const MoneyVsMargin = () => (
  <Pending
    span={8}
    title="Money versus margin"
    sub="Every race on two axes: the fundraising gap and the winning margin"
    height={340}
  />
);

export const DistrictContext = () => (
  <Pending
    span={12}
    title="District economic context"
    sub="Who lives in the district, beside where the money comes from. Senators get statewide figures."
    height={180}
  />
);

/* ── 08 Additional financial disclosures ─────────────────────────────── */

export const CampaignVsPersonalWealth = () => (
  <Pending
    span={4}
    title="Campaign money and disclosed wealth"
    sub="Two separate pots, side by side"
    height={300}
  />
);

export function LoansAndDebt({ data, updated, onOpen }) {
  const [view, setView] = useState('debt');
  const t = data?.totals || {};
  const top = (data?.members || [])
    .filter((m) => (m.debt || 0) > 0)
    .sort((a, b) => b.debt - a.debt)
    .slice(0, 8);
  return (
    <CFCardState
      span={4}
      title="Loans and campaign debt"
      sub="Money lent to campaigns, kept apart from money they owe"
      actions={
        <Pills
          label="List"
          value={view}
          onChange={setView}
          size="sm"
          options={[
            { key: 'debt', label: 'Most debt' },
            { key: 'loans', label: 'Largest loans', disabled: true },
          ]}
        />
      }
      state={data?.ready ? 'ready' : 'unavailable'}
      bodyHeight={300}
      footer={<CardFoot updated={updated} />}
    >
      <div className="cfi-kpis cfi-kpis--2">
        <Kpi
          label="Debt owed"
          value={money(t.debt)}
          sub={`${t.debtMembers ?? 0} committees`}
          tone="amber"
        />
        <Kpi label="Candidate loans" value={null} />
      </div>
      {top.length ? (
        <ol className="cfi-mini-list cfi-mini-list--rank">
          {top.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="cfi-link-btn cfi-strong"
                onClick={() => onOpen(m.id)}
              >
                {m.name}
              </button>
              <span className="cfi-mono">{money(m.debt)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="cfi-state-note">No records for this selection</p>
      )}
      <p className="cfi-note">
        Debt owed by each campaign committee as reported. Loan amounts and creditors appear once
        they are available; loan terms are shown only as reported.
      </p>
    </CFCardState>
  );
}

export const PoliticalOrganizations = () => (
  <Pending
    span={4}
    title="Beyond campaign committees"
    sub="Political organizations reporting outside campaign filings"
    height={300}
  />
);

/* ── 09 Latest filings ───────────────────────────────────────────────── */

export const LatestFilings = () => (
  <Pending
    span={8}
    title="Campaign finance filings"
    sub="Select a filing to open the member's profile"
    height={260}
  />
);

export function ReportingCalendar({ todayIso }) {
  const next = upcomingDeadlines(todayIso, 4);
  const today = String(todayIso || '').slice(0, 10);
  const inWindow = today >= FORTY_EIGHT_HOUR_WINDOW.from && today <= FORTY_EIGHT_HOUR_WINDOW.to;
  return (
    <CFCardState
      span={4}
      title="Reporting calendar"
      sub="The next deadlines for congressional campaigns"
      state={next.length ? 'ready' : 'empty'}
      bodyHeight={260}
    >
      <ol className="cfi-cal">
        {next.map((e, i) => {
          const d = new Date(`${e.date}T00:00:00Z`);
          return (
            <li key={e.date} className={i === 0 ? 'is-next' : undefined}>
              <span className="cfi-cal-date">
                <span className="cfi-mono cfi-eyebrow">
                  {d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}
                </span>
                <b className="cfi-mono">{d.getUTCDate()}</b>
              </span>
              <span>
                <b>{e.name}</b>
                <span className="cfi-muted cfi-small">
                  {e.sub}
                  {e.kind === 'report' ? ` · due ${longDate(e.date)}` : ''}
                </span>
              </span>
              {i === 0 ? <span className="cfi-tag is-full">Next</span> : null}
            </li>
          );
        })}
      </ol>
      <p className="cfi-note">
        {inWindow ? 'Now in the 48 hour window: ' : ''}During the final 20 days before the general
        election, contributions of $1,000 or more must be reported within 48 hours.
      </p>
    </CFCardState>
  );
}
