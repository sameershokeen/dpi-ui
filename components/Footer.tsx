"use client";

import { PROGRAM_ID } from "@/lib/dpi-program";
import { useNetwork } from "@/components/NetworkContext";
import { ExternalLink, Code2, BookOpen, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const { network } = useNetwork();
  const clusterParam = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  const explorerUrl = `https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}${clusterParam}`;

  const shortProgramId = `${PROGRAM_ID.toBase58().slice(0, 6)}...${PROGRAM_ID.toBase58().slice(-4)}`;

  return (
    <footer className="w-full mt-auto border-t border-white/8 bg-[#070A12]/90 backdrop-blur-xl px-4 py-6 text-xs text-slate-400">
      <div className="flex flex-col gap-4">
        {/* Protocol Identity & Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-indigo-500/30 shadow-sm bg-[#090B10] shrink-0">
              <Image
                src="/dpi-icon-square.png"
                alt="DPI"
                width={24}
                height={24}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-bold text-white tracking-tight text-sm">
              DPI Registry
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>On-Chain Verified</span>
          </div>
        </div>

        {/* Contract Address Explorer Link */}
        <div className="p-3 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Zap size={14} className="text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Program ID
              </div>
              <div className="font-mono text-xs text-slate-200 truncate">
                {shortProgramId}
              </div>
            </div>
          </div>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 shrink-0 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-xl border border-indigo-500/30 transition-colors"
          >
            <span>Explorer</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Navigation & Documentation Links */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
          <div className="flex items-center gap-3">
            <Link
              href="/community"
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              <BookOpen size={12} />
              <span>Docs</span>
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              <Code2 size={12} />
              <span>GitHub</span>
            </a>
            <Link
              href="/admin"
              className="flex items-center gap-1 text-purple-400/80 hover:text-purple-300 transition-colors"
            >
              <ShieldCheck size={12} />
              <span>Admin</span>
            </Link>
          </div>

          <span className="text-[10px] text-slate-500 font-medium">
            © {new Date().getFullYear()} DPI Protocol
          </span>
        </div>
      </div>
    </footer>
  );
}
