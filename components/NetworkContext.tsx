"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import { useToast } from "@/components/Toast";
import { triggerHaptic } from "@/lib/haptics";

export type SolanaCluster = "devnet" | "mainnet-beta" | "testnet";

interface NetworkContextType {
  network: SolanaCluster;
  setNetwork: (net: SolanaCluster) => void;
  customRpcUrl: string;
  setCustomRpcUrl: (url: string) => void;
  endpoint: string;
  isMainnet: boolean;
}

const NetworkContext = createContext<NetworkContextType | null>(null);

export const CLUSTER_CONFIG: Record<
  SolanaCluster,
  { label: string; name: string; defaultRpc: string; badgeColor: string }
> = {
  devnet: {
    label: "Devnet",
    name: "Solana Devnet",
    defaultRpc: clusterApiUrl(WalletAdapterNetwork.Devnet),
    badgeColor: "bg-emerald-400",
  },
  "mainnet-beta": {
    label: "Mainnet",
    name: "Solana Mainnet-Beta",
    defaultRpc: clusterApiUrl(WalletAdapterNetwork.Mainnet),
    badgeColor: "bg-indigo-400",
  },
  testnet: {
    label: "Testnet",
    name: "Solana Testnet",
    defaultRpc: clusterApiUrl(WalletAdapterNetwork.Testnet),
    badgeColor: "bg-amber-400",
  },
};

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<SolanaCluster>("devnet");
  const [customRpcUrl, setCustomRpcUrlState] = useState<string>("");
  const toast = useToast();

  useEffect(() => {
    try {
      const savedNet = localStorage.getItem("dpi_network") as SolanaCluster;
      if (savedNet && CLUSTER_CONFIG[savedNet]) {
        setNetworkState(savedNet);
      }
      const savedRpc = localStorage.getItem("dpi_custom_rpc");
      if (savedRpc) {
        setCustomRpcUrlState(savedRpc);
      }
    } catch {}
  }, []);

  const setNetwork = (net: SolanaCluster) => {
    setNetworkState(net);
    triggerHaptic("selection");
    try {
      localStorage.setItem("dpi_network", net);
    } catch {}
    toast.info(`Switched network to ${CLUSTER_CONFIG[net].name}`, "Network Changed");
  };

  const setCustomRpcUrl = (url: string) => {
    setCustomRpcUrlState(url);
    try {
      if (url) {
        localStorage.setItem("dpi_custom_rpc", url);
      } else {
        localStorage.removeItem("dpi_custom_rpc");
      }
    } catch {}
    toast.success("Custom RPC endpoint saved!");
  };

  const endpoint = useMemo(() => {
    if (customRpcUrl && customRpcUrl.trim().startsWith("http")) {
      return customRpcUrl.trim();
    }
    if (network === "devnet" && process.env.NEXT_PUBLIC_HELIUS_RPC_URL) {
      return process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
    }
    return CLUSTER_CONFIG[network]?.defaultRpc || CLUSTER_CONFIG.devnet.defaultRpc;
  }, [network, customRpcUrl]);

  return (
    <NetworkContext.Provider
      value={{
        network,
        setNetwork,
        customRpcUrl,
        setCustomRpcUrl,
        endpoint,
        isMainnet: network === "mainnet-beta",
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}
