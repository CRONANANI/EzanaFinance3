'use client';

/**
 * Campaign Finance Intelligence (/datasets/campaignfinancerecords).
 *
 * Phase 1 of the approved redesign: every card in its place, wired to the
 * data the platform holds today, with the cards whose data layer is not
 * built yet in the shared "Not available yet" state. The overview arrives
 * server-rendered; switching cycle refetches /api/campaign-finance/overview.
 *
 * The page names no data source anywhere in its copy (cards show only an
 * update time and member coverage). The older shared CampaignFinanceView and
 * MemberCampaignFinance exports are untouched and still power the Politician
 * Tracker's campaign finance section.
 */
import { useCallback, useEffect, useState } from 'react';
import { CF_SECTIONS, CFPageHeader, CFSectionNav, FilingActivityStrip } from './cf/Header';
import { FinancialLeaderboard } from './cf/Leaderboard';
import { MemberResearchDrawer } from './cf/MemberResearchDrawer';
import {
  DonorGeography,
  DonorIndustryAtlas,
  LobbyistConnections,
  OutsideGroupExplorer,
  OutsideMoneyPressure,
} from './cf/Network';
import { ChamberComparison, FundingComposition, MoneyMap, PartyComparison } from './cf/Overview';
import {
  ContributionSizeFingerprint,
  FinancialTrajectory,
  SpendingFingerprint,
} from './cf/Performance';
import {
  AdMomentum,
  BroadcastFilings,
  CampaignVsPersonalWealth,
  CommitteeOversightMoney,
  CommitteeSectorLandscape,
  DigitalAdObservatory,
  DistrictContext,
  IdeologyVsMoney,
  LatestFilings,
  LoansAndDebt,
  MoneyVsMargin,
  PoliticalOrganizations,
  RaceProfile,
  ReportingCalendar,
} from './cf/Sections';
import { easternTime, seatLabel } from './cf/format';
import { SectionHeader } from './cf/ui';
import './campaign-finance-records.css';

const BIOGUIDE = /^[A-Z][0-9]{6}$/;

function readMemberParam() {
  if (typeof window === 'undefined') return null;
  const id = new URLSearchParams(window.location.search).get('member');
  return id && BIOGUIDE.test(id.toUpperCase()) ? id.toUpperCase() : null;
}

