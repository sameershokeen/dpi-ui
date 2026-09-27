"use client";

import React from "react";
import Card from "@/components/Card";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`skeleton-shimmer rounded-xl bg-white/5 border border-white/5 ${className}`}
    />
  );
}

export function CommunityListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-3.5 border-white/8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar circle skeleton */}
              <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-24 h-4 rounded-md" />
                  <Skeleton className="w-12 h-3.5 rounded-full" />
                </div>
                <Skeleton className="w-28 h-3 rounded-md" />
              </div>
            </div>
            {/* Action button skeleton */}
            <Skeleton className="w-16 h-8 rounded-xl shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function HistoryListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-white/3 border border-white/6"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Icon skeleton */}
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="flex flex-col gap-1.5 min-w-0">
              <Skeleton className="w-32 h-4 rounded-md" />
              <Skeleton className="w-20 h-3 rounded-md" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Skeleton className="w-16 h-4 rounded-md" />
            <Skeleton className="w-10 h-3 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HandlePageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Handle card skeleton */}
      <Card className="p-6 border-indigo-500/25">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="w-36 h-6 rounded-lg" />
            <Skeleton className="w-48 h-3.5 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/8">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      </Card>
    </div>
  );
}

export function BalanceCardSkeleton() {
  return (
    <div className="rounded-3xl p-6 bg-linear-to-br from-indigo-950/40 via-[#161E36]/40 to-[#0E1322]/40 border border-white/10 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <Skeleton className="w-28 h-4 rounded-md" />
        <Skeleton className="w-16 h-4 rounded-full" />
      </div>
      <Skeleton className="w-44 h-10 rounded-xl my-1" />
      <Skeleton className="w-32 h-4 rounded-md" />
      <div className="grid grid-cols-2 gap-3 mt-2">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    </div>
  );
}
