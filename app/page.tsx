"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState, useCallback } from "react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { WalletMultiButton } from "@/components/WalletButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Card from "@/components/Card";
import { lookupReverseCached } from "@/lib/dpi-cache";
import { triggerHaptic } from "@/lib/haptics";
import {
  ArrowUpRight,
  ArrowDownLeft,
  AtSign,
  Send,
  Users,
  Zap,
  Shield,
  Globe,
  Check,
  Coins,
  Loader,
  History,
  User,
  Sparkles,
  TrendingUp,
  CreditCard,
  Search,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [loadingHandle, setLoadingHandle] = useState(false);

  const fetchUserData = useCallback(async () => {
    if (!publicKey || !connection) return;
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch {
      // Ignore RPC connection glitches
    }

    setLoadingHandle(true);
    try {
      const handleStr = await lookupReverseCached(connection, publicKey);
      setHandle(handleStr);
    } catch {
      setHandle(null);
    } finally {
      setLoadingHandle(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    let ignore = false;
    if (connected && publicKey) {
      fetchUserData();
    } else if (!ignore) {
      setBalance(null);
      setHandle(null);
    }
    return () => {
      ignore = true;
    };
  }, [connected, publicKey, fetchUserData]);

  const shortKey = publicKey
    ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}`
    : null;

  return (
    <div className="w-full">
      <Header />
      <div className="px-4 pt-4 pb-6">
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const clean = searchQuery.replace(/^@/, "").trim().toLowerCase();
    triggerHaptic("selection");
    router.push(`/handle`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Section */}
      <div className="relative pt-6 pb-2 text-center overflow-hidden">
        {/* Glowing badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-xs font-bold text-indigo-300 mb-5 shadow-[0_0_15px_rgba(99,102,241,0.3)] backdrop-blur-md">
          <Sparkles size={13} className="text-indigo-300 animate-pulse" />
          <span>Decentralized Public Infrastructure</span>
        </div>

        {/* Logo mark */}
        <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center mx-auto mb-5 shadow-[0_0_40px_rgba(99,102,241,0.5)] border-2 border-white/30">
          <span className="text-white text-3xl font-black tracking-tighter">
            dpi
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
          Take Control of Your <br />
          <span className="bg-linear-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            Web3 Identity
          </span>
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 max-w-xs mx-auto leading-relaxed mb-5">
          Privacy like crypto. Simplicity like UPI. Send & receive tokens using human-readable @handles on Solana.
        </p>

        {/* Quick Handle Search Bar */}
        <form onSubmit={handleSearchSubmit} className="max-w-xs mx-auto mb-5">
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#12182B] border border-indigo-500/40 shadow-lg shadow-indigo-500/10">
            <span className="text-sm font-black text-indigo-400">@</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="check handle availability..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-slate-500 font-medium"
            />
            <Link
              href="/handle"
              className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold active:scale-95 transition-all"
            >
              <ArrowRight size={14} />
            </Link>
          </div>
        </form>

        <div className="flex justify-center mb-2">
          <WalletMultiButton />
        </div>
      </div>

      {/* Ecosystem Metrics Widget */}
      <Card className="p-5 border-indigo-500/30 bg-linear-to-b from-[#141C2E]/90 to-[#0F1524]/90">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-indigo-400" />
            Ecosystem Metrics
          </span>
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
            Devnet 100% Live
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { label: "Handle Routing", percent: "99.9%", barWidth: "99%", color: "from-indigo-500 to-purple-500" },
            { label: "Instant Settlement", percent: "~400ms", barWidth: "95%", color: "from-emerald-500 to-teal-500" },
            { label: "Zero Protocol Fees", percent: "0%", barWidth: "100%", color: "from-pink-500 to-rose-500" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">{item.label}</span>
                <span className="font-bold text-white font-mono">{item.percent}</span>
              </div>
              <div className="h-1.5 w-full bg-white/8 rounded-full overflow-hidden">
                <div className={`h-full bg-linear-to-r ${item.color} rounded-full`} style={{ width: item.barWidth }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Feature Cards Grid */}
      <div className="flex flex-col gap-3">
        {[
          {
            icon: AtSign,
            title: "Claim your @handle",
            desc: "One wallet, one permanent identity. Universal routing across Solana.",
            gradient: "from-indigo-500/25 to-purple-500/25",
            iconColor: "text-indigo-400",
            border: "border-indigo-400/40",
            href: "/handle",
          },
          {
            icon: Send,
            title: "Send SOL & SPL Instantly",
            desc: "Send SOL, USDC, EURC & PYUSD with human-readable addresses.",
            gradient: "from-emerald-500/25 to-teal-500/25",
            iconColor: "text-emerald-400",
            border: "border-emerald-400/40",
            href: "/send",
          },
          {
            icon: Shield,
            title: "Self-Sovereign & On-Chain",
            desc: "Your handle lives in verified smart contracts. No middlemen.",
            gradient: "from-amber-500/25 to-orange-500/25",
            iconColor: "text-amber-400",
            border: "border-amber-400/40",
            href: "/community",
          },
          {
            icon: Users,
            title: "Community & Governance",
            desc: "Decentralized protocol parameters, verified contracts, and feed.",
            gradient: "from-pink-500/25 to-rose-500/25",
            iconColor: "text-pink-400",
            border: "border-pink-400/40",
            href: "/community",
          },
        ].map(({ icon: Icon, title, desc, gradient, iconColor, border, href }) => (
          <Link key={title} href={href}>
            <Card className="p-4 border hover:scale-[1.01] transition-transform duration-150">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl bg-linear-to-br ${gradient} border ${border} flex items-center justify-center shrink-0 shadow-md`}
                >
                  <Icon size={20} className={iconColor} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm text-white mb-0.5">{title}</div>
                  <div className="text-xs text-slate-300 leading-relaxed">{desc}</div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="text-center py-4 text-xs text-slate-400">
        Running on Solana Devnet ·{" "}
        <a
          href="https://explorer.solana.com/address/CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc?cluster=devnet"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-2"
        >
          View Verified Contract ↗
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
  const [tokens, setTokens] = useState<
    Array<{
      mint: string;
      symbol: string;
      name: string;
      balance: number;
      decimals: number;
    }>
  >([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const fetchTokenAssets = useCallback(async () => {
    if (!publicKey || !connection) return;
    setLoadingAssets(true);
    try {
      const tokenAccounts = await connection
        .getParsedTokenAccountsByOwner(publicKey, {
          programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        })
        .catch(() => ({ value: [] }));

      const allAccounts = tokenAccounts.value || [];

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
    } catch {
      // Ignore token query glitches
    } finally {
      setLoadingAssets(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    let ignore = false;
    if (!ignore) {
      fetchTokenAssets();
    }
    return () => {
      ignore = true;
    };
  }, [fetchTokenAssets]);

  const handleCopy = () => {
    if (!publicKey) return;
    triggerHaptic("tap");
    const textToCopy = handle ? `@${handle}` : publicKey.toBase58();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Main Balance Card */}
      <div className="relative rounded-3xl p-6 bg-linear-to-br from-indigo-950 via-[#161E36] to-[#0E1322] border-2 border-indigo-400/40 shadow-[0_12px_45px_rgba(99,102,241,0.35)] overflow-hidden backdrop-blur-2xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/35 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/25 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
            <CreditCard size={14} />
            Available Balance
          </span>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/25 text-indigo-300 border border-indigo-400/40 font-bold">
            Devnet
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-black text-white tracking-tight font-sans">
            {balance !== null ? balance.toFixed(4) : "—"}
          </span>
          <span className="text-xl font-black text-indigo-400">SOL</span>
        </div>

        <div className="text-xs text-slate-300 flex items-center gap-1.5 mb-6">
          {handle ? (
            <>
              <span className="font-bold text-white text-sm">@{handle}</span>
              <span>·</span>
              <span className="font-mono text-slate-300 font-medium">{shortKey}</span>
            </>
          ) : (
            <span className="font-mono text-slate-300 font-medium">{shortKey}</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <Link
            href="/send"
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white text-sm font-bold transition-all shadow-md"
          >
            <ArrowUpRight size={18} className="text-emerald-400" />
            Send Asset
          </Link>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white text-sm font-bold transition-all shadow-md cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={18} className="text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <ArrowDownLeft size={18} className="text-indigo-300" />
                Receive
              </>
            )}
          </button>
        </div>
      </div>

      {/* Handle Status Banner */}
      <Card className="p-4 border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                handle
                  ? "bg-indigo-500/25 text-indigo-300 border border-indigo-400/40"
                  : "bg-white/5 text-slate-400 border border-white/10"
              }`}
            >
              <AtSign size={20} />
            </div>
            <div>
              <div className="font-bold text-sm text-white">
                {loadingHandle
                  ? "Verifying on-chain..."
                  : handle
                  ? `@${handle}`
                  : "No @handle registered"}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {handle ? "Active On-Chain Solana Identity" : "Check & claim your unique DPI handle"}
              </div>
            </div>
          </div>
          <Link
            href="/handle"
            className="text-xs font-bold text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 active:scale-95 px-3.5 py-2 rounded-xl border border-indigo-400/40 transition-all"
          >
            {handle ? "Manage / Search" : "Search & Claim"}
          </Link>
        </div>
      </Card>

      {/* Quick Access Navigation Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: "/send", icon: Send, label: "Send Assets", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
          { href: "/handle", icon: AtSign, label: "Handles & Search", color: "text-indigo-400", bg: "bg-indigo-500/15 border-indigo-500/30" },
          { href: "/history", icon: History, label: "History & Receipts", color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30" },
          {
            href: handle ? `/handle/${handle}` : "/handle",
            icon: Globe,
            label: "Public Profile",
            color: "text-amber-400",
            bg: "bg-amber-500/15 border-amber-500/30",
          },
          { href: "/community", icon: Users, label: "Community", color: "text-pink-400", bg: "bg-pink-500/15 border-pink-500/30" },
          {
            href: "https://explorer.solana.com/address/CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc?cluster=devnet",
            icon: Zap,
            label: "Solana Explorer",
            color: "text-cyan-400",
            bg: "bg-cyan-500/15 border-cyan-500/30",
            external: true,
          },
        ].map(({ href, icon: Icon, label, color, bg, external }) => (
          <Card key={label} className="border-white/20 hover:border-white/30 transition-colors">
            <Link
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className="p-4 flex flex-col gap-2.5 active:scale-95 transition-transform"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} border flex items-center justify-center shadow-sm`}>
                <Icon size={18} className={color} />
              </div>
              <span className="text-sm font-bold text-white">{label}</span>
            </Link>
          </Card>
        ))}
      </div>

      {/* Holdings Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Coins size={16} className="text-indigo-400" />
            Holdings & Assets
          </h2>
          {loadingAssets && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-300">
              <Loader size={13} className="animate-spin" />
              Scanning assets...
            </div>
          )}
        </div>

        <Card className="overflow-hidden divide-y divide-white/10 border-white/20">
          {/* Native SOL Row */}
          <div className="p-4 flex items-center justify-between hover:bg-white/3 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center font-black text-indigo-300 text-xs shadow-sm">
                SOL
              </div>
              <div>
                <div className="text-sm font-bold text-white">Solana</div>
                <div className="text-xs text-slate-400">Native Network Token</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-white font-mono">
                {balance !== null ? balance.toFixed(4) : "—"}
              </div>
              <div className="text-xs text-slate-400 font-semibold">SOL</div>
            </div>
          </div>

          {/* Other SPL Tokens */}
          {tokens.map((token) => (
            <div
              key={token.mint}
              className="p-4 flex items-center justify-between hover:bg-white/3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/25 border border-purple-400/40 flex items-center justify-center font-bold text-purple-300 text-xs shadow-sm">
                  {token.symbol.slice(0, 4)}
                </div>
                <div>
                  <div className="text-sm font-bold text-white truncate max-w-40">
                    {token.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-white font-mono">
                  {token.balance.toFixed(4)}
                </div>
                <div className="text-xs text-slate-400 font-semibold">{token.symbol}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
