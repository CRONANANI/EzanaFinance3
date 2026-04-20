"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, ExternalLink } from "lucide-react";
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

/**
 * Animated data-flow visualization for the landing "Data Sources & Resources" card.
 *
 * Interaction model is hover-only: there is no onClick, no navigation, no modal.
 * Hovering a category badge fills it with the accent (WCAG-AA safe emerald-700 on
 * white text) and reveals an absolutely-positioned source panel. The badge + panel
 * share a common <div> wrapper so moving the cursor from button to panel does not
 * trigger a leave event — the panel stays open as long as the cursor is anywhere
 * inside that wrapper.
 *
 * The sourceDetails prop now carries structured source entries (name + description)
 * instead of flat strings, e.g.:
 *   { congress: { tagline: "...", sources: [{ name, description }] } }
 */
export default function DatabaseWithRestApi({
  className,
  circleText,
  badgeTexts,
  title,
  lightColor,
  sourceDetails,
}) {
  const accentColor = lightColor || "#10b981";
  const [hoveredSource, setHoveredSource] = useState(null);

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
      <h3 className="mb-8 text-center text-lg font-semibold text-emerald-500">
        {title || "Institutional-grade data from verified sources"}
      </h3>

      <div className="relative w-full" style={{ minHeight: "480px" }}>
        {/* SVG Connection Lines — now keyed off hoveredSource instead of a click-selected source */}
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

          {sourceConfigs.map(({ id }, index) => {
            const pos = sourcePositions[id];
            const isActive = hoveredSource === id;
            const strokeColor = isActive ? "rgba(16,185,129,0.8)" : "rgba(16,185,129,0.25)";
            const strokeWidth = isActive ? "2.5" : "2";

            return (
              <g key={id}>
                {isActive ? (
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

        {/* Badge + expanded-source panel live in the SAME relatively-positioned wrapper.
            That shared hover zone is what keeps the panel open when the cursor moves
            from the button down onto the panel — a mouseleave only fires when the
            cursor exits the wrapper entirely. */}
        {sourceConfigs.map(({ id, label }) => {
          const isWideCard = id === "institutional" || id === "analytics";
          const isHovered = hoveredSource === id;
          const detail = sourceDetails?.[id];

          return (
            <div
              key={id}
              className="absolute top-0 -translate-x-1/2"
              style={{ left: sourcePositions[id].left }}
              onMouseEnter={() => setHoveredSource(id)}
              onMouseLeave={() =>
                setHoveredSource((prev) => (prev === id ? null : prev))
              }
            >
              {/* Badge — hover-only. No onClick, no router.push, no modal. Informational
                  cursor (cursor-help) matches the read-only affordance. aria-expanded
                  mirrors hover state so the panel's visibility is announced to AT users. */}
              <div
                role="button"
                tabIndex={0}
                aria-describedby={`sources-${id}`}
                aria-expanded={isHovered}
                onFocus={() => setHoveredSource(id)}
                onBlur={() =>
                  setHoveredSource((prev) => (prev === id ? null : prev))
                }
                className={cn(
                  "select-none cursor-help flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 overflow-hidden backdrop-blur-sm",
                  "transition-all duration-200 ease-out",
                  isWideCard ? "min-w-[200px] max-w-[240px]" : "min-w-[100px] max-w-[180px]",
                  isHovered
                    ? "bg-emerald-700 border-emerald-500 shadow-lg shadow-emerald-500/20"
                    : "bg-[#0a0f0a]/95 hover:border-emerald-500/40"
                )}
                style={{
                  borderColor: isHovered ? undefined : `${accentColor}50`,
                  boxShadow: isHovered
                    ? `0 10px 30px -10px ${accentColor}55, inset 0 1px 0 ${accentColor}40`
                    : `inset 0 1px 0 ${accentColor}15`,
                }}
              >
                <DatabaseIcon
                  className={cn(
                    "flex-shrink-0 transition-colors duration-200",
                    isHovered ? "text-white" : "text-emerald-400"
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-medium text-center leading-tight transition-colors duration-200",
                    isHovered ? "text-white" : "text-emerald-100",
                    isWideCard ? "whitespace-nowrap" : "min-w-0 break-words"
                  )}
                  style={isWideCard ? undefined : { maxWidth: "140px" }}
                >
                  {label}
                </span>
              </div>

              {/* Expanded source panel. Gets its OWN neutral surface so text contrast
                  is against a dark card, not the emerald hover-fill. Positioned under
                  the badge (top: 100%) with a small mt-2 gap. z-30 so it layers above
                  the SVG paths and the Ezana hub. */}
              {isHovered && detail && (
                <div
                  id={`sources-${id}`}
                  role="tooltip"
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 mt-2 z-30",
                    "rounded-xl border p-4",
                    "w-[280px] sm:w-[300px]",
                    "transition-opacity duration-150"
                  )}
                  style={{
                    top: "100%",
                    background: "rgba(10, 15, 10, 0.98)",
                    borderColor: `${accentColor}40`,
                    boxShadow: `0 12px 32px -8px rgba(0,0,0,0.6), 0 0 0 1px ${accentColor}10`,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {detail.tagline && (
                    <div className="text-[11px] leading-snug text-emerald-200/80 mb-3">
                      {detail.tagline}
                    </div>
                  )}
                  <div className="text-[10px] uppercase tracking-wide font-semibold text-emerald-400/80 mb-2">
                    Powered by
                  </div>
                  <ul className="space-y-2.5">
                    {detail.sources?.map((src) => (
                      <li key={src.name} className="flex items-start gap-2">
                        <ExternalLink
                          className="h-3 w-3 mt-[3px] text-emerald-400/70 shrink-0"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white">
                            {src.name}
                          </div>
                          <div className="text-[11px] text-emerald-100/70 leading-snug">
                            {src.description}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
            className="relative grid h-[52px] w-[52px] place-items-center rounded-full border-2 bg-[#141516] font-semibold text-sm text-white shadow-lg z-10"
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
