'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import './centaur-intelligence.css';

const LEGENDARY_INVESTORS = [
  { id: 'warren-buffett', name: 'Warren Buffett', style: 'value investing', icon: '💰' },
  { id: 'ray-dalio', name: 'Ray Dalio', style: 'macro analysis', icon: '🌍' },
  { id: 'cathie-wood', name: 'Cathie Wood', style: 'growth outlook', icon: '🚀' },
  { id: 'paul-tudor-jones', name: 'Paul Tudor Jones', style: 'macro trading', icon: '📊' },
];

export default function CentaurIntelligencePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Welcome back! I'm Yohannes, your AI investment advisor. I've been reviewing your portfolio and the latest market events. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [boardroomMode, setBoardroomMode] = useState(null);
  const [sentinelReport, setSentinelReport] = useState(null);
  const [debriefItems, setDebriefItems] = useState([]);
  const [selectedReportWeek, setSelectedReportWeek] = useState(0);
  const messagesEndRef = useRef(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
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
      const res = await fetch('/api/centaur/sentinel');
      if (!res.ok) return;
      const { report } = await res.json();
      setSentinelReport(report);
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

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return;

    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/centaur/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          persona: boardroomMode || 'yohannes',
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I encountered an error. Please try again.' }]);
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
    <div className="centaur-page">
      {/* Header */}
      <div className="centaur-header">
        <Link href="/home" style={{ color: '#888', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
          <i className="bi bi-chevron-left" /> Back to Home
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <i className="bi bi-lightning-charge-fill" style={{ color: '#D4AF37', fontSize: '1.5rem' }} />
          <div>
            <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: '700', margin: 0, fontFamily: '"Cinzel", serif' }}>
              CENTAUR INTELLIGENCE
            </h1>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Your AI-Powered Investment Command Center
            </p>
          </div>
        </div>
      </div>

      {/* Sentinel Report Card */}
      <div className="centaur-card sentinel-card">
        <div className="centaur-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="bi bi-journal-text" style={{ color: '#D4AF37' }} />
            <span>YOHANNES SENTINEL — Weekly Report</span>
          </div>
          {sentinelReport && (
            <button
              onClick={() => {
                const modal = document.getElementById('sentinel-modal');
                if (modal) modal.style.display = 'flex';
              }}
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
            Your portfolio health is strong. 3 events need attention.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {Array.from({ length: 5 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (i * 7));
              const month = d.toLocaleDateString('en-US', { month: 'short' });
              const day = d.getDate();
              const ordinal = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedReportWeek(i)}
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
                  }}
                >
                  <div>{month}</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700' }}>{day}{ordinal}</div>
                </button>
              );
            })}
          </div>
          <p style={{ color: '#888', fontSize: '0.8rem' }}>
            Last generated: {sentinelReport?.report_date || new Date().toLocaleDateString()}
          </p>
          <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            View the full report for key highlights and actionable recommendations.
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="centaur-grid">
        {/* Chat Column */}
        <div className="centaur-card chat-card">
          <div className="centaur-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="bi bi-chat-dots" style={{ color: '#D4AF37' }} />
              <span>Chat with {boardroomMode || 'Yohannes'}</span>
            </div>
          </div>
          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble chat-bubble-${msg.role}`}>
                <div style={{ color: msg.role === 'assistant' ? '#D4AF37' : '#10b981', fontWeight: '600', fontSize: '0.7rem', marginBottom: '4px' }}>
                  {msg.role === 'assistant' ? (boardroomMode || 'Yohannes') : 'You'}
                </div>
                <p style={{ margin: 0, color: '#ccc', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  {msg.content}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              style={{
                width: '100%',
                background: '#1a1f2e',
                border: '1px solid #333',
                color: '#ccc',
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                marginBottom: '8px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={sendMessage}
                disabled={chatLoading}
                style={{
                  flex: 1,
                  background: '#D4AF37',
                  color: '#000',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '4px',
                  cursor: chatLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                  opacity: chatLoading ? 0.5 : 1,
                }}
              >
                {chatLoading ? 'Sending...' : 'Send'}
              </button>
              {boardroomMode && (
                <button
                  onClick={exitBoardroom}
                  style={{
                    background: '#333',
                    color: '#888',
                    border: '1px solid #555',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  Exit Boardroom
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Boardroom & Debrief Column */}
        <div className="centaur-column">
          {/* Boardroom Card */}
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
              {LEGENDARY_INVESTORS.map(investor => (
                <div key={investor.id} style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: 'rgba(212, 175, 55, 0.1)',
                      border: '1px solid rgba(212, 175, 55, 0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <i className="bi bi-person-fill" style={{ color: '#D4AF37', fontSize: '1rem' }} />
                    </div>
                    <span style={{ color: '#ccc', fontSize: '0.85rem' }}>
                      {investor.name}
                    </span>
                  </div>
                  <button
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

          {/* Debrief Queue Preview */}
          <div className="centaur-card">
            <div className="centaur-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="bi bi-inbox" style={{ color: '#D4AF37' }} />
                <span>Debrief Queue</span>
              </div>
            </div>
            <div className="centaur-card-body">
              {debriefItems.length === 0 ? (
                <p style={{ color: '#666', fontSize: '0.85rem' }}>No events in your debrief queue yet. Use the market analysis tool to add events.</p>
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
                        {item.event_country} · {item.reviewed ? '✓ Reviewed' : 'Pending'}
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

      {/* Sentinel Report Modal */}
      <div
        id="sentinel-modal"
        style={{
          display: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 10000,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(4px)',
        }}
        onClick={(e) => {
          if (e.target.id === 'sentinel-modal') {
            e.target.style.display = 'none';
          }
        }}
      >
        <div style={{
          width: '90%',
          maxWidth: '800px',
          maxHeight: '80vh',
          background: '#111',
          border: '1px solid #D4AF37',
          borderRadius: '12px',
          padding: '2rem',
          overflowY: 'auto',
          color: '#ccc',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ color: '#D4AF37', fontFamily: '"Cinzel", serif', margin: 0 }}>Yohannes Sentinel Report</h2>
            <button
              onClick={() => {
                const modal = document.getElementById('sentinel-modal');
                if (modal) modal.style.display = 'none';
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                fontSize: '1.5rem',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: '0.9rem', lineHeight: '1.8', whiteSpace: 'pre-line' }}>
            {sentinelReport?.report_text}
          </div>
        </div>
      </div>
    </div>
  );
}
