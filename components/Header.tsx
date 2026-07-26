"use client";

import { WalletMultiButton } from "@/components/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";

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
  const { connected } = useWallet();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--bg-base)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {showBack && (
          <button
            onClick={onBack}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-primary)",
              fontSize: 18,
            }}
          >
            ‹
          </button>
        )}
        {title ? (
          <span
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </span>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* DPI Logo Mark */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  color: "white",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                }}
              >
                dpi
              </span>
            </div>
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1,
                }}
              >
                DPI
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  lineHeight: 1,
                  marginTop: 2,
                  letterSpacing: "0.2px",
                }}
              >
                Devnet
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {rightElement}
        <div style={{ transform: "scale(0.88)", transformOrigin: "right center" }}>
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
