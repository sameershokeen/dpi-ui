"use client";

import React from "react";
import { Loader2, CheckCircle2, ShieldCheck, Radio, Sparkles } from "lucide-react";

export type StepperStage = "signing" | "broadcasting" | "confirming" | "done";

interface TransactionStepperModalProps {
  isOpen: boolean;
  stage: StepperStage;
  txTitle?: string;
  txSubtitle?: string;
}

export default function TransactionStepperModal({
  isOpen,
  stage,
  txTitle = "Processing On-Chain Transaction",
  txSubtitle = "Please confirm the prompt in your Solana wallet extension.",
}: TransactionStepperModalProps) {
  if (!isOpen) return null;

  const steps = [
    {
      id: "signing",
      label: "Wallet Signature",
      desc: "Approve transaction request",
      icon: ShieldCheck,
    },
    {
      id: "broadcasting",
      label: "Cluster Broadcast",
      desc: "Transmitting to Solana Devnet",
      icon: Radio,
    },
    {
      id: "confirming",
      label: "Block Confirmation",
      desc: "Finalizing on-chain ledger state",
      icon: Sparkles,
    },
  ];

  const getStepStatus = (stepId: string) => {
    if (stage === "done") return "completed";
    if (stage === stepId) return "active";

    if (stage === "signing") {
      return "pending";
    }
    if (stage === "broadcasting") {
      if (stepId === "signing") return "completed";
      return "pending";
    }
    if (stage === "confirming") {
      if (stepId === "signing" || stepId === "broadcasting") return "completed";
      return "pending";
    }
    return "pending";
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative max-w-xs sm:max-w-sm w-full bg-[#111827] border border-indigo-500/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(99,102,241,0.25)] flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
          <h3 className="text-base font-black text-white">{txTitle}</h3>
          <p className="text-xs text-slate-400 mt-1">{txSubtitle}</p>
        </div>

        {/* Stepper list */}
        <div className="w-full flex flex-col gap-3 px-2">
          {steps.map((s, idx) => {
            const status = getStepStatus(s.id);
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  status === "active"
                    ? "bg-indigo-500/15 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                    : status === "completed"
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-white/3 border-white/6 opacity-40"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    status === "active"
                      ? "bg-indigo-500 text-white"
                      : status === "completed"
                      ? "bg-emerald-500 text-white"
                      : "bg-white/10 text-slate-400"
                  }`}
                >
                  {status === "active" ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : status === "completed" ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <span className="text-[11px] font-bold">{idx + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white leading-none">{s.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
