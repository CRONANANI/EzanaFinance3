'use client';

/* eslint-disable react-hooks/rules-of-hooks --
 * Known pre-existing violation: the `modelId === 'dcf'` and
 * `modelId === 'earnings'` early returns sit above the hook calls (useState,
 * useRef, useCallback, useEffect, useMemo), so React's hook order shifts when
 * the user switches modelId between a special case and the generic path.
 *
 * Correct fix is to split this into a dispatcher + a generic-panel child so
 * hooks always run unconditionally. Tracked in docs/REFACTOR_ROADMAP.md
 * Phase 8 (page decomposition will split the AI analysis surfaces anyway).
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { getModelConfig } from '@/lib/ai/analysis-prompts';
import { getModelStripVariables } from '@/lib/research/modelStripVariables';
import { ModelVariableStrip } from '@/components/research/models/ModelVariableStrip';

/* EarningsAnalysisCard pulls in Recharts and only renders when the user opens
   the "earnings" model (modelId === 'earnings'), so defer it to keep Recharts
   out of this panel's initial bundle. Named export; reserved height ≈ card. */
const EarningsAnalysisCard = dynamic(
  () =>
    import('@/components/research/models/EarningsAnalysisCard').then((m) => ({
      default: m.EarningsAnalysisCard,
    })),
  { ssr: false, loading: () => <div aria-hidden style={{ minHeight: 480, width: '100%' }} /> },
);
import { CompsAnalysisCard } from '@/components/research/models/CompsAnalysisCard';
import DCFInteractiveModel from './dcf/DCFInteractiveModel';
import { incrementAnalysesRun } from '@/lib/beginner-profile';
import { useChecklist } from '@/hooks/useChecklist';

const SIMPLE_EXPLAIN_KEY = 'ezana_simple_explain';

function EarningsAnalysisPanel({ symbol, onClose }) {
  const panelRef = useRef(null);
  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [symbol]);
  return (
    <div ref={panelRef} className="ai-analysis-panel">
      <EarningsAnalysisCard symbol={symbol} onClose={onClose} />
    </div>
  );
}

/**
 * AIAnalysisPanel — Full-width expandable panel for AI stock analysis
 * Opens below the carousel when a model card is clicked.
 * Calls /api/ai-stock-analysis with the selected model and ticker.
 */
