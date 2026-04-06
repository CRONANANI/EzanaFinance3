"use client";

import { useRouter } from "next/navigation";
import { useGlobalPowerMap } from "@/hooks/useGlobalPowerMap";

export function ShowMeDataButton() {
  const selectedLayers = useGlobalPowerMap((s) => s.selectedLayers);
  const router = useRouter();

  if (selectedLayers.length === 0) return null;

  const href = `/empire-ranking?layers=${selectedLayers.join(",")}`;

  return (
    <div className="relative flex items-center justify-center mt-1 min-h-[2.25rem] px-1">
      <span
        className="absolute rounded-full powermap-ring-a"
        aria-hidden
      />
      <span
        className="absolute rounded-full powermap-ring-b"
        aria-hidden
      />
      <span
        className="absolute rounded-full powermap-ring-c"
        aria-hidden
      />

      <button
        type="button"
        onClick={() => router.push(href)}
        className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-95 powermap-data-btn-inner"
      >
        <span className="w-2 h-2 rounded-full bg-white powermap-dot-pulse" aria-hidden />
        Show me the data
        <span className="text-purple-200">→</span>
      </button>
    </div>
  );
}
