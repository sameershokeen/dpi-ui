"use client";

import { useState, useEffect } from "react";
import { Wallet, AtSign, Send, CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

interface Step {
  id: number;
  title: string;
  badge: string;
  subtitle: string;
  description: string;
  icon: typeof Wallet;
  gradient: string;
  borderColor: string;
  textColor: string;
  actionText: string;
  actionHref: string;
  mockup: {
    type: "wallet" | "handle" | "send";
    headline: string;
    detail: string;
    subdetail?: string;
  };
}

const STEPS: Step[] = [
  {
    id: 1,
    title: "Connect Wallet",
    badge: "Step 1 · 10 Seconds",
    subtitle: "Non-custodial & Permissionless",
    description: "Connect Phantom, Backpack, or Solflare. No email or personal data required. Full self-sovereignty.",
    icon: Wallet,
    gradient: "from-indigo-500/20 to-purple-500/10",
    borderColor: "border-indigo-500/40",
    textColor: "text-indigo-400",
    actionText: "Supported Wallets",
    actionHref: "#",
    mockup: {
      type: "wallet",
      headline: "Phantom / Solflare Connected",
      detail: "Pubkey: 7xKX...3b49",
      subdetail: "Solana Devnet Active",
    },
  },
  {
    id: 2,
    title: "Claim @handle",
    badge: "Step 2 · One-time On-chain",
    subtitle: "Your Permanent Web3 Name",
    description: "Claim your unique @handle mapped directly to your wallet address on the DPI registry smart contract.",
    icon: AtSign,
    gradient: "from-purple-500/20 to-pink-500/10",
    borderColor: "border-purple-500/40",
    textColor: "text-purple-400",
    actionText: "Claim @handle",
    actionHref: "/handle",
    mockup: {
      type: "handle",
      headline: "@satoshi.sol",
      detail: "Registered & Verified On-Chain",
      subdetail: "Fee: 0.00 SOL · Verified PDA",
    },
  },
  {
    id: 3,
    title: "Instant Payments",
    badge: "Step 3 · Peer-to-Peer",
    subtitle: "Zero Protocol Cut · ~400ms",
    description: "Send SOL, USDC, EURC, or PYUSD directly to @handles without copying fragile 44-character addresses.",
    icon: Send,
    gradient: "from-emerald-500/20 to-teal-500/10",
    borderColor: "border-emerald-500/40",
    textColor: "text-emerald-400",
    actionText: "Start Transfer",
    actionHref: "/send",
    mockup: {
      type: "send",
      headline: "Paid 2.5 SOL to @alice",
      detail: "Confirmed in 380ms",
      subdetail: "Protocol Fee: 0.00% (Free)",
    },
  },
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

  // Auto-advance step every 5 seconds if not interacted
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev % STEPS.length) + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const current = STEPS.find((s) => s.id === activeStep) || STEPS[0];
  const CurrentIcon = current.icon;

  return (
    <div className="rounded-3xl border border-(--border) bg-(--bg-card) backdrop-blur-xl p-5 sm:p-6 shadow-2xl relative overflow-hidden transition-colors">
      {/* Decorative background glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-bold text-indigo-500 dark:text-indigo-400 mb-1">
            <Sparkles size={12} className="text-indigo-500 dark:text-indigo-400" />
            Simple 3-Step Flow
          </div>
          <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
            How DPI Protocol Works
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-(--text-muted) bg-(--bg-subtle) px-2.5 py-1 rounded-lg border border-(--border)">
          <ShieldCheck size={13} className="text-emerald-500 dark:text-emerald-400" />
          <span>Non-custodial</span>
        </div>
      </div>

      {/* Step Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-(--bg-subtle) border border-(--border) mb-5">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = step.id === activeStep;
          return (
            <button
              key={step.id}
              onClick={() => {
                setActiveStep(step.id);
                setIsAutoPlaying(false);
              }}
              className={`flex items-center justify-center gap-2 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isActive ? "bg-white text-indigo-700" : "bg-white/10 text-slate-400"
                }`}
              >
                {step.id}
              </div>
              <span className="truncate hidden sm:inline">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active Step Content Card */}
      <div
        className={`rounded-2xl border ${current.borderColor} bg-linear-to-br ${current.gradient} p-4 sm:p-5 relative transition-all duration-300`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-12 h-12 rounded-2xl bg-black/40 border ${current.borderColor} flex items-center justify-center shrink-0 shadow-inner`}
            >
              <CurrentIcon size={24} className={current.textColor} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {current.badge}
              </span>
              <h3 className="text-base font-bold text-white leading-snug">
                {current.title}
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                {current.subtitle}
              </p>
            </div>
          </div>

          {current.actionHref !== "#" && (
            <Link
              href={current.actionHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold active:scale-95 transition-all self-end sm:self-auto shrink-0"
            >
              <span>{current.actionText}</span>
              <ArrowRight size={13} />
            </Link>
          )}
        </div>

        <p className="text-xs text-(--text-secondary) leading-relaxed mb-4">
          {current.description}
        </p>

        {/* Live Mockup Box */}
        <div className="rounded-xl bg-(--bg-subtle) border border-(--border) p-3.5 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-500 dark:text-indigo-300 shrink-0">
              <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground truncate font-mono">
                {current.mockup.headline}
              </div>
              <div className="text-[11px] text-(--text-muted) font-medium truncate">
                {current.mockup.detail}
              </div>
            </div>
          </div>

          {current.mockup.subdetail && (
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 whitespace-nowrap">
              {current.mockup.subdetail}
            </span>
          )}
        </div>
      </div>

      {/* Progress timeline dots */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          {STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() => {
                setActiveStep(step.id);
                setIsAutoPlaying(false);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step.id === activeStep
                  ? "w-7 bg-indigo-500"
                  : "w-2 bg-white/20 hover:bg-white/40"
              }`}
              title={`Switch to step ${step.id}`}
            />
          ))}
        </div>
        <span className="text-[11px] text-slate-400">
          Step {activeStep} of 3
        </span>
      </div>
    </div>
  );
}
