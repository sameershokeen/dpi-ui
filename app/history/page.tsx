"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import Header from "@/components/Header";
import Card from "@/components/Card";
import { getReverseLookupPda, fetchRecentProtocolActivity, PROGRAM_ID } from "@/lib/dpi-program";
import { getTokenMetaByMint } from "@/lib/tokens";
import { triggerHaptic } from "@/lib/haptics";
import { exportReceiptAsImage } from "@/lib/receipt-export";
import { useToast } from "@/components/Toast";
import EmptyState from "@/components/EmptyState";
import PullToRefresh from "@/components/PullToRefresh";
import { useNetwork, getExplorerUrl } from "@/components/NetworkContext";
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ExternalLink,
  Clock,
  Code2,
  Search,
  AtSign,
  Receipt,
  Copy,
  CheckCircle,
  Zap,
  Activity,
  Download,
  Filter,
} from "lucide-react";

interface ParsedTx {
  signature: string;
  blockTime: number | null;
  slot: number;
  status: "success" | "failed";
  type: "send" | "receive" | "interaction" | "dpi";
  counterparty: string | null;
  counterpartyHandle: string | null;
  amount: number | null;
  tokenSymbol?: string | null;
}

interface ProtocolTx {
  signature: string;
  slot: number;
  err: any;
  blockTime: string;
  timestamp: number;
  explorerUrl: string;
}

