'use client';

import { useRecommendation, usePriceTarget } from '@/hooks/useFinnhub';
import { motion } from 'framer-motion';
import { TrendingUp, Minus, TrendingDown, Users } from 'lucide-react';

export function AnalystRecommendations({ symbol }) {
  const { data: recommendations, loading: recsLoading } = useRecommendation(symbol);
  const { data: priceTarget, loading: ptLoading } = usePriceTarget(symbol);

  const isLoading = recsLoading || ptLoading;

  if (!symbol) return null;
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="research-card bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl p-4"
      >
        <div
          className="flex items-center gap-2"
          style={{
            fontSize: '0.6875rem',
            fontFamily: 'var(--font-mono, monospace)',
            color: '#6b7280',
          }}
        >
          <div className="w-4 h-4 border-2 border-emerald-500/50 border-t-emerald-500 rounded-full animate-spin" />
          Loading analyst data...
        </div>
      </motion.div>
    );
  }

  if ((!recommendations || recommendations.length === 0) && !priceTarget?.targetMean) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="research-card bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl p-4"
      >
        <div className="text-center py-4">
          <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p
            style={{
              fontSize: '0.6875rem',
              fontFamily: 'var(--font-mono, monospace)',
              color: '#6b7280',
            }}
          >
            Analyst data not available
          </p>
        </div>
      </motion.div>
    );
  }

  const latest = recommendations?.[0];
  const total = latest
    ? latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell
    : 0;

  const recommendationData = latest
    ? [
        { label: 'Strong Buy', value: latest.strongBuy, color: '#10b981' },
        { label: 'Buy', value: latest.buy, color: '#34d399' },
        { label: 'Hold', value: latest.hold, color: '#fbbf24' },
        { label: 'Sell', value: latest.sell, color: '#f87171' },
        { label: 'Strong Sell', value: latest.strongSell, color: '#ef4444' },
      ]
    : [];

  let consensus = 'Hold';
  let consensusColor = '#fbbf24';
  let consensusBg = 'rgba(251, 191, 36, 0.1)';
  let consensusBorder = 'rgba(251, 191, 36, 0.3)';
  let ConsensusIcon = Minus;

  if (latest) {
    const buyTotal = latest.strongBuy + latest.buy;
    const sellTotal = latest.sell + latest.strongSell;
    if (buyTotal > sellTotal + latest.hold) {
      consensus = 'Buy';
      consensusColor = '#10b981';
      consensusBg = 'rgba(16, 185, 129, 0.1)';
      consensusBorder = 'rgba(16, 185, 129, 0.3)';
      ConsensusIcon = TrendingUp;
    } else if (sellTotal > buyTotal + latest.hold) {
      consensus = 'Sell';
      consensusColor = '#ef4444';
      consensusBg = 'rgba(239, 68, 68, 0.1)';
      consensusBorder = 'rgba(239, 68, 68, 0.3)';
      ConsensusIcon = TrendingDown;
    }
  }

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="research-card bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid rgba(16, 185, 129, 0.06)',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'rgba(16, 185, 129, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Users style={{ width: 12, height: 12, color: '#10b981' }} />
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: '0.8125rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--home-heading, #f0f6fc)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Analyst Ratings
        </h3>
      </div>

      <div style={{ padding: '0.75rem 1rem' }}>
        {latest && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <div
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: 10,
                border: `1px solid ${consensusBorder}`,
                background: consensusBg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <ConsensusIcon
                style={{ width: 16, height: 16, color: consensusColor, marginBottom: 2 }}
              />
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-mono, monospace)',
                  color: consensusColor,
                }}
              >
                {consensus}
              </span>
              <span
                style={{
                  fontSize: '0.5rem',
                  fontFamily: 'var(--font-mono, monospace)',
                  color: '#6b7280',
                  marginTop: 1,
                }}
              >
                {total} Analyst{total !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {latest && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              marginBottom: '0.75rem',
            }}
          >
            {recommendationData.map((rec) => (
              <div key={rec.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.5625rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    color: '#6b7280',
                    width: 65,
                    flexShrink: 0,
                  }}
                >
                  {rec.label}
                </span>
                <div
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 4,
                    height: 8,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 4,
                      transition: 'width 0.5s ease-out',
                      width: `${total > 0 ? (rec.value / total) * 100 : 0}%`,
                      backgroundColor: rec.color,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: '0.625rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 800,
                    color: '#f0f6fc',
                    width: 16,
                    textAlign: 'right',
                  }}
                >
                  {rec.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {priceTarget?.targetMean && (
          <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(16, 185, 129, 0.06)' }}>
            <h4
              style={{
                fontSize: '0.5625rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono, monospace)',
                color: '#6b7280',
                letterSpacing: '0.04em',
                marginBottom: '0.375rem',
                textTransform: 'uppercase',
              }}
            >
              Price Target ({priceTarget.numberAnalysts ?? 0} Analysts)
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div
                style={{
                  background: 'rgba(10, 14, 19, 0.6)',
                  border: '1px solid rgba(16, 185, 129, 0.06)',
                  borderRadius: 6,
                  padding: '0.4rem 0.5rem',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontSize: '0.5rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    color: '#6b7280',
                    margin: '0 0 0.15rem 0',
                  }}
                >
                  LOW
                </p>
                <p
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 800,
                    color: '#f87171',
                    margin: 0,
                  }}
                >
                  {formatPrice(priceTarget.targetLow)}
                </p>
              </div>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 6,
                  padding: '0.4rem 0.5rem',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontSize: '0.5rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    color: '#10b981',
                    margin: '0 0 0.15rem 0',
                  }}
                >
                  MEAN
                </p>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 800,
                    color: '#10b981',
                    margin: 0,
                  }}
                >
                  {formatPrice(priceTarget.targetMean)}
                </p>
              </div>
              <div
                style={{
                  background: 'rgba(10, 14, 19, 0.6)',
                  border: '1px solid rgba(16, 185, 129, 0.06)',
                  borderRadius: 6,
                  padding: '0.4rem 0.5rem',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontSize: '0.5rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    color: '#6b7280',
                    margin: '0 0 0.15rem 0',
                  }}
                >
                  HIGH
                </p>
                <p
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 800,
                    color: '#10b981',
                    margin: 0,
                  }}
                >
                  {formatPrice(priceTarget.targetHigh)}
                </p>
              </div>
            </div>
          </div>
        )}

        {latest && (
          <p
            style={{
              fontSize: '0.5rem',
              fontFamily: 'var(--font-mono, monospace)',
              color: '#4b5563',
              textAlign: 'center',
              margin: '0.5rem 0 0 0',
            }}
          >
            Last updated: {latest.period}
          </p>
        )}
      </div>
    </motion.div>
  );
}
