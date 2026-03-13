"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { InteractiveGlobe } from "@/components/ui/interactive-globe";

const HERO_NOTIFICATIONS = [
  { id: "n1", type: "congress", title: "Congressional Trade Alert", content: "Nancy Pelosi disclosed new NVDA purchases worth $1.2M", badge: "Congress", icon: "bi-building" },
  { id: "n2", type: "market_news", title: "AAPL Breaking News", content: "Apple record Q4 earnings, stock up 5% after-hours", badge: "Earnings", icon: "bi-graph-up" },
  { id: "n3", type: "portfolio_alerts", title: "Portfolio Alert", content: "Your portfolio gained $2,847 today (+2.26%)", badge: "Portfolio", icon: "bi-graph-up" },
  { id: "n4", type: "congress", title: "Senate Trading Activity", content: "Sen. Richard Burr sold $1.8M in airline stocks", badge: "Congress", icon: "bi-building" },
  { id: "n5", type: "market_news", title: "Market Volatility Alert", content: "S&P 500 dropped 2.3% — consider rebalancing", badge: "Market", icon: "bi-graph-down" },
  { id: "n6", type: "community", title: "Community Discussion", content: "Alex commented on your Tesla discussion thread", badge: "Community", icon: "bi-people" },
  { id: "n7", type: "market_news", title: "Earnings Report", content: "Tesla Q4 earnings beat expectations, stock up 8%", badge: "Earnings", icon: "bi-graph-up" },
];

const TIME_AGOS = ["2m ago", "8m ago", "1h ago", "2h ago", "4h ago", "6h ago", "1d ago"];

export function GlobeWithNotificationCards({ size = 460 }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % HERO_NOTIFICATIONS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const item = HERO_NOTIFICATIONS[activeIndex];
  const timeAgo = TIME_AGOS[activeIndex % TIME_AGOS.length];
  const side = activeIndex % 2 === 0 ? "left" : "right";
  const verticalPos = activeIndex % 3;

  const Card = ({ cardItem, cardTimeAgo, cardSide, vPos }) => (
    <motion.div
      className={`globe-notification-card globe-card-v-${vPos}`}
      initial={{
        opacity: 0,
        x: cardSide === "left" ? 24 : -24,
      }}
      animate={{
        opacity: 1,
        x: 0,
        transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
      }}
      exit={{
        opacity: 0,
        transition: { duration: 0.8, ease: [0.55, 0.09, 0.68, 0.53] },
      }}
    >
      <div className={`globe-card-icon ${cardItem.type}`}>
        <i className={`bi ${cardItem.icon}`} />
      </div>
      <div className="globe-card-content">
        <span className="globe-card-badge">{cardItem.badge}</span>
        <span className="globe-card-title">{cardItem.title}</span>
        <span className="globe-card-text">{cardItem.content}</span>
        <span className="globe-card-time">{cardTimeAgo}</span>
      </div>
    </motion.div>
  );

  return (
    <div className="globe-with-cards-wrapper">
      <div className="globe-notification-cards globe-cards-left">
        <AnimatePresence mode="wait">
          {side === "left" && item && <Card key={item.id} cardItem={item} cardTimeAgo={timeAgo} cardSide="left" vPos={verticalPos} />}
        </AnimatePresence>
      </div>

      <div className="globe-container">
        <InteractiveGlobe size={size} showConnections={false} showMarkers={false} />
      </div>

      <div className="globe-notification-cards globe-cards-right">
        <AnimatePresence mode="wait">
          {side === "right" && item && <Card key={item.id} cardItem={item} cardTimeAgo={timeAgo} cardSide="right" vPos={verticalPos} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
