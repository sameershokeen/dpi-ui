"use client";

import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@/components/WalletButton";
import { ChevronLeft, Globe, ShieldCheck, Sun, Moon, Bell } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useNetwork, CLUSTER_CONFIG } from "@/components/NetworkContext";
import NetworkSwitcherModal from "@/components/NetworkSwitcherModal";
import NotificationPreferencesModal from "@/components/NotificationPreferencesModal";
import { useTheme } from "@/components/ThemeContext";
import { triggerHaptic } from "@/lib/haptics";
import { getDpiProgram, checkIsAdmin } from "@/lib/dpi-program";

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
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const currentConfig = CLUSTER_CONFIG[network] || CLUSTER_CONFIG.devnet;

  useEffect(() => {
    let active = true;
    async function checkAdminStatus() {
      if (!publicKey || !connection) {
        setIsAdmin(false);
        return;
      }
      try {
        const program = getDpiProgram(connection);
        const adminStatus = await checkIsAdmin(program, publicKey);
        if (active) {
          setIsAdmin(adminStatus);
        }
      } catch {
        if (active) setIsAdmin(false);
      }
    }
    checkAdminStatus();
    return () => {
      active = false;
    };
  }, [publicKey, connection]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[var(--bg-base)]/85 backdrop-blur-xl border-b border-white/6 px-4 py-3 flex items-center justify-between gap-3 transition-colors">
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
            <Link href="/" className="flex items-center gap-2.5 group">
              {/* Official DPI Logo Mark */}
              <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/25 group-hover:scale-105 border border-indigo-500/30 transition-transform bg-[#090B10] shrink-0">
                <Image
                  src="/dpi-icon-square.png"
                  alt="DPI"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div>
                <div className="text-sm font-extrabold text-white leading-none tracking-tight">
                  DPI
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerHaptic("tap");
                    setNetworkModalOpen(true);
                  }}
                  className="text-[10px] text-indigo-300 hover:text-white font-semibold leading-none mt-1 flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-white/4 border border-white/8 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentConfig.badgeColor} animate-pulse`} />
                  <span>{currentConfig.label}</span>
                </button>
              </div>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Admin Badge */}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => triggerHaptic("tap")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-[11px] font-bold text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-all animate-pulse"
              title="DPI Protocol Admin Console"
            >
              <ShieldCheck size={13} className="text-purple-300" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          {/* Theme Toggle (FEAT-046) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} mode`}
            aria-label="Toggle Theme"
          >
            {resolvedTheme === "dark" ? (
              <Sun size={15} className="text-amber-300" />
            ) : (
              <Moon size={15} className="text-indigo-400" />
            )}
          </button>

          {/* Notifications Preferences (FEAT-022) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("tap");
              setNotifModalOpen(true);
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Notification & Sound Preferences"
            aria-label="Notification Preferences"
          >
            <Bell size={15} />
          </button>

          {title && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("tap");
                setNetworkModalOpen(true);
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
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

      <NotificationPreferencesModal
        isOpen={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
      />
    </>
  );
}
