'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import './centaur-intelligence.css';
import '../empire-ranking/empire-ranking.css';
import { CentaurPromptBox } from '@/components/ui/chatgpt-prompt-input';
import dynamicImport from 'next/dynamic';

/* SentinelReportModal is a modal + Recharts-heavy dialog that never renders
   before the user clicks a sentinel. Ship it in its own chunk so it doesn't
   sit in the initial bundle of /centaur-intelligence (previously ~298 kB
   First Load). */
const SentinelReportModal = dynamicImport(
  () => import('@/components/centaur/SentinelReportModal').then((m) => ({ default: m.SentinelReportModal })),
  { ssr: false, loading: () => null }
);

const TooltipProvider = TooltipPrimitive.Provider;

const LEGENDARY_INVESTORS = [
  {
    id: 'warren-buffett',
    name: 'Warren Buffett',
    botName: 'BuffettBot',
    style: 'value investing',
    disclaimer:
      'This tool is inspired by the publicly available writings, interviews, and shareholder letters of Warren Buffett. It is not affiliated with, endorsed by, or representative of Warren Buffett or Berkshire Hathaway, Inc.',
  },
  {
    id: 'ray-dalio',
    name: 'Ray Dalio',
    botName: 'DalioMind',
    style: 'macro analysis',
    disclaimer:
      'This tool is inspired by the publicly available writings and interviews of Ray Dalio, including Principles and The Changing World Order. It is not affiliated with, endorsed by, or representative of Ray Dalio or Bridgewater Associates.',
  },
  {
    id: 'cathie-wood',
    name: 'Cathie Wood',
    botName: 'ArkOracle',
    style: 'growth outlook',
    disclaimer:
      'This tool is inspired by the publicly available research, interviews, and investment commentary of Cathie Wood. It is not affiliated with, endorsed by, or representative of Cathie Wood or ARK Investment Management LLC.',
  },
  {
    id: 'paul-tudor-jones',
    name: 'Paul Tudor Jones',
    botName: 'TudorSignal',
    style: 'macro trading',
    disclaimer:
      'This tool is inspired by the publicly available interviews and market commentary of Paul Tudor Jones. It is not affiliated with, endorsed by, or representative of Paul Tudor Jones or Tudor Investment Corp.',
  },
];

const RAY_DALIO_SUGGESTED_PROMPTS = [
  'Where are we in the big cycle?',
  'Is the dollar losing reserve status?',
  'How does the US-China rivalry end?',
  'What happens when debt hits 0% interest rates?',
  'What should I own in a currency devaluation?',
  'How did the Dutch Empire fall?',
];

const YOHANNES_WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "Welcome back! I'm Yohannes, your AI investment advisor. I've been reviewing your portfolio and the latest market events. How can I help you today?",
};

function reportForWeekIndex(reports, weekIndex) {
  if (!reports?.length) return null;
  return reports[weekIndex] || null;
}

