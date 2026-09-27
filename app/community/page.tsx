"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import Header from "@/components/Header";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import { getDpiProgram, PROGRAM_ID } from "@/lib/dpi-program";
import { triggerHaptic } from "@/lib/haptics";
import { useToast } from "@/components/Toast";
import CopyableAddress from "@/components/CopyableAddress";
import {
  Megaphone,
  Globe,
  Shield,
  Zap,
  ExternalLink,
  Users,
  Search,
  Loader,
  RefreshCw,
  Copy,
  CheckCircle,
  Send,
  AtSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface RegisteredHandleRecord {
  publicKey: string;
  owner: string;
  handle: string;
  frozen: boolean;
}

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
    link: `https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`,
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
  const { connection } = useConnection();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"directory" | "governance">("directory");
  const [handles, setHandles] = useState<RegisteredHandleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterState, setFilterState] = useState<"all" | "active" | "frozen">("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchDirectory = useCallback(async () => {
    if (!connection) return;
    setLoading(true);
    try {
      const program = getDpiProgram(connection);
      const allAccounts = await program.account.handleRegistry.all();

      const parsed: RegisteredHandleRecord[] = allAccounts.map((item) => ({
        publicKey: item.publicKey.toBase58(),
        owner: item.account.owner.toBase58(),
        handle: item.account.handle,
        frozen: Boolean(item.account.frozen),
      }));

      // Sort alphabetically by handle
      parsed.sort((a, b) => a.handle.localeCompare(b.handle));
      setHandles(parsed);
    } catch (err: any) {
      console.warn("Error fetching handle directory:", err);
      toast.error("Failed to load on-chain directory from Solana RPC");
    } finally {
      setLoading(false);
    }
  }, [connection, toast]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  const filteredHandles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim().replace(/^@/, "");
    return handles.filter((h) => {
      const matchesSearch =
        !q ||
        h.handle.toLowerCase().includes(q) ||
        h.owner.toLowerCase().includes(q);
      const matchesFilter =
        filterState === "all" ||
        (filterState === "active" && !h.frozen) ||
        (filterState === "frozen" && h.frozen);
      return matchesSearch && matchesFilter;
    });
  }, [handles, searchQuery, filterState]);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterState]);

  const totalPages = Math.max(1, Math.ceil(filteredHandles.length / PAGE_SIZE));
  const paginatedHandles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredHandles.slice(start, start + PAGE_SIZE);
  }, [filteredHandles, currentPage, PAGE_SIZE]);

  const copyAddress = (address: string) => {
    triggerHaptic("tap");
    navigator.clipboard.writeText(address);
    setCopiedKey(address);
    toast.success("Wallet address copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const activeCount = handles.filter((h) => !h.frozen).length;
  const frozenCount = handles.filter((h) => h.frozen).length;

  return (
    <div className="w-full">
      <Header title="Community & Directory" />

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Banner */}
        <div className="rounded-2xl p-5 bg-linear-to-br from-indigo-900/60 via-purple-900/40 to-[#101422] border border-indigo-500/30 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Users size={18} className="text-indigo-400" />
              <span>DPI Community Directory</span>
            </div>
            <button
              onClick={() => {
                triggerHaptic("tap");
                fetchDirectory();
              }}
              disabled={loading}
              className="p-1.5 rounded-lg bg-(--bg-subtle) hover:bg-(--bg-card-hover) text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh directory"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
          <p className="text-xs text-(--text-secondary) leading-relaxed">
            Live on-chain registry of all decentralized identities created on the DPI Solana protocol.
          </p>

          {/* Metric Pills */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-(--border) text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-(--text-muted)">Total:</span>
              <span className="font-bold text-white font-mono">{loading ? "…" : handles.length}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600" />
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400">Active:</span>
              <span className="font-bold text-emerald-400 font-mono">{loading ? "…" : activeCount}</span>
            </div>
            {frozenCount > 0 && (
              <>
                <div className="w-1 h-1 rounded-full bg-slate-600" />
                <div className="flex items-center gap-1.5">
                  <span className="text-rose-400">Frozen:</span>
                  <span className="font-bold text-rose-400 font-mono">{loading ? "…" : frozenCount}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-(--bg-subtle) border border-(--border) text-xs font-bold">
          <button
            onClick={() => {
              triggerHaptic("selection");
              setActiveTab("directory");
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "directory"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-(--text-muted) hover:text-foreground"
            }`}
          >
            Registered Handles ({loading ? "…" : handles.length})
          </button>
          <button
            onClick={() => {
              triggerHaptic("selection");
              setActiveTab("governance");
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "governance"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-(--text-muted) hover:text-foreground"
            }`}
          >
            Ecosystem & Feed
          </button>
        </div>

        {activeTab === "directory" ? (
          <>
            {/* Search & Filter Bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-(--bg-subtle) border border-(--border) shadow-xs">
                <Search size={14} className="text-(--text-muted) shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by @handle or wallet address..."
                  className="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-(--text-muted) font-medium"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-(--bg-subtle) border border-(--border) text-[11px] font-bold">
                {(["all", "active", "frozen"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      triggerHaptic("tap");
                      setFilterState(f);
                    }}
                    className={`px-2 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                      filterState === f
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-(--text-muted) hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Handle Directory List */}
            {loading ? (
              <Card className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <Loader size={24} className="animate-spin text-indigo-400" />
                <span className="text-xs text-(--text-muted)">Loading handles from Solana Devnet…</span>
              </Card>
            ) : filteredHandles.length === 0 ? (
              <Card className="p-8 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-(--bg-subtle) border border-(--border) flex items-center justify-center text-(--text-muted)">
                  <AtSign size={20} />
                </div>
                <div className="text-sm font-bold text-foreground">
                  {searchQuery ? "No matching handles found" : "No handles registered yet"}
                </div>
                <p className="text-xs text-(--text-muted) max-w-xs">
                  {searchQuery
                    ? "Try a different search term or clear filters"
                    : "Be the first to claim a decentralized identity on the protocol!"}
                </p>
                <Link
                  href="/handle"
                  className="mt-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md active:scale-95 transition-all"
                >
                  Register a Handle
                </Link>
              </Card>
            ) : (
              <div className="flex flex-col gap-2.5">
                {paginatedHandles.map((item) => {
                  const shortOwner = `${item.owner.slice(0, 6)}...${item.owner.slice(-4)}`;
                  const isCopied = copiedKey === item.owner;

                  return (
                    <Card
                      key={item.publicKey}
                      className="p-4 flex items-center justify-between gap-3 hover:border-indigo-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-600 dark:text-white text-sm shrink-0">
                          {item.handle[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Link
                              href={`/handle/${item.handle}`}
                              className="text-sm font-black text-foreground hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors truncate"
                            >
                              @{item.handle}
                            </Link>
                            {item.frozen ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-500 dark:text-rose-300 border border-rose-500/30">
                                Frozen
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <CopyableAddress
                              address={item.owner}
                              prefixLen={5}
                              suffixLen={4}
                              showExplorer={true}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/send?to=@${item.handle}`}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 hover:bg-indigo-600/25 dark:hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-white text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                          title="Send SOL to this handle"
                        >
                          <Send size={12} />
                          <span>Send</span>
                        </Link>
                        <Link
                          href={`/handle/${item.handle}`}
                          className="p-1.5 rounded-xl bg-(--bg-subtle) hover:bg-(--bg-card-hover) border border-(--border) text-(--text-muted) hover:text-foreground transition-colors"
                          title="View public profile"
                        >
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    </Card>
                  );
                })}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t border-(--border) text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("tap");
                        setCurrentPage((p) => Math.max(1, p - 1));
                      }}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-xl bg-(--bg-subtle) hover:bg-(--bg-card-hover) border border-(--border) text-(--text-secondary) disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={13} /> Prev
                    </button>

                    <span className="text-(--text-muted) font-mono text-[11px]">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("tap");
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                      }}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-xl bg-(--bg-subtle) hover:bg-(--bg-card-hover) border border-(--border) text-(--text-secondary) disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Governance & Feed View */
          <div className="flex flex-col gap-3">
            {ANNOUNCEMENTS.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.id} className="p-4.5">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl ${item.iconBg} border flex items-center justify-center shrink-0 shadow-xs`}
                    >
                      <Icon size={18} className={item.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <StatusBadge status={item.badgeStatus}>{item.badge}</StatusBadge>
                        <span className="text-[11px] text-(--text-muted) font-medium">
                          {item.date}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-foreground mb-1 leading-snug">
                        {item.title}
                      </div>
                      <div className="text-xs text-(--text-secondary) leading-relaxed">
                        {item.body}
                      </div>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2.5 text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          {item.linkLabel} <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Smart Contract Card */}
            <Card className="p-4 flex flex-col gap-2">
              <div className="text-[11px] font-bold text-(--text-muted) uppercase tracking-wider">
                Verified Smart Contract
              </div>
              <div className="text-xs text-(--text-secondary) leading-relaxed font-mono break-all bg-(--bg-subtle) p-2.5 rounded-xl border border-(--border)">
                {PROGRAM_ID.toBase58()}
              </div>
              <a
                href={`https://explorer.solana.com/address/${PROGRAM_ID.toBase58()}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 font-semibold mt-1"
              >
                Inspect on Solana Explorer <ExternalLink size={12} />
              </a>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
