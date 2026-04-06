"use client";

import { useRouter } from "next/navigation";
import { useGlobalPowerMap } from "@/hooks/useGlobalPowerMap";

export function ShowMeDataButton() {
  const selectedLayers = useGlobalPowerMap((s) => s.selectedLayers);
  const router = useRouter();

  if (selectedLayers.length === 0) return null;

  const href = `/empire-ranking?layers=${selectedLayers.join(",")}`;

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: '0.625rem',
        fontWeight: 800,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '0.375rem 1.25rem',
        background: 'rgba(212, 175, 55, 0.08)',
        border: '1px solid rgba(212, 175, 55, 0.30)',
        borderRadius: '4px',
        color: '#D4AF37',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(212, 175, 55, 0.16)';
        e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.60)';
        e.currentTarget.style.color = '#e6c35a';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(212, 175, 55, 0.08)';
        e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.30)';
        e.currentTarget.style.color = '#D4AF37';
      }}
    >
      SHOW ME THE DATA →
    </button>
  );
}
