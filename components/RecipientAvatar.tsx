"use client";

import React, { useMemo } from "react";

interface RecipientAvatarProps {
  address?: string | null;
  handle?: string | null;
  size?: number; // size in px, default 44
  className?: string;
}

const GRADIENT_PALETTES = [
  { from: "#6366F1", to: "#EC4899" }, // indigo to pink
  { from: "#8B5CF6", to: "#3B82F6" }, // violet to blue
  { from: "#10B981", to: "#06B6D4" }, // emerald to cyan
  { from: "#F59E0B", to: "#EF4444" }, // amber to red
  { from: "#EC4899", to: "#8B5CF6" }, // pink to violet
  { from: "#14F195", to: "#9945FF" }, // solana green to solana purple
  { from: "#38BDF8", to: "#6366F1" }, // sky to indigo
  { from: "#F43F5E", to: "#FB923C" }, // rose to orange
];

export default function RecipientAvatar({
  address,
  handle,
  size = 44,
  className = "",
}: RecipientAvatarProps) {
  const { gradient, initial, ringColor } = useMemo(() => {
    const seed = (handle || address || "DPI").trim();

    // Deterministic hash
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absHash = Math.abs(hash);
    const palette = GRADIENT_PALETTES[absHash % GRADIENT_PALETTES.length];

    let letter = "@";
    if (handle) {
      const clean = handle.replace(/^@/, "").trim();
      letter = clean.length > 0 ? clean[0].toUpperCase() : "@";
    } else if (address) {
      letter = address[0].toUpperCase();
    }

    return {
      gradient: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
      ringColor: `${palette.from}55`,
      initial: letter,
    };
  }, [address, handle]);

  return (
    <div
      className={`relative rounded-2xl flex items-center justify-center font-black text-white select-none shadow-md shrink-0 transition-transform duration-300 animate-in fade-in zoom-in-75 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: gradient,
        boxShadow: `0 4px 15px ${ringColor}`,
        fontSize: `${Math.round(size * 0.42)}px`,
      }}
    >
      <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{initial}</span>
      {/* Subtle glossy overlay */}
      <div className="absolute inset-0 rounded-2xl bg-white/10 pointer-events-none" />
    </div>
  );
}
