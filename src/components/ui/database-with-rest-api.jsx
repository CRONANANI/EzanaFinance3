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
      width="5"
      height="5"
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
}) {
  return (
    <div
      className={cn(
        "relative flex h-[350px] w-full max-w-[600px] flex-col items-center",
        className
      )}
    >
      <svg
        className="h-full sm:w-full text-muted"
        width="100%"
        height="100%"
        viewBox="0 0 340 100"
      >
        <g
          stroke="currentColor"
          fill="none"
          strokeWidth="0.4"
          strokeDasharray="100 100"
          pathLength="100"
        >
          <path d="M 38 10 v 15 q 0 5 5 5 h 119 q 5 0 5 5 v 10" />
          <path d="M 118 10 v 10 q 0 5 5 5 h 13 q 5 0 5 5 v 10" />
          <path d="M 198 10 v 10 q 0 5 -5 5 h -14 q -5 0 -5 5 v 10" />
          <path d="M 301 10 v 15 q 0 5 -5 5 h -141 q -5 0 -5 5 v 10" />
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
            r="12"
            fill="url(#db-blue-grad)"
          />
        </g>
        <g mask="url(#db-mask-2)">
          <circle
            className="database db-light-2"
            cx="0"
            cy="0"
            r="12"
            fill="url(#db-blue-grad)"
          />
        </g>
        <g mask="url(#db-mask-3)">
          <circle
            className="database db-light-3"
            cx="0"
            cy="0"
            r="12"
            fill="url(#db-blue-grad)"
          />
        </g>
        <g mask="url(#db-mask-4)">
          <circle
            className="database db-light-4"
            cx="0"
            cy="0"
            r="12"
            fill="url(#db-blue-grad)"
          />
        </g>
        <g stroke="currentColor" fill="none" strokeWidth="0.4">
          <g>
            <rect fill="#18181B" x="5" y="2" width="65" height="16" rx="8" />
            <DatabaseIcon x="10" y="5" />
            <text x="42" y="13" fill="white" stroke="none" fontSize="10" fontWeight="500" textAnchor="middle">
              {badgeTexts?.first || "GET"}
            </text>
          </g>
          <g>
            <rect fill="#18181B" x="85" y="2" width="65" height="16" rx="8" />
            <DatabaseIcon x="90" y="5" />
            <text x="117" y="13" fill="white" stroke="none" fontSize="10" fontWeight="500" textAnchor="middle">
              {badgeTexts?.second || "POST"}
            </text>
          </g>
          <g>
            <rect fill="#18181B" x="165" y="2" width="90" height="16" rx="8" />
            <DatabaseIcon x="170" y="5" />
            <text x="210" y="13" fill="white" stroke="none" fontSize="10" fontWeight="500" textAnchor="middle">
              {badgeTexts?.third || "PUT"}
            </text>
          </g>
          <g>
            <rect fill="#18181B" x="268" y="2" width="67" height="16" rx="8" />
            <DatabaseIcon x="273" y="5" />
            <text x="301" y="13" fill="white" stroke="none" fontSize="10" fontWeight="500" textAnchor="middle">
              {badgeTexts?.fourth || "DELETE"}
            </text>
          </g>
        </g>
        <defs>
          <mask id="db-mask-1">
            <path
              d="M 38 10 v 15 q 0 5 5 5 h 119 q 5 0 5 5 v 10"
              strokeWidth="0.5"
              stroke="white"
            />
          </mask>
          <mask id="db-mask-2">
            <path
              d="M 118 10 v 10 q 0 5 5 5 h 13 q 5 0 5 5 v 10"
              strokeWidth="0.5"
              stroke="white"
            />
          </mask>
          <mask id="db-mask-3">
            <path
              d="M 198 10 v 10 q 0 5 -5 5 h -14 q -5 0 -5 5 v 10"
              strokeWidth="0.5"
              stroke="white"
            />
          </mask>
          <mask id="db-mask-4">
            <path
              d="M 301 10 v 15 q 0 5 -5 5 h -141 q -5 0 -5 5 v 10"
              strokeWidth="0.5"
              stroke="white"
            />
          </mask>
          <radialGradient id="db-blue-grad" fx="1">
            <stop offset="0%" stopColor={lightColor || "#00A6F5"} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
      </svg>
      <div className="absolute bottom-10 flex w-full flex-col items-center">
        <div className="absolute -bottom-4 h-[100px] w-[62%] rounded-lg bg-accent/30" />
        <div className="absolute -top-3 z-20 flex items-center justify-center rounded-lg border bg-[#101112] px-2 py-1 sm:-top-4 sm:py-1.5">
          <Sparkles className="size-3" />
          <span className="ml-2 text-[15px]">
            {title || "Data exchange using a customized REST API"}
          </span>
        </div>
        <div className="absolute -bottom-8 z-30 grid h-[60px] w-[60px] place-items-center rounded-full border-t bg-[#141516] font-semibold text-xs">
          {circleText || "SVG"}
        </div>
        <div className="relative z-10 flex h-[150px] w-full items-center justify-center overflow-hidden rounded-lg border bg-background shadow-md">
          <div className="absolute bottom-8 left-12 z-10 flex h-7 items-center gap-2 rounded-full border bg-[#101112] px-3 text-xs">
            <HeartHandshake className="size-4" />
            <span>{buttonTexts?.first || "LegionDev"}</span>
          </div>
          <div className="absolute right-16 z-10 hidden h-7 items-center gap-2 rounded-full border bg-[#101112] px-3 text-xs sm:flex">
            <Folder className="size-4" />
            <span>{buttonTexts?.second || "v2_updates"}</span>
          </div>
          <motion.div
            className="absolute -bottom-14 h-[100px] w-[100px] rounded-full border-t bg-accent/5"
            animate={{ scale: [0.98, 1.02, 0.98, 1, 1, 1, 1, 1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-20 h-[145px] w-[145px] rounded-full border-t bg-accent/5"
            animate={{ scale: [1, 1, 1, 0.98, 1.02, 0.98, 1, 1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-[100px] h-[190px] w-[190px] rounded-full border-t bg-accent/5"
            animate={{ scale: [1, 1, 1, 1, 1, 0.98, 1.02, 0.98, 1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-[120px] h-[235px] w-[235px] rounded-full border-t bg-accent/5"
            animate={{ scale: [1, 1, 1, 1, 1, 1, 0.98, 1.02, 0.98, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>
    </div>
  );
}
