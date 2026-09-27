"use client";

import { useState, useEffect } from "react";
import { triggerHaptic } from "@/lib/haptics";
import { useToast } from "@/components/Toast";
import { usePrices } from "@/lib/prices";
import { PREDEFINED_TOKENS } from "@/lib/tokens";
import {
  X,
  QrCode,
  Copy,
  CheckCircle,
  Share2,
  FileText,
  Sparkles,
  Zap,
} from "lucide-react";

interface RequestPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  myHandle: string | null;
  myAddress: string | null;
}

export default function RequestPaymentModal({
  isOpen,
  onClose,
  myHandle,
  myAddress,
}: RequestPaymentModalProps) {
  const toast = useToast();
  const { formatUsd } = usePrices();

  const [mode, setMode] = useState<"dpi" | "solana-pay">("dpi");
  const [token, setToken] = useState("SOL");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [copied, setCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  const recipientIdentifier = myHandle ? `@${myHandle}` : myAddress || "";

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (mode === "solana-pay") {
      // FEAT-020: Solana Pay standard URI (solana:<recipient>?amount=...&spl-token=...&label=...&message=...)
      const target = myAddress || (myHandle ? `@${myHandle}` : "");
      const params = new URLSearchParams();
      if (amount && parseFloat(amount) > 0) {
        params.set("amount", amount);
      }
      if (token !== "SOL" && PREDEFINED_TOKENS[token]?.mint) {
        params.set("spl-token", PREDEFINED_TOKENS[token].mint);
      }
      if (myHandle) {
        params.set("label", `@${myHandle}`);
      }
      if (memo.trim()) {
        params.set("message", memo.trim());
      }
      const queryString = params.toString();
      const solanaUri = `solana:${target}${queryString ? `?${queryString}` : ""}`;
      setGeneratedLink(solanaUri);
    } else {
      // Standard DPI deep link
      const origin = window.location.origin;
      const params = new URLSearchParams();
      if (recipientIdentifier) {
        params.set("to", recipientIdentifier);
      }
      if (token) {
        params.set("token", token);
      }
      if (amount && parseFloat(amount) > 0) {
        params.set("amount", amount);
      }
      if (memo.trim()) {
        params.set("memo", memo.trim());
      }
      const url = `${origin}/send?${params.toString()}`;
      setGeneratedLink(url);
    }
  }, [mode, recipientIdentifier, myAddress, myHandle, token, amount, memo]);

  if (!isOpen) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    generatedLink
  )}&bgcolor=111827&color=6366F1&margin=10`;

  const handleCopyLink = () => {
    triggerHaptic("tap");
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success(
      mode === "solana-pay" ? "Solana Pay URI copied!" : "DPI payment link copied!"
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    triggerHaptic("selection");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Payment Request on DPI`,
          text: `Pay ${amount ? `${amount} ${token}` : token} to ${recipientIdentifier} on Solana DPI${
            memo ? ` for: "${memo}"` : ""
          }`,
          url: mode === "dpi" ? generatedLink : undefined,
        });
        toast.success("Shared successfully!");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const parsedAmount = parseFloat(amount) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-[#0d1222] border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <QrCode size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Request Payment</h2>
              <p className="text-[11px] text-slate-400">Create a payment link & QR code</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic("tap");
              onClose();
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Format Toggle (FEAT-020: Solana Pay vs DPI Link) */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-white/4 border border-white/8 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                setMode("dpi");
              }}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === "dpi"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              DPI Link
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                setMode("solana-pay");
              }}
              className={`py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                mode === "solana-pay"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap size={11} className="text-amber-300" />
              <span>Solana Pay QR</span>
            </button>
          </div>

          {/* QR Code preview */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/3 border border-white/10">
            <div className="w-44 h-44 rounded-xl overflow-hidden border border-indigo-500/30 p-2 bg-[#0a0f1e] shadow-lg flex items-center justify-center">
              <img
                src={qrImageUrl}
                alt="Payment QR Code"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="mt-2 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-xs font-bold text-white">
                  {amount ? `${amount} ${token}` : `Any amount (${token})`}
                </span>
                {mode === "solana-pay" && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Solana Pay
                  </span>
                )}
              </div>
              {parsedAmount > 0 && (
                <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                  ≈ {formatUsd(parsedAmount, token)} USD
                </span>
              )}
              <div className="text-[11px] text-indigo-400 font-mono mt-0.5">
                to {recipientIdentifier}
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            {/* Token Selector & Amount */}
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Asset
                </label>
                <select
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs font-bold text-white outline-none cursor-pointer"
                >
                  <option value="SOL" className="bg-[#121626]">SOL</option>
                  <option value="USDC" className="bg-[#121626]">USDC</option>
                  <option value="EURC" className="bg-[#121626]">EURC</option>
                  <option value="PYUSD" className="bg-[#121626]">PYUSD</option>
                </select>
              </div>

              <div className="col-span-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Amount (Optional)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9.]/g, "");
                    if (clean.split(".").length <= 2) setAmount(clean);
                  }}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-xs font-bold text-white font-mono placeholder:text-slate-600 outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Note / Memo */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Note / Memo (Optional)
              </label>
              <div className="relative">
                <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={memo}
                  maxLength={50}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="e.g. Lunch, Project milestone, Coffee"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleCopyLink}
              className="py-3 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/45 border border-indigo-500/50 text-indigo-200 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              {copied ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copied ? "Copied!" : mode === "solana-pay" ? "Copy Solana URI" : "Copy Link"}
            </button>

            <button
              onClick={handleShare}
              className="py-3 px-3 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 hover:brightness-110 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              <Share2 size={14} />
              Share Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
