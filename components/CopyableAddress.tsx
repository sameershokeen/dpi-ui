"use client";

import React, { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { useNetwork, getExplorerUrl } from "@/components/NetworkContext";

interface CopyableAddressProps {
  address: string;
  prefixLen?: number;
  suffixLen?: number;
  showExplorer?: boolean;
  className?: string;
}

export default function CopyableAddress({
  address,
  prefixLen = 6,
  suffixLen = 4,
  showExplorer = false,
  className = "",
}: CopyableAddressProps) {
  const { network } = useNetwork();
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const display =
    address.length > prefixLen + suffixLen + 3
      ? `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`
      : address;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    triggerHaptic("tap");
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className={`relative inline-flex items-center gap-1.5 font-mono text-xs ${className}`}>
      {/* Floating Copied Tooltip */}
      {copied && (
        <div
          role="status"
          aria-live="polite"
          className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-emerald-500 text-black font-sans text-[10px] font-black shadow-lg pointer-events-none animate-in fade-in zoom-in-75 duration-150 z-30 flex items-center gap-1"
        >
          <Check size={11} strokeWidth={3} />
          Copied
        </div>
      )}

      <button
        type="button"
        onClick={handleCopy}
        title="Click to copy full address"
        className={`group inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all active:scale-95 cursor-pointer ${
          copied
            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
            : "bg-white/4 hover:bg-white/8 border-white/10 hover:border-indigo-400/40 text-slate-300 hover:text-white"
        }`}
      >
        <span className="font-semibold select-all">{display}</span>
        {copied ? (
          <Check size={12} className="text-emerald-400 shrink-0" />
        ) : (
          <Copy
            size={12}
            className="text-slate-400 group-hover:text-indigo-300 shrink-0 transition-colors"
          />
        )}
      </button>

      {showExplorer && (
        <a
          href={getExplorerUrl("address", address, network)}
          target="_blank"
          rel="noopener noreferrer"
          title="View on Solana Explorer"
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded-lg bg-white/4 hover:bg-white/8 border border-white/10 text-slate-400 hover:text-indigo-300 transition-all active:scale-95"
        >
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}
