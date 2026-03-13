"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { InteractiveGlobe } from "@/components/ui/interactive-globe";

const HERO_NOTIFICATIONS = [
  { id: "n1", type: "congress", title: "Congressional Trade Alert", content: "Nancy Pelosi disclosed new NVIDIA purchases worth $1.2M", badge: "Congress", icon: "bi-building" },
  { id: "n2", type: "market_news", title: "AAPL Breaking News", content: "Apple announces record Q4 earnings, stock up 5% in after-hours", badge: "Earnings", icon: "bi-graph-up" },
  { id: "n3", type: "portfolio_alerts", title: "Portfolio Alert", content: "Your portfolio gained $2,847 today (+2.26%)", badge: "Portfolio", icon: "bi-graph-up" },
  { id: "n4", type: "congress", title: "Senate Trading Activity", content: "Sen. Richard Burr sold $1.8M in airline stocks", badge: "Congress", icon: "bi-building" },
  { id: "n5", type: "market_news", title: "Market Volatility Alert", content: "S&P 500 dropped 2.3% — consider rebalancing", badge: "Market", icon: "bi-graph-down" },
  { id: "n6", type: "community", title: "Community Discussion", content: "Alex commented on your Tesla discussion thread", badge: "Community", icon: "bi-people" },
  { id: "n7", type: "market_news", title: "Earnings Report", content: "Tesla Q4 earnings beat expectations, stock up 8%", badge: "Earnings", icon: "bi-graph-up" },
];

const TIME_AGOS = ["2m ago", "8m ago", "1h ago", "2h ago", "4h ago", "6h ago", "1d ago"];

export function GlobeWithNotificationCards({ size = 460 }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setActiveIndex((i) => (i + 1) % HERO_NOTIFICATIONS.length);
        setIsVisible(true);
      }, 600);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const item = HERO_NOTIFICATIONS[activeIndex];
  const timeAgo = TIME_AGOS[activeIndex % TIME_AGOS.length];

  return (
    <div className="globe-with-cards-wrapper">
      <div className="globe-container">
        <InteractiveGlobe size={size} showConnections={false} showMarkers={false} />
      </div>

      <div className="globe-notification-cards">
        <AnimatePresence mode="wait">
          {item && (
            <motion.div
              key={item.id}
              className="globe-notification-card"
              initial={{
                opacity: 0,
                scale: 0.4,
                x: -120,
                y: (activeIndex % 3 - 1) * 15,
                filter: "blur(6px)",
              }}
              animate={{
                opacity: isVisible ? 1 : 0.6,
                scale: isVisible ? 1 : 0.95,
                x: 0,
                y: 0,
                filter: "blur(0px)",
                transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                filter: "blur(2px)",
                transition: { duration: 0.5, ease: "easeIn" },
              }}
            >
              <div className={`globe-card-icon ${item.type}`}>
                <i className={`bi ${item.icon}`} />
              </div>
              <div className="globe-card-content">
                <span className="globe-card-badge">{item.badge}</span>
                <span className="globe-card-title">{item.title}</span>
                <span className="globe-card-text">{item.content}</span>
                <span className="globe-card-time">{timeAgo}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