export default function CentaurIntelligencePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  /** UI only — includes welcome/greeting; never sent to the API as-is */
  const [displayMessages, setDisplayMessages] = useState([YOHANNES_WELCOME_MESSAGE]);
  /** Conversation history for /api/centaur/chat — no welcome-only assistant lines */
  const [apiMessages, setApiMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [boardroomMode, setBoardroomMode] = useState(null);
  const [activeDisclaimer, setActiveDisclaimer] = useState(null);
  const [promptValue, setPromptValue] = useState('');
  const [sentinelReport, setSentinelReport] = useState(null);
  const [sentinelReports, setSentinelReports] = useState([]);
  const [debriefItems, setDebriefItems] = useState([]);
  const [selectedReportWeek, setSelectedReportWeek] = useState(0);
  const [sentinelModalOpen, setSentinelModalOpen] = useState(false);
  const [modalReport, setModalReport] = useState(null);
  const messagesEndRef = useRef(null);

  const activeInvestor = useMemo(
    () => LEGENDARY_INVESTORS.find((inv) => inv.botName === boardroomMode) ?? null,
    [boardroomMode],
  );

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) {
          router.push('/sign-in');
          return;
        }
        setUser(authUser);
      } catch (error) {
        console.error('User fetch error:', error);
        router.push('/sign-in');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [supabase, router]);

  useEffect(() => {
    if (user) {
      fetchSentinelReport();
      fetchDebriefItems();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  const fetchSentinelReport = async () => {
    try {
      const res = await fetch('/api/centaur/sentinel?limit=12');
      if (!res.ok) return;
      const data = await res.json();
      setSentinelReport(data.report);
      setSentinelReports(Array.isArray(data.reports) ? data.reports : data.report ? [data.report] : []);
    } catch (error) {
      console.error('Failed to fetch sentinel report:', error);
    }
  };

  const fetchDebriefItems = async () => {
    try {
      const res = await fetch('/api/debrief-items');
      if (!res.ok) return;
      const { items } = await res.json();
      setDebriefItems(items || []);
    } catch (error) {
      console.error('Failed to fetch debrief items:', error);
    }
  };

  const openSentinelModal = (report) => {
    setModalReport(report);
    setSentinelModalOpen(true);
  };

  const sendMessage = async (payload) => {
    const text = typeof payload === 'string' ? payload : payload?.text;
    if (!text?.trim() || chatLoading) return;

    const userMsg = { role: 'user', content: text.trim() };
    const newApiMessages = [...apiMessages, userMsg];

    setDisplayMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
    setPromptValue('');

    try {
      const res = await fetch('/api/centaur/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newApiMessages,
          investor: activeInvestor?.name ?? null,
          persona: activeInvestor?.name || 'yohannes',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error('Chat API error:', res.status, data);
        setDisplayMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply || `Error ${res.status}: please try again.`,
          },
        ]);
        return;
      }

      const assistantMsg = {
        role: 'assistant',
        content: data.reply || 'No response received.',
      };
      setDisplayMessages((prev) => [...prev, assistantMsg]);
      setApiMessages([...newApiMessages, assistantMsg]);
    } catch (err) {
      console.error('Chat fetch error:', err);
      setDisplayMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please check your internet and try again.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const startBoardroom = (investor) => {
    setBoardroomMode(investor.botName);
    setActiveDisclaimer(investor.disclaimer);
    setPromptValue('');
    setApiMessages([]);
    const welcome =
      investor.id === 'ray-dalio'
        ? `Welcome to the boardroom. I'm DalioMind — drawing on the principles and macro frameworks from Ray Dalio's work. I want to think through long cycles, money and credit dynamics, and how empires rise and decline. I've reviewed your portfolio context. What would you like to explore?`
        : investor.id === 'warren-buffett'
          ? `Welcome to the boardroom. I'm BuffettBot — channeling the value investing philosophy found throughout Warren Buffett's shareholder letters and interviews. I've reviewed your portfolio. What would you like to analyse together?`
          : investor.id === 'cathie-wood'
            ? `Welcome to the boardroom. I'm ArkOracle — built on the disruptive innovation framework Cathie Wood is known for. I've reviewed your portfolio. Which emerging themes or positions would you like to discuss?`
            : `Welcome to the boardroom. I'm TudorSignal — inspired by Paul Tudor Jones's macro trading discipline. I've reviewed your portfolio. What market dynamics or positions would you like to work through?`;
    setDisplayMessages([
      {
        role: 'assistant',
        content: welcome,
      },
    ]);
  };

  const exitBoardroom = () => {
    setBoardroomMode(null);
    setActiveDisclaimer(null);
    setPromptValue('');
    setApiMessages([]);
    setDisplayMessages([
      {
        role: 'assistant',
        content: "I'm back as Yohannes. What else can I help you with?",
      },
    ]);
  };

  const showDalioBanner =
    boardroomMode === 'DalioMind' && displayMessages.filter((m) => m.role === 'user').length === 0;

  if (loading) {
    return (
      <div className="dashboard-page-inset er-page ci-page" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        <i className="bi bi-hourglass" style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }} />
        Loading Centaur Intelligence...
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="dashboard-page-inset er-page ci-page">
        <div className="er-hero ci-hero-centered ci-hero-wrap">
          <div className="er-hero-left">
            <Link href="/home" className="er-back-link">
              <i className="bi bi-chevron-left" /> Back to Home
            </Link>
            <div className="er-hero-title-row">
              <div className="er-hero-icon">
                <i className="bi bi-lightning-charge-fill" />
              </div>
              <div className="ci-hero-title-block">
                <h1>Centaur Intelligence</h1>
                <p className="er-hero-sub">Your AI-powered investment command center</p>
              </div>
            </div>
          </div>
          <div className="er-hero-badge">COMMAND CENTER</div>
        </div>

        <div className="er-card sentinel-card">
          <div className="er-card-header">
            <div className="er-card-header-left">
              <i className="bi bi-journal-text" aria-hidden />
              <div>
                <h3>Sentinel Weekly Report</h3>
                <p className="er-card-subtitle">Portfolio health & weekly briefing</p>
              </div>
            </div>
            {sentinelReport && (
              <div className="er-card-actions">
                <button type="button" onClick={() => openSentinelModal(sentinelReport)} className="er-pill-toggle er-pill-toggle--active">
                  View Latest
                </button>
              </div>
            )}
          </div>
          <div className="er-card-body">
            <p style={{ color: '#d4af37', fontWeight: 600, marginBottom: '0.5rem' }}>Portfolio Status: STRONG</p>
            <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              Your portfolio health is strong. Review the full report for highlights and actions.
            </p>
            <div className="er-pill-toggle-group">
              {Array.from({ length: 5 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i * 7);
                const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                const day = d.getDate();
                const rep = reportForWeekIndex(sentinelReports, i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelectedReportWeek(i);
                      const r = rep || sentinelReport;
                      if (r) openSentinelModal(r);
                    }}
                    className={`er-pill-toggle ci-sentinel-date-btn${selectedReportWeek === i ? ' er-pill-toggle--active' : ''}`}
                  >
                    <span className="ci-sentinel-date-month">{month}</span>
                    <span className="ci-sentinel-date-day">{day}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="centaur-grid">
          <div className="er-card chat-card">
            <div className="er-card-header">
              <div className="er-card-header-left" style={{ flexWrap: 'wrap', rowGap: '0.5rem' }}>
                <i className="bi bi-chat-dots" aria-hidden />
                <div>
                  <h3>Chat with {boardroomMode || 'Yohannes'}</h3>
                  <p className="er-card-subtitle">{boardroomMode ? 'Boardroom meeting mode' : 'Default advisor'}</p>
                </div>
              </div>
              <div className="er-card-actions">
                <button
                  type="button"
                  onClick={() => boardroomMode && exitBoardroom()}
                  className={`er-pill-toggle${!boardroomMode ? ' er-pill-toggle--active' : ''}`}
                >
                  Yohannes
                </button>
                {LEGENDARY_INVESTORS.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => startBoardroom(inv)}
                    className={`er-pill-toggle${boardroomMode === inv.botName ? ' er-pill-toggle--active' : ''}`}
                  >
                    {inv.botName}
                  </button>
                ))}
              </div>
            </div>
            <div className="chat-messages">
              {showDalioBanner && (
                <div className="er-card ci-dalio-banner">
                  <div className="er-card-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div className="ci-dalio-avatar">RD</div>
                      <div>
                        <h3 className="ci-dalio-name">DalioMind</h3>
                        <p className="er-card-subtitle" style={{ margin: '2px 0 0' }}>
                          Founder, Bridgewater Associates · Author, <em>The Changing World Order</em>
                        </p>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.82rem', lineHeight: 1.5, margin: '0 0 0.75rem' }}>
                      Ask me about macro cycles, empire rises and declines, money and debt dynamics, the US–China transition, reserve currency history,
                      or how to think about investing through major regime changes.
                    </p>
                    <div className="er-pill-toggle-group" style={{ marginBottom: 0 }}>
                      {RAY_DALIO_SUGGESTED_PROMPTS.map((prompt) => (
                        <button key={prompt} type="button" className="er-pill-toggle" onClick={() => setPromptValue(prompt)}>
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {displayMessages.map((msg, idx) => (
                <div key={idx} className={`chat-bubble chat-bubble-${msg.role}`}>
                  <div
                    style={{
                      color: msg.role === 'assistant' ? '#D4AF37' : '#10b981',
                      fontWeight: '600',
                      fontSize: '0.7rem',
                      marginBottom: '4px',
                    }}
                  >
                    {msg.role === 'assistant' ? boardroomMode || 'Yohannes' : 'You'}
                  </div>
                  <p style={{ margin: 0, color: '#1f2937', fontSize: '0.85rem', lineHeight: '1.5' }}>
                    {msg.content}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">
              <CentaurPromptBox
                onSend={sendMessage}
                disabled={chatLoading}
                placeholder={chatLoading ? 'Waiting for reply…' : `Message ${boardroomMode || 'Yohannes'}…`}
                value={promptValue}
                onValueChange={setPromptValue}
                promptShellClassName="ci-centaur-prompt-shell"
              />
              {boardroomMode && (
                <button type="button" onClick={exitBoardroom} className="er-pill-toggle" style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}>
                  Exit boardroom (back to Yohannes)
                </button>
              )}
            </div>
          </div>

          <div className="centaur-column">
            <div className="er-card">
              <div className="er-card-header">
                <div className="er-card-header-left">
                  <i className="bi bi-building" aria-hidden />
                  <div>
                    <h3>Boardroom Meetings</h3>
                    <p className="er-card-subtitle">Legendary investor perspectives</p>
                  </div>
                </div>
              </div>
              <div className="er-card-body">
                <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Schedule a meeting with legendary investors to review your portfolio.</p>
                {LEGENDARY_INVESTORS.map((investor) => (
                  <div
                    key={investor.id}
                    style={{
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'rgba(212, 175, 55, 0.1)',
                          border: '1px solid rgba(212, 175, 55, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <i className="bi bi-cpu" style={{ color: '#D4AF37', fontSize: '1rem' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#D4AF37' }}>
                          {investor.botName}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.6875rem', color: '#6b7280' }}>
                          Inspired by {investor.name}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => startBoardroom(investor)}
                      className={`er-pill-toggle${boardroomMode === investor.botName ? ' er-pill-toggle--active' : ''}`}
                    >
                      {boardroomMode === investor.botName ? 'Active' : 'Start'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {activeDisclaimer && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                  background: 'rgba(212, 175, 55, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <i
                    className="bi bi-info-circle"
                    style={{ color: '#D4AF37', fontSize: '0.8rem', flexShrink: 0, marginTop: '1px' }}
                  />
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.6875rem',
                      lineHeight: 1.5,
                      color: '#9ca3af',
                      fontStyle: 'italic',
                    }}
                  >
                    {activeDisclaimer}
                  </p>
                </div>
              </div>
            )}

            <div className="er-card">
              <div className="er-card-header">
                <div className="er-card-header-left">
                  <i className="bi bi-inbox" aria-hidden />
                  <div>
                    <h3>Debrief Queue</h3>
                    <p className="er-card-subtitle">Events from market analysis</p>
                  </div>
                </div>
              </div>
              <div className="er-card-body">
                {debriefItems.length === 0 ? (
                  <p style={{ fontSize: '0.85rem' }}>
                    No events in your debrief queue yet. Use the market analysis tool to add events.
                  </p>
                ) : (
                  <>
                    <p style={{ color: '#d4af37', fontWeight: 600, marginBottom: '0.75rem' }}>
                      {debriefItems.length} Events Pending
                    </p>
                    {debriefItems.slice(0, 3).map((item, idx) => (
                      <div
                        key={idx}
                        style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(212, 175, 55, 0.08)' }}
                      >
                        <p style={{ fontSize: '0.8rem', margin: '0 0 4px 0', fontWeight: 600 }}>
                          {item.event_title}
                        </p>
                        <p style={{ fontSize: '0.75rem', margin: 0, color: '#6b7280' }}>
                          {item.event_country} · {item.reviewed ? 'Reviewed' : 'Pending'}
                        </p>
                      </div>
                    ))}
                    <Link href="/market-analysis" style={{ display: 'inline-block', color: '#d4af37', fontSize: '0.8rem', marginTop: '1rem', textDecoration: 'none' }}>
                      Review Debrief →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <SentinelReportModal open={sentinelModalOpen} onClose={() => setSentinelModalOpen(false)} report={modalReport} />
      </div>
    </TooltipProvider>
  );
}
