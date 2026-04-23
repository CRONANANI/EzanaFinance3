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
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  LineChart,
  ReferenceLine,
} from 'recharts';
import { ModelVariableStrip } from '@/components/research/models/ModelVariableStrip';

/**
 * NLP-scored earnings call analyzer (Loughran–McDonald lexicon + heuristics).
 * Framed as directional signal, not a forecast.
 *
 * @param {{ symbol: string; onClose?: () => void }} props
 */
export function EarningsAnalysisCard({ symbol, onClose }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!symbol) return;
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/earnings/analysis/${encodeURIComponent(symbol)}`, {
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }
      if (json.error) {
        throw new Error(json.error);
      }
      setData(json);
    } catch (e) {
      setError(e?.message || 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) return <EarningsLoading />;
  if (error || !data) {
    return <EarningsEmpty symbol={symbol} message={error} onRetry={load} />;
  }

  const { current, history, earningsHistory, synthesis } = data;

  const latestEarnings = earningsHistory?.[0];
  const surpriseDecimal =
    latestEarnings?.epsActual != null &&
    latestEarnings?.epsEstimated != null &&
    Math.abs(Number(latestEarnings.epsEstimated)) > 1e-9
      ? (latestEarnings.epsActual - latestEarnings.epsEstimated) /
        Math.abs(latestEarnings.epsEstimated)
      : null;

  const beats = (earningsHistory || [])
    .slice(0, 8)
    .reverse()
    .map((e) => ({
      period: e.date
        ? new Date(e.date).toLocaleDateString([], { month: 'short', year: '2-digit' })
        : '',
      actual: e.epsActual,
      estimate: e.epsEstimated,
      surprise:
        e.epsActual != null && e.epsEstimated != null && Math.abs(Number(e.epsEstimated)) > 1e-9
          ? ((e.epsActual - e.epsEstimated) / Math.abs(e.epsEstimated)) * 100
          : 0,
    }));

  const sentimentTrend = [...(history || [])].reverse().map((h) => ({
    period: h.period,
    overall: h.sentimentScore,
    qa: h.qaSentiment,
  }));

  const variables = [
    { label: 'Last EPS', value: latestEarnings?.epsActual ?? '—', format: 'currency' },
    { label: 'Consensus', value: latestEarnings?.epsEstimated ?? '—', format: 'currency' },
    {
      label: 'Surprise',
      value: surpriseDecimal != null ? surpriseDecimal : '—',
      format: surpriseDecimal != null ? 'percent' : undefined,
    },
    { label: 'Sentiment', value: current.analysis.sentimentScore, format: 'number' },
    { label: 'Q&A tone', value: current.analysis.qaSentiment, format: 'number' },
    { label: 'Uncertainty', value: current.analysis.uncertaintyScore, format: 'number' },
  ];

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
        variables={variables.map((v) => ({
          label: v.label,
          value: v.value,
          format: v.format,
        }))}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h4 className="text-xs font-semibold text-foreground">EPS — Actual vs. Consensus</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={beats} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <XAxis dataKey="period" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} width={36} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="actual" name="Actual EPS" fill="hsl(var(--primary))" />
                <Bar
                  dataKey="estimate"
                  name="Consensus"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.5}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Call tone — last 4 quarters</h4>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentTrend} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
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
                  dataKey="overall"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Overall"
                />
                <Line
                  type="monotone"
                  dataKey="qa"
                  stroke="hsl(45, 95%, 50%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Q&A only"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <h4 className="text-xs font-semibold text-foreground">Top topics on this call</h4>
        <div className="flex flex-wrap gap-2">
          {(current.analysis.topTopics || []).map((t) => (
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
          remarks and Q&A. The directional tilt combines tone vs. the prior quarter, Q&A evasiveness,
          uncertainty language, and whether EPS met consensus. Published research finds only a modest
          short-horizon directional edge (on the order of roughly 55–60% in some mid-cap samples over
          ~5–10 trading days)—a tilt or lean, not a forecast. This readout is one signal among many.
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
          {synthesis.confidence} signal confidence
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

function EarningsEmpty({ symbol, message, onRetry }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 text-center space-y-2">
      <p className="text-sm font-medium">No earnings call analysis available for {symbol}</p>
      <p className="text-xs text-muted-foreground">
        {message ||
          'Try a widely covered US listing. Transcripts come from Financial Modeling Prep; cache fills after the first successful load.'}
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

export default EarningsAnalysisCard;
