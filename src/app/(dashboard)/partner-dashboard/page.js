'use client';

import { AnimatedCounter } from '@/components/partner/AnimatedCounter';
import { PartnerPreviewEmpty } from '@/components/partner/PartnerPreviewEmpty';
import { usePartnerPayouts, fmtUsdCents, fmtPayoutDate } from '@/hooks/usePartnerPayouts';
import '../partner.css';

/* QA PAR-5: earnings and payouts come from /api/partner/payouts. Copiers,
   strategies, audience, content and activity have no data source yet, so
   their cards show an honest preview state instead of invented numbers. */

const PAYOUT_STATUS_LABEL = {
  paid: 'Paid',
  pending: 'Pending',
  processing: 'Processing',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

function StatCard({ icon, label, cents, loading, gold = false }) {
  return (
    <div className={`ptr-stat-card${gold ? ' ptr-stat-gold' : ''}`}>
      <i className={`bi ${icon}`} aria-hidden />
      <div className="ptr-stat-info">
        <span className="ptr-stat-value">
          {loading || cents == null ? (
            '-'
          ) : (
            <>
              $<AnimatedCounter value={cents / 100} decimals={2} />
            </>
          )}
        </span>
        <span className="ptr-stat-label">{label}</span>
      </div>
    </div>
  );
}

export default function PartnerDashboardPage() {
  const { loading, error, payouts, pendingCents, lifetimeCents } = usePartnerPayouts();
  const lastPaid = payouts.find((p) => p.status === 'paid') || null;

  return (
    <div className="ptr-page">
      <div className="ptr-page-header">
        <h1 className="ptr-page-title">Partner Dashboard</h1>
      </div>

      {error ? (
        <p className="ptr-inline-error" role="alert">
          Earnings could not be loaded right now. Try again shortly.
        </p>
      ) : null}

      <div className="ptr-stats-row">
        <StatCard
          icon="bi-cash-coin"
          label="Lifetime paid"
          cents={lifetimeCents}
          loading={loading}
          gold
        />
        <StatCard
          icon="bi-hourglass-split"
          label="Pending payout"
          cents={pendingCents}
          loading={loading}
        />
        <StatCard
          icon="bi-calendar-check"
          label={lastPaid ? `Last payout, ${fmtPayoutDate(lastPaid.paid_at)}` : 'Last payout'}
          cents={loading || error ? null : lastPaid ? lastPaid.amount_cents : 0}
          loading={loading}
        />
      </div>

      <div className="ptr-row-2">
        <div className="ptr-card">
          <div className="ptr-card-header">
            <h3>Payout History</h3>
          </div>
          {loading ? (
            <PartnerPreviewEmpty icon="bi-arrow-repeat" title="Loading payouts" />
          ) : payouts.length === 0 ? (
            <PartnerPreviewEmpty icon="bi-wallet2" title="No payouts yet">
              Payouts are paid monthly, on the first business day, to the account in Settings,
              Payouts.
            </PartnerPreviewEmpty>
          ) : (
            <table className="ptr-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Period</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtPayoutDate(p.paid_at || p.created_at)}</td>
                    <td className="ptr-table-amount">{fmtUsdCents(p.amount_cents)}</td>
                    <td>
                      {p.period_start && p.period_end
                        ? `${fmtPayoutDate(p.period_start)} to ${fmtPayoutDate(p.period_end)}`
                        : ''}
                    </td>
                    <td>
                      <span
                        className={`ptr-status-badge ${p.status === 'paid' ? 'green' : 'muted'}`}
                      >
                        {PAYOUT_STATUS_LABEL[p.status] || p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="ptr-card">
          <div className="ptr-card-header">
            <h3>Commission Breakdown</h3>
          </div>
          <PartnerPreviewEmpty icon="bi-pie-chart">
            A per-source breakdown of copy trading, course and referral earnings will appear here.
          </PartnerPreviewEmpty>
        </div>
      </div>

      <div className="ptr-row-2">
        <div className="ptr-card">
          <div className="ptr-card-header">
            <h3>Audience Growth</h3>
          </div>
          <PartnerPreviewEmpty icon="bi-people">
            Followers, copiers and Echo subscribers over time.
          </PartnerPreviewEmpty>
        </div>

        <div className="ptr-card ptr-strategies-card">
          <div className="ptr-card-header">
            <h3>Your Strategies</h3>
          </div>
          <PartnerPreviewEmpty icon="bi-lightning-charge">
            Copy-trading strategies, their copiers and returns.
          </PartnerPreviewEmpty>
        </div>
      </div>

      <div className="ptr-row-2">
        <div className="ptr-card">
          <div className="ptr-card-header">
            <h3>Top Performing Content</h3>
          </div>
          <PartnerPreviewEmpty icon="bi-newspaper">
            Your most-read articles and most-enrolled courses.
          </PartnerPreviewEmpty>
        </div>

        <div className="ptr-card">
          <div className="ptr-card-header">
            <h3>Top Copiers</h3>
          </div>
          <PartnerPreviewEmpty icon="bi-person-check">
            The members copying your strategies, with their results.
          </PartnerPreviewEmpty>
        </div>
      </div>
    </div>
  );
}
