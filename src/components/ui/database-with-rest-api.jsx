"use client";

import React from "react";
import { motion } from "motion/react";
import { Sparkles, ArrowDown, User } from "lucide-react";
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
  return (
    <div
      className={cn(
        "relative flex w-full max-w-[520px] flex-col items-center gap-0",
        className
      )}
    >
      {/* 1. Title card - ABOVE the 4 data source cards */}
      <div className="mb-4 flex w-full items-center justify-center rounded-lg border bg-[#101112] px-4 py-3 shadow-md">
        <Sparkles className="size-4 shrink-0 text-emerald-500" />
        <span className="ml-2 text-center text-sm font-medium">
          {title || "Institutional-grade data from verified sources"}
        </span>
      </div>

      {/* 2. Four data source cards (Congress, 13F, Institutional, Alternative Analytics) */}
      <div className="mb-2 grid w-full grid-cols-4 gap-2">
        {[
          { key: "first", id: "congress", label: badgeTexts?.first || "Congress" },
          { key: "second", id: "13f", label: badgeTexts?.second || "13F" },
          { key: "third", id: "institutional", label: badgeTexts?.third || "Institutional" },
          { key: "fourth", id: "analytics", label: badgeTexts?.fourth || "Analytics" },
        ].map(({ key, id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onBadgeClick?.(id)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border bg-[#18181B] px-2 py-2.5 transition-colors hover:bg-[#27272a]",
              onBadgeClick && "cursor-pointer"
            )}
          >
            <DatabaseIcon />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* 3. Flow arrows: 4 cards → Ezana */}
      <div className="flex flex-col items-center py-1">
        <ArrowDown className="size-4 text-muted-foreground/60" />
        <span className="mt-0.5 text-[10px] text-muted-foreground/70">
          feeds into
        </span>
      </div>

      {/* 4. Ezana - filters & creates */}
      <div className="relative z-20 flex flex-col items-center">
        <div
          className="grid h-[36px] w-[36px] place-items-center rounded-full border-2 border-emerald-500/50 bg-[#141516] font-semibold text-xs"
          style={{ borderTopColor: lightColor || "#10b981" }}
        >
          {circleText || "Ezana"}
        </div>
        <span className="mt-1.5 text-[10px] text-muted-foreground/80">
          filters & creates
        </span>
      </div>

      {/* 5. Flow arrows: Ezana → You */}
      <div className="flex flex-col items-center py-1">
        <ArrowDown className="size-4 text-muted-foreground/60" />
      </div>

      {/* 6. Output: Feeds & metrics tailored for you (no Alpha Vantage / SEC EDGAR) */}
      <div className="relative z-10 flex h-[70px] w-full items-center justify-center overflow-hidden rounded-lg border bg-background shadow-md">
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
  );
}
