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
import { CentaurPromptBox } from '@/components/ui/chatgpt-prompt-input';
import { SentinelReportModal } from '@/components/centaur/SentinelReportModal';

const TooltipProvider = TooltipPrimitive.Provider;

const LEGENDARY_INVESTORS = [
  { id: 'warren-buffett', name: 'Warren Buffett', style: 'value investing' },
  { id: 'ray-dalio', name: 'Ray Dalio', style: 'macro analysis' },
  { id: 'cathie-wood', name: 'Cathie Wood', style: 'growth outlook' },
  { id: 'paul-tudor-jones', name: 'Paul Tudor Jones', style: 'macro trading' },
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

    try {
      const res = await fetch('/api/centaur/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          persona: boardroomMode || 'yohannes',
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I encountered an error. Please try again.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const startBoardroom = (investor) => {
    setBoardroomMode(investor.name);
    setMessages([
      {
        role: 'assistant',
        content: `Welcome to the boardroom. I'm channeling the investment philosophy of ${investor.name}. I've reviewed your portfolio. Let's discuss your positions from a ${investor.style} perspective. What would you like to focus on?`,
      },
    ]);
  };

  const exitBoardroom = () => {
    setBoardroomMode(null);
    setMessages([
      {
        role: 'assistant',
        content: "I'm back as Yohannes. What else can I help you with?",
      },
    ]);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        <i className="bi bi-hourglass" style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }} />
        Loading Centaur Intelligence...
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="centaur-page">
        <div className="centaur-header">
          <Link
            href="/home"
            style={{
              color: '#888',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '1rem',
            }}
          >
            <i className="bi bi-chevron-left" /> Back to Home
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
            <i className="bi bi-lightning-charge-fill" style={{ color: '#D4AF37', fontSize: '1.5rem' }} />
            <div>
              <h1
                style={{
                  color: '#fff',
                  fontSize: '1.8rem',
                  fontWeight: '700',
                  margin: 0,
                  fontFamily: '"Cinzel", serif',
                }}
              >
                CENTAUR INTELLIGENCE
              </h1>
              <p style={{ color: '#888', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Your AI-Powered Investment Command Center
              </p>
            </div>
          </div>
        </div>

        <div className="centaur-card sentinel-card">
          <div className="centaur-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="bi bi-journal-text" style={{ color: '#D4AF37' }} />
              <span>Sentinel Weekly Report</span>
            </div>
            {sentinelReport && (
              <button
                type="button"
                onClick={() => openSentinelModal(sentinelReport)}
                style={{
                  background: 'rgba(212, 175, 55, 0.15)',
                  border: '1px solid #D4AF37',
                  color: '#D4AF37',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                }}
              >
                View Latest
              </button>
            )}
          </div>
          <div className="centaur-card-body">
            <p style={{ color: '#D4AF37', fontWeight: '600', marginBottom: '0.5rem' }}>Portfolio Status: STRONG</p>
            <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Your portfolio health is strong. Review the full report for highlights and actions.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
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
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: selectedReportWeek === i ? '1px solid #D4AF37' : '1px solid #333',
                      background: selectedReportWeek === i ? 'rgba(212, 175, 55, 0.1)' : '#0a0e13',
                      color: selectedReportWeek === i ? '#D4AF37' : '#888',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      width: '72px',
                      minHeight: '52px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div>{month}</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700' }}>
                      {day}
                      {ordinal}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="centaur-grid">
          <div className="centaur-card chat-card">
            <div className="centaur-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <i className="bi bi-chat-dots" style={{ color: '#D4AF37' }} />
                <span>Chat with {boardroomMode || 'Yohannes'}</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                  <button
                    type="button"
                    onClick={exitBoardroom}
                    style={{
                      background: boardroomMode ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.25)',
                      border: '1px solid rgba(212, 175, 55, 0.45)',
                      color: '#D4AF37',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Yohannes
                  </button>
                  {LEGENDARY_INVESTORS.map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => startBoardroom(inv)}
                      style={{
                        background:
                          boardroomMode === inv.name ? 'rgba(212, 175, 55, 0.22)' : 'transparent',
                        border: '1px solid #333',
                        color: '#aaa',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        cursor: 'pointer',
                      }}
                    >
                      {inv.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="chat-messages">
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
              />
              {boardroomMode && (
                <button
                  type="button"
                  onClick={exitBoardroom}
                  style={{
                    marginTop: '8px',
                    background: '#333',
                    color: '#888',
                    border: '1px solid #555',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    width: '100%',
                  }}
                >
                  Exit boardroom (back to Yohannes)
                </button>
              )}
            </div>
          </div>

          <div className="centaur-column">
            <div className="centaur-card">
              <div className="centaur-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="bi bi-building" style={{ color: '#D4AF37' }} />
                  <span>Boardroom Meetings</span>
                </div>
              </div>
              <div className="centaur-card-body">
                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Schedule a meeting with legendary investors to review your portfolio.
                </p>
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
                      <span style={{ color: '#ccc', fontSize: '0.85rem' }}>{investor.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => startBoardroom(investor)}
                      style={{
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        color: '#D4AF37',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                      }}
                    >
                      Start
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="centaur-card">
              <div className="centaur-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="bi bi-inbox" style={{ color: '#D4AF37' }} />
                  <span>Debrief Queue</span>
                </div>
              </div>
              <div className="centaur-card-body">
                {debriefItems.length === 0 ? (
                  <p style={{ color: '#666', fontSize: '0.85rem' }}>
                    No events in your debrief queue yet. Use the market analysis tool to add events.
                  </p>
                ) : (
                  <>
                    <p style={{ color: '#D4AF37', fontWeight: '600', marginBottom: '0.75rem' }}>
                      {debriefItems.length} Events Pending
                    </p>
                    {debriefItems.slice(0, 3).map((item, idx) => (
                      <div key={idx} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #333' }}>
                        <p style={{ color: '#ccc', fontSize: '0.8rem', margin: '0 0 4px 0', fontWeight: '600' }}>
                          {item.event_title}
                        </p>
                        <p style={{ color: '#888', fontSize: '0.75rem', margin: 0 }}>
                          {item.event_country} · {item.reviewed ? 'Reviewed' : 'Pending'}
                        </p>
                      </div>
                    ))}
                    <Link
                      href="/market-analysis"
                      style={{
                        display: 'inline-block',
                        color: '#D4AF37',
                        fontSize: '0.8rem',
                        marginTop: '1rem',
                        textDecoration: 'none',
                      }}
                    >
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
