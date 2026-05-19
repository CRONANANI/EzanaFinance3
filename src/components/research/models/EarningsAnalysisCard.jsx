'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  Minus,
  User2,
  DollarSign,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  LineChart,
  ReferenceLine,
} from 'recharts';
import { ModelVariableStrip } from '@/components/research/models/ModelVariableStrip';

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
      reiterated: '— Reiterated',
      lowered: '▼ Lowered',
    }[analysis.guidanceDirection] || '—';

  const variables = [
    { label: 'Last EPS', value: latestEarnings?.epsActual ?? '—', format: 'currency' },
    { label: 'Consensus', value: latestEarnings?.epsEstimated ?? '—', format: 'currency' },
    {
      label: 'Surprise',
      value: surpriseDecimal != null ? surpriseDecimal : '—',
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

  return (
    <section className="rounded-xl border border-amber-500/40 bg-card p-5 space-y-4 ring-1 ring-amber-500/20">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Earnings Call Analyzer
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              NLP-scored tone and directional signal · {symbol} · {current.period}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SynthesisBadge synthesis={synthesis} />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted/60"
            >
              Close
            </button>
          )}
        </div>
      </header>

      <ModelVariableStrip
        variables={variables.map((v) => ({ label: v.label, value: v.value, format: v.format }))}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
            Financial Metrics Mentioned
          </h4>
          {(analysis.financialMetrics || []).length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No specific figures extracted from transcript
            </p>
          ) : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {(analysis.financialMetrics || []).map((m, i) => (
                <div
                  key={i}
                  className="flex items-baseline justify-between gap-2 text-xs border-b border-border/50 pb-1 last:border-0"
                >
                  <span className="text-muted-foreground shrink-0">{m.label}</span>
                  <span className="font-mono font-semibold text-foreground text-right">
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <User2 className="h-3.5 w-3.5 text-blue-500" />
            Executive Tone
          </h4>
          {(analysis.speakerSentiments || []).length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No speaker labels detected in transcript
            </p>
          ) : (
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {(analysis.speakerSentiments || []).map((s, i) => {
                const barColor =
                  s.sentiment >= 60
                    ? 'bg-emerald-500'
                    : s.sentiment >= 45
                      ? 'bg-amber-500'
                      : 'bg-red-500';
                const barWidth = Math.max(8, Math.min(100, s.sentiment));
                return (
                  <div key={i} className="space-y-0.5">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground truncate">{s.name}</span>
                      <span className="text-muted-foreground shrink-0 text-[10px]">{s.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                        {s.sentiment}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <h4 className="text-xs font-semibold text-foreground">Quarter-over-Quarter Trends</h4>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <XAxis dataKey="period" tick={{ fontSize: 9 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} width={36} />
              <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="sentiment"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 2, strokeWidth: 0 }}
                name="Sentiment"
              />
              <Line
                type="monotone"
                dataKey="qa"
                stroke="hsl(45, 95%, 50%)"
                strokeWidth={2}
                dot={{ r: 2, strokeWidth: 0 }}
                name="Q&A Tone"
              />
              <Line
                type="monotone"
                dataKey="uncertainty"
                stroke="hsl(0, 80%, 55%)"
                strokeWidth={1.5}
                dot={{ r: 2, strokeWidth: 0 }}
                name="Uncertainty"
                strokeDasharray="4 3"
              />
              <Line
                type="monotone"
                dataKey="evasiveness"
                stroke="hsl(270, 60%, 55%)"
                strokeWidth={1.5}
                dot={{ r: 2, strokeWidth: 0 }}
                name="Evasiveness"
                strokeDasharray="4 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 rounded" style={{ background: 'hsl(var(--primary))' }} />{' '}
            Sentiment
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 rounded" style={{ background: 'hsl(45, 95%, 50%)' }} /> Q&A
            Tone
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-0.5 rounded border-t border-dashed"
              style={{ borderColor: 'hsl(0, 80%, 55%)' }}
            />{' '}
            Uncertainty
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-0.5 rounded border-t border-dashed"
              style={{ borderColor: 'hsl(270, 60%, 55%)' }}
            />{' '}
            Evasiveness
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <h4 className="text-xs font-semibold text-foreground">Top topics on this call</h4>
        <div className="flex flex-wrap gap-2">
          {(analysis.topTopics || []).map((t) => (
            <span
              key={t.topic}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs"
            >
              <span className="font-medium capitalize">{t.topic}</span>
              <span className="text-muted-foreground tabular-nums">{t.mentions}</span>
              {t.delta_vs_prior != null && (
                <span
                  className={`tabular-nums text-[10px] ${
                    t.delta_vs_prior > 0
                      ? 'text-green-600 dark:text-green-400'
                      : t.delta_vs_prior < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-muted-foreground'
                  }`}
                >
                  ({t.delta_vs_prior > 0 ? '+' : ''}
                  {t.delta_vs_prior} vs prior)
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
        <span className="font-medium text-amber-800 dark:text-amber-200">Signal strength: </span>
        {synthesis.confidence === 'low'
          ? 'Low — few clear transcript or earnings cues; treat as weak context only.'
          : synthesis.confidence === 'moderate'
            ? 'Moderate — several cues align; still one input among many.'
            : 'Higher — multiple cues point the same way; still not deterministic.'}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SignalList
          title="Positive signals"
          signals={synthesis.positiveSignals}
          icon={CheckCircle2}
          color="text-green-600 dark:text-green-400"
        />
        <SignalList
          title="Negative signals"
          signals={synthesis.negativeSignals}
          icon={AlertTriangle}
          color="text-red-600 dark:text-red-400"
        />
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-3 flex gap-2 text-[11px] text-muted-foreground leading-relaxed">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <div>
          <strong className="text-foreground">How this works:</strong> Sentiment scores come from
          the Loughran–McDonald financial dictionary over the full transcript, split into prepared
          remarks and Q&A. Executive tone is computed per-speaker. Financial metrics are extracted
          via pattern matching. The directional tilt combines tone trends, Q&A evasiveness, guidance
          direction, uncertainty language, and EPS consensus. This readout is one signal among many.
        </div>
      </div>
    </section>
  );
}

function SynthesisBadge({ synthesis }) {
  const tiltConfig = {
    bullish: {
      icon: TrendingUp,
      bg: 'bg-green-500/15',
      text: 'text-green-700 dark:text-green-400',
      label: 'Bullish tilt',
    },
    bearish: {
      icon: TrendingDown,
      bg: 'bg-red-500/15',
      text: 'text-red-700 dark:text-red-400',
      label: 'Bearish tilt',
    },
    mixed: {
      icon: Minus,
      bg: 'bg-amber-500/15',
      text: 'text-amber-700 dark:text-amber-400',
      label: 'Mixed signals',
    },
    neutral: {
      icon: Minus,
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      label: 'Neutral tilt',
    },
  }[synthesis.tilt];
  const Icon = tiltConfig.icon;
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${tiltConfig.bg}`}>
      <Icon className={`h-4 w-4 ${tiltConfig.text}`} />
      <div className="text-right">
        <div className={`text-xs font-semibold ${tiltConfig.text}`}>{tiltConfig.label}</div>
        <div className="text-[10px] text-muted-foreground capitalize">
          {synthesis.confidence} confidence
        </div>
      </div>
    </div>
  );
}

function SignalList({ title, signals, icon: Icon, color }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        {title}
      </div>
      {signals.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">None flagged</p>
      ) : (
        <ul className="space-y-1">
          {signals.map((s, i) => (
            <li key={i} className="text-xs text-foreground leading-relaxed">
              · {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EarningsLoading() {
  return (
    <section className="rounded-xl border border-amber-500/40 bg-card p-5 space-y-4">
      <div className="h-8 w-48 rounded bg-muted/40 animate-pulse" />
      <div className="h-20 rounded bg-muted/40 animate-pulse" />
      <div className="h-44 rounded bg-muted/40 animate-pulse" />
    </section>
  );
}

function EarningsEmpty({ symbol, onRetry, onClose }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 text-center space-y-2">
      <div className="flex justify-end gap-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-muted/50"
          >
            Close
          </button>
        )}
      </div>
      <p className="text-sm font-medium">No earnings call analysis available for {symbol}</p>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">
        Try a widely covered US listing such as AAPL, MSFT, NVDA, or TSLA.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
        >
          Retry
        </button>
      )}
    </section>
  );
}

function EarningsError({ symbol, error, onRetry, onClose }) {
  const { status, message, detail } = error;
  return (
    <section
      className={`rounded-xl border ${status === 503 ? 'border-amber-500/40 bg-amber-500/5' : status === 404 ? 'border-border bg-card' : 'border-destructive/30 bg-card'} p-5 text-center space-y-2`}
    >
      <div className="flex justify-end gap-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-muted/50"
          >
            Close
          </button>
        )}
      </div>
      <p
        className={`text-sm font-medium ${status >= 500 ? 'text-destructive' : 'text-foreground'}`}
      >
        {status === 404
          ? 'No earnings transcripts available'
          : status === 503
            ? 'Transcript data unavailable'
            : 'Analysis failed'}
      </p>
      <p className="text-xs text-muted-foreground max-w-lg mx-auto">{message}</p>
      {detail && <p className="text-[11px] text-muted-foreground max-w-lg mx-auto">{detail}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
        >
          Retry
        </button>
      )}
    </section>
  );
}

export default EarningsAnalysisCard;
