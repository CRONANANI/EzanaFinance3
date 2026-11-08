'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  LineChart,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { CHART } from '@/lib/chart-theme';
import { ModelVariableStrip } from '@/components/research/models/ModelVariableStrip';
import './earnings-analysis-card.css';

/* Series styling. Token strings resolve inside the SVG, so both themes work. */
const SERIES = [
  { key: 'sentiment', name: 'Sentiment', stroke: 'var(--emerald)', width: 2, dash: undefined },
  { key: 'qa', name: 'Q&A Tone', stroke: 'var(--blue)', width: 2, dash: undefined },
  { key: 'uncertainty', name: 'Uncertainty', stroke: 'var(--negative)', width: 1.5, dash: '4 3' },
  { key: 'evasiveness', name: 'Evasiveness', stroke: 'var(--purple)', width: 1.5, dash: '4 3' },
];

const TOOLTIP_STYLE = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-primary)',
  borderRadius: 8,
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-primary)',
};

export function EarningsAnalysisCard({ symbol, onClose }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState(null);

  const load = useCallback(async () => {
    if (!symbol) return;
    setIsLoading(true);
    setErrorInfo(null);
    setData(null);
    try {
      const res = await fetch(`/api/earnings/analysis/${encodeURIComponent(symbol)}`, {
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        setErrorInfo({
          status: res.status,
          message: json.error || `Request failed (${res.status})`,
          detail: json.detail,
        });
        return;
      }
      setData(json);
    } catch (e) {
      setErrorInfo({ status: 0, message: e?.message || 'Failed to load' });
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) return <EarningsLoading />;
  if (errorInfo)
    return <EarningsError symbol={symbol} error={errorInfo} onRetry={load} onClose={onClose} />;
  if (!data) return <EarningsEmpty symbol={symbol} onRetry={load} onClose={onClose} />;

  const { current, history, earningsHistory, synthesis } = data;
  const analysis = current.analysis;

  const latestEarnings = earningsHistory?.[0];
  const surpriseDecimal =
    latestEarnings?.epsActual != null &&
    latestEarnings?.epsEstimated != null &&
    Math.abs(Number(latestEarnings.epsEstimated)) > 1e-9
      ? (latestEarnings.epsActual - latestEarnings.epsEstimated) /
        Math.abs(latestEarnings.epsEstimated)
      : null;

  const guidanceLabel =
    {
      raised: '▲ Raised',
      reiterated: 'Reiterated',
      lowered: '▼ Lowered',
    }[analysis.guidanceDirection] || '–';

  const variables = [
    { label: 'Last EPS', value: latestEarnings?.epsActual ?? '–', format: 'currency' },
    { label: 'Consensus', value: latestEarnings?.epsEstimated ?? '–', format: 'currency' },
    {
      label: 'Surprise',
      value: surpriseDecimal != null ? surpriseDecimal : '–',
      format: surpriseDecimal != null ? 'percent' : undefined,
    },
    { label: 'Guidance', value: guidanceLabel },
    { label: 'Sentiment', value: analysis.sentimentScore, format: 'number' },
    { label: 'Uncertainty', value: analysis.uncertaintyScore, format: 'number' },
  ];

  const trendData = [...(history || [])].reverse().map((h) => ({
    period: h.period,
    sentiment: h.sentimentScore,
    qa: h.qaSentiment,
    uncertainty: h.uncertaintyScore,
    evasiveness: h.qaEvasivenessScore,
  }));

  const financialMetrics = analysis.financialMetrics || [];
  const speakers = analysis.speakerSentiments || [];
  const topics = analysis.topTopics || [];

  return (
    <section className="eca" aria-labelledby="eca-title">
      <header className="eca-head">
        <div className="eca-head-id">
          <span className="eca-icon" aria-hidden="true">
            <i className="bi bi-bar-chart-line" />
          </span>
          <div className="eca-head-text">
            <h3 id="eca-title" className="eca-title">
              Earnings Call Analyzer
            </h3>
            <p className="eca-desc">
              NLP-scored tone and directional signal · {symbol} · {current.period}
            </p>
          </div>
        </div>
        <div className="eca-head-actions">
          <SynthesisBadge synthesis={synthesis} />
          {onClose && (
            <button type="button" onClick={onClose} className="eca-btn">
              <i className="bi bi-x-lg" aria-hidden="true" /> Close
            </button>
          )}
        </div>
      </header>

      <ModelVariableStrip
        variables={variables.map((v) => ({ label: v.label, value: v.value, format: v.format }))}
        className="eca-strip"
      />

      <div className="eca-main">
        <div className="eca-chart-block">
          <h4 className="eca-block-title">Quarter-over-quarter trends</h4>
          {trendData.length === 0 ? (
            <p className="eca-none">No prior calls to compare yet.</p>
          ) : (
            <>
              <div className="eca-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid
                      vertical={false}
                      stroke={CHART.gridStroke}
                      strokeDasharray={CHART.gridDash}
                    />
                    <XAxis
                      dataKey="period"
                      tick={CHART.tick}
                      axisLine={CHART.xAxisLine}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={CHART.tick}
                      width={32}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ReferenceLine
                      y={50}
                      stroke="var(--text-muted)"
                      strokeOpacity={0.5}
                      strokeDasharray="3 3"
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    {SERIES.map((s) => (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.name}
                        stroke={s.stroke}
                        strokeWidth={s.width}
                        strokeDasharray={s.dash}
                        dot={{ r: 2, strokeWidth: 0, fill: s.stroke }}
                        animationDuration={CHART.animationDuration}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <ul className="eca-legend" aria-label="Chart legend">
                {SERIES.map((s) => (
                  <li key={s.key}>
                    <span
                      className={`eca-legend-swatch${s.dash ? ' is-dashed' : ''}`}
                      style={{ '--eca-swatch': s.stroke }}
                      aria-hidden="true"
                    />
                    {s.name}
                    {s.dash ? ' (dashed)' : ''}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <aside className="eca-signals" aria-label="Signal read">
          <p className="eca-strength">
            <span className="eca-strength-label">Signal strength</span>
            {synthesis.confidence === 'low'
              ? 'Low, few clear transcript or earnings cues; treat as weak context only.'
              : synthesis.confidence === 'moderate'
                ? 'Moderate, several cues align; still one input among many.'
                : 'Higher, multiple cues point the same way; still not deterministic.'}
          </p>
          <SignalList
            title="Positive signals"
            signals={synthesis.positiveSignals}
            icon="bi-check-circle"
            tone="pos"
          />
          <SignalList
            title="Negative signals"
            signals={synthesis.negativeSignals}
            icon="bi-exclamation-triangle"
            tone="neg"
          />
        </aside>
      </div>

      <div className="eca-detail-grid">
        <div className="eca-block">
          <h4 className="eca-block-title">
            <i className="bi bi-currency-dollar" aria-hidden="true" /> Financial metrics mentioned
          </h4>
          {financialMetrics.length === 0 ? (
            <p className="eca-none">No specific figures extracted from transcript</p>
          ) : (
            <dl className="eca-metrics">
              {financialMetrics.map((m, i) => (
                <div key={i} className="eca-metric-row">
                  <dt>{m.label}</dt>
                  <dd>{m.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="eca-block">
          <h4 className="eca-block-title">
            <i className="bi bi-person" aria-hidden="true" /> Executive tone
          </h4>
          {speakers.length === 0 ? (
            <p className="eca-none">No speaker labels detected in transcript</p>
          ) : (
            <ul className="eca-speakers">
              {speakers.map((s, i) => {
                const tone = s.sentiment >= 60 ? 'pos' : s.sentiment >= 45 ? 'mid' : 'neg';
                const barWidth = Math.max(8, Math.min(100, s.sentiment));
                return (
                  <li key={i} className="eca-speaker">
                    <span className="eca-speaker-name">{s.name}</span>
                    <span className="eca-speaker-role">{s.role}</span>
                    <span className="eca-bar" aria-hidden="true">
                      <span
                        className={`eca-bar-fill is-${tone}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </span>
                    <span className="eca-speaker-score">{s.sentiment}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {topics.length > 0 && (
        <div className="eca-topics">
          <h4 className="eca-block-title">Top topics on this call</h4>
          <ul className="eca-topic-list">
            {topics.map((t) => (
              <li key={t.topic} className="eca-topic">
                <span className="eca-topic-name">{t.topic}</span>
                <span className="eca-topic-count">{t.mentions}</span>
                {t.delta_vs_prior != null && (
                  <span
                    className={`eca-topic-delta${
                      t.delta_vs_prior > 0 ? ' is-pos' : t.delta_vs_prior < 0 ? ' is-neg' : ''
                    }`}
                  >
                    ({t.delta_vs_prior > 0 ? '+' : ''}
                    {t.delta_vs_prior} vs prior)
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="eca-method">
        <summary>
          <i className="bi bi-info-circle" aria-hidden="true" /> How this works
        </summary>
        <p>
          Sentiment scores come from the Loughran–McDonald financial dictionary over the full
          transcript, split into prepared remarks and Q&A. Executive tone is computed per-speaker.
          Financial metrics are extracted via pattern matching. The directional tilt combines tone
          trends, Q&A evasiveness, guidance direction, uncertainty language, and EPS consensus. This
          readout is one signal among many.
        </p>
      </details>
    </section>
  );
}

function SynthesisBadge({ synthesis }) {
  const cfg = {
    bullish: { icon: 'bi-graph-up-arrow', tone: 'pos', label: 'Bullish tilt' },
    bearish: { icon: 'bi-graph-down-arrow', tone: 'neg', label: 'Bearish tilt' },
    mixed: { icon: 'bi-dash-lg', tone: 'mid', label: 'Mixed signals' },
    neutral: { icon: 'bi-dash-lg', tone: 'flat', label: 'Neutral tilt' },
  }[synthesis.tilt] || { icon: 'bi-dash-lg', tone: 'flat', label: 'Neutral tilt' };
  return (
    <div className={`eca-badge is-${cfg.tone}`}>
      <i className={`bi ${cfg.icon}`} aria-hidden="true" />
      <span className="eca-badge-text">
        <span className="eca-badge-label">{cfg.label}</span>
        <span className="eca-badge-conf">{synthesis.confidence} confidence</span>
      </span>
    </div>
  );
}

function SignalList({ title, signals, icon, tone }) {
  return (
    <div className="eca-signal-list">
      <h5 className={`eca-signal-title is-${tone}`}>
        <i className={`bi ${icon}`} aria-hidden="true" /> {title}
      </h5>
      {signals.length === 0 ? (
        <p className="eca-none">None flagged</p>
      ) : (
        <ul>
          {signals.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EarningsLoading() {
  return (
    <section className="eca" aria-busy="true" aria-label="Loading earnings call analysis">
      <div className="eca-skel eca-skel--title" />
      <div className="eca-skel eca-skel--strip" />
      <div className="eca-skel eca-skel--chart" />
    </section>
  );
}

function EarningsEmpty({ symbol, onRetry, onClose }) {
  return (
    <section className="eca eca--state">
      {onClose && (
        <div className="eca-state-actions">
          <button type="button" onClick={onClose} className="eca-btn">
            Close
          </button>
        </div>
      )}
      <p className="eca-state-title">No earnings call analysis available for {symbol}</p>
      <p className="eca-state-text">
        Try a widely covered US listing such as AAPL, MSFT, NVDA, or TSLA.
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="eca-btn">
          <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Retry
        </button>
      )}
    </section>
  );
}

function EarningsError({ symbol, error, onRetry, onClose }) {
  const { status, message, detail } = error;
  return (
    <section
      className={`eca eca--state${status === 503 ? ' is-warn' : status >= 500 ? ' is-error' : ''}`}
      role={status >= 500 ? 'alert' : undefined}
    >
      {onClose && (
        <div className="eca-state-actions">
          <button type="button" onClick={onClose} className="eca-btn">
            Close
          </button>
        </div>
      )}
      <p className="eca-state-title">
        {status === 404
          ? 'No earnings transcripts available'
          : status === 503
            ? 'Transcript data unavailable'
            : 'Analysis failed'}
      </p>
      <p className="eca-state-text">{message}</p>
      {detail && <p className="eca-state-text eca-state-text--detail">{detail}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="eca-btn">
          <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Retry
        </button>
      )}
    </section>
  );
}

export default EarningsAnalysisCard;
