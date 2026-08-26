"use client";

import React, { useState } from "react";
import { X, Globe, Check, Server, ShieldAlert } from "lucide-react";
import { useNetwork, CLUSTER_CONFIG, SolanaCluster } from "@/components/NetworkContext";
import { triggerHaptic } from "@/lib/haptics";

interface NetworkSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NetworkSwitcherModal({
  isOpen,
  onClose,
}: NetworkSwitcherModalProps) {
  const { network, setNetwork, customRpcUrl, setCustomRpcUrl } = useNetwork();
  const [customInput, setCustomInput] = useState(customRpcUrl);

  if (!isOpen) return null;

  const clusters: SolanaCluster[] = ["devnet", "mainnet-beta", "testnet"];

  const handleSelectCluster = (c: SolanaCluster) => {
    setNetwork(c);
    onClose();
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomRpcUrl(customInput);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-xs sm:max-w-sm w-full bg-[#111827] border border-white/16 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Globe size={20} />
          </div>
          <h3 className="text-base font-black text-white">Solana Network & RPC</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Switch clusters or configure a custom RPC endpoint
          </p>
        </div>

        {/* Cluster list */}
        <div className="flex flex-col gap-2">
          {clusters.map((c) => {
            const conf = CLUSTER_CONFIG[c];
            const isSelected = network === c && !customRpcUrl;
            return (
              <button
                key={c}
                type="button"
                onClick={() => handleSelectCluster(c)}
                className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600/20 border-indigo-500/50 text-white shadow-md shadow-indigo-500/10"
                    : "bg-white/4 border-white/8 text-slate-300 hover:bg-white/8 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${conf.badgeColor}`} />
                  <div>
                    <div className="text-xs font-bold leading-none">{conf.name}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{conf.label}</div>
                  </div>
                </div>
                {isSelected && <Check size={16} className="text-indigo-400" />}
              </button>
            );
          })}
        </div>

        {/* Custom RPC Input */}
        <form onSubmit={handleSaveCustom} className="pt-2 border-t border-white/8 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Server size={13} className="text-indigo-400" />
            <span>Custom RPC Endpoint (Optional)</span>
          </div>
          <input
            type="url"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="https://mainnet.helius-rpc.com/?api-key=..."
            className="w-full px-3 py-2 rounded-xl bg-white/4 border border-white/10 text-xs text-white outline-none focus:border-indigo-500/50"
          />
          <div className="flex gap-2">
            {customRpcUrl && (
              <button
                type="button"
                onClick={() => {
                  setCustomInput("");
                  setCustomRpcUrl("");
                }}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-all cursor-pointer"
              >
                Clear Custom
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold active:scale-95 transition-all cursor-pointer"
            >
              Apply RPC
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
