"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, AtSign, Send, Wallet, X } from "lucide-react";

interface OnboardingProgressProps {
  isConnected: boolean;
  hasHandle: boolean;
  hasSentPayment?: boolean;
}

export default function OnboardingProgress({
  isConnected,
  hasHandle,
  hasSentPayment: hasSentPaymentProp,
}: OnboardingProgressProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden until we check
  const [hasSent, setHasSent] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const setupComplete = localStorage.getItem("dpi_setup_complete");
    const setupDismissed = localStorage.getItem("dpi_setup_dismissed");
    if (setupComplete === "true" || setupDismissed === "true") {
      setDismissed(true);
      return;
    }
    setDismissed(false);

    // Check if user has ever sent a payment
    const sentFlag = localStorage.getItem("dpi_has_sent_payment");
    if (sentFlag === "true") {
      setHasSent(true);
    }
  }, []);

  // Sync prop
  useEffect(() => {
    if (hasSentPaymentProp) {
      setHasSent(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("dpi_has_sent_payment", "true");
      }
    }
  }, [hasSentPaymentProp]);

  // Auto-complete when all steps done
  useEffect(() => {
    if (isConnected && hasHandle && hasSent) {
      if (typeof window !== "undefined") {
        localStorage.setItem("dpi_setup_complete", "true");
      }
      // Delay dismiss for a moment to show the completed state
      const t = setTimeout(() => setDismissed(true), 2000);
      return () => clearTimeout(t);
    }
  }, [isConnected, hasHandle, hasSent]);

  if (dismissed) return null;

  const steps = [
    {
      label: "Connect wallet",
      done: isConnected,
      icon: Wallet,
    },
    {
      label: "Register @handle",
      done: hasHandle,
      icon: AtSign,
      action: !hasHandle ? { href: "/handle", label: "Claim Now" } : undefined,
    },
    {
      label: "Make first payment",
      done: hasSent,
      icon: Send,
      action: !hasSent ? { href: "/send", label: "Try Sending" } : undefined,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dpi_setup_dismissed", "true");
    }
    setDismissed(true);
  };

  return (
    <div
      className={`relative rounded-2xl p-4 border transition-all duration-500 ${
        allDone
          ? "bg-emerald-500/10 border-emerald-500/30"
          : "bg-linear-to-br from-indigo-950/60 to-purple-950/40 border-indigo-400/30 animate-[onboard-pulse_3s_ease-in-out_infinite]"
      }`}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        aria-label="Dismiss setup guide"
      >
        <X size={14} />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-white">
          {allDone ? "Setup Complete! 🎉" : "DPI Setup"}
        </span>
        <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
          {completedCount} of {steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-white/8 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            allDone
              ? "bg-emerald-500"
              : "bg-linear-to-r from-indigo-500 to-purple-500"
          }`}
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-2">
        {steps.map((step) => (
          <div
            key={step.label}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  step.done
                    ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/40"
                    : "bg-white/5 text-slate-500 border border-white/10"
                }`}
              >
                {step.done ? (
                  <Check size={12} strokeWidth={3} />
                ) : (
                  <step.icon size={12} />
                )}
              </div>
              <span
                className={`text-xs font-semibold transition-colors ${
                  step.done ? "text-slate-400 line-through" : "text-white"
                }`}
              >
                {step.label}
              </span>
            </div>
            {step.action && (
              <Link
                href={step.action.href}
                className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 px-2.5 py-1 rounded-lg border border-indigo-500/30 transition-all active:scale-95"
              >
                {step.action.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
