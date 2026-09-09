"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import Header from "@/components/Header";
import Card from "@/components/Card";
import { getReverseLookupPDA, fetchRecentProtocolActivity, PROGRAM_ID } from "@/lib/dpi-program";
import { triggerHaptic } from "@/lib/haptics";
import { exportReceiptAsImage } from "@/lib/receipt-export";
import { useToast } from "@/components/Toast";
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
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"wallet" | "protocol">("wallet");
  const [txs, setTxs] = useState<ParsedTx[]>([]);
  const [protocolTxs, setProtocolTxs] = useState<ProtocolTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProtocol, setLoadingProtocol] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedSig, setCopiedSig] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!publicKey || !connection) return;
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Fetch recent signatures
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 15 });

      if (signatures.length === 0) {
        setTxs([]);
        setLoading(false);
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
                const src = info.authority || info.source;
                const dst = info.destination;

                const decimals = 6;
                let symbol = "Token";
                if (
                  mint === "4zMMC9zT5H24GsmVBtBq7B8RFKu1e79mksqtCRRjh482" ||
                  mint === "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
                ) {
                  symbol = "USDC";
                } else if (mint === "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr") {
                  symbol = "EURC";
                } else if (mint === "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM") {
                  symbol = "PYUSD";
                } else if (mint) {
                  symbol = `SPL (${mint.slice(0, 4)}...${mint.slice(-4)})`;
                }

                amount = rawAmount ? parseFloat(rawAmount) / Math.pow(10, decimals) : null;
                tokenSymbol = symbol;

                if (src === userAddrStr) {
                  type = "send";
                  counterparty = dst;
                } else {
                  type = "receive";
                  counterparty = src;
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
            const [reversePDA] = getReverseLookupPDA(cpKey);
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

      setTxs(parsedList);
    } catch (err: any) {
      setErrorMsg("Failed to fetch wallet history. Please try again.");
    } finally {
      setLoading(false);
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
    if (!searchQuery) return txs;
    const q = searchQuery.toLowerCase();
    return txs.filter(
      (tx) =>
        tx.signature.toLowerCase().includes(q) ||
        (tx.counterparty && tx.counterparty.toLowerCase().includes(q)) ||
        (tx.counterpartyHandle && tx.counterpartyHandle.toLowerCase().includes(q))
    );
  }, [txs, searchQuery]);

  const filteredProtocolTxs = useMemo(() => {
    if (!searchQuery) return protocolTxs;
    const q = searchQuery.toLowerCase();
    return protocolTxs.filter((tx) => tx.signature.toLowerCase().includes(q));
  }, [protocolTxs, searchQuery]);

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
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/4 border border-white/8 text-xs font-bold">
          <button
            onClick={() => {
              triggerHaptic("selection");
              setActiveTab("wallet");
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "wallet"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
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
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity size={13} />
            <span>Protocol Explorer</span>
          </button>
        </div>

        {/* Search Bar & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/4 border border-white/10 text-xs">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === "wallet"
                  ? "Search by @handle, address or tx signature..."
                  : "Search protocol tx signatures..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-500 font-medium"
            />
          </div>
          <button
            onClick={() => {
              triggerHaptic("tap");
              if (activeTab === "wallet") fetchHistory();
              else fetchProtocolFeed();
            }}
            disabled={loading || loadingProtocol}
            className="w-10 h-10 rounded-xl bg-white/4 border border-white/10 hover:bg-white/8 active:scale-95 flex items-center justify-center text-slate-300 transition-all cursor-pointer"
            title="Refresh transactions"
          >
            <RefreshCw
              size={14}
              className={loading || loadingProtocol ? "animate-spin text-indigo-400" : ""}
            />
          </button>
        </div>

        {activeTab === "wallet" ? (
          /* Wallet Activity View */
          !connected ? (
            <Card className="p-8 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Clock size={24} />
              </div>
              <h2 className="text-sm font-bold text-white">Connect Your Wallet</h2>
              <p className="text-xs text-slate-400 max-w-xs">
                Connect your wallet to view real-time personal transaction receipts and transfers.
              </p>
            </Card>
          ) : (
            <>
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs text-center">
                  {errorMsg}
                </div>
              )}

              {loading && txs.length === 0 ? (
                <div className="flex flex-col gap-2.5">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="p-4 flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-xl bg-white/10" />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="h-3 w-28 bg-white/10 rounded" />
                        <div className="h-2 w-20 bg-white/5 rounded" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredTxs.length === 0 ? (
                <Card className="p-8 text-center flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500">
                    <Clock size={20} />
                  </div>
                  <div className="text-xs font-bold text-white">No transactions found</div>
                  <div className="text-[11px] text-slate-500">
                    {searchQuery
                      ? "No records matched your search query"
                      : "Send SOL or tokens using @handles to see your receipts here"}
                  </div>
                </Card>
              ) : (
                <Card className="overflow-hidden divide-y divide-white/6">
                  {filteredTxs.map((tx) => {
                    const isOutgoing = tx.type === "send";
                    const isIncoming = tx.type === "receive";
                    const isDpi = tx.type === "dpi";

                    return (
                      <div
                        key={tx.signature}
                        className="p-4 flex items-center justify-between hover:bg-white/2 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                              isOutgoing
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                : isIncoming
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : isDpi
                                ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
                                : "bg-white/5 border-white/10 text-slate-400"
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
                            <div className="text-xs font-bold text-white truncate">
                              {isOutgoing ? (
                                <>
                                  Sent {tx.tokenSymbol || "SOL"} to{" "}
                                  <span className="text-indigo-300 font-mono">
                                    {tx.counterpartyHandle
                                      ? `@${tx.counterpartyHandle}`
                                      : `${tx.counterparty?.slice(0, 4)}...${tx.counterparty?.slice(-4)}`}
                                  </span>
                                </>
                              ) : isIncoming ? (
                                <>
                                  Received from{" "}
                                  <span className="text-emerald-300 font-mono">
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
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
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
                                  isIncoming ? "text-emerald-400" : "text-white"
                                }`}
                              >
                                {isIncoming ? "+" : "-"}
                                {tx.amount.toFixed(3)}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
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
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-indigo-400 transition-all cursor-pointer"
                            title="Download Receipt (PNG)"
                          >
                            <Receipt size={13} />
                          </button>
                          <a
                            href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                            title="View on Solana Explorer"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </Card>
              )}
            </>
          )
        ) : (
          /* Global Protocol Activity Feed View */
          <div className="flex flex-col gap-2.5">
            {loadingProtocol && protocolTxs.length === 0 ? (
              <Card className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <RefreshCw size={20} className="animate-spin text-indigo-400" />
                <span className="text-xs text-slate-400">
                  Fetching recent transactions on DPI Program…
                </span>
              </Card>
            ) : filteredProtocolTxs.length === 0 ? (
              <Card className="p-8 text-center flex flex-col items-center gap-2">
                <Activity size={20} className="text-slate-500" />
                <div className="text-xs font-bold text-white">No protocol activity found</div>
                <div className="text-[11px] text-slate-500">
                  Transaction signatures executed on {PROGRAM_ID.toBase58().slice(0, 8)}... will
                  appear here in real time.
                </div>
              </Card>
            ) : (
              <Card className="overflow-hidden divide-y divide-white/6">
                {filteredProtocolTxs.map((ptx) => {
                  const shortSig = `${ptx.signature.slice(0, 10)}...${ptx.signature.slice(-8)}`;
                  const isCopied = copiedSig === ptx.signature;

                  return (
                    <div
                      key={ptx.signature}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/2 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                          <Zap size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs font-bold text-white truncate">
                              {shortSig}
                            </span>
                            {ptx.err ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                Failed
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Confirmed
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <span>{ptx.blockTime}</span>
                            <span>·</span>
                            <span>Slot {ptx.slot}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => copySignature(ptx.signature)}
                          className="p-1.5 rounded-lg bg-white/4 hover:bg-white/8 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy transaction signature"
                        >
                          {isCopied ? (
                            <CheckCircle size={13} className="text-emerald-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                        <a
                          href={ptx.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-white/4 hover:bg-white/8 text-slate-400 hover:text-white transition-colors"
                          title="Inspect on Solana Explorer"
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
