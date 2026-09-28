'use client';

/**
 * Campaign Finance Records — standalone dataset page (redesigned family). Its
 * body is the SHARED <CampaignFinanceView> (the same FEC/OpenFEC cards + tables
 * + member drill-down rendered as a section on the Political Trade Tracker), so
 * there is no forked campaign-finance logic. Reuses the shared CategoryBar
 * (Capitol Watch active); 1440/32 margins; tokens only. NO mock data — honest
 * empty states when FEC data isn't populated yet.
 */
import { CampaignFinanceView } from '@/components/datasets/CampaignFinanceView';
import './campaign-finance-records.css';
import EzanaQLBar from '@/components/ezanaql/EzanaQLBar';
import { seedForDataset } from '@/lib/ezanaql/seeds';

export default function CampaignFinanceRecordsClient() {
  return (
    <div className="cfr-page">
      <header className="cfr-header">
        <p className="cfr-eyebrow">DATASETS · FEC CAMPAIGN FINANCE</p>
        <h1 className="cfr-title">Campaign finance records</h1>
        <p className="cfr-sub">
          Federal Election Commission contribution and spending data for members of Congress.
        </p>
      </header>

      {/* The one shared query bar, same slot and size as every dataset page. */}
      <EzanaQLBar datasetScope={null} seedQuery={seedForDataset(null)} />

      <CampaignFinanceView />
    </div>
  );
}
