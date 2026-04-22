"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { InteractiveGlobe } from "@/components/ui/interactive-globe";
import { useTheme } from "@/components/ThemeProvider";

const HERO_NOTIFICATIONS = [
  { id: "n1", type: "inside-the-capitol", title: "Congressional Trade Alert", content: "Nancy Pelosi disclosed new NVIDIA purchases worth $1.2M", badge: "Inside the Capitol", icon: "bi-bank" },
  { id: "n2", type: "market_news", title: "AAPL Breaking News", content: "Apple announces record Q4 earnings, stock up 5% in after-hours trading", badge: "Earnings", icon: "bi-graph-up" },
  { id: "n3", type: "portfolio_alerts", title: "Portfolio Alert", content: "Your portfolio gained $2,847.31 today (+2.26%)", badge: "Portfolio", icon: "bi-graph-up" },
  { id: "n4", type: "inside-the-capitol", title: "Senate Trading Activity", content: "Sen. Richard Burr sold $1.8M in airline stocks before market crash", badge: "Inside the Capitol", icon: "bi-bank" },
  { id: "n5", type: "market_news", title: "Market Volatility Alert", content: "S&P 500 dropped 2.3% — consider rebalancing your portfolio", badge: "Market", icon: "bi-graph-down" },
  { id: "n6", type: "community", title: "Community Discussion", content: "Alex commented on your Tesla discussion thread", badge: "Community", icon: "bi-people" },
  { id: "n7", type: "market_news", title: "Earnings Report", content: "Tesla Q4 earnings beat expectations, stock up 8% pre-market", badge: "Earnings", icon: "bi-graph-up" },
];

const TIME_AGOS = ["2m ago", "8m ago", "1h ago", "2h ago", "4h ago", "6h ago", "1d ago"];

const SIDES = ["left", "right"];
const VERTICAL_POSITIONS = [0, 1, 2];

function pickRandomPosition(prevSide, prevVPos) {
  const candidates = [];
  for (const s of SIDES) {
    for (const v of VERTICAL_POSITIONS) {
      if (s !== prevSide || v !== prevVPos) {
        candidates.push({ side: s, vPos: v });
      }
    }
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function GlobeWithNotificationCards({ size = 460, onGlobeReady }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState(() => pickRandomPosition(null, null));

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % HERO_NOTIFICATIONS.length);
      setPosition((prev) => {
        const next = pickRandomPosition(prev.side, prev.vPos);
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const item = HERO_NOTIFICATIONS[activeIndex];
  const timeAgo = TIME_AGOS[activeIndex % TIME_AGOS.length];
  const { side, vPos: verticalPos } = position;

  const Alert = ({ cardItem, cardTimeAgo, cardSide, vPos }) => (
    <motion.div
      className={`globe-notification-alert globe-card-v-${vPos}`}
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
      <div className={`globe-alert-icon ${cardItem.type}`}>
        <i className={`bi ${cardItem.icon}`} />
      </div>
      <div className="globe-alert-content">
        <span className="globe-alert-title">{cardItem.title}</span>
        <span className="globe-alert-text">{cardItem.content}</span>
        <span className="globe-alert-time">{cardTimeAgo}</span>
      </div>
    </motion.div>
  );

  return (
    <div className="globe-with-cards-wrapper">
      <div className="globe-notification-cards globe-cards-left">
        <AnimatePresence mode="wait">
          {side === "left" && item && <Alert key={item.id} cardItem={item} cardTimeAgo={timeAgo} cardSide="left" vPos={verticalPos} />}
        </AnimatePresence>
      </div>

      <div className="globe-container">
        {/* Light-mode ocean: match hero #f8fafb (FallingPattern). #c8d4db read as a pale ring behind the globe. */}
        <InteractiveGlobe
          size={size}
          showConnections={false}
          showMarkers={false}
          onReady={onGlobeReady}
          oceanFill={isLight ? "#f8fafb" : "#020403"}
          dotColor={isLight ? "rgba(5, 150, 105, ALPHA)" : "rgba(52, 211, 153, ALPHA)"}
        />
      </div>

      <div className="globe-notification-cards globe-cards-right">
        <AnimatePresence mode="wait">
          {side === "right" && item && <Alert key={item.id} cardItem={item} cardTimeAgo={timeAgo} cardSide="right" vPos={verticalPos} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
