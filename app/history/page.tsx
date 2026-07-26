"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import Header from "@/components/Header";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import { getReverseLookupPDA } from "@/lib/dpi-program";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  ExternalLink, 
  User, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Code2, 
  HelpCircle,
  Search,
  AtSign
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

export default function HistoryPage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();

  const [txs, setTxs] = useState<ParsedTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchHistory = async () => {
    if (!publicKey || !connection) return;
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Get recent transaction signatures (limit to 10 for faster loading and layout compatibility)
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
      
      if (signatures.length === 0) {
        setTxs([]);
        setLoading(false);
        return;
      }

      // 2. Fetch parsed details sequentially with delay to avoid rate limits
      const parsedList: ParsedTx[] = [];
      const counterpartiesToResolve: { address: string; index: number }[] = [];
      const userAddrStr = publicKey.toBase58();

      for (let i = 0; i < signatures.length; i++) {
        const sig = signatures[i];
        let tx: any = null;
        try {
          tx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
        } catch (err) {
          console.warn("Failed fetching parsed transaction details:", sig.signature, err);
        }

        let type: "send" | "receive" | "interaction" | "dpi" = "interaction";
        let counterparty: string | null = null;
        let amount: number | null = null;
        let tokenSymbol: string | null = null;

        if (tx && tx.meta) {
          const message = tx.transaction.message;
          const instructions = message.instructions;

          // Check if any instruction calls the DPI program
          const hasDpiInstruction = instructions.some(
            (ix: any) => (ix.programId?.toBase58() === "CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc" || ix.program === "CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc")
          );

          if (hasDpiInstruction) {
            type = "dpi";
          } else {
            // Parse standard System Transfer instruction
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
              // Parse SPL token transfer (transfer or transferChecked)
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
                
                let decimals = 6;
                let symbol = "Token";
                if (mint === "4zMMC9zT5H24GsmVBtBq7B8RFKu1e79mksqtCRRjh482" || mint === "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU") {
                  symbol = "USDC";
                  decimals = 6;
                } else if (mint === "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr") {
                  symbol = "EURC";
                  decimals = 6;
                } else if (mint === "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM") {
                  symbol = "PYUSD";
                  decimals = 6;
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

        // Add 120ms delay between singular requests to avoid rate limits
        if (i < signatures.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
      }

      // 3. Batch resolve all counterparties' handles using getMultipleAccountsInfo (exactly 1 call)
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
                      const handleStr = data.slice(8 + 32 + 4, 8 + 32 + 4 + strLen).toString("utf-8");
                      parsedList[cp.index].counterpartyHandle = handleStr;
                    }
                  }
                } catch (err) {
                  console.error("Failed decoding handle for counterparty:", cp.address, err);
                }
              }
            });
          }
        } catch (err) {
          console.error("Failed batch resolving handles:", err);
        }
      }

      setTxs(parsedList);
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Failed to load transaction history from RPC.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      fetchHistory();
    }
  }, [connected, publicKey]);

  // Filter transactions based on query (by handle, address or signature)
  const filteredTxs = txs.filter((tx) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.signature.toLowerCase().includes(q) ||
      (tx.counterparty && tx.counterparty.toLowerCase().includes(q)) ||
      (tx.counterpartyHandle && tx.counterpartyHandle.toLowerCase().includes(q))
    );
  });

  const getAvatarForAddress = (address: string | null) => {
    if (!address) return null;
    return typeof window !== "undefined" ? localStorage.getItem(`dpi_avatar_${address}`) : null;
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

  return (
    <div>
      <Header title="History" showBack onBack={() => router.back()} />
      <div style={{ padding: "20px" }}>
        
        {!connected ? (
          <Card style={{ padding: "48px 24px", textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "var(--bg-base)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Clock size={28} color="var(--text-muted)" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
              Connect your wallet
            </div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.5 }}>
              Please connect your wallet to view your recent transaction history.
            </p>
          </Card>
        ) : (
          <div>
            {/* Toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {/* Search bar */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "0 12px",
                  gap: 8,
                }}
              >
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search by handle or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    padding: "10px 0",
                    fontSize: 14,
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Refresh button */}
              <button
                onClick={fetchHistory}
                disabled={loading}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  transition: "all 0.2s ease",
                }}
                title="Refresh history"
              >
                <RefreshCw 
                  size={16} 
                  style={{ animation: loading ? "spin 1s linear infinite" : "none" }} 
                />
              </button>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: "12px",
                  background: "#FFEEED",
                  borderRadius: 12,
                  color: "var(--danger)",
                  fontSize: 13,
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* UPI-style Simple list */}
            {loading && txs.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} style={{ padding: "16px", display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 22, background: "var(--bg-base)", animation: "pulse 1.5s infinite" }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ height: 14, width: "120px", background: "var(--bg-base)", borderRadius: 4, animation: "pulse 1.5s infinite" }} />
                      <div style={{ height: 10, width: "80px", background: "var(--bg-base)", borderRadius: 4, animation: "pulse 1.5s infinite" }} />
                    </div>
                    <div style={{ height: 16, width: "60px", background: "var(--bg-base)", borderRadius: 4, animation: "pulse 1.5s infinite" }} />
                  </Card>
                ))}
              </div>
            ) : filteredTxs.length === 0 ? (
              <Card style={{ padding: "40px 24px", textAlign: "center" }}>
                <Clock size={36} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                  No transactions found
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                  {searchQuery ? "No results match your search query." : "You haven't made any transactions yet."}
                </p>
              </Card>
            ) : (
              <Card style={{ padding: "4px 0", overflow: "hidden" }}>
                {filteredTxs.map((tx, idx) => {
                  const isOutgoing = tx.type === "send";
                  const isIncoming = tx.type === "receive";
                  const isInteraction = tx.type === "interaction" || tx.type === "dpi";
                  const statusFailed = tx.status === "failed";
                  
                  const cachedAvatar = getAvatarForAddress(tx.counterparty);

                  // Row separator border
                  const borderStyle = idx < filteredTxs.length - 1 
                    ? "1px solid var(--border-subtle)" 
                    : "none";

                  return (
                    <div
                      key={tx.signature}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 16px",
                        borderBottom: borderStyle,
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      {/* Left: Avatar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            background: isOutgoing 
                              ? "var(--accent-light)" 
                              : isIncoming 
                              ? "var(--success-light)" 
                              : tx.type === "dpi"
                              ? "var(--accent-light)"
                              : "var(--bg-base)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            overflow: "hidden",
                          }}
                        >
                          {cachedAvatar ? (
                            <img
                              src={cachedAvatar}
                              alt="Counterparty avatar"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : tx.counterpartyHandle ? (
                            <span 
                              style={{ 
                                color: isOutgoing ? "var(--accent)" : isIncoming ? "var(--success)" : "var(--text-secondary)", 
                                fontWeight: 700, 
                                fontSize: 18 
                              }}
                            >
                              {tx.counterpartyHandle[0].toUpperCase()}
                            </span>
                          ) : isOutgoing ? (
                            <ArrowUpRight size={18} color="var(--accent)" />
                          ) : isIncoming ? (
                            <ArrowDownLeft size={18} color="var(--success)" />
                          ) : tx.type === "dpi" ? (
                            <AtSign size={18} color="var(--accent)" />
                          ) : (
                            <Code2 size={18} color="var(--text-muted)" />
                          )}
                        </div>

                        {/* Middle: Details */}
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                          <div 
                            style={{ 
                              fontWeight: 700, 
                              fontSize: 14, 
                              color: "var(--text-primary)",
                              display: "flex",
                              alignItems: "center",
                              gap: 6
                            }}
                          >
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {isOutgoing ? (
                                <>Sent {tx.tokenSymbol || "SOL"} to {tx.counterpartyHandle ? `@${tx.counterpartyHandle}` : `${tx.counterparty?.slice(0, 4)}...${tx.counterparty?.slice(-4)}`}</>
                              ) : isIncoming ? (
                                <>Received {tx.tokenSymbol || "SOL"} from {tx.counterpartyHandle ? `@${tx.counterpartyHandle}` : `${tx.counterparty?.slice(0, 4)}...${tx.counterparty?.slice(-4)}`}</>
                              ) : tx.type === "dpi" ? (
                                <>DPI Handle Registration</>
                              ) : (
                                <>Contract Interaction</>
                              )}
                            </span>
                            
                            {statusFailed && (
                              <span style={{ fontSize: 10, color: "var(--danger)", background: "#FFEEED", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>
                                Failed
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                            <span>{formatDate(tx.blockTime)}</span>
                            <span>·</span>
                            <span style={{ fontFamily: "monospace", fontSize: 10 }}>Slot {tx.slot}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Explorer */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 12 }}>
                        {tx.amount !== null && !isInteraction && (
                          <div 
                            style={{ 
                              fontWeight: 800, 
                              fontSize: 15,
                              color: statusFailed 
                                ? "var(--text-muted)" 
                                : isIncoming 
                                ? "var(--success)" 
                                : "var(--text-primary)",
                              textAlign: "right"
                            }}
                          >
                            {isIncoming ? "+" : "-"} {tx.amount.toFixed(3)}
                            <span style={{ fontSize: 10, fontWeight: 500, marginLeft: 2 }}>{tx.tokenSymbol || "SOL"}</span>
                          </div>
                        )}

                        <a
                          href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: "1px solid var(--border)",
                            background: "var(--bg-elevated)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          title="View on Solana Explorer"
                        >
                          <ExternalLink size={14} />
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
