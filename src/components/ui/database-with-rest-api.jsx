"use client";

import React from "react";
import { motion } from "motion/react";
import { Folder, HeartHandshake, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function DatabaseIcon({ x = "0", y = "0" }) {
  return (
    <svg
      x={x}
      y={y}
      xmlns="http://www.w3.org/2000/svg"
      width="4"
      height="4"
      viewBox="0 0 24 24"
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
  buttonTexts,
  title,
  lightColor,
  onBadgeClick,
}) {
  const badges = [
    { key: "first", id: "congress" },
    { key: "second", id: "13f" },
    { key: "third", id: "institutional" },
    { key: "fourth", id: "analytics" },
  ];

  return (
    <div
      className={cn(
        "relative flex h-[175px] w-full max-w-[500px] flex-col items-center",
        className
      )}
    >
      <svg
        className="h-full sm:w-full text-muted"
        width="100%"
        height="100%"
        viewBox="0 0 200 100"
      >
        <g
          stroke="currentColor"
          fill="none"
          strokeWidth="0.4"
          strokeDasharray="100 100"
          pathLength="100"
        >
          <path d="M 31 10 v 15 q 0 5 5 5 h 59 q 5 0 5 5 v 10" />
          <path d="M 77 10 v 10 q 0 5 5 5 h 13 q 5 0 5 5 v 10" />
          <path d="M 124 10 v 10 q 0 5 -5 5 h -14 q -5 0 -5 5 v 10" />
          <path d="M 170 10 v 15 q 0 5 -5 5 h -60 q -5 0 -5 5 v 10" />
          <animate
            attributeName="stroke-dashoffset"
            from="100"
            to="0"
            dur="1s"
            fill="freeze"
            calcMode="spline"
            keySplines="0.25,0.1,0.5,1"
            keyTimes="0; 1"
          />
        </g>
        <g mask="url(#db-mask-1)">
          <circle
            className="database db-light-1"
            cx="0"
            cy="0"
            r="8"
            fill="url(#db-blue-grad)"
          />
        </g>
        <g mask="url(#db-mask-2)">
          <circle
            className="database db-light-2"
            cx="0"
            cy="0"
            r="8"
            fill="url(#db-blue-grad)"
          />
        </g>
        <g mask="url(#db-mask-3)">
          <circle
            className="database db-light-3"
            cx="0"
            cy="0"
            r="8"
            fill="url(#db-blue-grad)"
          />
        </g>
        <g mask="url(#db-mask-4)">
          <circle
            className="database db-light-4"
            cx="0"
            cy="0"
            r="8"
            fill="url(#db-blue-grad)"
          />
        </g>
        <g stroke="currentColor" fill="none" strokeWidth="0.4">
          <g
            className={onBadgeClick ? "cursor-pointer" : ""}
            onClick={() => onBadgeClick?.("congress")}
          >
            <rect fill="#18181B" x="14" y="5" width="34" height="10" rx="5" />
            <DatabaseIcon x="18" y="7.5" />
            <text
              x="31"
              y="12"
              fill="white"
              stroke="none"
              fontSize="5"
              fontWeight="500"
              textAnchor="middle"
            >
              {badgeTexts?.first || "Congress"}
            </text>
          </g>
          <g
            className={onBadgeClick ? "cursor-pointer" : ""}
            onClick={() => onBadgeClick?.("13f")}
          >
            <rect fill="#18181B" x="60" y="5" width="34" height="10" rx="5" />
            <DatabaseIcon x="64" y="7.5" />
            <text
              x="77"
              y="12"
              fill="white"
              stroke="none"
              fontSize="5"
              fontWeight="500"
              textAnchor="middle"
            >
              {badgeTexts?.second || "13F"}
            </text>
          </g>
          <g
            className={onBadgeClick ? "cursor-pointer" : ""}
            onClick={() => onBadgeClick?.("institutional")}
          >
            <rect fill="#18181B" x="108" y="5" width="34" height="10" rx="5" />
            <DatabaseIcon x="112" y="7.5" />
            <text
              x="122"
              y="12"
              fill="white"
              stroke="none"
              fontSize="4"
              fontWeight="500"
              textAnchor="middle"
            >
              {badgeTexts?.third || "Institutional"}
            </text>
          </g>
          <g
            className={onBadgeClick ? "cursor-pointer" : ""}
            onClick={() => onBadgeClick?.("analytics")}
          >
            <rect fill="#18181B" x="150" y="5" width="40" height="10" rx="5" />
            <DatabaseIcon x="154" y="7.5" />
            <text
              x="165"
              y="12"
              fill="white"
              stroke="none"
              fontSize="4"
              fontWeight="500"
              textAnchor="middle"
            >
              {badgeTexts?.fourth || "Analytics"}
            </text>
          </g>
        </g>
        <defs>
          <mask id="db-mask-1">
            <path
              d="M 31 10 v 15 q 0 5 5 5 h 59 q 5 0 5 5 v 10"
              strokeWidth="0.5"
              stroke="white"
            />
          </mask>
          <mask id="db-mask-2">
            <path
              d="M 77 10 v 10 q 0 5 5 5 h 13 q 5 0 5 5 v 10"
              strokeWidth="0.5"
              stroke="white"
            />
          </mask>
          <mask id="db-mask-3">
            <path
              d="M 124 10 v 10 q 0 5 -5 5 h -14 q -5 0 -5 5 v 10"
              strokeWidth="0.5"
              stroke="white"
            />
          </mask>
          <mask id="db-mask-4">
            <path
              d="M 170 10 v 15 q 0 5 -5 5 h -60 q -5 0 -5 5 v 10"
              strokeWidth="0.5"
              stroke="white"
            />
          </mask>
          <radialGradient id="db-blue-grad" fx="1">
            <stop offset="0%" stopColor={lightColor || "#10b981"} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
      </svg>
      <div className="absolute bottom-5 flex w-full flex-col items-center">
        <div className="absolute -bottom-2 h-[50px] w-[62%] rounded-lg bg-accent/30" />
        <div className="absolute -top-1.5 z-20 flex items-center justify-center rounded-lg border bg-[#101112] px-2 py-0.5 sm:-top-2 sm:py-1">
          <Sparkles className="size-2.5" />
          <span className="ml-1.5 text-[10px]">
            {title || "Institutional-grade data from verified sources"}
          </span>
        </div>
        <div className="absolute -bottom-4 z-30 grid h-[30px] w-[30px] place-items-center rounded-full border-t bg-[#141516] font-semibold text-[10px]">
          {circleText || "Ezana"}
        </div>
        <div className="relative z-10 flex h-[75px] w-full items-center justify-center overflow-hidden rounded-lg border bg-background shadow-md">
          <div className="absolute bottom-4 left-6 z-10 flex h-5 items-center gap-1.5 rounded-full border bg-[#101112] px-2 text-[8px]">
            <HeartHandshake className="size-3" />
            <span>{buttonTexts?.first || "Alpha Vantage"}</span>
          </div>
          <div className="absolute right-8 z-10 hidden h-5 items-center gap-1.5 rounded-full border bg-[#101112] px-2 text-[8px] sm:flex">
            <Folder className="size-3" />
            <span>{buttonTexts?.second || "SEC EDGAR"}</span>
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
          <motion.div
            className="absolute -bottom-[60px] h-[118px] w-[118px] rounded-full border-t bg-accent/5"
            animate={{ scale: [1, 1, 1, 1, 1, 1, 0.98, 1.02, 0.98, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>
    </div>
  );
}
