"use client";

import React, { useEffect, useRef, useState } from "react";

interface AnimatedBalanceProps {
  value: number | null;
  decimals?: number;
  symbol?: string;
  className?: string;
}

export default function AnimatedBalance({
  value,
  decimals = 4,
  symbol = "SOL",
  className = "",
}: AnimatedBalanceProps) {
  const [displayValue, setDisplayValue] = useState<number | null>(value);
  const [changeInfo, setChangeInfo] = useState<{
    diff: number;
    type: "increase" | "decrease";
  } | null>(null);
  const [glowType, setGlowType] = useState<"increase" | "decrease" | null>(null);

  const prevValueRef = useRef<number | null>(value);
  const animFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === null) {
      setDisplayValue(null);
      prevValueRef.current = null;
      return;
    }

    const prev = prevValueRef.current;
    prevValueRef.current = value;

    // First load / initialize without animation
    if (prev === null) {
      setDisplayValue(value);
      return;
    }

    const diff = value - prev;
    if (Math.abs(diff) < 0.00001) {
      setDisplayValue(value);
      return;
    }

    const isIncrease = diff > 0;
    const type = isIncrease ? "increase" : "decrease";

    // Set change badge and glow
    setChangeInfo({ diff, type });
    setGlowType(type);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setChangeInfo(null);
      setGlowType(null);
    }, 2500);

    // Smooth counter roll over 600ms
    const startTime = performance.now();
    const duration = 600;

    const startVal = prev;
    const endVal = value;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value]);

  return (
    <div className={`relative inline-flex flex-col ${className}`}>
      {/* Floating diff badge */}
      {changeInfo && (
        <div
          className={`absolute -top-5 left-0 px-2 py-0.5 rounded-md text-[11px] font-black font-mono tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-none shadow-sm ${
            changeInfo.type === "increase"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
          }`}
        >
          {changeInfo.diff > 0 ? "+" : ""}
          {changeInfo.diff.toFixed(decimals)} {symbol}
        </div>
      )}

      <div className="flex items-baseline gap-2">
        <span
          className={`text-4xl font-black text-foreground tracking-tight font-sans transition-all duration-300 ${
            glowType === "increase"
              ? "\!text-emerald-600 dark:\!text-emerald-300 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              : glowType === "decrease"
              ? "\!text-rose-600 dark:\!text-rose-300 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]"
              : ""
          }`}
        >
          {displayValue !== null ? displayValue.toFixed(decimals) : "—"}
        </span>
        {symbol && (
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{symbol}</span>
        )}
      </div>
    </div>
  );
}
