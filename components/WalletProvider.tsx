"use client";

import { FC, ReactNode, useMemo, useCallback } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletError } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  TrustWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  Coin98WalletAdapter,
  SafePalWalletAdapter,
  TokenPocketWalletAdapter,
  BitKeepWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { NetworkProvider, useNetwork } from "@/components/NetworkContext";
import InboundPaymentListener from "@/components/InboundPaymentListener";

import "@solana/wallet-adapter-react-ui/styles.css";

interface Props {
  children: ReactNode;
}

const WalletConnectionInner: FC<Props> = ({ children }) => {
  const { endpoint } = useNetwork();
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TrustWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new Coin98WalletAdapter(),
      new SafePalWalletAdapter(),
      new TokenPocketWalletAdapter(),
      new BitKeepWalletAdapter(),
    ],
    []
  );

  const onError = useCallback((error: WalletError) => {
    if (
      error.name === "WalletWindowBlockedError" ||
      error.name === "WalletConnectionError" ||
      error.name === "WalletNotSelectedError"
    ) {
      return;
    }
    console.warn("Wallet adapter:", error.message || error.name);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect onError={onError}>
        <WalletModalProvider>
          {children}
          <InboundPaymentListener />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const SolanaWalletProvider: FC<Props> = ({ children }) => {
  return (
    <NetworkProvider>
      <WalletConnectionInner>{children}</WalletConnectionInner>
    </NetworkProvider>
  );
};

export default SolanaWalletProvider;

