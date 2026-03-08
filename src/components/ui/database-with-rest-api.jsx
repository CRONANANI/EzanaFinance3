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

export default function DatabaseWithRestApi({
  className,
  circleText,
  badgeTexts,
  title,
  lightColor,
  onBadgeClick,
}) {
  const accentColor = lightColor || "#10b981";

  return (
    <div
      className={cn(
        "relative flex w-full max-w-[800px] flex-col items-center gap-0",
        className
      )}
    >
      {/* Title - no bubble, just text */}
      <h3 className="mb-8 text-center text-lg font-semibold text-foreground/90">
        {title || "Institutional-grade data from verified sources"}
      </h3>

      {/* Diagram area */}
      <div className="relative w-full" style={{ minHeight: "320px" }}>
        {/* SVG: Connection lines with animated pulses */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 800 320"
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

          {/* Static connection lines */}
          <g stroke="rgba(16,185,129,0.2)" strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="M 100 60 L 100 120 Q 100 140 120 140 L 380 140 Q 400 140 400 160 L 400 175" />
            <path d="M 300 60 L 300 100 Q 300 120 320 120 L 380 120 Q 400 120 400 140 L 400 175" />
            <path d="M 500 60 L 500 100 Q 500 120 480 120 L 420 120 Q 400 120 400 140 L 400 175" />
            <path d="M 700 60 L 700 120 Q 700 140 680 140 L 420 140 Q 400 140 400 160 L 400 175" />
          </g>

          {/* Animated pulse 1 - Congress */}
          <circle r="4" fill={accentColor} filter="url(#glow)">
            <animateMotion
              dur="2.5s"
              repeatCount="indefinite"
              path="M 100 60 L 100 120 Q 100 140 120 140 L 380 140 Q 400 140 400 160 L 400 175"
            />
            <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" />
          </circle>

          {/* Animated pulse 2 - 13F */}
          <circle r="4" fill={accentColor} filter="url(#glow)">
            <animateMotion
              dur="2.5s"
              repeatCount="indefinite"
              begin="0.6s"
              path="M 300 60 L 300 100 Q 300 120 320 120 L 380 120 Q 400 120 400 140 L 400 175"
            />
            <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" begin="0.6s" />
          </circle>

          {/* Animated pulse 3 - Institutional */}
          <circle r="4" fill={accentColor} filter="url(#glow)">
            <animateMotion
              dur="2.5s"
              repeatCount="indefinite"
              begin="1.2s"
              path="M 500 60 L 500 100 Q 500 120 480 120 L 420 120 Q 400 120 400 140 L 400 175"
            />
            <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" begin="1.2s" />
          </circle>

          {/* Animated pulse 4 - Alternative Analytics */}
          <circle r="4" fill={accentColor} filter="url(#glow)">
            <animateMotion
              dur="2.5s"
              repeatCount="indefinite"
              begin="1.8s"
              path="M 700 60 L 700 120 Q 700 140 680 140 L 420 140 Q 400 140 400 160 L 400 175"
            />
            <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" begin="1.8s" />
          </circle>

          {/* Line from Ezana hub to output */}
          <path
            d="M 400 220 L 400 265"
            stroke="rgba(16,185,129,0.3)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />

          {/* Animated pulse from Ezana to output */}
          <circle r="4" fill={accentColor} filter="url(#glow)">
            <animateMotion dur="1.5s" repeatCount="indefinite" path="M 400 220 L 400 265" />
            <animate attributeName="opacity" values="0;1;1;0" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </svg>

        {/* 4 data source cards */}
        {[
          { id: "congress", label: badgeTexts?.first || "Congress", left: "12.5%" },
          { id: "13f", label: badgeTexts?.second || "13F", left: "37.5%" },
          { id: "institutional", label: badgeTexts?.third || "Institutional", left: "62.5%" },
          { id: "analytics", label: badgeTexts?.fourth || "Alternative Analytics", left: "87.5%", wider: true },
        ].map(({ id, label, left, wider }) => (
          <button
            key={id}
            type="button"
            onClick={() => onBadgeClick?.(id)}
            className={cn(
              "absolute top-0 flex -translate-x-1/2 items-center justify-center gap-1.5 rounded-lg border border-zinc-700/50 bg-[#18181B] px-3 py-3 transition-all hover:bg-[#27272a] hover:border-emerald-500/30",
              wider ? "min-w-[160px]" : "min-w-[100px]",
              onBadgeClick && "cursor-pointer"
            )}
            style={{ left }}
          >
            <DatabaseIcon />
            <span className="text-xs font-medium whitespace-nowrap">{label}</span>
          </button>
        ))}

        {/* Ezana hub - center with transformation effect */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[175px] z-20 flex flex-col items-center">
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

        {/* Output card - Personalized Intelligence */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] max-w-[500px]">
          <div className="flex h-[60px] items-center justify-center rounded-lg border border-zinc-700/50 bg-[#18181B]/90 shadow-md">
            <div className="flex items-center gap-2 text-sm">
              <User className="size-4 text-emerald-500" />
              <span className="text-foreground/80">Personalized Intelligence Dashboard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
