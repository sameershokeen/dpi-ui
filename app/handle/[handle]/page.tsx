"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import Header from "@/components/Header";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import { getHandleRegistryPDA } from "@/lib/dpi-program";
import { Send, Copy, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface HandleData {
  owner: string;
  handle: string;
  frozen: boolean;
}

export default function HandlePublicPage() {
  const params = useParams();
  const router = useRouter();
  const { connection } = useConnection();
  const handle = (params.handle as string).replace(/^@/, "");

  const [data, setData] = useState<HandleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [handlePDA] = getHandleRegistryPDA(handle);
        const info = await connection.getAccountInfo(handlePDA);
        if (!info?.data) {
          setNotFound(true);
          return;
        }
        const d = info.data;
        // Discriminator: 8 bytes
        // owner: 32 bytes pubkey
        // handle string: 4 bytes length + N bytes
        // bump: 1 byte
        // frozen: 1 byte
        const owner = new PublicKey(d.slice(8, 40)).toBase58();
        const strLen = d.readUInt32LE(40);
        const handleStr = d.slice(44, 44 + strLen).toString("utf-8");
        const frozen = d[44 + strLen + 1] === 1;
        setData({ owner, handle: handleStr, frozen });
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (handle) fetch();
  }, [handle, connection]);

  // Load profile photo from localStorage when owner public key is resolved
  useEffect(() => {
    if (data?.owner) {
      const stored = localStorage.getItem(`dpi_avatar_${data.owner}`);
      setProfilePhoto(stored);
    } else {
      setProfilePhoto(null);
    }
  }, [data?.owner]);

  const copyAddress = () => {
    if (data?.owner) {
      navigator.clipboard.writeText(data.owner);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortAddr = data?.owner
    ? `${data.owner.slice(0, 8)}...${data.owner.slice(-6)}`
    : "";

  return (
    <div>
      <Header showBack onBack={() => router.back()} />
      <div style={{ padding: "20px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
            Loading @{handle}...
          </div>
        )}

        {notFound && !loading && (
          <Card style={{ padding: "40px 24px", textAlign: "center" }}>
            <AlertTriangle size={40} color="var(--text-muted)" style={{ margin: "0 auto 16px" }} />
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              @{handle} not found
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
              This handle hasn't been registered yet.
            </div>
            <Link
              href="/handle"
              style={{
                padding: "10px 20px",
                background: "var(--accent)",
                color: "white",
                borderRadius: 10,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Register it
            </Link>
          </Card>
        )}

        {data && !loading && (
          <>
            {/* Profile card */}
            <Card style={{ padding: "28px", marginBottom: 16, textAlign: "center" }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 30,
                  color: "white",
                  fontWeight: 800,
                  overflow: "hidden",
                }}
              >
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  data.handle[0].toUpperCase()
                )}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
                @{data.handle}
              </div>
              <div style={{ marginBottom: 12 }}>
                {data.frozen ? (
                  <StatusBadge status="danger">🔒 Frozen</StatusBadge>
                ) : (
                  <StatusBadge status="success">✓ Active</StatusBadge>
                )}
              </div>
              <button
                onClick={copyAddress}
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "8px 16px",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "monospace",
                }}
              >
                {copied ? <CheckCircle size={14} color="var(--success)" /> : <Copy size={14} />}
                {shortAddr}
              </button>
            </Card>

            {/* Actions */}
            <Card style={{ padding: "16px", marginBottom: 16 }}>
              <Link
                href={`/send?to=${data.handle}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "14px",
                  background: "var(--accent)",
                  borderRadius: 12,
                  color: "white",
                  textDecoration: "none",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                <Send size={18} />
                Send SOL to @{data.handle}
              </Link>
            </Card>

            {/* Details */}
            <Card style={{ padding: "16px" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, fontWeight: 600 }}>
                ON-CHAIN DETAILS
              </div>
              {[
                { label: "Handle", value: `@${data.handle}` },
                { label: "Owner", value: shortAddr, mono: true },
                { label: "Status", value: data.frozen ? "Frozen" : "Active" },
                { label: "Network", value: "Solana Devnet" },
              ].map(({ label, value, mono }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontSize: 14,
                  }}
                >
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontFamily: mono ? "monospace" : undefined,
                      fontSize: mono ? 12 : 14,
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <a
                  href={`https://explorer.solana.com/address/${data.owner}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}
                >
                  View on Solana Explorer ↗
                </a>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
