"use client";

import React, { useState } from "react";
import { X, Coins, ExternalLink, Copy, Check, Sparkles } from "lucide-react";
import { useToast } from "@/components/Toast";
import { triggerHaptic } from "@/lib/haptics";
import { useWallet } from "@solana/wallet-adapter-react";

interface TokenFaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TokenFaucetModal({
  isOpen,
  onClose,
}: TokenFaucetModalProps) {
  const { publicKey } = useWallet();
  const toast = useToast();
  const [copiedMint, setCopiedMint] = useState<string | null>(null);

  if (!isOpen) return null;

  const tokens = [
    {
      symbol: "USDC",
      name: "Circle USD Coin",
      mint: "4zMMC9zT5H24GsmVBtBq7B8RFKu1e79mksqtCRRjh482",
      faucetUrl: "https://faucet.circle.com/",
      faucetName: "Circle Official Faucet",
      color: "from-blue-500 to-indigo-600",
    },
    {
      symbol: "EURC",
      name: "Circle Euro Coin",
      mint: "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr",
      faucetUrl: "https://faucet.circle.com/",
      faucetName: "Circle Official Faucet",
      color: "from-indigo-500 to-purple-600",
    },
    {
      symbol: "PYUSD",
      name: "PayPal USD",
      mint: "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM",
      faucetUrl: "https://solfaucet.com/",
      faucetName: "Solana Devnet Faucet",
      color: "from-sky-500 to-blue-700",
    },
  ];

  const copyToClipboard = (text: string, label: string) => {
    triggerHaptic("tap");
    navigator.clipboard.writeText(text);
    setCopiedMint(label);
    toast.success(`Copied ${label} mint address!`);
    setTimeout(() => setCopiedMint(null), 2000);
  };

  const copyWalletAddr = () => {
    if (!publicKey) return;
    triggerHaptic("tap");
    navigator.clipboard.writeText(publicKey.toBase58());
    toast.success("Wallet address copied for faucet!");
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full bg-[#111827] border border-white/16 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Coins size={24} />
          </div>
          <h3 className="text-base font-black text-white">Devnet Token Faucet</h3>
          <p className="text-xs text-slate-400 mt-1">
            Get free testnet USDC, EURC, & PYUSD tokens on Solana Devnet
          </p>
        </div>

        {publicKey && (
          <button
            onClick={copyWalletAddr}
            className="flex items-center justify-between p-2.5 rounded-xl bg-white/4 border border-white/10 text-xs text-slate-300 hover:bg-white/8 transition-colors cursor-pointer"
          >
            <span className="truncate max-w-200px font-mono text-[11px]">
              {publicKey.toBase58().slice(0, 10)}...{publicKey.toBase58().slice(-8)}
            </span>
            <span className="text-indigo-400 font-bold text-[11px] flex items-center gap-1 shrink-0">
              <Copy size={11} /> Copy Address
            </span>
          </button>
        )}

        <div className="flex flex-col gap-2.5">
          {tokens.map((t) => (
            <div
              key={t.symbol}
              className="p-3.5 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl bg-linear-to-br ${t.color} flex items-center justify-center text-white text-xs font-black shrink-0`}
                >
                  {t.symbol.slice(0, 3)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{t.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                    <span>{t.mint.slice(0, 6)}...{t.mint.slice(-4)}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(t.mint, t.symbol)}
                      className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                      title="Copy mint"
                    >
                      {copiedMint === t.symbol ? (
                        <Check size={11} className="text-emerald-400" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <a
                href={t.faucetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-[11px] font-bold text-indigo-300 hover:text-white transition-all shrink-0 cursor-pointer"
              >
                Claim <ExternalLink size={11} />
              </a>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          Circle Faucet allows claiming 10 USDC or EURC every 2 hours directly to your Solana Devnet address.
        </p>
      </div>
    </div>
  );
}
