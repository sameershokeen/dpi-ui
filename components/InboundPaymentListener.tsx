"use client";

import { useEffect, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useToast } from "@/components/Toast";
import { triggerHaptic } from "@/lib/haptics";
import { playNotificationSound } from "@/lib/sounds";
import { getNotificationSettings } from "@/components/NotificationPreferencesModal";

export default function InboundPaymentListener() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const toast = useToast();
  const prevBalanceRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!connected || !publicKey || !connection) {
      prevBalanceRef.current = null;
      initializedRef.current = false;
      return;
    }

    let isSubscribed = true;
    initializedRef.current = false;

    // Fetch baseline balance first
    connection
      .getBalance(publicKey, "confirmed")
      .then((b) => {
        if (isSubscribed) {
          prevBalanceRef.current = b;
          // Mark initialized after small delay so initial socket events don't trigger false alerts
          setTimeout(() => {
            if (isSubscribed) {
              initializedRef.current = true;
            }
          }, 1500);
        }
      })
      .catch(() => {});

    // Listen to account changes on-chain via WebSocket
    let subId: number | null = null;
    try {
      subId = connection.onAccountChange(
        publicKey,
        (accountInfo) => {
          if (!isSubscribed) return;
          const newBalance = accountInfo.lamports;

          if (
            initializedRef.current &&
            prevBalanceRef.current !== null &&
            newBalance > prevBalanceRef.current
          ) {
            const diffLamports = newBalance - prevBalanceRef.current;
            const diffSol = diffLamports / LAMPORTS_PER_SOL;

            const notifSettings = getNotificationSettings();

            if (diffSol >= notifSettings.minAmountSol) {
              triggerHaptic("success");
              playNotificationSound();

              if (notifSettings.inboundEnabled) {
                toast.success(
                  `Received +${diffSol.toFixed(4)} SOL on your wallet!`,
                  "Incoming Payment Received 💸"
                );
              }

              // FEAT-008: Native Browser Push Notification
              if (
                notifSettings.pushEnabled &&
                typeof window !== "undefined" &&
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                try {
                  const notif = new Notification("DPI Payment Received 💸", {
                    body: `Received +${diffSol.toFixed(4)} SOL on your address.`,
                    icon: "/dpi-icon-square.png",
                    tag: "dpi-payment",
                  });
                  notif.onclick = () => {
                    window.focus();
                  };
                } catch {}
              }
            }
          }
          prevBalanceRef.current = newBalance;
        },
        "confirmed"
      );
    } catch {}

    return () => {
      isSubscribed = false;
      if (subId !== null) {
        try {
          connection.removeAccountChangeListener(subId);
        } catch {}
      }
    };
  }, [connected, publicKey, connection, toast]);

  return null;
}
