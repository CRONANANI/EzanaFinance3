'use client';

import { useState, useEffect, useRef } from 'react';
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
import { SentinelReportModal } from '@/components/centaur/SentinelReportModal';

const TooltipProvider = TooltipPrimitive.Provider;

const LEGENDARY_INVESTORS = [
  { id: 'warren-buffett', name: 'Warren Buffett', style: 'value investing' },
  { id: 'ray-dalio', name: 'Ray Dalio', style: 'macro analysis' },
  { id: 'cathie-wood', name: 'Cathie Wood', style: 'growth outlook' },
  { id: 'paul-tudor-jones', name: 'Paul Tudor Jones', style: 'macro trading' },
];

const RAY_DALIO_SUGGESTED_PROMPTS = [
  'Where are we in the big cycle?',
  'Is the dollar losing reserve status?',
  'How does the US-China rivalry end?',
  'What happens when debt hits 0% interest rates?',
  'What should I own in a currency devaluation?',
  'How did the Dutch Empire fall?',
];

function reportForWeekIndex(reports, weekIndex) {
  if (!reports?.length) return null;
  return reports[weekIndex] || null;
}

export default function CentaurIntelligencePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Welcome back! I'm Yohannes, your AI investment advisor. I've been reviewing your portfolio and the latest market events. How can I help you today?",
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [boardroomMode, setBoardroomMode] = useState(null);
  const [promptValue, setPromptValue] = useState('');
  const [sentinelReport, setSentinelReport] = useState(null);
  const [sentinelReports, setSentinelReports] = useState([]);
  const [debriefItems, setDebriefItems] = useState([]);
  const [selectedReportWeek, setSelectedReportWeek] = useState(0);
  const [sentinelModalOpen, setSentinelModalOpen] = useState(false);
  const [modalReport, setModalReport] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
  }, [messages]);

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
    const history = [...messagesRef.current, userMsg];
    setMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
    setPromptValue('');

    try {
      const res = await fetch('/api/centaur/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          investor: boardroomMode ?? null,
          persona: boardroomMode || 'yohannes',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        console.error('Chat API error:', res.status, data);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply || `Error ${res.status}: please try again.`,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply || 'No response received.' },
      ]);
    } catch (err) {
      console.error('Chat fetch error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please check your internet and try again.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const startBoardroom = (investor) => {
    setBoardroomMode(investor.name);
    setPromptValue('');
    const welcome =
      investor.id === 'ray-dalio'
        ? `Welcome to the boardroom. I want to think with you the way I do in my work on The Changing World Order — through long cycles, money and credit, internal and external conflict, and how empires rise and decline. I've reviewed your portfolio context. What would you like to explore?`
        : `Welcome to the boardroom. I'm channeling the investment philosophy of ${investor.name}. I've reviewed your portfolio. Let's discuss your positions from a ${investor.style} perspective. What would you like to focus on?`;
    setMessages([
      {
        role: 'assistant',
        content: welcome,
      },
    ]);
  };

  const exitBoardroom = () => {
    setBoardroomMode(null);
    setPromptValue('');
    setMessages([
      {
        role: 'assistant',
        content: "I'm back as Yohannes. What else can I help you with?",
      },
    ]);
  };

  const showDalioBanner =
    boardroomMode === 'Ray Dalio' && messages.filter((m) => m.role === 'user').length === 0;

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
        <div className="er-hero ci-hero-wrap">
          <div className="er-hero-left">
            <Link href="/home" className="er-back-link">
              <i className="bi bi-chevron-left" /> Back to Home
            </Link>
            <div className="er-hero-title-row">
              <div className="er-hero-icon">
                <i className="bi bi-lightning-charge-fill" />
              </div>
              <div>
                <h1>Centaur Intelligence</h1>
                <p className="er-hero-sub">Your AI-powered investment command center — advisor chat, boardroom personas, and briefings.</p>
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
                const month = d.toLocaleDateString('en-US', { month: 'short' });
                const day = d.getDate();
                const ordinal =
                  day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
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
                    className={`er-pill-toggle${selectedReportWeek === i ? ' er-pill-toggle--active' : ''}`}
                    style={{ width: '72px', minHeight: '52px', flexDirection: 'column', justifyContent: 'center' }}
                  >
                    <span>{month}</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                      {day}
                      {ordinal}
                    </span>
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
                    className={`er-pill-toggle${boardroomMode === inv.name ? ' er-pill-toggle--active' : ''}`}
                  >
                    {inv.name.split(' ')[0]}
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
                        <h3 className="ci-dalio-name">Ray Dalio</h3>
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
              {messages.map((msg, idx) => (
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
                  <p style={{ margin: 0, color: '#ccc', fontSize: '0.85rem', lineHeight: '1.5' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
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
                        <i className="bi bi-person-fill" style={{ color: '#D4AF37', fontSize: '1rem' }} />
                      </div>
                      <span style={{ fontSize: '0.85rem' }}>{investor.name}</span>
                    </div>
                    <button type="button" onClick={() => startBoardroom(investor)} className="er-pill-toggle er-pill-toggle--active">
                      Start
                    </button>
                  </div>
                ))}
              </div>
            </div>

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