function writeMemberParam(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('member', id);
  else url.searchParams.delete('member');
  window.history.replaceState(window.history.state, '', url.toString());
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  /* Neutralize spreadsheet formulas, then quote. */
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export default function CampaignFinanceRecordsClient({ initial, cycles, todayIso }) {
  const [data, setData] = useState(initial);
  const [cycle, setCycle] = useState(initial?.cycle || 2026);
  const [loading, setLoading] = useState(false);
  const [memberId, setMemberId] = useState(null);
  const [order, setOrder] = useState([]);

  useEffect(() => {
    setMemberId(readMemberParam());
  }, []);

  const openMember = useCallback((id) => {
    if (!id) return;
    setMemberId(id);
    writeMemberParam(id);
  }, []);
  const closeMember = useCallback(() => {
    setMemberId(null);
    writeMemberParam(null);
  }, []);

  const changeCycle = useCallback(
    async (c) => {
      if (c === cycle) return;
      setCycle(c);
      setLoading(true);
      try {
        const res = await fetch(`/api/campaign-finance/overview?cycle=${c}`);
        const body = res.ok ? await res.json() : null;
        setData(body || { ready: false, cycle: c, members: [] });
      } catch {
        setData({ ready: false, cycle: c, members: [] });
      } finally {
        setLoading(false);
      }
    },
    [cycle],
  );

  const exportCsv = useCallback(() => {
    const members = data?.members || [];
    const head = [
      'Member',
      'Party',
      'Seat',
      'Raised',
      'Spent',
      'Cash on hand',
      'Debt',
      'Itemized individual',
      'PAC',
    ];
    const lines = [head.map(csvCell).join(',')];
    const byId = new Map(members.map((m) => [m.id, m]));
    const rows = order.length ? order.map((id) => byId.get(id)).filter(Boolean) : members;
    for (const m of rows) {
      lines.push(
        [m.name, m.party, seatLabel(m), m.raised, m.spent, m.cash, m.debt, m.itemized, m.pac]
          .map(csvCell)
          .join(','),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ezana-campaign-finance-${cycle}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, [data, order, cycle]);

  const updated = easternTime(data?.synced);
  const view = loading ? { ...data, ready: false } : data;
  const members = data?.members || [];
  const props = { data: view, updated, cycle, onOpen: openMember };

  return (
    <div className="cfi-page">
      <FilingActivityStrip items={[]} />
      <CFPageHeader
        data={data}
        cycle={cycle}
        cycles={cycles}
        onCycle={changeCycle}
        onExport={exportCsv}
        exportDisabled={!data?.ready}
      />
      <CFSectionNav members={members} onMember={openMember} />

      <div className="cfi-sections" aria-busy={loading || undefined}>
        <div id={CF_SECTIONS[0].id} className="cfi-section cfi-section--lead">
          <FinancialLeaderboard {...props} onOrder={setOrder} />
        </div>

        <section id="overview" className="cfi-section" aria-label="The money behind Congress">
          <SectionHeader
            num="02"
            title="The money behind Congress"
            question="Where congressional campaign money comes from, and where it goes"
          />
          <div className="cfi-grid">
            <MoneyMap {...props} />
            <FundingComposition {...props} />
            <PartyComparison {...props} />
            <ChamberComparison {...props} />
          </div>
        </section>

        <section id="money" className="cfi-section" aria-label="Campaign financial performance">
          <SectionHeader
            num="03"
            title="Campaign financial performance"
            question="How campaigns raise, hold and spend over time"
          />
          <div className="cfi-grid">
            <FinancialTrajectory {...props} />
            <ContributionSizeFingerprint {...props} />
            <SpendingFingerprint {...props} />
          </div>
        </section>

        <section id="outside" className="cfi-section" aria-label="The political money network">
          <SectionHeader
            num="04"
            title="The political money network"
            question="Outside groups, donor geography, industries and lobbying around each member"
          />
          <div className="cfi-grid">
            <OutsideMoneyPressure {...props} />
            <OutsideGroupExplorer {...props} />
            <DonorGeography {...props} />
            <DonorIndustryAtlas />
            <LobbyistConnections />
          </div>
        </section>

        <section id="ads" className="cfi-section" aria-label="Political advertising intelligence">
          <SectionHeader
            num="05"
            title="Political advertising intelligence"
            question="What is being bought, where and when"
          />
          <div className="cfi-grid">
            <DigitalAdObservatory />
            <AdMomentum />
            <BroadcastFilings />
          </div>
        </section>

        <section
          id="votes"
          className="cfi-section"
          aria-label="Money, committees and voting records"
        >
          <SectionHeader
            num="06"
            title="Money, committees and voting records"
            question="Financial resources beside committee seats and roll call votes"
          />
          <div className="cfi-grid">
            <CommitteeOversightMoney />
            <IdeologyVsMoney />
            <CommitteeSectorLandscape />
          </div>
        </section>

        <section id="elections" className="cfi-section" aria-label="Elections and district context">
          <SectionHeader
            num="07"
            title="Elections and district context"
            question="The race behind each member, and the place they represent"
          />
          <div className="cfi-grid">
            <RaceProfile />
            <MoneyVsMargin />
            <DistrictContext />
          </div>
        </section>

        <section
          id="disclosures"
          className="cfi-section"
          aria-label="Additional financial disclosures"
        >
          <SectionHeader
            num="08"
            title="Additional financial disclosures"
            question="Personal wealth ranges, campaign debt and political organizations"
          />
          <div className="cfi-grid">
            <CampaignVsPersonalWealth />
            <LoansAndDebt {...props} />
            <PoliticalOrganizations />
          </div>
        </section>

        <section id="filings" className="cfi-section" aria-label="Latest filings">
          <SectionHeader
            num="09"
            title="Latest filings"
            question="What campaigns reported most recently, and what is due next"
          />
          <div className="cfi-grid">
            <LatestFilings />
            <ReportingCalendar todayIso={todayIso} />
          </div>
        </section>

        <p className="cfi-footnote">
          Campaign finance records are public filings. Ezana shows aggregates and never a searchable
          directory of individual donors. Associations shown here are not evidence of influence.
          Nothing here is investment advice.
        </p>
      </div>

      {memberId ? (
        <MemberResearchDrawer
          memberId={memberId}
          data={data}
          cycle={cycle}
          order={order}
          onNavigate={openMember}
          onClose={closeMember}
        />
      ) : null}
    </div>
  );
}
