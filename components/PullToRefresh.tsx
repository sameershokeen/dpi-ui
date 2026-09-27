"use client";

import React, { useState, useRef, useEffect, ReactNode } from "react";
import { RefreshCw, ArrowDown } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { useToast } from "@/components/Toast";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
}

const PULL_THRESHOLD = 70;

export default function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || refreshing) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop <= 5) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    } else {
      isPullingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || disabled || refreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      // Apply diminishing pull resistance
      const resistedDistance = Math.min(diff * 0.45, 110);
      setPullDistance(resistedDistance);

      if (resistedDistance >= PULL_THRESHOLD && pullDistance < PULL_THRESHOLD) {
        triggerHaptic("tap");
      }
    } else {
      setPullDistance(0);
      isPullingRef.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current || disabled) return;
    isPullingRef.current = false;

    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      triggerHaptic("selection");
      try {
        await onRefresh();
        toast.info("Refreshed data from Solana", "Updated ✓");
        triggerHaptic("success");
      } catch {
        // error handling handled by caller
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  const isTriggerable = pullDistance >= PULL_THRESHOLD;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full"
    >
      {/* Pull to refresh visual indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          style={{ height: `${refreshing ? 50 : pullDistance}px` }}
          className="overflow-hidden transition-all duration-150 flex items-center justify-center text-xs font-bold text-indigo-400 bg-indigo-950/20 border-b border-indigo-500/20"
        >
          <div className="flex items-center gap-2 py-2">
            <RefreshCw
              size={15}
              className={`${
                refreshing
                  ? "animate-spin text-indigo-400"
                  : isTriggerable
                  ? "rotate-180 text-emerald-400"
                  : "text-slate-400"
              } transition-transform duration-200`}
            />
            <span className="text-[11px]">
              {refreshing
                ? "Refreshing Solana on-chain data..."
                : isTriggerable
                ? "Release to refresh"
                : "Pull down to refresh"}
            </span>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
