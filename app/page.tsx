"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { WalletMultiButton } from "@/components/WalletButton";
import Link from "next/link";
import Header from "@/components/Header";
import Card from "@/components/Card";
import { getReverseLookupPDA } from "@/lib/dpi-program";
import { ArrowUpRight, ArrowDownLeft, AtSign, Send, Users, Zap, Shield, Globe, Check, Coins, Loader, History, User } from "lucide-react";

export default function HomePage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [loadingHandle, setLoadingHandle] = useState(false);

  useEffect(() => {
    if (!publicKey || !connection) return;
    connection.getBalance(publicKey).then((bal) => {
      setBalance(bal / LAMPORTS_PER_SOL);
    });

    // Try to fetch handle from on-chain
    const fetchHandle = async () => {
      setLoadingHandle(true);
      try {
        const [reversePDA] = getReverseLookupPDA(publicKey);
        const accountInfo = await connection.getAccountInfo(reversePDA);
        if (accountInfo?.data) {
          // Skip 8 bytes discriminator, 32 bytes owner pubkey, then 4 bytes string length
          const data = accountInfo.data;
          const strLen = data.readUInt32LE(8 + 32);
          const handleStr = data.slice(8 + 32 + 4, 8 + 32 + 4 + strLen).toString("utf-8");
          setHandle(handleStr);
        } else {
          setHandle(null);
        }
      } catch {
        setHandle(null);
      } finally {
        setLoadingHandle(false);
      }
    };
    fetchHandle();
  }, [publicKey, connection]);

  const shortKey = publicKey
    ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}`
    : null;

  return (
    <div>
      <Header />
      <div style={{ padding: "20px 20px 0" }}>
        {!connected ? (
          <LandingView />
        ) : (
          <ConnectedView
            balance={balance}
            handle={handle}
            loadingHandle={loadingHandle}
            shortKey={shortKey}
            publicKey={publicKey}
          />
        )}
      </div>
    </div>
  );
}

function LandingView() {
  return (
    <div>
      {/* Hero */}
      <div
        style={{
          textAlign: "center",
          padding: "40px 0 32px",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: "0 8px 24px rgba(91,79,233,0.3)",
          }}
        >
          <span style={{ color: "white", fontSize: 26, fontWeight: 800 }}>dpi</span>
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--text-primary)",
            margin: "0 0 10px",
            lineHeight: 1.2,
          }}
        >
          Your identity on Solana
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--text-secondary)",
            margin: "0 0 32px",
            lineHeight: 1.5,
          }}
        >
          Privacy like crypto.
          <br />
          Simplicity like UPI.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <WalletMultiButton />
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        {[
          {
            icon: AtSign,
            title: "Claim your @handle",
            desc: "One wallet, one identity. Register a permanent on-chain handle.",
            color: "#5B4FE9",
            bg: "#EEF0FF",
          },
          {
            icon: Send,
            title: "Send SOL instantly",
            desc: "Pay anyone by @handle — no long addresses needed.",
            color: "#22C97A",
            bg: "#E8FAF1",
          },
          {
            icon: Shield,
            title: "Self-sovereign",
            desc: "Your handle lives on Solana. No middlemen, no censorship.",
            color: "#F5A623",
            bg: "#FFF8EC",
          },
          {
            icon: Users,
            title: "Community updates",
            desc: "Stay connected with DPI announcements and governance.",
            color: "#E8453C",
            bg: "#FFEEED",
          },
        ].map(({ icon: Icon, title, desc, color, bg }) => (
          <Card key={title} style={{ padding: "16px" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={20} color={color} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "24px 0",
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        Running on Solana Devnet ·{" "}
        <a
          href="https://explorer.solana.com/address/CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc?cluster=devnet"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          View contract ↗
        </a>
      </div>
    </div>
  );
}

function ConnectedView({
  balance,
  handle,
  loadingHandle,
  shortKey,
  publicKey,
}: {
  balance: number | null;
  handle: string | null;
  loadingHandle: boolean;
  shortKey: string | null;
  publicKey: PublicKey | null;
}) {
  const [copied, setCopied] = useState(false);

  const { connection } = useConnection();
  const [tokens, setTokens] = useState<Array<{
    mint: string;
    symbol: string;
    name: string;
    balance: number;
    decimals: number;
  }>>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const fetchTokenAssets = async () => {
    if (!publicKey || !connection) return;
    setLoadingAssets(true);
    try {
      let tokenAccounts: any = { value: [] };
      try {
        tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        });
      } catch (err) {
        console.warn("Failed fetching standard Token accounts:", err);
      }

      let token2022Accounts: any = { value: [] };
      try {
        token2022Accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new PublicKey("TokenzQdBNbMcq6D7KV5u56jgG7JT4ixeraXeiqVg1y"),
        });
      } catch (err) {
        console.warn("Failed fetching Token-2022 accounts (unrecognized on some RPCs):", err);
      }

      const allAccounts = [...(tokenAccounts.value || []), ...(token2022Accounts.value || [])];
      const parsed = allAccounts
        .map((acc) => {
          const info = acc.account.data.parsed.info;
          const mint = info.mint;
          const uiAmount = info.tokenAmount.uiAmount || 0;
          const decimals = info.tokenAmount.decimals;

          let symbol = `SPL (${mint.slice(0, 4)}...${mint.slice(-4)})`;
          let name = "SPL Token";

          if (mint === "4zMMC9zT5H24GsmVBtBq7B8RFKu1e79mksqtCRRjh482") {
            symbol = "USDC";
            name = "USD Coin (Circle Devnet)";
          } else if (mint === "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr") {
            symbol = "EURC";
            name = "EURC (Circle Devnet)";
          } else if (mint === "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM") {
            symbol = "PYUSD";
            name = "PayPal USD (Devnet)";
          }

          return { mint, symbol, name, balance: uiAmount, decimals };
        })
        .filter((t) => t.balance > 0);

      setTokens(parsed);
    } catch (e) {
      console.error("Error scanning token assets:", e);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    fetchTokenAssets();
  }, [publicKey, connection]);

  const handleCopy = () => {
    if (!publicKey) return;
    const textToCopy = handle ? `@${handle}` : publicKey.toBase58();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Balance Card */}
      <Card
        style={{
          padding: "24px",
          background: "var(--accent)",
          border: "none",
          marginBottom: 16,
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 6 }}>
          Available balance
        </div>
        <div
          style={{
            color: "white",
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-1px",
            marginBottom: 4,
          }}
        >
          {balance !== null ? balance.toFixed(4) : "—"}
          <span style={{ fontSize: 16, fontWeight: 500, marginLeft: 6, opacity: 0.8 }}>
            SOL
          </span>
        </div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
          {handle ? (
            <span>
              @{handle} · {shortKey}
            </span>
          ) : (
            shortKey
          )}
        </div>

        {/* Quick action buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <Link
            href="/send"
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.2)",
              borderRadius: 12,
              padding: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              color: "white",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <ArrowUpRight size={16} />
            Send
          </Link>
          <button
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: 12,
              padding: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check size={16} />
                Copied
              </>
            ) : (
              <>
                <ArrowDownLeft size={16} />
                Receive
              </>
            )}
          </button>
        </div>
      </Card>

      {/* Handle Status */}
      <Card style={{ padding: "16px", marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: handle ? "var(--accent-light)" : "var(--bg-base)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AtSign size={20} color={handle ? "var(--accent)" : "var(--text-muted)"} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {loadingHandle
                  ? "Checking..."
                  : handle
                  ? `@${handle}`
                  : "No handle yet"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {handle ? "Your on-chain identity" : "Claim your @handle"}
              </div>
            </div>
          </div>
          <Link
            href="/handle"
            style={{
              fontSize: 13,
              color: "var(--accent)",
              fontWeight: 600,
              textDecoration: "none",
              padding: "6px 12px",
              background: "var(--accent-light)",
              borderRadius: 8,
            }}
          >
            {handle ? "Manage" : "Register"}
          </Link>
        </div>
      </Card>

      {/* Quick Links */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          { href: "/send", icon: Send, label: "Send Assets", color: "#22C97A", bg: "#E8FAF1" },
          { href: "/history", icon: History, label: "History", color: "#8E33FF", bg: "#F4ECFF" },
          {
            href: `/handle/${handle || ""}`,
            icon: Globe,
            label: "Your Page",
            color: "#F5A623",
            bg: "#FFF8EC",
            disabled: !handle,
          },
          { href: "/profile", icon: User, label: "Profile", color: "#FF3385", bg: "#FFEBF3" },
          { href: "/community", icon: Users, label: "Community", color: "#5B4FE9", bg: "#EEF0FF" },
          {
            href: "https://explorer.solana.com/address/CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc?cluster=devnet",
            icon: Zap,
            label: "Explorer",
            color: "#E8453C",
            bg: "#FFEEED",
            external: true,
          },
        ].map(({ href, icon: Icon, label, color, bg, disabled, external }) => (
          <Card key={label} style={{ opacity: disabled ? 0.4 : 1 }}>
            <Link
              href={disabled ? "#" : href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "16px",
                textDecoration: "none",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={18} color={color} />
              </div>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {label}
              </span>
            </Link>
          </Card>
        ))}
      </div>

      {/* Holdings Section */}
      <h3
        style={{
          fontSize: 16,
          fontWeight: 700,
          margin: "24px 0 12px",
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Coins size={18} color="var(--accent)" />
        Holdings
      </h3>

      <Card style={{ padding: "4px 0", overflow: "hidden", marginBottom: 20 }}>
        {/* Render Native SOL first */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: tokens.length > 0 ? "1px solid var(--border-subtle)" : "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "var(--accent-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                color: "var(--accent)",
                fontSize: 15,
              }}
            >
              SOL
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                Solana
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                Native Token
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>
              {balance !== null ? balance.toFixed(4) : "—"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
              SOL
            </div>
          </div>
        </div>

        {/* Render loading assets */}
        {loadingAssets && tokens.length === 0 && (
          <div style={{ padding: "20px", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13 }}>
            <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> Scanning assets...
          </div>
        )}

        {/* Render other SPL tokens */}
        {tokens.map((token, idx) => {
          const isLast = idx === tokens.length - 1;
          const bgCol = 
            token.symbol === "USDC" 
              ? "#EBF4FF" 
              : token.symbol === "EURC" 
              ? "#F0FDFA" 
              : token.symbol === "PYUSD" 
              ? "#F5F3FF" 
              : "var(--bg-base)";
          const textCol = 
            token.symbol === "USDC" 
              ? "#2563EB" 
              : token.symbol === "EURC" 
              ? "#0D9488" 
              : token.symbol === "PYUSD" 
              ? "#7C3AED" 
              : "var(--text-secondary)";

          return (
            <div
              key={token.mint}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: bgCol,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    color: textCol,
                    fontSize: 12,
                  }}
                >
                  {token.symbol.slice(0, 4)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {token.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }} title={token.mint}>
                    {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>
                  {token.balance.toFixed(4)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                  {token.symbol}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
