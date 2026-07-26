"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@/components/WalletButton";
import { useState, useEffect, useRef } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import Header from "@/components/Header";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import { getReverseLookupPDA, getHandleRegistryPDA } from "@/lib/dpi-program";
import { Copy, CheckCircle, ExternalLink, AtSign, User, LogOut, Camera, Loader, History, Coins } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { publicKey, connected, disconnect } = useWallet();
  const { connection } = useConnection();

  const [balance, setBalance] = useState<number | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!publicKey || !connection) return;
    setLoading(true);

    Promise.all([
      connection.getBalance(publicKey),
      (async () => {
        try {
          const [reversePDA] = getReverseLookupPDA(publicKey);
          const info = await connection.getAccountInfo(reversePDA);
          if (info?.data) {
            const d = info.data;
            const strLen = d.readUInt32LE(8 + 32);
            const handleStr = d.slice(8 + 32 + 4, 8 + 32 + 4 + strLen).toString("utf-8");
            setHandle(handleStr);

            const [handlePDA] = getHandleRegistryPDA(handleStr);
            const hrInfo = await connection.getAccountInfo(handlePDA);
            if (hrInfo?.data) {
              setFrozen(hrInfo.data[hrInfo.data.length - 1] === 1);
            }
          } else {
            setHandle(null);
          }
        } catch {}
      })(),
    ])
      .then(([bal]) => setBalance(bal / LAMPORTS_PER_SOL))
      .finally(() => setLoading(false));
  }, [publicKey, connection]);

  // Load profile photo from localStorage
  useEffect(() => {
    if (publicKey) {
      const stored = localStorage.getItem(`dpi_avatar_${publicKey.toBase58()}`);
      setProfilePhoto(stored);
    } else {
      setProfilePhoto(null);
    }
  }, [publicKey]);

  const triggerFileInput = () => {
    if (fileInputRef.current && !uploading) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !publicKey) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      if (data.url) {
        localStorage.setItem(`dpi_avatar_${publicKey.toBase58()}`, data.url);
        setProfilePhoto(data.url);
      }
    } catch (err: any) {
      alert(`Error uploading photo: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!connected) {
    return (
      <div>
        <Header title="Profile" />
        <div style={{ padding: "20px" }}>
          <Card style={{ padding: "48px 24px", textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "var(--bg-base)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <User size={28} color="var(--text-muted)" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
              Connect your wallet
            </div>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              Connect to view your profile, handle, and transaction history.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <WalletMultiButton />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const shortKey = publicKey
    ? `${publicKey.toBase58().slice(0, 10)}...${publicKey.toBase58().slice(-8)}`
    : "";

  return (
    <div>
      <Header title="Profile" />
      <div style={{ padding: "20px" }}>
        {/* Avatar + identity */}
        <Card
          style={{
            padding: "28px 24px",
            marginBottom: 16,
            textAlign: "center",
            background: "linear-gradient(180deg, #FAFAF8 0%, #F5F4F0 100%)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: "none" }}
          />
          <div
            onClick={triggerFileInput}
            onMouseEnter={() => setAvatarHovered(true)}
            onMouseLeave={() => setAvatarHovered(false)}
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              background: handle ? "var(--accent)" : "var(--bg-base)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              border: handle ? "none" : "2px dashed var(--border)",
              cursor: uploading ? "not-allowed" : "pointer",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.2s ease",
              boxShadow: avatarHovered && !uploading ? "0 0 0 3px var(--accent-light)" : "none",
            }}
            title="Click to upload profile photo"
          >
            {uploading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  background: "rgba(0, 0, 0, 0.4)",
                  position: "absolute",
                  inset: 0,
                  zIndex: 2,
                }}
              >
                <Loader size={20} color="white" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : null}

            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Profile photo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : handle ? (
              <span style={{ color: "white", fontSize: 28, fontWeight: 800 }}>
                {handle[0].toUpperCase()}
              </span>
            ) : (
              <User size={28} color="var(--text-muted)" />
            )}

            {/* Hover Camera Overlay */}
            {avatarHovered && !uploading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0, 0, 0, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  zIndex: 1,
                }}
              >
                <Camera size={20} />
              </div>
            )}
          </div>

          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            {handle ? `@${handle}` : "No handle"}
          </div>

          {handle && (
            <div style={{ marginBottom: 12 }}>
              {frozen ? (
                <StatusBadge status="danger">🔒 Frozen</StatusBadge>
              ) : (
                <StatusBadge status="success">✓ Active</StatusBadge>
              )}
            </div>
          )}

          <button
            onClick={copyAddress}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "8px 14px",
              fontSize: 12,
              color: "var(--text-secondary)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "monospace",
              boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              transition: "all 0.15s ease",
            }}
          >
            {copied ? (
              <CheckCircle size={13} color="var(--success)" />
            ) : (
              <Copy size={13} />
            )}
            {shortKey}
          </button>
        </Card>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Card style={{ padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Coins size={14} color="var(--accent)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>SOL Balance</span>
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--accent)",
              }}
            >
              {loading ? "…" : balance !== null ? balance.toFixed(3) : "—"}
            </div>
          </Card>
          
          <Card style={{ padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <AtSign size={14} color={handle ? "var(--success)" : "var(--text-muted)"} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Handles</span>
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: handle ? "var(--success)" : "var(--text-muted)",
              }}
            >
              {loading ? "…" : handle ? "1" : "0"}
            </div>
          </Card>
        </div>

        {/* Actions */}
        <Card style={{ marginBottom: 16, overflow: "hidden" }}>
          {handle ? (
            <Link
              href={`/handle/${handle}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px",
                textDecoration: "none",
                color: "var(--text-primary)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "var(--accent-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AtSign size={16} color="var(--accent)" />
                </div>
                <span style={{ fontSize: 15, fontWeight: 600 }}>View @{handle} page</span>
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: 18 }}>›</span>
            </Link>
          ) : (
            <Link
              href="/handle"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px",
                textDecoration: "none",
                color: "var(--text-primary)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "var(--accent-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AtSign size={16} color="var(--accent)" />
                </div>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Register a handle</span>
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: 18 }}>›</span>
            </Link>
          )}

          {/* History link */}
          <Link
            href="/history"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px",
              textDecoration: "none",
              color: "var(--text-primary)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#E8FAF1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <History size={16} color="var(--success)" />
              </div>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Transaction History</span>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: 18 }}>›</span>
          </Link>

          <a
            href={
              publicKey
                ? `https://explorer.solana.com/address/${publicKey.toBase58()}?cluster=devnet`
                : "#"
            }
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px",
              textDecoration: "none",
              color: "var(--text-primary)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#FFF8EC",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ExternalLink size={16} color="var(--warning)" />
              </div>
              <span style={{ fontSize: 15, fontWeight: 600 }}>View on Explorer</span>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: 18 }}>›</span>
          </a>
        </Card>

        {/* Network info */}
        <Card style={{ padding: "14px 16px", marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 14,
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>Network</span>
            <StatusBadge status="accent">Devnet</StatusBadge>
          </div>
        </Card>

        {/* Disconnect */}
        <button
          onClick={() => disconnect()}
          style={{
            width: "100%",
            padding: "14px",
            border: "1.5px solid var(--border)",
            borderRadius: 12,
            background: "var(--bg-elevated)",
            color: "var(--danger)",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <LogOut size={16} />
          Disconnect Wallet
        </button>
      </div>
    </div>
  );
}
