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
      stroke="currentColor"
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
  selectedSource,
  sourceDetails,
}) {
  const accentColor = lightColor || "#10b981";

  // Original uniform layout: 10%, 30%, 50%, 70%, 90% with wider container (1100px) for adequate spacing
  // Paths converge to center (550, 290) - Ezana hub
  const sourcePositions = {
    congress: {
      left: "10%",
      fullPath: "M 110 55 L 110 180 Q 110 220 170 220 L 530 220 Q 550 220 550 250 L 550 290",
      pathStart: "M 110 55 L 110 95",
      pathEnd: "M 110 155 L 110 180 Q 110 220 170 220 L 530 220 Q 550 220 550 250 L 550 290",
    },
    "13f": {
      left: "30%",
      fullPath: "M 330 55 L 330 180 Q 330 210 390 210 L 530 210 Q 550 210 550 240 L 550 290",
      pathStart: "M 330 55 L 330 95",
      pathEnd: "M 330 155 L 330 180 Q 330 210 390 210 L 530 210 Q 550 210 550 240 L 550 290",
    },
    institutional: {
      left: "50%",
      fullPath: "M 550 55 L 550 290",
      pathStart: "M 550 55 L 550 95",
      pathEnd: "M 550 155 L 550 290",
    },
    analytics: {
      left: "70%",
      fullPath: "M 770 55 L 770 180 Q 770 210 710 210 L 570 210 Q 550 210 550 240 L 550 290",
      pathStart: "M 770 55 L 770 95",
      pathEnd: "M 770 155 L 770 180 Q 770 210 710 210 L 570 210 Q 550 210 550 240 L 550 290",
    },
    community: {
      left: "90%",
      fullPath: "M 990 55 L 990 180 Q 990 220 930 220 L 570 220 Q 550 220 550 250 L 550 290",
      pathStart: "M 990 55 L 990 95",
      pathEnd: "M 990 155 L 990 180 Q 990 220 930 220 L 570 220 Q 550 220 550 250 L 550 290",
    },
  };

  const sourceConfigs = [
    { id: "congress", label: badgeTexts?.first || "Congress" },
    { id: "13f", label: badgeTexts?.second || "13F" },
    { id: "institutional", label: badgeTexts?.third || "Institutional" },
    { id: "analytics", label: badgeTexts?.fourth || "Alternative Analytics" },
    { id: "community", label: badgeTexts?.fifth || "Community" },
  ];

  return (
    <div
      className={cn(
        "relative flex w-full max-w-[1100px] flex-col items-center gap-0",
        className
      )}
    >
      {/* Title in brand green */}
      <h3 className="mb-8 text-center text-lg font-semibold text-emerald-500">
        {title || "Institutional-grade data from verified sources"}
      </h3>

      {/* Diagram area */}
      <div className="relative w-full" style={{ minHeight: "480px" }}>
        {/* SVG Connection Lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1100 480"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Connection lines - continuous by default, split only when selected */}
          {sourceConfigs.map(({ id }, index) => {
            const pos = sourcePositions[id];
            const isSelected = selectedSource === id;
            const strokeColor = isSelected ? "rgba(16,185,129,0.8)" : "rgba(16,185,129,0.25)";
            const strokeWidth = isSelected ? "2.5" : "2";

            return (
              <g key={id}>
                {isSelected ? (
                  <>
                    <path
                      d={pos.pathStart}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      fill="none"
                      strokeLinecap="round"
                    />
                    <path
                      d={pos.pathEnd}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      fill="none"
                      strokeLinecap="round"
                    />
                  </>
                ) : (
                  <path
                    d={pos.fullPath}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                  />
                )}
                <circle r="4" fill={accentColor} filter="url(#glow)" opacity="0.8">
                  <animateMotion
                    dur="3s"
                    repeatCount="indefinite"
                    begin={`${index * 0.5}s`}
                    path={pos.fullPath}
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.8;0.8;0"
                    dur="3s"
                    repeatCount="indefinite"
                    begin={`${index * 0.5}s`}
                  />
                </circle>
              </g>
            );
          })}
        </svg>

        {/* 5 Data Source Cards - same design as Personalized Intelligence Dashboard, no glow */}
        {sourceConfigs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onBadgeClick?.(id)}
            className={cn(
              "absolute top-0 flex -translate-x-1/2 items-center justify-center gap-2 rounded-xl border px-4 py-3.5 transition-all overflow-hidden backdrop-blur-sm",
              "min-w-[100px] max-w-[180px] bg-[#0a0f0a]/95",
              "hover:border-emerald-500/40 hover:bg-emerald-500/5",
              selectedSource === id && "border-emerald-500/60 bg-emerald-500/15",
              onBadgeClick && "cursor-pointer"
            )}
            style={{
              left: sourcePositions[id].left,
              borderColor: selectedSource === id ? undefined : `${accentColor}50`,
              boxShadow: selectedSource === id ? `inset 0 1px 0 ${accentColor}20` : `inset 0 1px 0 ${accentColor}15`,
            }}
          >
            <DatabaseIcon className="flex-shrink-0 text-emerald-400" />
            <span className="text-sm font-medium min-w-0 break-words text-center leading-tight text-emerald-100" style={{ maxWidth: "140px" }}>{label}</span>
          </button>
        ))}

        {/* Inline Details - no bubble, uniform position */}
        {sourceConfigs.map(({ id }) => {
          if (selectedSource !== id || !sourceDetails?.[id]) return null;
          return (
            <div
              key={`details-${id}`}
              className="absolute -translate-x-1/2 flex flex-col items-center z-10"
              style={{ left: sourcePositions[id].left, top: "100px" }}
            >
              <ul className="text-[10px] text-emerald-400/90 space-y-1 text-center">
                {sourceDetails[id].map((detail, i) => (
                  <li key={i} className="whitespace-nowrap">{detail}</li>
                ))}
              </ul>
            </div>
          );
        })}

        {/* Ezana Hub - centered at 50% */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[290px] z-20 flex flex-col items-center">
          <motion.div
            className="absolute w-20 h-20 rounded-full"
            style={{ background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)` }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            className="relative grid h-[52px] w-[52px] place-items-center rounded-full border-2 bg-[#141516] font-semibold text-sm shadow-lg z-10"
            style={{
              borderColor: accentColor,
              boxShadow: `0 0 25px ${accentColor}50, 0 0 50px ${accentColor}25`,
            }}
          >
            {circleText || "Ezana"}
          </div>
        </div>

        {/* WiFi-style Signal - Straight horizontal arcs like WiFi symbol */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[350px] flex flex-col items-center z-10">
          <svg width="100" height="50" viewBox="0 0 100 50" className="overflow-visible">
            <motion.path
              d="M 40 20 Q 50 10 60 20"
              fill="none"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
              d="M 28 32 Q 50 8 72 32"
              fill="none"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
              animate={{ opacity: [0.7, 0.25, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            />
            <motion.path
              d="M 16 44 Q 50 6 84 44"
              fill="none"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
              animate={{ opacity: [0.5, 0.15, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />
          </svg>
        </div>

        {/* Personalized Intelligence Dashboard - Glowing Bubble */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="relative group">
            <motion.div
              className="absolute -inset-1 rounded-xl blur-md"
              style={{ background: `linear-gradient(90deg, ${accentColor}20, ${accentColor}35, ${accentColor}20)` }}
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <div
              className="relative flex items-center gap-2.5 px-6 py-3.5 rounded-xl border bg-[#0a0f0a]/95 backdrop-blur-sm"
              style={{
                borderColor: `${accentColor}50`,
                boxShadow: `0 0 30px ${accentColor}20, inset 0 1px 0 ${accentColor}15`,
              }}
            >
              <User className="size-4 text-emerald-400" />
              <span className="text-emerald-100 font-medium text-sm">
                Personalized Intelligence Dashboard
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
