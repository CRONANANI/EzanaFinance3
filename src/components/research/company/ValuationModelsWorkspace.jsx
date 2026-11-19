'use client';

/**
 * Valuation Models tab (Nov 19th, 2026): one workspace for the five models
 * that used to be spread over the Models, Valuation, Earnings and Peers tabs.
 * Each model keeps its existing engine; this file adds the shared frame
 * (what the model is, how it works, where its data comes from, and what kind
 * of output it gives) and the sub-navigation. The selected model is mirrored
 * to ?tool= by the page, and old ids (valuation, earnings, peers) map here.
 */
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ToolPicker } from './ToolPicker';
import { DcfWorkbench } from './DcfWorkbench';
import { AIAnalysisPanel } from '@/components/research/AIAnalysisPanel';
import { ValuationMethodSelector } from '@/components/research/models/ValuationMethodSelector';
import { TOOL_LABELS } from '@/lib/research/company-research';

/* Recharts and the statement engine load only when the model opens. */
const ThreeStatementWorkspace = dynamic(
  () => import('./ThreeStatementWorkspace').then((m) => ({ default: m.ThreeStatementWorkspace })),
  { ssr: false, loading: () => <div className="rc-skel rc-skel--chart" aria-hidden="true" /> },
);

const META = {
  dcf: {
    kind: 'Priced valuation',
    purpose: 'Estimates a value per share from the cash the business is forecast to generate.',
    method:
      'Five-year unlevered free cash flow forecast from editable drivers, discounted at the weighted average cost of capital, plus a Gordon-growth terminal value; equity value = enterprise value minus net debt, divided by diluted shares. The reverse DCF solves for the revenue growth the current price implies.',
    source: 'Financial Modeling Prep custom DCF engine, live quote.',
  },
  threestatement: {
    kind: 'Forecast, not a valuation',
    purpose: 'Rolls the income statement, balance sheet and cash flow forward together.',
    method:
      'Driver-based five-year forecast from the last reported fiscal year. Net income flows to equity, cash moves by free cash flow, PP&E by capex less D&A, and the balance check compares assets with liabilities plus equity every year.',
    source: 'Annual reported statements (Financial Modeling Prep), your drivers.',
  },
  comps: {
    kind: 'Relative valuation',
    purpose: 'Prices the company against similar listed companies.',
    method:
      'Trailing multiples (P/E, EV/EBITDA, EV/Revenue, P/B) for the peer set; implied prices apply peer-median multiples to the company’s own trailing figures. Negative or zero denominators are excluded.',
    source:
      'Peer set from FMP stock peers and Ezana’s curated map; multiples from FMP, Finnhub and Alpha Vantage.',
  },
  grpv: {
    kind: 'AI research report (scoring heuristic)',
    purpose: 'Scores Growth, Risk, Price and Value on Ezana’s official GRPV scale.',
    method:
      'Official scale: an overall score out of 72, 18 points per pillar. The report is written by an AI model from the market data supplied with the request; treat its scores as a structured opinion, not a priced valuation.',
    source: 'FMP quote, profile, ratios, statements and estimates sent to the model.',
  },
  earnings: {
    kind: 'NLP analysis of earnings calls',
    purpose: 'Reads the tone and signals of recent earnings calls next to reported results.',
    method:
      'Loughran-McDonald financial dictionary scoring over call transcripts, speaker by speaker, with EPS actual versus consensus from reported results. Tone scores describe language, not financial performance.',
    source: 'Earnings call transcripts and earnings surprises (Financial Modeling Prep).',
  },
};

function ModelFrame({ id, symbol, children, extra }) {
  const m = META[id];
  const [open, setOpen] = useState(false);
  return (
    <section className="ux-modelframe" aria-labelledby={`ux-mf-${id}`}>
      <header className="ux-modelframe__head">
        <div>
          <h3 id={`ux-mf-${id}`} className="ux-modelframe__title">
            {TOOL_LABELS[id]} <span className="ux-muted">· {symbol}</span>
          </h3>
          <p className="ux-modelframe__purpose">{m.purpose}</p>
        </div>
        <div className="ux-modelframe__tags">
          <span className="ux-tag">{m.kind}</span>
          <button
            type="button"
            className="ux-text-btn"
            aria-expanded={open}
            aria-controls={`ux-mf-${id}-method`}
            onClick={() => setOpen((v) => !v)}
          >
            <i className="bi bi-info-circle" aria-hidden="true" /> How it works
          </button>
          {extra}
        </div>
      </header>
      {open ? (
        <div id={`ux-mf-${id}-method`} className="ux-modelframe__method">
          <p>{m.method}</p>
          <p className="ux-muted">Data: {m.source}</p>
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function ValuationModelsWorkspace({
  symbol,
  research,
  tool,
  onSelectTool,
  onOpenModel,
  showTips,
  guide = false,
}) {
  const [showGuide, setShowGuide] = useState(guide);
  const [aiFor3s, setAiFor3s] = useState(false);

  let body = null;
  if (tool === 'dcf') {
    body = <DcfWorkbench symbol={symbol} price={research.quote.price} peers={research.peers} />;
  } else if (tool === 'threestatement') {
    body = (
      <>
        <ThreeStatementWorkspace
          key={symbol}
          symbol={symbol}
          onAiCommentary={() => setAiFor3s(true)}
        />
        {aiFor3s ? (
          <div className="ux-ai-commentary">
            <h4 className="ux-kicker">AI commentary (separate from the model above)</h4>
            <AIAnalysisPanel
              key={`3s-ai-${symbol}`}
              modelId="threestatement"
              symbol={symbol}
              onClose={() => setAiFor3s(false)}
              onOpenModel={onOpenModel}
              showTips={showTips}
            />
          </div>
        ) : null}
      </>
    );
  } else {
    body = (
      <AIAnalysisPanel
        key={`${tool}-${symbol}`}
        modelId={tool}
        symbol={symbol}
        onClose={() => onSelectTool('dcf')}
        onOpenModel={onOpenModel}
        showTips={showTips}
      />
    );
  }

  return (
    <div className="rc-tool-section ux-models-ws">
      <div className="ux-models-ws__nav">
        <ToolPicker section="models" tool={tool} onSelect={onSelectTool} />
        <button
          type="button"
          className="ux-text-btn"
          aria-expanded={showGuide}
          onClick={() => setShowGuide((v) => !v)}
        >
          <i className="bi bi-signpost-split" aria-hidden="true" /> Which model fits?
        </button>
      </div>
      {showGuide ? (
        <div className="ux-guide">
          <ValuationMethodSelector
            symbol={symbol}
            onClose={() => setShowGuide(false)}
            onOpenModel={(id) => {
              setShowGuide(false);
              onOpenModel(id);
            }}
          />
        </div>
      ) : null}
      <ModelFrame id={tool} symbol={symbol}>
        {body}
      </ModelFrame>
    </div>
  );
}

export default ValuationModelsWorkspace;
