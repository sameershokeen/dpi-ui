"use client";

import dynamic from "next/dynamic";

export const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  {
    ssr: false,
    loading: () => (
      <div className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-semibold text-white/50 animate-pulse min-w-30">
        Connect Wallet
      </div>
    ),
  }
);
