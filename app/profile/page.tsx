"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@/components/WalletButton";
import { useState, useEffect, useRef, useCallback } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import Header from "@/components/Header";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import { lookupReverseCached, lookupHandleCached } from "@/lib/dpi-cache";
import { useToast } from "@/components/Toast";
import { triggerHaptic } from "@/lib/haptics";
import QRCodeModal from "@/components/QRCodeModal";
import TokenFaucetModal from "@/components/TokenFaucetModal";
import { Copy, CheckCircle, ExternalLink, AtSign, User, LogOut, Camera, Loader, History, Coins, X, Eye, Trash2, Upload, Droplets, Sparkles, QrCode, Search } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { publicKey, connected, disconnect } = useWallet();
  const { connection } = useConnection();
  const toast = useToast();

  const [balance, setBalance] = useState<number | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [airdropping, setAirdropping] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [tokenFaucetOpen, setTokenFaucetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfileData = useCallback(async () => {
    if (!publicKey || !connection) return;
    setLoading(true);

    try {
      const [bal, handleStr] = await Promise.all([
        connection.getBalance(publicKey).catch(() => null),
        lookupReverseCached(connection, publicKey),
      ]);

      if (bal !== null) {
        setBalance(bal / LAMPORTS_PER_SOL);
      }
      setHandle(handleStr);

      if (handleStr) {
        const handleInfo = await lookupHandleCached(connection, handleStr);
        setFrozen(handleInfo?.frozen || false);
      } else {
        setFrozen(false);
      }
    } catch (err) {
      console.warn("Failed fetching profile info", err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchProfileData();
      const stored = localStorage.getItem(`dpi_avatar_${publicKey.toBase58()}`);
      setProfilePhoto(stored);
    } else {
      setBalance(null);
      setHandle(null);
      setProfilePhoto(null);
    }
  }, [connected, publicKey, fetchProfileData]);

  const triggerFileInput = () => {
    if (fileInputRef.current && !uploading) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarClick = () => {
    if (profilePhoto) {
      setPreviewOpen(true);
    } else {
      triggerFileInput();
    }
  };

  const handleRemovePhoto = () => {
    if (!publicKey) return;
    localStorage.removeItem(`dpi_avatar_${publicKey.toBase58()}`);
    setProfilePhoto(null);
    setPreviewOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && previewOpen) {
        setPreviewOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewOpen]);

  const handleRequestAirdrop = async () => {
    if (!publicKey || !connection || airdropping) return;
    setAirdropping(true);
    triggerHaptic("selection");
    try {
      toast.info("Requesting 1 SOL from Solana Devnet faucet...", "Airdrop in Progress");
      const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature: sig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });
      triggerHaptic("success");
      toast.success("1 SOL has been credited to your Devnet wallet!", "Airdrop Confirmed");
      fetchProfileData();
    } catch (err: any) {
      triggerHaptic("error");
      toast.error(
        err?.message?.includes("429")
          ? "Devnet faucet rate limited. Please try again shortly."
          : `Airdrop failed: ${err.message || "Unknown error"}`,
        "Airdrop Error"
      );
    } finally {
      setAirdropping(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !publicKey) return;

    // Check size limit (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      triggerHaptic("error");
      toast.error("Please select an image smaller than 3MB.", "File Too Large");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      if (data.url) {
        localStorage.setItem(`dpi_avatar_${publicKey.toBase58()}`, data.url);
        setProfilePhoto(data.url);
        setPreviewOpen(false);
        triggerHaptic("success");
        toast.success("Profile photo updated successfully!");
      }
    } catch (err: any) {
      triggerHaptic("error");
      toast.error(err.message || "Failed to upload photo", "Upload Error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const copyAddress = () => {
    if (publicKey) {
      triggerHaptic("tap");
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      toast.success("Wallet address copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!connected) {
    return (
      <div className="w-full">
        <Header title="Profile" />
        <div className="px-4 py-8">
          <Card className="p-8 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <User size={28} />
            </div>
            <h2 className="text-lg font-black text-white">Connect Your Wallet</h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Connect to manage your DPI on-chain profile, registered handle, and avatar.
            </p>
            <div className="mt-2">
              <WalletMultiButton />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const shortKey = publicKey
    ? `${publicKey.toBase58().slice(0, 8)}...${publicKey.toBase58().slice(-6)}`
    : "";

  return (
    <div className="w-full">
      <Header title="Profile" />
      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Low Balance Airdrop Banner */}
        {balance !== null && balance < 0.05 && (
          <div className="p-3.5 rounded-2xl bg-linear-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 backdrop-blur-xl flex items-center justify-between gap-3 shadow-[0_4px_20px_rgba(99,102,241,0.2)] animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Droplets size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white">Low Devnet Balance</div>
                <div className="text-[10px] text-slate-400">Need SOL for gas fees?</div>
              </div>
            </div>
            <button
              onClick={handleRequestAirdrop}
              disabled={airdropping}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {airdropping ? (
                <Loader size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              {airdropping ? "Requesting…" : "Get 1 SOL"}
            </button>
          </div>
        )}

        {/* Profile Card */}
        <Card className="p-6 text-center flex flex-col items-center gap-3 bg-linear-to-b from-[#181F33] to-[#101422] border-indigo-500/20">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="relative">
            <div
              onClick={handleAvatarClick}
              className="w-20 h-20 rounded-3xl bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-black text-white text-3xl shadow-[0_0_30px_rgba(99,102,241,0.35)] relative overflow-hidden group cursor-pointer border border-white/20 active:scale-95 transition-all"
              title={profilePhoto ? "Click to preview photo" : "Click to upload profile photo"}
            >
              {uploading ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                  <Loader size={20} className="animate-spin text-white" />
                </div>
              ) : null}

              {profilePhoto ? (
                <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
              ) : handle ? (
                handle[0].toUpperCase()
              ) : (
                <User size={28} className="text-white/80" />
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                {profilePhoto ? <Eye size={20} /> : <Camera size={20} />}
              </div>
            </div>

            {/* Change photo button badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg border-2 border-[#181F33] cursor-pointer active:scale-90 transition-all z-10"
              title={profilePhoto ? "Change profile photo" : "Upload photo"}
            >
              <Camera size={13} />
            </button>
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {handle ? `@${handle}` : "No Handle Registered"}
            </h1>
            {handle && (
              <div className="mt-1">
                {frozen ? (
                  <StatusBadge status="danger">🔒 Frozen</StatusBadge>
                ) : (
                  <StatusBadge status="success">✓ Active On-Chain</StatusBadge>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyAddress}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/4 border border-white/10 text-xs font-mono text-slate-300 hover:bg-white/8 active:scale-95 transition-all cursor-pointer"
            >
              {copied ? (
                <CheckCircle size={13} className="text-emerald-400" />
              ) : (
                <Copy size={13} />
              )}
              {shortKey}
            </button>

            <button
              onClick={() => {
                triggerHaptic("tap");
                setQrOpen(true);
              }}
              className="p-1.5 rounded-xl bg-white/4 border border-white/10 text-slate-300 hover:text-white hover:bg-white/8 active:scale-95 transition-all cursor-pointer"
              title="Show QR Code"
            >
              <QrCode size={16} />
            </button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold mb-1">
              <Coins size={14} />
              <span>SOL Balance</span>
            </div>
            <div className="text-xl font-black text-white font-mono">
              {loading ? "…" : balance !== null ? balance.toFixed(3) : "—"}
            </div>
            <button
              onClick={handleRequestAirdrop}
              disabled={airdropping}
              className="mt-2 text-[10px] text-indigo-300 hover:text-indigo-200 underline cursor-pointer disabled:opacity-50"
            >
              {airdropping ? "Requesting..." : "+ Request Airdrop"}
            </button>
          </Card>

          <Card className="p-4 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-1">
              <AtSign size={14} />
              <span>Registered Handles</span>
            </div>
            <div className="text-xl font-black text-white font-mono">
              {loading ? "…" : handle ? "1" : "0"}
            </div>
            {handle ? (
              <Link
                href={`/handle/${handle}`}
                className="mt-2 text-[10px] text-emerald-400 hover:text-emerald-300 underline"
              >
                View Public Profile
              </Link>
            ) : (
              <Link
                href="/handle"
                className="mt-2 text-[10px] text-indigo-400 hover:text-indigo-300 underline"
              >
                Claim @handle
              </Link>
            )}
          </Card>
        </div>

        {/* Quick Links */}
        <Card className="overflow-hidden divide-y divide-white/6">
          {handle && (
            <Link
              href={`/handle/${handle}`}
              className="p-4 flex items-center justify-between hover:bg-white/2 active:bg-white/4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <AtSign size={16} />
                </div>
                <span className="text-xs font-bold text-white">View Public @{handle} Page</span>
              </div>
              <span className="text-slate-500 text-sm">›</span>
            </Link>
          )}

          <Link
            href="/handle"
            className="p-4 flex items-center justify-between hover:bg-white/2 active:bg-white/4 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Search size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Search & Check @Handles</span>
                <span className="text-[10px] text-slate-400">Check availability or lookup profiles</span>
              </div>
            </div>
            <span className="text-slate-500 text-sm">›</span>
          </Link>

          <Link
            href="/history"
            className="p-4 flex items-center justify-between hover:bg-white/2 active:bg-white/4 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <History size={16} />
              </div>
              <span className="text-xs font-bold text-white">Transaction Receipts</span>
            </div>
            <span className="text-slate-500 text-sm">›</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("tap");
              setTokenFaucetOpen(true);
            }}
            className="w-full p-4 flex items-center justify-between hover:bg-white/2 active:bg-white/4 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Coins size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Devnet Token Faucet</span>
                <span className="text-[10px] text-slate-400">Get free test USDC, EURC, & PYUSD</span>
              </div>
            </div>
            <span className="text-slate-500 text-sm">›</span>
          </button>

          <a
            href={
              publicKey
                ? `https://explorer.solana.com/address/${publicKey.toBase58()}?cluster=devnet`
                : "#"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 flex items-center justify-between hover:bg-white/2 active:bg-white/4 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ExternalLink size={16} />
              </div>
              <span className="text-xs font-bold text-white">Explorer Account Overview</span>
            </div>
            <span className="text-slate-500 text-sm">›</span>
          </a>
        </Card>

        {/* Disconnect Button */}
        <button
          onClick={() => disconnect()}
          className="w-full py-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15 active:scale-[0.99] text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <LogOut size={16} />
          Disconnect Wallet
        </button>
      </div>

      {/* Photo Preview Modal */}
      {previewOpen && profilePhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative max-w-xs sm:max-w-sm w-full bg-[#111827] border border-white/16 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setPreviewOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close preview"
            >
              <X size={18} />
            </button>

            {/* Header info */}
            <div className="text-center mt-1">
              <h3 className="text-base font-bold text-white">Profile Photo Preview</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {handle ? `@${handle}` : shortKey}
              </p>
            </div>

            {/* Image display */}
            <div className="w-56 h-56 rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-black/40 flex items-center justify-center">
              <img
                src={profilePhoto}
                alt="Profile Preview"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2.5 w-full mt-1">
              <button
                type="button"
                onClick={() => {
                  triggerFileInput();
                }}
                disabled={uploading}
                className="py-2.5 px-3 rounded-xl bg-indigo-600/25 border border-indigo-500/40 hover:bg-indigo-600/40 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {uploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                Change Photo
              </button>

              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={uploading}
                className="py-2.5 px-3 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile QR Code Modal */}
      <QRCodeModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        title={handle ? `@${handle}` : "My Solana Address"}
        subtitle="Scan with camera to send SOL / tokens directly"
        value={
          handle
            ? `${typeof window !== "undefined" ? window.location.origin : ""}/handle/${handle}`
            : publicKey?.toBase58() || ""
        }
        handle={handle || undefined}
      />

      {/* Token Faucet Modal */}
      <TokenFaucetModal
        isOpen={tokenFaucetOpen}
        onClose={() => setTokenFaucetOpen(false)}
      />
    </div>
  );
}