export default function HistoryPage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { network } = useNetwork();
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"wallet" | "protocol">("wallet");
  const [directionFilter, setDirectionFilter] = useState<"all" | "send" | "receive">("all");
  const [tokenFilter, setTokenFilter] = useState<string>("all");
  const [txs, setTxs] = useState<ParsedTx[]>([]);
  const [protocolTxs, setProtocolTxs] = useState<ProtocolTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingProtocol, setLoadingProtocol] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedSig, setCopiedSig] = useState<string | null>(null);

  const txsRef = useRef<ParsedTx[]>([]);
  txsRef.current = txs;

  const fetchHistory = useCallback(async (isLoadMore: boolean = false) => {
    if (!publicKey || !connection) return;
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setErrorMsg("");

    try {
      // 1. Fetch recent signatures
      const lastSig = isLoadMore && txsRef.current.length > 0
        ? txsRef.current[txsRef.current.length - 1].signature
        : undefined;

      const signatures = await connection.getSignaturesForAddress(publicKey, {
        limit: 15,
        before: lastSig,
      });

      if (signatures.length < 15) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (signatures.length === 0) {
        if (!isLoadMore) setTxs([]);
        return;
      }

      const userAddrStr = publicKey.toBase58();

      // 2. Fetch parsed transactions concurrently with Promise.allSettled
      const parsedResults = await Promise.allSettled(
        signatures.map((sig) =>
          connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          })
        )
      );

      const parsedList: ParsedTx[] = [];
      const counterpartiesToResolve: { address: string; index: number }[] = [];

      signatures.forEach((sig, i) => {
        const result = parsedResults[i];
        const tx = result.status === "fulfilled" ? result.value : null;

        let type: "send" | "receive" | "interaction" | "dpi" = "interaction";
        let counterparty: string | null = null;
        let amount: number | null = null;
        let tokenSymbol: string | null = null;

        if (tx && tx.meta) {
          const message = tx.transaction.message;
          const instructions = message.instructions;

          const hasDpiInstruction = instructions.some(
            (ix: any) =>
              ix.programId?.toBase58() === PROGRAM_ID.toBase58() ||
              ix.program === PROGRAM_ID.toBase58()
          );

          if (hasDpiInstruction) {
            type = "dpi";
          } else {
            const transferIx = instructions.find(
              (ix: any) => ix.program === "system" && ix.parsed?.type === "transfer"
            );

            if (transferIx) {
              const info = (transferIx as any).parsed.info;
              const src = info.source;
              const dst = info.destination;
              amount = info.lamports / LAMPORTS_PER_SOL;

              if (src === userAddrStr) {
                type = "send";
                counterparty = dst;
              } else if (dst === userAddrStr) {
                type = "receive";
                counterparty = src;
              }
            } else {
              const tokenIx = instructions.find(
                (ix: any) =>
                  (ix.program === "spl-token" || ix.program === "spl-token-2022") &&
                  (ix.parsed?.type === "transfer" || ix.parsed?.type === "transferChecked")
              );

              if (tokenIx) {
                const info = (tokenIx as any).parsed.info;
                const mint = info.mint;
                const rawAmount = info.amount || info.tokenAmount?.amount;
                const srcAtaOrOwner = info.source;
                const dstAta = info.destination;

                // Build ATA -> Owner map from pre & post token balances
                const ataToOwnerMap: Record<string, string> = {};
                const allBalances = [
                  ...((tx.meta as any).preTokenBalances || []),
                  ...((tx.meta as any).postTokenBalances || []),
                ];
                for (const bal of allBalances) {
                  if (bal.owner && bal.accountIndex !== undefined) {
                    const key = (message as any).accountKeys[bal.accountIndex];
                    const pubkeyStr = typeof key === "string"
                      ? key
                      : (key?.pubkey
                          ? (typeof key.pubkey === "string" ? key.pubkey : key.pubkey.toBase58?.() || String(key.pubkey))
                          : null);
                    if (pubkeyStr) {
                      ataToOwnerMap[pubkeyStr] = bal.owner;
                    }
                  }
                }

                const srcOwner = info.authority || ataToOwnerMap[srcAtaOrOwner] || srcAtaOrOwner;
                const dstOwner = ataToOwnerMap[dstAta] || dstAta;

                const meta = getTokenMetaByMint(mint);
                const decimals = info.tokenAmount?.decimals ?? meta.decimals ?? 6;
                const symbol = meta.symbol;

                amount = info.tokenAmount?.uiAmount !== undefined && info.tokenAmount?.uiAmount !== null
                  ? info.tokenAmount.uiAmount
                  : (rawAmount ? parseFloat(rawAmount) / Math.pow(10, decimals) : null);
                tokenSymbol = symbol;

                if (srcOwner === userAddrStr || info.authority === userAddrStr || srcAtaOrOwner === userAddrStr) {
                  type = "send";
                  counterparty = dstOwner;
                } else {
                  type = "receive";
                  counterparty = srcOwner;
                }
              }
            }
          }
        }

        if (counterparty) {
          counterpartiesToResolve.push({ address: counterparty, index: i });
        }

        parsedList.push({
          signature: sig.signature,
          blockTime: sig.blockTime ?? null,
          slot: sig.slot,
          status: (sig.err ? "failed" : "success") as "success" | "failed",
          type,
          counterparty,
          counterpartyHandle: null,
          amount,
          tokenSymbol,
        });
      });

      // 3. Batch resolve handle PDAs in a single query
      if (counterpartiesToResolve.length > 0) {
        try {
          const pdas = counterpartiesToResolve.map((cp) => {
            const cpKey = new PublicKey(cp.address);
            const [reversePDA] = getReverseLookupPda(cpKey);
            return reversePDA;
          });

          const accountsInfo = await connection.getMultipleAccountsInfo(pdas);
          if (accountsInfo) {
            counterpartiesToResolve.forEach((cp, idx) => {
              const acc = accountsInfo[idx];
              if (acc?.data) {
                try {
                  const data = Buffer.from(acc.data);
                  if (data.length >= 8 + 32 + 4) {
                    const strLen = data.readUInt32LE(8 + 32);
                    if (data.length >= 8 + 32 + 4 + strLen) {
                      const handleStr = data
                        .slice(8 + 32 + 4, 8 + 32 + 4 + strLen)
                        .toString("utf-8");
                      parsedList[cp.index].counterpartyHandle = handleStr;
                    }
                  }
                } catch {}
              }
            });
          }
        } catch {}
      }

      if (isLoadMore) {
        setTxs((prev) => [...prev, ...parsedList]);
      } else {
        setTxs(parsedList);
      }
    } catch {
      setErrorMsg("Failed to fetch wallet history. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [publicKey, connection]);

  const fetchProtocolFeed = useCallback(async () => {
    if (!connection) return;
    setLoadingProtocol(true);
    try {
      const pTxs = await fetchRecentProtocolActivity(connection, 25);
      setProtocolTxs(pTxs);
    } catch (err) {
      console.warn("Error loading protocol activity:", err);
    } finally {
      setLoadingProtocol(false);
    }
  }, [connection]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchHistory();
    }
    fetchProtocolFeed();
  }, [connected, publicKey, fetchHistory, fetchProtocolFeed]);

  const filteredTxs = useMemo(() => {
    let list = txs;
    if (directionFilter !== "all") {
      list = list.filter((tx) => tx.type === directionFilter);
    }
    if (tokenFilter !== "all") {
      list = list.filter(
        (tx) => (tx.tokenSymbol || "SOL").toUpperCase() === tokenFilter.toUpperCase()
      );
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (tx) =>
          tx.signature.toLowerCase().includes(q) ||
          (tx.counterparty && tx.counterparty.toLowerCase().includes(q)) ||
          (tx.counterpartyHandle && tx.counterpartyHandle.toLowerCase().includes(q)) ||
          (tx.amount !== null && tx.amount.toString().includes(q))
      );
    }
    return list;
  }, [txs, directionFilter, tokenFilter, searchQuery]);

  const filteredProtocolTxs = useMemo(() => {
    if (!searchQuery) return protocolTxs;
    const q = searchQuery.toLowerCase();
    return protocolTxs.filter((tx) => tx.signature.toLowerCase().includes(q));
  }, [protocolTxs, searchQuery]);

  const exportHistoryCSV = () => {
    if (filteredTxs.length === 0) {
      toast.error("No transactions to export");
      return;
    }
    triggerHaptic("selection");
    const headers = [
      "Signature",
      "Date",
      "Direction",
      "Amount",
      "Token",
      "Status",
      "Counterparty",
      "Counterparty Handle",
    ];
    const rows = filteredTxs.map((t) => [
      t.signature,
      t.blockTime ? new Date(t.blockTime * 1000).toISOString() : "Pending",
      t.type,
      t.amount !== null ? t.amount : 0,
      t.tokenSymbol || "SOL",
      t.status,
      t.counterparty || "",
      t.counterpartyHandle ? `@${t.counterpartyHandle}` : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `dpi-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Transactions exported to CSV!");
  };

  const formatDate = (blockTime: number | null) => {
    if (!blockTime) return "Pending";
    const date = new Date(blockTime * 1000);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copySignature = (sig: string) => {
    triggerHaptic("tap");
    navigator.clipboard.writeText(sig);
    setCopiedSig(sig);
    toast.success("Transaction signature copied!");
    setTimeout(() => setCopiedSig(null), 2000);
  };

  return (
    <div className="w-full">
      <Header title="Transaction History" showBack onBack={() => router.back()} />

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-(--bg-subtle) border border-(--border) text-xs font-bold">
          <button
            onClick={() => {
              triggerHaptic("selection");
              setActiveTab("wallet");
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "wallet"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-(--text-muted) hover:text-foreground"
            }`}
          >
            <Clock size={13} />
            <span>My Wallet</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic("selection");
              setActiveTab("protocol");
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "protocol"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-(--text-muted) hover:text-foreground"
            }`}
          >
            <Activity size={13} />
            <span>Protocol Explorer</span>
          </button>
        </div>

        {/* Search Bar & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-(--bg-subtle) border border-(--border) text-xs">
            <Search size={14} className="text-(--text-muted)" />
            <input
              type="text"
              placeholder={
                activeTab === "wallet"
                  ? "Search by @handle, address or tx signature..."
                  : "Search protocol tx signatures..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-(--text-muted) font-medium"
            />
          </div>
          <button
            onClick={() => {
              triggerHaptic("tap");
              if (activeTab === "wallet") fetchHistory();
              else fetchProtocolFeed();
            }}
            disabled={loading || loadingProtocol}
            className="w-10 h-10 rounded-xl bg-(--bg-subtle) border border-(--border) hover:bg-(--bg-card-hover) active:scale-95 flex items-center justify-center text-(--text-secondary) hover:text-foreground transition-all cursor-pointer"
            title="Refresh transactions"
          >
            <RefreshCw
              size={14}
              className={loading || loadingProtocol ? "animate-spin text-indigo-400" : ""}
            />
          </button>
        </div>

        {/* Filters Bar & CSV Export (FEAT-010) */}
        {activeTab === "wallet" && connected && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            {/* Direction filter pills */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-(--bg-subtle) border border-(--border) text-[11px] font-bold">
              {(["all", "send", "receive"] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => {
                    triggerHaptic("tap");
                    setDirectionFilter(dir);
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                    directionFilter === dir
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-(--text-muted) hover:text-foreground"
                  }`}
                >
                  {dir === "all" ? "All" : dir === "send" ? "Sent" : "Received"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Token filter */}
              <select
                value={tokenFilter}
                onChange={(e) => {
                  triggerHaptic("tap");
                  setTokenFilter(e.target.value);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-(--bg-subtle) border border-(--border) text-[11px] font-bold text-(--text-secondary) outline-none cursor-pointer"
              >
                <option value="all">All Tokens</option>
                <option value="SOL">SOL</option>
                <option value="USDC">USDC</option>
                <option value="EURC">EURC</option>
                <option value="PYUSD">PYUSD</option>
              </select>

              {/* Export CSV button (FEAT-010) */}
              <button
                type="button"
                onClick={exportHistoryCSV}
                className="px-2.5 py-1.5 rounded-xl bg-(--bg-subtle) hover:bg-(--bg-card-hover) border border-(--border) text-[11px] font-bold text-indigo-500 dark:text-indigo-300 hover:text-indigo-600 dark:hover:text-white flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                title="Export transactions as CSV"
              >
                <Download size={13} />
                <span>CSV</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === "wallet" ? (
          /* Wallet Activity View with PullToRefresh (FEAT-036) */
          !connected ? (
            <EmptyState
              type="not-connected"
              title="Connect Your Wallet"
              description="Connect your Solana wallet to view real-time personal transaction receipts and transfers."
            />
          ) : (
            <PullToRefresh onRefresh={() => fetchHistory(false)}>
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs text-center mb-3">
                  {errorMsg}
                </div>
              )}

              {loading && txs.length === 0 ? (
                <div className="flex flex-col gap-2.5">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="p-4 flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-xl bg-(--bg-subtle)" />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="h-3 w-28 bg-(--bg-subtle) rounded" />
                        <div className="h-2 w-20 bg-(--bg-subtle)/70 rounded" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredTxs.length === 0 ? (
                <EmptyState
                  type={searchQuery || directionFilter !== "all" || tokenFilter !== "all" ? "no-results" : "no-history"}
                  title={searchQuery || directionFilter !== "all" || tokenFilter !== "all" ? "No Matching Transactions" : "No Transactions Yet"}
                  description={
                    searchQuery || directionFilter !== "all" || tokenFilter !== "all"
                      ? "No records matched your selected filters or search terms."
                      : "Send SOL or tokens using @handles to see your receipts here."
                  }
                  actionText="Send Assets"
                  actionHref="/send"
                />
              ) : (
                <>
                  <Card className="overflow-hidden divide-y divide-(--border)">
                  {filteredTxs.map((tx) => {
                    const isOutgoing = tx.type === "send";
                    const isIncoming = tx.type === "receive";
                    const isDpi = tx.type === "dpi";

                    return (
                      <div
                        key={tx.signature}
                        className="p-4 flex items-center justify-between hover:bg-(--bg-subtle) transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                              isOutgoing
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400"
                                : isIncoming
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400"
                                : isDpi
                                ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-500 dark:text-indigo-400"
                                : "bg-(--bg-subtle) border-(--border) text-(--text-muted)"
                            }`}
                          >
                            {isOutgoing ? (
                              <ArrowUpRight size={18} />
                            ) : isIncoming ? (
                              <ArrowDownLeft size={18} />
                            ) : isDpi ? (
                              <AtSign size={18} />
                            ) : (
                              <Code2 size={18} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">
                              {isOutgoing ? (
                                <>
                                  Sent {tx.tokenSymbol || "SOL"} to{" "}
                                  <span className="text-indigo-600 dark:text-indigo-300 font-mono font-semibold">
                                    {tx.counterpartyHandle
                                      ? `@${tx.counterpartyHandle}`
                                      : `${tx.counterparty?.slice(0, 4)}...${tx.counterparty?.slice(-4)}`}
                                  </span>
                                </>
                              ) : isIncoming ? (
                                <>
                                  Received from{" "}
                                  <span className="text-emerald-600 dark:text-emerald-300 font-mono font-semibold">
                                    {tx.counterpartyHandle
                                      ? `@${tx.counterpartyHandle}`
                                      : `${tx.counterparty?.slice(0, 4)}...${tx.counterparty?.slice(-4)}`}
                                  </span>
                                </>
                              ) : isDpi ? (
                                "DPI Protocol Instruction"
                              ) : (
                                "Solana Program Call"
                              )}
                            </div>
                            <div className="text-[10px] text-(--text-muted) mt-0.5 flex items-center gap-1.5 font-mono">
                              <span>{formatDate(tx.blockTime)}</span>
                              <span>·</span>
                              <span>Slot {tx.slot}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 ml-3 shrink-0">
                          {tx.amount !== null && !isDpi && (
                            <div className="text-right">
                              <div
                                className={`text-xs font-black font-mono ${
                                  isIncoming ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                                }`}
                              >
                                {isIncoming ? "+" : "-"}
                                {tx.amount.toFixed(3)}
                              </div>
                              <div className="text-[10px] text-(--text-muted) font-medium">
                                {tx.tokenSymbol || "SOL"}
                              </div>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic("tap");
                              exportReceiptAsImage({
                                txSig: tx.signature,
                                amount: tx.amount ? tx.amount.toFixed(3) : "1.0",
                                tokenSymbol: tx.tokenSymbol || "SOL",
                                recipient: tx.counterpartyHandle
                                  ? `@${tx.counterpartyHandle}`
                                  : tx.counterparty || "DPI Protocol",
                                timestamp: formatDate(tx.blockTime),
                              });
                            }}
                            className="w-8 h-8 rounded-lg bg-(--bg-subtle) hover:bg-(--bg-card-hover) border border-(--border) flex items-center justify-center text-(--text-muted) hover:text-indigo-500 dark:hover:text-indigo-400 transition-all cursor-pointer"
                            title="Download Receipt (PNG)"
                          >
                            <Receipt size={13} />
                          </button>
                          <a
                            href={getExplorerUrl("tx", tx.signature, network)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-(--bg-subtle) hover:bg-(--bg-card-hover) border border-(--border) flex items-center justify-center text-(--text-muted) hover:text-foreground transition-all"
                            title="View on Solana Explorer"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </Card>

                {hasMore && !searchQuery && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("tap");
                        fetchHistory(true);
                      }}
                      disabled={loadingMore}
                      className="px-4 py-2 rounded-xl bg-(--bg-subtle) hover:bg-(--bg-card-hover) border border-(--border) text-xs font-semibold text-(--text-secondary) hover:text-foreground flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <>
                          <RefreshCw size={13} className="animate-spin text-indigo-400" />
                          <span>Loading older transactions...</span>
                        </>
                      ) : (
                        <span>Load More Transactions</span>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
            </PullToRefresh>
          )
        ) : (
          /* Global Protocol Activity Feed View */
          <div className="flex flex-col gap-2.5">
            {loadingProtocol && protocolTxs.length === 0 ? (
              <Card className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <RefreshCw size={20} className="animate-spin text-indigo-400" />
                <span className="text-xs text-(--text-muted)">
                  Fetching recent transactions on DPI Program…
                </span>
              </Card>
            ) : filteredProtocolTxs.length === 0 ? (
              <Card className="p-8 text-center flex flex-col items-center gap-2">
                <Activity size={20} className="text-(--text-muted)" />
                <div className="text-xs font-bold text-foreground">No protocol activity found</div>
                <div className="text-[11px] text-(--text-muted)">
                  Transaction signatures executed on {PROGRAM_ID.toBase58().slice(0, 8)}... will
                  appear here in real time.
                </div>
              </Card>
            ) : (
              <Card className="overflow-hidden divide-y divide-(--border)">
                {filteredProtocolTxs.map((ptx) => {
                  const shortSig = `${ptx.signature.slice(0, 10)}...${ptx.signature.slice(-8)}`;
                  const isCopied = copiedSig === ptx.signature;

                  return (
                    <div
                      key={ptx.signature}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-(--bg-subtle) transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0">
                          <Zap size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs font-bold text-foreground truncate">
                              {shortSig}
                            </span>
                            {ptx.err ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30">
                                Failed
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                Confirmed
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-(--text-muted) font-mono">
                            <span>{ptx.blockTime}</span>
                            <span>·</span>
                            <span>Slot {ptx.slot}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => copySignature(ptx.signature)}
                          className="p-1.5 rounded-lg bg-(--bg-subtle) hover:bg-(--bg-card-hover) text-(--text-muted) hover:text-foreground transition-colors cursor-pointer"
                          title="Copy transaction signature"
                        >
                          {isCopied ? (
                            <CheckCircle size={13} className="text-emerald-500 dark:text-emerald-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                        <a
                          href={ptx.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-(--bg-subtle) hover:bg-(--bg-card-hover) text-(--text-muted) hover:text-foreground transition-colors"
                          title="View on Solana Explorer"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
