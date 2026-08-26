"use client";

import { useState } from "react";
import { WalletMultiButton } from "@/components/WalletButton";
import { ChevronLeft, Globe } from "lucide-react";
import { useNetwork, CLUSTER_CONFIG } from "@/components/NetworkContext";
import NetworkSwitcherModal from "@/components/NetworkSwitcherModal";
import { triggerHaptic } from "@/lib/haptics";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export default function Header({
  title,
  showBack = false,
  onBack,
  rightElement,
}: HeaderProps) {
  const { network } = useNetwork();
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const currentConfig = CLUSTER_CONFIG[network] || CLUSTER_CONFIG.devnet;

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#090B10]/80 backdrop-blur-xl border-b border-white/6 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center cursor-pointer text-white/80 transition-all"
              aria-label="Back"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {title ? (
            <h1 className="text-lg font-bold text-white tracking-tight">
              {title}
            </h1>
          ) : (
            <div className="flex items-center gap-2.5">
              {/* DPI Logo Mark */}
              <div className="w-8 h-8 rounded-xl bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <span className="text-white text-xs font-black tracking-tight">
                  dpi
                </span>
              </div>
              <div>
                <div className="text-sm font-extrabold text-white leading-none tracking-tight">
                  DPI
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("tap");
                    setNetworkModalOpen(true);
                  }}
                  className="text-[10px] text-indigo-300 hover:text-white font-semibold leading-none mt-1 flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-white/4 border border-white/8 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentConfig.badgeColor} animate-pulse`} />
                  <span>{currentConfig.label}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {title && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("tap");
                setNetworkModalOpen(true);
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Change Solana Network"
            >
              <Globe size={15} />
            </button>
          )}
          {rightElement}
          <div className="scale-90 origin-right">
            <WalletMultiButton />
          </div>
        </div>
      </header>

      <NetworkSwitcherModal
        isOpen={networkModalOpen}
        onClose={() => setNetworkModalOpen(false)}
      />
    </>
  );
}

