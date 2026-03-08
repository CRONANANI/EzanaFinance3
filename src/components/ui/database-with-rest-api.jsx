"use client";

import React from "react";
import { motion } from "motion/react";
import { Sparkles, User } from "lucide-react";
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
        "relative flex w-full max-w-[720px] flex-col items-center gap-0",
        className
      )}
    >
      {/* 1. Title card - ABOVE the 4 data source cards (unchanged) */}
      <div className="mb-6 flex w-full items-center justify-center rounded-lg border bg-[#101112] px-4 py-3 shadow-md">
        <Sparkles className="size-4 shrink-0 text-emerald-500" />
        <span className="ml-2 text-center text-sm font-medium">
          {title || "Institutional-grade data from verified sources"}
        </span>
      </div>

      {/* 2. Diagram area: 4 spread cards + connection lines + Ezana hub */}
      <div className="relative w-full min-h-[280px]">
        {/* SVG: 4 connection lines with pulse animation */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 720 280"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="db-lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.5" />
              <stop offset="50%" stopColor={accentColor} stopOpacity="1" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.5" />
            </linearGradient>
            <filter id="db-glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* 4 paths from card centers to Ezana hub - base lines (visible structure) */}
          <g stroke="rgba(16,185,129,0.4)" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <path d="M 90 55 Q 90 140 360 165" />
            <path d="M 270 55 Q 270 140 360 165" />
            <path d="M 450 55 Q 450 140 360 165" />
            <path d="M 630 55 Q 630 140 360 165" />
          </g>
          {/* 4 animated pulse lines - prominent flowing effect */}
          <g stroke="url(#db-lineGrad)" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#db-glow)">
            <path d="M 90 55 Q 90 140 360 165" className="db-pulse-line" style={{ animationDelay: "0s" }} />
            <path d="M 270 55 Q 270 140 360 165" className="db-pulse-line" style={{ animationDelay: "0.4s" }} />
            <path d="M 450 55 Q 450 140 360 165" className="db-pulse-line" style={{ animationDelay: "0.8s" }} />
            <path d="M 630 55 Q 630 140 360 165" className="db-pulse-line" style={{ animationDelay: "1.2s" }} />
          </g>
        </svg>

        {/* 4 data source cards - spread out, aligned with connection lines */}
        {[
          { id: "congress", label: badgeTexts?.first || "Congress", left: "12.5%" },
          { id: "13f", label: badgeTexts?.second || "13F", left: "37.5%" },
          { id: "institutional", label: badgeTexts?.third || "Institutional", left: "62.5%" },
          { id: "analytics", label: badgeTexts?.fourth || "Analytics", left: "87.5%" },
        ].map(({ id, label, left }) => (
          <button
            key={id}
            type="button"
            onClick={() => onBadgeClick?.(id)}
            className={cn(
              "absolute top-0 flex w-[20%] min-w-[100px] max-w-[140px] -translate-x-1/2 items-center justify-center gap-1.5 rounded-lg border bg-[#18181B] px-3 py-3 transition-colors hover:bg-[#27272a]",
              onBadgeClick && "cursor-pointer"
            )}
            style={{ left }}
          >
            <DatabaseIcon />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}

        {/* Ezana hub - center */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[155px] z-20 flex flex-col items-center">
          <div
            className="grid h-[44px] w-[44px] place-items-center rounded-full border-2 bg-[#141516] font-semibold text-sm shadow-lg"
            style={{
              borderColor: accentColor,
              boxShadow: `0 0 20px ${accentColor}40, 0 0 40px ${accentColor}20`,
            }}
          >
            {circleText || "Ezana"}
          </div>
          <span className="mt-2 text-[10px] text-muted-foreground/80">
            filters & creates
          </span>
        </div>

        {/* Output card - bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex h-[70px] items-center justify-center overflow-hidden rounded-lg border bg-background shadow-md">
          <div className="flex items-center gap-2 rounded-full border bg-[#101112] px-4 py-2 text-xs">
            <User className="size-3.5 text-emerald-500" />
            <span>Feeds & metrics tailored for you</span>
          </div>
          <motion.div
            className="absolute -bottom-7 h-[50px] w-[50px] rounded-full border-t bg-accent/5"
            animate={{ scale: [0.98, 1.02, 0.98, 1, 1, 1, 1, 1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-10 h-[72px] w-[72px] rounded-full border-t bg-accent/5"
            animate={{ scale: [1, 1, 1, 0.98, 1.02, 0.98, 1, 1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-[50px] h-[95px] w-[95px] rounded-full border-t bg-accent/5"
            animate={{ scale: [1, 1, 1, 1, 1, 0.98, 1.02, 0.98, 1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>
    </div>
  );
}
