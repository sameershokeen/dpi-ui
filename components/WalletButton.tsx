"use client";

import dynamic from "next/dynamic";

export const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  {
    ssr: false,
    loading: () => (
      <div className="h-10 px-4 rounded-xl bg-black/5 dark:bg-white/5 border border-(--border) flex items-center justify-center text-xs font-semibold text-(--text-muted) animate-pulse min-w-30">
        Connect Wallet
      </div>
    ),
  }
);
