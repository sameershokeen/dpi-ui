"use client";

import { useEffect, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { getDpiProgram, initProtocolEventListener } from "@/lib/dpi-program";
import { useToast } from "@/components/Toast";
import { triggerHaptic } from "@/lib/haptics";

export default function ProtocolEventListener() {
  const { connection } = useConnection();
  const toast = useToast();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!connection) return;

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    let isSubscribed = true;

    try {
      const program = getDpiProgram(connection);
      const unsubscribe = initProtocolEventListener(program, (eventName, payload) => {
        if (!isSubscribed) return;
        const eventData = payload?.event || payload || {};

        switch (eventName) {
          case "handleRegistered":
            triggerHaptic("tap");
            toast.info(
              `@${eventData.handle || "handle"} registered on Solana`,
              "New Handle Registered 🚀"
            );
            break;
          case "handleTransferred":
            triggerHaptic("tap");
            toast.info(
              `@${eventData.handle || "handle"} ownership transferred`,
              "Handle Transfer 🔄"
            );
            break;
          case "handleFrozen":
            triggerHaptic("warning");
            toast.warning(
              `@${eventData.handle || "handle"} was frozen by administrator`,
              "Handle Frozen 🔒"
            );
            break;
          case "handleUnfrozen":
            triggerHaptic("tap");
            toast.success(
              `@${eventData.handle || "handle"} was unfrozen`,
              "Handle Unfrozen 🔓"
            );
            break;
          case "handleReserved":
            triggerHaptic("tap");
            toast.info(
              `@${eventData.handle || "handle"} reserved by administration`,
              "Namespace Reserved 🛡️"
            );
            break;
          case "handleRecovered":
            triggerHaptic("warning");
            toast.warning(
              `@${eventData.handle || "handle"} recovered by administration`,
              "Emergency Recovery ⚠️"
            );
            break;
          case "configUpdated":
            triggerHaptic("tap");
            toast.info(
              "Protocol admin key transferred on-chain",
              "Admin Governance 🏛️"
            );
            break;
          default:
            break;
        }
      });

      cleanupRef.current = unsubscribe;
    } catch {
      // Ignore websocket connection issues on RPC providers without pubsub
    }

    return () => {
      isSubscribed = false;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [connection, toast]);

  return null;
}