export function AIAnalysisPanel({ modelId, symbol, onClose, showTips = false }) {
  if (modelId === 'dcf') {
    return <DCFInteractiveModel symbol={symbol} onClose={onClose} />;
  }

  if (modelId === 'earnings') {
    return <EarningsAnalysisPanel symbol={symbol} onClose={onClose} />;
  }

  if (modelId === 'comps') {
    return (
      <div className="ai-analysis-panel">
        <CompsAnalysisCard symbol={symbol} onClose={onClose} />
      </div>
    );
  }

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [simpleExplain, setSimpleExplain] = useState(false);
  const panelRef = useRef(null);
  const { completeTask } = useChecklist();

  const modelConfig = getModelConfig(modelId);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(SIMPLE_EXPLAIN_KEY);
    if (stored === 'true' || stored === 'false') {
      setSimpleExplain(stored === 'true');
    } else {
      setSimpleExplain(!!showTips);
    }
  }, [showTips]);

  const toggleSimpleExplain = () => {
    setSimpleExplain((v) => {
      const next = !v;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SIMPLE_EXPLAIN_KEY, String(next));
      }
      return next;
    });
  };

  const runAnalysis = useCallback(async () => {
    if (!symbol || !modelId) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch('/api/ai-stock-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: symbol, model: modelId, simpleExplain }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Analysis failed (${res.status})`);
      }

      const data = await res.json();
      setAnalysis(data);
      void incrementAnalysesRun();
      completeTask('action_1');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [symbol, modelId, simpleExplain, completeTask]);

  useEffect(() => {
    if (symbol && modelId) {
      runAnalysis();
    }
  }, [symbol, modelId, runAnalysis, simpleExplain]);

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [modelId]);

  const stripVariables = useMemo(
    () => getModelStripVariables(modelId, { analysis }),
    [modelId, analysis],
  );

  if (!modelConfig) return null;

  return (
    <div ref={panelRef} className="ai-analysis-panel">
      <div className="component-card ai-analysis-card">
        {/* Header */}
        <div className="card-header ai-analysis-header">
          <div className="ai-analysis-header-left">
            <div
              className="ai-analysis-model-icon"
              style={{ background: `${modelConfig.color}20`, color: modelConfig.color }}
            >
              <i className={`bi ${modelConfig.icon}`} />
            </div>
            <div>
              <h3 className="ai-analysis-title">{modelConfig.name}</h3>
              <span className="ai-analysis-subtitle">
                {modelConfig.subtitle} · {symbol}
              </span>
            </div>
          </div>
          <div className="ai-analysis-header-right">
            <button
              type="button"
              className={`ai-analysis-rerun ${simpleExplain ? 'is-active' : ''}`}
              onClick={toggleSimpleExplain}
              title="Explain results in plain language"
              style={
                simpleExplain
                  ? { borderColor: 'rgba(16,185,129,0.5)', color: 'var(--emerald, #10b981)' }
                  : undefined
              }
            >
              <i className="bi bi-chat-left-text" /> Explain simply
            </button>
            {analysis?.marketData && (
              <div className="ai-analysis-price-badge">
                <span className="ai-price">${analysis.marketData.price?.toLocaleString()}</span>
                <span
                  className={`ai-change ${analysis.marketData.changesPercentage >= 0 ? 'positive' : 'negative'}`}
                >
                  {analysis.marketData.changesPercentage >= 0 ? '+' : ''}
                  {analysis.marketData.changesPercentage?.toFixed(2)}%
                </span>
              </div>
            )}
            <button
              className="ai-analysis-rerun"
              onClick={runAnalysis}
              disabled={loading}
              title="Re-run analysis"
              type="button"
            >
              <i className={`bi bi-arrow-clockwise ${loading ? 'ai-spin' : ''}`} />
            </button>
            <button className="card-action-btn" onClick={onClose} type="button">
              <i className="bi bi-x-lg" /> Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="card-body ai-analysis-body">
          <ModelVariableStrip variables={stripVariables} className="ai-model-variable-strip mb-0" />
          {/* Loading State */}
          {loading && (
            <div className="ai-analysis-loading">
              <div className="ai-loading-visual">
                <div className="ai-loading-rings">
                  <div
                    className="ai-ring ai-ring-1"
                    style={{ borderColor: `${modelConfig.color}40` }}
                  />
                  <div
                    className="ai-ring ai-ring-2"
                    style={{ borderColor: `${modelConfig.color}25` }}
                  />
                  <div
                    className="ai-ring ai-ring-3"
                    style={{ borderColor: `${modelConfig.color}15` }}
                  />
                  <div className="ai-loading-icon" style={{ color: modelConfig.color }}>
                    <i className={`bi ${modelConfig.icon}`} />
                  </div>
                </div>
              </div>
              <div className="ai-loading-text">
                <span className="ai-loading-title">Running {modelConfig.name}</span>
                <span className="ai-loading-desc">
                  Analyzing {symbol} with {modelConfig.subtitle.toLowerCase()} methodology...
                </span>
              </div>
              <div className="ai-loading-skeleton">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="ai-skeleton-line"
                    style={{
                      width: `${60 + Math.random() * 40}%`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="ai-analysis-error">
              <i className="bi bi-exclamation-triangle" />
              <p>{error}</p>
              <button onClick={runAnalysis} type="button" className="ai-retry-btn">
                <i className="bi bi-arrow-clockwise" /> Retry Analysis
              </button>
            </div>
          )}

          {/* No Stock Selected */}
          {!symbol && !loading && !error && (
            <div className="ai-analysis-empty">
              <i className="bi bi-search" />
              <p>Select a stock from the heatmap or search bar above to run {modelConfig.name}.</p>
            </div>
          )}

          {/* Analysis Result */}
          {analysis && !loading && (
            <div className="ai-analysis-result">
              <div className="ai-analysis-meta-bar">
                <span className="ai-meta-item">
                  <i className="bi bi-clock" /> Generated{' '}
                  {new Date(analysis.generatedAt).toLocaleTimeString()}
                </span>
                <span className="ai-meta-item">
                  <i className="bi bi-cpu" /> Claude Sonnet 4
                </span>
                <span className="ai-meta-item">
                  <i className="bi bi-diagram-3" /> {analysis.modelName}
                </span>
              </div>
              <div className="ai-analysis-content">
                <AnalysisRenderer text={analysis.analysis} color={modelConfig.color} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Renders AI analysis text with basic formatting:
 * - ## headers → styled h2
 * - **bold** → <strong>
 * - | table | rows | → table elements
 * - Bullet points
 * - Numbered lists
 */
function AnalysisRenderer({ text, color }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let inTable = false;
  let tableRows = [];
  let tableHeaders = [];

  const flushTable = () => {
    if (tableHeaders.length > 0 || tableRows.length > 0) {
      elements.push(
        <div key={`table-${elements.length}`} className="ai-table-wrap">
          <table className="ai-analysis-table">
            {tableHeaders.length > 0 && (
              <thead>
                <tr>
                  {tableHeaders.map((h, i) => (
                    <th key={i}>{h.trim()}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{formatInlineText(cell.trim())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      if (inTable) flushTable();
      continue;
    }

    // Table row detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      // Separator row (|---|---|)
      if (cells.every((c) => /^[-:]+$/.test(c))) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    }

    if (inTable) flushTable();

    // H1 heading
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="ai-h1" style={{ color }}>
          {formatInlineText(trimmed.slice(2))}
        </h2>,
      );
      continue;
    }

    // H2 heading
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="ai-h2" style={{ color }}>
          {formatInlineText(trimmed.slice(3))}
        </h3>,
      );
      continue;
    }

    // H3 heading
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={i} className="ai-h3">
          {formatInlineText(trimmed.slice(4))}
        </h4>,
      );
      continue;
    }

    // Bullet point
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={i} className="ai-bullet">
          <span className="ai-bullet-dot" style={{ background: color }} />
          <span>{formatInlineText(trimmed.slice(2))}</span>
        </div>,
      );
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      elements.push(
        <div key={i} className="ai-numbered">
          <span className="ai-num" style={{ color }}>
            {numMatch[1]}.
          </span>
          <span>{formatInlineText(numMatch[2])}</span>
        </div>,
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="ai-paragraph">
        {formatInlineText(trimmed)}
      </p>,
    );
  }

  if (inTable) flushTable();

  return <>{elements}</>;
}

/** Format **bold** and `code` inline */
function formatInlineText(text) {
  if (!text) return text;

  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(remaining.slice(0, boldMatch.index));
      }
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Code
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) {
        parts.push(remaining.slice(0, codeMatch.index));
      }
      parts.push(
        <code key={key++} className="ai-inline-code">
          {codeMatch[1]}
        </code>,
      );
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }

    parts.push(remaining);
    break;
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

export default AIAnalysisPanel;
