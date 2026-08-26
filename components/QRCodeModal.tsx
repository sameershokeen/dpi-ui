"use client";

import React, { useState } from "react";
import { X, Copy, CheckCircle, ExternalLink, Share2, QrCode } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";
import { useToast } from "@/components/Toast";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  value: string; // The address or solana pay link
  handle?: string;
}

export default function QRCodeModal({
  isOpen,
  onClose,
  title,
  subtitle,
  value,
  handle,
}: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  if (!isOpen) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    value
  )}&bgcolor=111827&color=6366F1&margin=10`;

  const copyToClipboard = () => {
    triggerHaptic("tap");
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    triggerHaptic("selection");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `DPI Profile: ${handle ? `@${handle}` : "Solana Address"}`,
          text: `Send SOL & SPL tokens instantly on Solana using ${
            handle ? `@${handle}` : value
          }!`,
          url: handle ? `${window.location.origin}/handle/${handle}` : window.location.href,
        });
        toast.success("Shared successfully!");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-xs sm:max-w-sm w-full bg-[#111827] border border-white/16 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mt-1">
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <QrCode size={20} />
          </div>
          <h3 className="text-base font-black text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* QR Code Container */}
        <div className="w-56 h-56 rounded-2xl overflow-hidden border border-indigo-500/30 p-2.5 bg-[#0d1322] shadow-[0_0_30px_rgba(99,102,241,0.2)] flex items-center justify-center relative group">
          <img
            src={qrImageUrl}
            alt="Solana QR Code"
            className="w-full h-full object-contain rounded-xl"
            loading="eager"
          />
        </div>

        {/* Value Display */}
        <div className="w-full px-3 py-2 rounded-xl bg-white/4 border border-white/8 text-[11px] font-mono text-slate-300 text-center truncate select-all">
          {value}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5 w-full mt-1">
          <button
            onClick={copyToClipboard}
            className="py-2.5 px-3 rounded-xl bg-indigo-600/25 border border-indigo-500/40 hover:bg-indigo-600/35 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            {copied ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy Value"}
          </button>

          <button
            onClick={handleShare}
            className="py-2.5 px-3 rounded-xl bg-white/6 border border-white/12 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Share2 size={14} />
            Share Link
          </button>
        </div>
      </div>
    </div>
  );
}
