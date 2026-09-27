"use client";

import { useState, useEffect, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { ArrowRightLeft, X, AlertTriangle, Loader, CheckCircle2, ChevronRight } from "lucide-react";
import { getDpiProgram, transferHandle as transferHandleSDK, parseAnchorError, confirmTx } from "@/lib/dpi-program";
import { invalidateHandleCache, lookupReverseCached } from "@/lib/dpi-cache";
import { triggerHaptic } from "@/lib/haptics";
import { useToast } from "@/components/Toast";
import RecipientAvatar from "@/components/RecipientAvatar";

interface TransferHandleModalProps {
  isOpen: boolean;
  onClose: () => void;
  handle: string;
  isFrozen?: boolean;
  onSuccess?: (signature: string) => void;
}

export default function TransferHandleModal({
  isOpen,
  onClose,
  handle,
  isFrozen = false,
  onSuccess,
}: TransferHandleModalProps) {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const { connection } = useConnection();
  const toast = useToast();

  const [recipientAddress, setRecipientAddress] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [step, setStep] = useState<"input" | "review">("input");
  const [recipientHandle, setRecipientHandle] = useState<string | null>(null);
  const [resolvingRecipient, setResolvingRecipient] = useState(false);
  const [countdown, setCountdown] = useState<number>(3);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state on modal open/close
  useEffect(() => {
    if (!isOpen) {
      setRecipientAddress("");
      setStep("input");
      setRecipientHandle(null);
      setCountdown(3);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    }
  }, [isOpen]);

  // Countdown for review step (FEAT-047 3-second safety timer)
  useEffect(() => {
    if (step === "review") {
      setCountdown(3);
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [step]);

  if (!isOpen) return null;

  const validateAddress = (addr: string): PublicKey | null => {
    const clean = addr.trim();
    if (!clean) return null;
    try {
      return new PublicKey(clean);
    } catch {
      return null;
    }
  };

  const handleProceedToReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !wallet) {
      toast.error("Please connect your wallet first.");
      return;
    }

    const recipientKey = validateAddress(recipientAddress);
    if (!recipientKey) {
      toast.error("Please enter a valid Solana public key address.");
      return;
    }

    if (recipientKey.equals(publicKey)) {
      toast.error("Recipient cannot be your current wallet.");
      return;
    }

    if (isFrozen) {
      toast.error("This handle is frozen. Transfers are currently locked.");
      return;
    }

    setResolvingRecipient(true);
    triggerHaptic("selection");

    try {
      // FEAT-047: Auto-resolve recipient handle
      const resolved = await lookupReverseCached(connection, recipientKey);
      setRecipientHandle(resolved);
      setStep("review");
    } catch {
      setRecipientHandle(null);
      setStep("review");
    } finally {
      setResolvingRecipient(false);
    }
  };

  const handleExecuteTransfer = async () => {
    const recipientKey = validateAddress(recipientAddress);
    if (!recipientKey || !publicKey || !wallet) return;

    setTransferring(true);
    triggerHaptic("selection");

    try {
      const program = getDpiProgram(connection, wallet);
      const sig = await transferHandleSDK(program, wallet, handle, recipientKey);

      await confirmTx(connection, sig, "confirmed");

      invalidateHandleCache(handle, publicKey);
      invalidateHandleCache(undefined, recipientKey);

      triggerHaptic("success");
      toast.success(
        `@${handle} transferred to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`,
        "Transfer Successful 🎉"
      );

      setRecipientAddress("");
      onClose();
      if (onSuccess) {
        onSuccess(sig);
      }
    } catch (err: any) {
      triggerHaptic("error");
      toast.error(parseAnchorError(err), "Transfer Failed");
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={() => !transferring && onClose()}
    >
      <div
        className="relative max-w-sm w-full bg-[#111827] border border-white/16 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Transfer @{handle}</h3>
              <p className="text-[11px] text-slate-400">
                {step === "input" ? "Enter recipient address" : "Step 2: Confirm recipient details"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !transferring && onClose()}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {isFrozen && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
            <AlertTriangle size={16} className="shrink-0 text-rose-400" />
            <span>This handle is FROZEN by administrators. Transfers are locked.</span>
          </div>
        )}

        {step === "input" ? (
          <form onSubmit={handleProceedToReview} className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Recipient Solana Wallet Address
              </label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Base58 Solana address..."
                disabled={transferring || isFrozen || resolvingRecipient}
                className="w-full bg-[#0A0E1A] border border-white/12 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-purple-500 font-mono transition-colors disabled:opacity-50"
              />
            </div>

            <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-[11px] text-slate-400 leading-relaxed">
              ℹ️ Once transferred, you will permanently forfeit ownership of{" "}
              <span className="text-white font-bold">@{handle}</span>.
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={transferring || resolvingRecipient}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={transferring || isFrozen || !recipientAddress.trim() || resolvingRecipient}
                className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {resolvingRecipient ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    <span>Resolving…</span>
                  </>
                ) : (
                  <>
                    <span>Review</span>
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* FEAT-047: Review & Confirmation Step with Recipient Preview and 3-second countdown */
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
            {/* Recipient Preview Card */}
            <div className="p-3.5 rounded-2xl bg-linear-to-br from-purple-950/40 to-indigo-950/40 border border-purple-500/40 flex items-center gap-3">
              <RecipientAvatar
                address={recipientAddress}
                handle={recipientHandle ? `@${recipientHandle}` : undefined}
                size={40}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white truncate">
                    {recipientHandle ? `@${recipientHandle}` : "Raw Wallet Address"}
                  </span>
                  {recipientHandle ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded border border-emerald-500/30">
                      Registered
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/30">
                      No Handle
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                  {recipientAddress.slice(0, 8)}...{recipientAddress.slice(-6)}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[11px] text-rose-300 leading-relaxed flex items-start gap-2">
              <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <span>
                Irreversible Action: You are transferring full on-chain control of{" "}
                <span className="font-bold text-white">@{handle}</span>.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setStep("input")}
                disabled={transferring}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleExecuteTransfer}
                disabled={transferring || countdown > 0}
                className={`py-2.5 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50 ${
                  countdown > 0
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-500 text-white shadow-red-600/30"
                }`}
              >
                {transferring ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    <span>Signing…</span>
                  </>
                ) : countdown > 0 ? (
                  <span>Confirm ({countdown}s)</span>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Confirm Transfer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
