"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { triggerHaptic } from "@/lib/haptics";
import { useToast } from "@/components/Toast";
import { getDpiProgram, checkHandleAvailability, validateHandle } from "@/lib/dpi-program";
import {
  X,
  Sparkles,
  AtSign,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Loader,
  Search,
} from "lucide-react";

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasHandle: boolean;
}

export default function OnboardingWizardModal({
  isOpen,
  onClose,
  hasHandle,
}: OnboardingWizardModalProps) {
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const toast = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [handleInput, setHandleInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<"idle" | "available" | "taken" | "invalid">("idle");
  const [errorText, setErrorText] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setHandleInput("");
      setAvailability("idle");
      setErrorText("");
    }
  }, [isOpen]);

  const markOnboarded = () => {
    try {
      localStorage.setItem("dpi_onboarded", "true");
    } catch {}
  };

  const handleDismiss = () => {
    triggerHaptic("tap");
    markOnboarded();
    onClose();
  };

  const checkAvailability = async (query: string) => {
    const clean = query.trim().toLowerCase();
    if (!clean) {
      setAvailability("idle");
      return;
    }

    const validation = validateHandle(clean);
    if (validation) {
      setAvailability("invalid");
      setErrorText(typeof validation === "string" ? validation : "Invalid handle format");
      return;
    }

    setChecking(true);
    setErrorText("");

    try {
      const program = getDpiProgram(connection);
      const res = await checkHandleAvailability(program, clean);
      if (res.state === "AVAILABLE") {
        setAvailability("available");
      } else {
        setAvailability("taken");
        setErrorText(`@${clean} is already claimed by another user`);
      }
    } catch {
      setAvailability("invalid");
      setErrorText("Error checking availability");
    } finally {
      setChecking(false);
    }
  };

  const handleInputChange = (val: string) => {
    const clean = val.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
    setHandleInput(clean);
    setAvailability("idle");
    setErrorText("");

    if (timerRef.current) clearTimeout(timerRef.current);
    if (clean.length >= 3) {
      timerRef.current = setTimeout(() => checkAvailability(clean), 300);
    }
  };

  const handleProceedToClaim = () => {
    markOnboarded();
    triggerHaptic("success");
    onClose();
    if (handleInput && availability === "available") {
      router.push(`/handle?search=${encodeURIComponent(handleInput)}`);
    } else {
      router.push("/handle");
    }
  };

  if (!isOpen || hasHandle) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-[#0d1222] border border-white/20 shadow-2xl overflow-hidden flex flex-col">
        {/* Step Indicator Header */}
        <div className="px-6 pt-5 pb-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
              Step {step} of 3
            </span>
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    s === step ? "w-6 bg-indigo-500" : s < step ? "w-3 bg-emerald-400" : "w-3 bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Skip for now
          </button>
        </div>

        {/* Wizard Steps */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
                <Sparkles size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Welcome to DPI</h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Decentralized Public Infrastructure gives your Solana wallet a human-readable <span className="text-indigo-400 font-semibold">@handle</span> — just like UPI, email, or a phone number.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left pt-1">
                <div className="p-3 rounded-xl bg-white/4 border border-white/10">
                  <Zap size={16} className="text-amber-400 mb-1" />
                  <div className="text-xs font-bold text-white">No 44-char Keys</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Send to @alice instead of clumsy public keys</div>
                </div>
                <div className="p-3 rounded-xl bg-white/4 border border-white/10">
                  <ShieldCheck size={16} className="text-emerald-400 mb-1" />
                  <div className="text-xs font-bold text-white">100% On-Chain</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Non-custodial, censorship-resistant Solana registry</div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setStep(2);
                  }}
                  className="w-full py-3.5 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 hover:brightness-110 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  Choose Your @Handle <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-300 flex items-center justify-center mx-auto mb-2">
                  <AtSign size={24} />
                </div>
                <h3 className="text-base font-bold text-white">Check Handle Availability</h3>
                <p className="text-xs text-slate-400 mt-0.5">Find a unique username for your Solana identity</p>
              </div>

              <div className="space-y-2">
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 font-bold text-indigo-400 text-sm">@</span>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="yourname"
                    maxLength={20}
                    className="w-full pl-8 pr-10 py-3 rounded-xl bg-white/5 border border-white/15 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:border-indigo-400 transition-colors"
                  />
                  {checking && (
                    <Loader size={16} className="absolute right-3.5 animate-spin text-indigo-400" />
                  )}
                  {availability === "available" && !checking && (
                    <CheckCircle size={16} className="absolute right-3.5 text-emerald-400" />
                  )}
                  {(availability === "taken" || availability === "invalid") && !checking && (
                    <AlertCircle size={16} className="absolute right-3.5 text-rose-400" />
                  )}
                </div>

                {availability === "available" && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2 font-medium">
                    <CheckCircle size={14} />
                    <span>Great news! <b>@{handleInput}</b> is available to claim!</span>
                  </div>
                )}

                {errorText && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{errorText}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={availability !== "available"}
                  onClick={() => {
                    triggerHaptic("selection");
                    setStep(3);
                  }}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    availability === "available"
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/25"
                      : "bg-white/5 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  Continue <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Ready to Claim @{handleInput}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Finalize your on-chain handle registration</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/4 border border-white/10 space-y-2.5 text-xs text-left">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Registration Fee</span>
                  <span className="font-bold text-emerald-400">FREE (Devnet)</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Est. Network Gas</span>
                  <span className="font-mono text-white">~0.0015 SOL (Rent exempt)</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Ownership</span>
                  <span className="text-indigo-400 font-bold">100% Non-custodial</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleProceedToClaim}
                  className="w-full py-3.5 rounded-xl bg-linear-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:brightness-110 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer"
                >
                  Register @{handleInput} Now <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
