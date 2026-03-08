"use client";

import React from "react";
import { motion } from "motion/react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

function DatabaseIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}

const PATH_CONFIG = [
  {
    id: "congress",
    path: "M 90 60 L 90 200 Q 90 220 110 220 L 430 220 Q 450 220 450 260",
    left: "10%",
    detailTop: "130px",
  },
  {
    id: "13f",
    path: "M 270 60 L 270 200 Q 270 220 290 220 L 430 220 Q 450 220 450 260",
    left: "30%",
    detailTop: "130px",
  },
  {
    id: "institutional",
    path: "M 450 60 L 450 260",
    left: "50%",
    detailTop: "160px",
  },
  {
    id: "analytics",
    path: "M 630 60 L 630 200 Q 630 220 610 220 L 470 220 Q 450 220 450 260",
    left: "70%",
    detailTop: "130px",
  },
  {
    id: "community",
    path: "M 810 60 L 810 200 Q 810 220 790 220 L 470 220 Q 450 220 450 260",
    left: "90%",
    detailTop: "130px",
  },
];

export default function DatabaseWithRestApi({
  className,
  circleText,
  badgeTexts,
  title,
  lightColor,
  onBadgeClick,
  selectedSource,
  sourceDetails = {},
}) {
  const accentColor = lightColor || "#10b981";

  return (
    <div
      className={cn(
        "relative flex w-full max-w-[900px] flex-col items-center gap-0",
        className
      )}
    >
      {/* Title - no bubble, just text */}
      <h3 className="mb-8 text-center text-lg font-semibold text-foreground/90">
        {title || "Institutional-grade data from verified sources"}
      </h3>

      {/* Diagram area */}
      <div className="relative w-full" style={{ minHeight: "420px" }}>
        {/* SVG: Connection lines with animated pulses */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 900 420"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="pulse-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0" />
              <stop offset="50%" stopColor={accentColor} stopOpacity="1" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Connection lines - default (low opacity) and highlighted (when selected) */}
          {PATH_CONFIG.map(({ id, path }) => (
            <path
              key={id}
              d={path}
              stroke={selectedSource === id ? accentColor : "rgba(16,185,129,0.2)"}
              strokeWidth={selectedSource === id ? "2.5" : "2"}
              fill="none"
              strokeLinecap="round"
            />
          ))}

          {/* Animated pulses */}
          {PATH_CONFIG.map(({ id, path }, i) => (
            <circle key={`pulse-${id}`} r="4" fill={accentColor} filter="url(#glow)">
              <animateMotion
                dur="2.5s"
                repeatCount="indefinite"
                begin={`${i * 0.6}s`}
                path={path}
              />
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                dur="2.5s"
                repeatCount="indefinite"
                begin={`${i * 0.6}s`}
              />
            </circle>
          ))}

          {/* Line from Ezana hub to output */}
          <path
            d="M 450 320 L 450 400"
            stroke="rgba(16,185,129,0.3)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />

          {/* Animated pulse from Ezana to output */}
          <circle r="4" fill={accentColor} filter="url(#glow)">
            <animateMotion dur="1.5s" repeatCount="indefinite" path="M 450 320 L 450 400" />
            <animate attributeName="opacity" values="0;1;1;0" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </svg>

        {/* Inline source details - positioned along vertical line when selected */}
        {PATH_CONFIG.map(({ id, left, detailTop }) =>
          selectedSource === id && sourceDetails[id]?.length ? (
            <div
              key={`details-${id}`}
              className="absolute -translate-x-1/2 max-w-[140px] text-center z-10 px-2 py-1.5 rounded-md bg-black/40"
              style={{ left, top: detailTop }}
            >
              <ul className="text-[11px] text-muted-foreground/80 space-y-1">
                {sourceDetails[id].map((detail, i) => (
                  <li key={i}>{detail}</li>
                ))}
              </ul>
            </div>
          ) : null
        )}

        {/* 5 data source cards */}
        {[
          { id: "congress", label: badgeTexts?.first || "Congress", left: "10%" },
          { id: "13f", label: badgeTexts?.second || "13F", left: "30%" },
          { id: "institutional", label: badgeTexts?.third || "Institutional", left: "50%" },
          { id: "analytics", label: badgeTexts?.fourth || "Alternative Analytics", left: "70%", wider: true },
          { id: "community", label: badgeTexts?.fifth || "Community", left: "90%" },
        ].map(({ id, label, left, wider }) => (
          <button
            key={id}
            type="button"
            onClick={() => onBadgeClick?.(id)}
            className={cn(
              "absolute top-0 flex -translate-x-1/2 items-center justify-center gap-1.5 rounded-lg border px-3 py-3 transition-all hover:bg-[#27272a] hover:border-emerald-500/30",
              selectedSource === id
                ? "border-emerald-500/60 bg-emerald-500/5"
                : "border-zinc-700/50 bg-[#18181B]",
              wider ? "min-w-[160px]" : "min-w-[100px]",
              onBadgeClick && "cursor-pointer"
            )}
            style={{ left }}
          >
            <DatabaseIcon />
            <span className="text-sm font-medium whitespace-nowrap">{label}</span>
          </button>
        ))}

        {/* Ezana hub - center with transformation effect */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[260px] z-20 flex flex-col items-center">
          {/* Outer glow ring */}
          <motion.div
            className="absolute w-16 h-16 rounded-full"
            style={{
              background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Main hub circle */}
          <div
            className="relative grid h-[48px] w-[48px] place-items-center rounded-full border-2 bg-[#141516] font-semibold text-sm shadow-lg z-10"
            style={{
              borderColor: accentColor,
              boxShadow: `0 0 20px ${accentColor}40, 0 0 40px ${accentColor}20`,
            }}
          >
            {circleText || "Ezana"}
          </div>

          {/* Downward arrow indicator */}
          <motion.div
            className="mt-2"
            animate={{
              y: [0, 4, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
              <path
                d="M10 12L0 2L2 0L10 8L18 0L20 2L10 12Z"
                fill={accentColor}
                fillOpacity="0.6"
              />
            </svg>
          </motion.div>
        </div>

        {/* Output - Personalized Intelligence (plain text, no card) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 text-sm">
          <User className="size-4 text-emerald-500" />
          <span className="text-foreground/80">Personalized Intelligence Dashboard</span>
        </div>
      </div>
    </div>
  );
}
