"use client";

import Header from "@/components/Header";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import { Megaphone, Globe, Shield, Zap, ExternalLink, Sparkles } from "lucide-react";

const ANNOUNCEMENTS = [
  {
    id: 1,
    type: "launch",
    icon: Zap,
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-500/20 border-indigo-500/30",
    title: "DPI Protocol Live on Solana Devnet",
    body: "The Decentralized Public Infrastructure Handle Registry program is live. Register human-readable handles and route instant payments directly on Solana.",
    badge: "Live",
    badgeStatus: "accent" as const,
    date: "Latest",
    link: "https://explorer.solana.com/address/CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc?cluster=devnet",
    linkLabel: "View Contract",
  },
  {
    id: 2,
    type: "info",
    icon: Shield,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/20 border-emerald-500/30",
    title: "Ecosystem Security & Reserved Namespace",
    body: "To prevent identity spoofing, critical namespaces ('admin', 'team', 'support', 'security', 'dpi') are protected on-chain by the program authority.",
    badge: "Governance",
    badgeStatus: "success" as const,
    date: "Pinned",
  },
  {
    id: 3,
    type: "info",
    icon: Globe,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/20 border-amber-500/30",
    title: "One Wallet · One Handle Rule",
    body: "Each Solana wallet address maps to a unique ReverseLookup PDA on-chain, creating a clean 1:1 identity record without duplicates.",
    badge: "Protocol",
    badgeStatus: "warning" as const,
    date: "Pinned",
  },
  {
    id: 4,
    type: "announcement",
    icon: Megaphone,
    iconColor: "text-pink-400",
    iconBg: "bg-pink-500/20 border-pink-500/30",
    title: "SPL Token & Token-2022 Support",
    body: "DPI supports native SOL transfers along with devnet stablecoins (USDC, EURC, PYUSD) and custom SPL token mint routing.",
    badge: "Feature",
    badgeStatus: "neutral" as const,
    date: "Devnet",
  },
];

export default function CommunityPage() {
  return (
    <div className="w-full">
      <Header title="Community & Governance" />
      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Banner */}
        <div className="rounded-2xl p-5 bg-linear-to-br from-indigo-900/60 via-purple-900/40 to-[#101422] border border-indigo-500/30 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center gap-2 mb-1.5 text-white font-bold text-base">
            <Sparkles size={18} className="text-indigo-400" />
            <span>DPI Ecosystem Feed</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Official announcements, smart contract updates, and governance parameters for the DPI Solana protocol.
          </p>
        </div>

        {/* Announcements List */}
        <div className="flex flex-col gap-3">
          {ANNOUNCEMENTS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.id} className="p-4.5">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl ${item.iconBg} border flex items-center justify-center shrink-0 shadow-sm`}
                  >
                    <Icon size={18} className={item.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <StatusBadge status={item.badgeStatus}>{item.badge}</StatusBadge>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {item.date}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white mb-1 leading-snug">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed">
                      {item.body}
                    </div>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2.5 text-xs font-bold text-indigo-400 hover:text-indigo-300"
                      >
                        {item.linkLabel} <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Smart Contract Card */}
        <Card className="p-4 flex flex-col gap-2 bg-[#121626]/40">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Verified Smart Contract
          </div>
          <div className="text-xs text-slate-300 leading-relaxed font-mono break-all bg-white/3 p-2.5 rounded-xl border border-white/6">
            CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc
          </div>
          <a
            href="https://explorer.solana.com/address/CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc?cluster=devnet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold mt-1"
          >
            Inspect on Solana Explorer <ExternalLink size={12} />
          </a>
        </Card>
      </div>
    </div>
  );
}
