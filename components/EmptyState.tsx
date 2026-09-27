"use client";

import React from "react";
import Link from "next/link";
import { WalletMultiButton } from "@/components/WalletButton";

export type EmptyStateType =
  | "no-handle"
  | "no-history"
  | "no-results"
  | "not-connected";

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  type,
  title,
  description,
  actionText,
  actionHref,
  onAction,
  className = "",
}: EmptyStateProps) {
  const renderIllustration = () => {
    switch (type) {
      case "no-handle":
        return (
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center animate-pulse">
            <svg
              className="w-full h-full text-indigo-400/80 drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]"
              viewBox="0 0 120 120"
              fill="none"
              stroke="currentColor"
            >
              {/* Dotted orbital ring */}
              <circle
                cx="60"
                cy="60"
                r="45"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="opacity-40 animate-[spin_20s_linear_infinite]"
              />
              <circle cx="60" cy="15" r="3" fill="currentColor" className="opacity-80" />
              <circle cx="105" cy="60" r="2" fill="currentColor" className="opacity-60" />
              <circle cx="25" cy="80" r="2.5" fill="currentColor" className="opacity-70" />
              
              {/* Floating @ symbol */}
              <text
                x="60"
                y="72"
                textAnchor="middle"
                fontSize="42"
                fontWeight="900"
                fontFamily="monospace"
                fill="currentColor"
                stroke="none"
                className="animate-[bounce_3s_ease-in-out_infinite]"
              >
                @
              </text>

              {/* Little '+' cursor badge */}
              <g transform="translate(75, 70)">
                <circle cx="10" cy="10" r="10" fill="#6366F1" stroke="#111827" strokeWidth="2" />
                <path d="M10 6v8M6 10h8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
              </g>
            </svg>
          </div>
        );

      case "no-history":
        return (
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <svg
              className="w-full h-full text-indigo-400/80 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              viewBox="0 0 120 120"
              fill="none"
              stroke="currentColor"
            >
              {/* Left Wallet */}
              <rect
                x="15"
                y="40"
                width="32"
                height="40"
                rx="6"
                strokeWidth="2"
                className="stroke-indigo-400 fill-indigo-950/40"
              />
              <circle cx="38" cy="60" r="3" fill="currentColor" />

              {/* Right Wallet */}
              <rect
                x="73"
                y="40"
                width="32"
                height="40"
                rx="6"
                strokeWidth="2"
                className="stroke-purple-400 fill-purple-950/40"
              />
              <circle cx="82" cy="60" r="3" fill="currentColor" />

              {/* Dotted Transfer Arrow */}
              <path
                d="M48 60 H72"
                strokeWidth="2"
                strokeDasharray="3 3"
                strokeLinecap="round"
                className="stroke-cyan-400"
              />
              <path
                d="M68 56 L72 60 L68 64"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-cyan-400"
              />

              {/* Ambient dots */}
              <circle cx="60" cy="28" r="2" fill="#EC4899" className="opacity-70 animate-ping" />
            </svg>
          </div>
        );

      case "no-results":
        return (
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <svg
              className="w-full h-full text-indigo-400/80"
              viewBox="0 0 120 120"
              fill="none"
              stroke="currentColor"
            >
              {/* Magnifying Glass */}
              <circle
                cx="52"
                cy="52"
                r="26"
                strokeWidth="2.5"
                className="stroke-indigo-400 fill-indigo-950/30"
              />
              <path
                d="M72 72 L96 96"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="stroke-indigo-400"
              />
              {/* Question Mark inside lens */}
              <text
                x="52"
                y="62"
                textAnchor="middle"
                fontSize="24"
                fontWeight="900"
                fill="currentColor"
                stroke="none"
                className="fill-indigo-300"
              >
                ?
              </text>
            </svg>
          </div>
        );

      case "not-connected":
        return (
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <svg
              className="w-full h-full text-indigo-400/80 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              viewBox="0 0 120 120"
              fill="none"
              stroke="currentColor"
            >
              {/* Disconnected Plug left */}
              <g transform="translate(18, 45)">
                <rect x="0" y="5" width="22" height="20" rx="4" strokeWidth="2" className="stroke-indigo-400" />
                <line x1="22" y1="10" x2="30" y2="10" strokeWidth="2.5" strokeLinecap="round" className="stroke-indigo-300" />
                <line x1="22" y1="20" x2="30" y2="20" strokeWidth="2.5" strokeLinecap="round" className="stroke-indigo-300" />
                <path d="M0 15 H-8" strokeWidth="2" strokeLinecap="round" className="stroke-slate-500" />
              </g>

              {/* Spark between */}
              <path
                d="M58 54 L62 58 L58 66 L64 70"
                strokeWidth="2"
                strokeLinecap="round"
                className="stroke-amber-400 animate-pulse"
              />

              {/* Socket right */}
              <g transform="translate(72, 45)">
                <rect x="10" y="5" width="22" height="20" rx="4" strokeWidth="2" className="stroke-purple-400" />
                <line x1="10" y1="10" x2="6" y2="10" strokeWidth="2.5" strokeLinecap="round" className="stroke-purple-300" />
                <line x1="10" y1="20" x2="6" y2="20" strokeWidth="2.5" strokeLinecap="round" className="stroke-purple-300" />
                <path d="M32 15 H40" strokeWidth="2" strokeLinecap="round" className="stroke-slate-500" />
              </g>
            </svg>
          </div>
        );
    }
  };

  const defaultTitles: Record<EmptyStateType, string> = {
    "no-handle": "No Handle Claimed Yet",
    "no-history": "No Transactions Yet",
    "no-results": "No Matches Found",
    "not-connected": "Wallet Not Connected",
  };

  const defaultDescriptions: Record<EmptyStateType, string> = {
    "no-handle": "Claim your unique @handle on Solana DPI to receive SOL & tokens easily without long public keys.",
    "no-history": "Your on-chain transfer activity and payment requests will show up here.",
    "no-results": "Try adjusting your search keywords or search by full Solana address.",
    "not-connected": "Connect your Solana wallet to interact with the DPI protocol and view your assets.",
  };

  const currentTitle = title || defaultTitles[type];
  const currentDesc = description || defaultDescriptions[type];

  return (
    <div
      className={`p-8 text-center flex flex-col items-center gap-3 bg-(--bg-card) border border-(--border) rounded-3xl ${className}`}
    >
      {renderIllustration()}

      <div className="max-w-xs">
        <h3 className="text-base font-black text-foreground tracking-tight">{currentTitle}</h3>
        <p className="text-xs text-(--text-muted) mt-1 leading-relaxed">{currentDesc}</p>
      </div>

      {type === "not-connected" ? (
        <div className="mt-2 scale-95">
          <WalletMultiButton />
        </div>
      ) : actionText && actionHref ? (
        <Link
          href={actionHref}
          className="mt-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-500/25 active:scale-95 transition-all"
        >
          {actionText}
        </Link>
      ) : actionText && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
        >
          {actionText}
        </button>
      ) : null}
    </div>
  );
}
