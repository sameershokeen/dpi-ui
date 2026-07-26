"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useState, useEffect } from "react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import Header from "@/components/Header";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import {
  DPI_PROGRAM_ID,
  getHandleRegistryPDA,
  getReverseLookupPDA,
  getReservedHandlePDA,
  getConfigPDA,
  validateHandle,
} from "@/lib/dpi-program";
import { AtSign, CheckCircle, XCircle, Loader, AlertTriangle } from "lucide-react";
import Link from "next/link";

type Step = "idle" | "checking" | "available" | "taken" | "registering" | "success" | "error";

export default function HandlePage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [handle, setHandle] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [myHandle, setMyHandle] = useState<string | null>(null);
  const [myHandleFrozen, setMyHandleFrozen] = useState(false);
  const [txSig, setTxSig] = useState("");
  const [checkTimer, setCheckTimer] = useState<NodeJS.Timeout | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Load existing handle on mount
  useEffect(() => {
    if (!publicKey || !connection) return;
    const fetch = async () => {
      try {
        const [reversePDA] = getReverseLookupPDA(publicKey);
        const accountInfo = await connection.getAccountInfo(reversePDA);
        if (accountInfo?.data) {
          const data = accountInfo.data;
          const strLen = data.readUInt32LE(8 + 32);
          const handleStr = data.slice(8 + 32 + 4, 8 + 32 + 4 + strLen).toString("utf-8");
          setMyHandle(handleStr);

          // Check frozen
          const [handlePDA] = getHandleRegistryPDA(handleStr);
          const hrInfo = await connection.getAccountInfo(handlePDA);
          if (hrInfo?.data) {
            const frozen = hrInfo.data[hrInfo.data.length - 1] === 1;
            setMyHandleFrozen(frozen);
          }
        }
      } catch {}
    };
    fetch();
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

  const onHandleChange = (val: string) => {
    const lower = val.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    setHandle(lower);
    setStep("idle");
    setErrorMsg("");
    if (checkTimer) clearTimeout(checkTimer);

    const validationError = validateHandle(lower);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }
    if (lower.length >= 3) {
      const t = setTimeout(() => checkAvailability(lower), 600);
      setCheckTimer(t);
    }
  };

  const checkAvailability = async (h: string) => {
    setStep("checking");
    try {
      const [handlePDA] = getHandleRegistryPDA(h);
      const info = await connection.getAccountInfo(handlePDA);
      setStep(info ? "taken" : "available");
    } catch {
      setStep("error");
      setErrorMsg("Failed to check availability");
    }
  };

  const registerHandle = async () => {
    if (!publicKey || !signTransaction) return;
    const validationError = validateHandle(handle);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setStep("registering");
    setErrorMsg("");

    try {
      const [handlePDA] = getHandleRegistryPDA(handle);
      const [reversePDA] = getReverseLookupPDA(publicKey);
      const [reservedPDA] = getReservedHandlePDA(handle);

      // Encode instruction data manually (Anchor discriminator + string)
      // "register_handle" discriminator
      const discriminator = Buffer.from([
        0x0f, 0xad, 0x15, 0x9e, 0x7d, 0xcc, 0xdd, 0x1d,
      ]);
      const handleBytes = Buffer.from(handle, "utf-8");
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32LE(handleBytes.length, 0);
      const data = Buffer.concat([discriminator, lenBuf, handleBytes]);

      const instruction = new TransactionInstruction({
        programId: DPI_PROGRAM_ID,
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: handlePDA, isSigner: false, isWritable: true },
          { pubkey: reversePDA, isSigner: false, isWritable: true },
          { pubkey: reservedPDA, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
      });

      const { blockhash } = await connection.getLatestBlockhash();
      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      tx.add(instruction);

      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");

      setTxSig(sig);
      setMyHandle(handle);
      setStep("success");
    } catch (e: unknown) {
      setStep("error");
      const msg = e instanceof Error ? e.message : "Transaction failed";
      if (msg.includes("0x177a")) setErrorMsg("Wallet already owns a handle");
      else if (msg.includes("0x1779")) setErrorMsg("Invalid handle format");
      else if (msg.includes("0x1772")) setErrorMsg("This handle is reserved");
      else if (msg.includes("0x1776")) setErrorMsg("Handle is already taken");
      else setErrorMsg(msg);
    }
  };

  return (
    <div>
      <Header title="@Handle" />
      <div style={{ padding: "20px" }}>
        {/* My current handle */}
        {myHandle && (
          <Card style={{ padding: "16px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              YOUR HANDLE
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    color: "white",
                    fontWeight: 700,
                    overflow: "hidden",
                  }}
                >
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    myHandle[0].toUpperCase()
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>@{myHandle}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {myHandleFrozen ? (
                      <StatusBadge status="danger">🔒 Frozen</StatusBadge>
                    ) : (
                      <StatusBadge status="success">✓ Active</StatusBadge>
                    )}
                  </div>
                </div>
              </div>
              <Link
                href={`/handle/${myHandle}`}
                style={{
                  fontSize: 13,
                  color: "var(--accent)",
                  textDecoration: "none",
                  fontWeight: 600,
                  padding: "6px 12px",
                  background: "var(--accent-light)",
                  borderRadius: 8,
                }}
              >
                View Page
              </Link>
            </div>
          </Card>
        )}

        {/* Register new handle (only if no handle yet) */}
        {!myHandle && (
          <>
            <div
              style={{
                marginBottom: 20,
              }}
            >
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  marginBottom: 6,
                  color: "var(--text-primary)",
                }}
              >
                Claim your handle
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                One wallet, one handle. Permanently on-chain.
              </p>
            </div>

            {!connected ? (
              <Card style={{ padding: "24px", textAlign: "center" }}>
                <AtSign size={32} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
                <p style={{ color: "var(--text-secondary)", marginBottom: 4 }}>
                  Connect your wallet to register a handle
                </p>
              </Card>
            ) : (
              <Card style={{ padding: "20px" }}>
                {/* Input */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "var(--bg-base)",
                    borderRadius: 12,
                    border: `1.5px solid ${
                      step === "available"
                        ? "var(--success)"
                        : step === "taken" || errorMsg
                        ? "var(--danger)"
                        : "var(--border)"
                    }`,
                    padding: "0 14px",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      color: "var(--accent)",
                      fontWeight: 700,
                      userSelect: "none",
                    }}
                  >
                    @
                  </span>
                  <input
                    value={handle}
                    onChange={(e) => onHandleChange(e.target.value)}
                    placeholder="yourhandle"
                    maxLength={32}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: 18,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      padding: "14px 0",
                      letterSpacing: "-0.3px",
                    }}
                  />
                  <div style={{ width: 24, flexShrink: 0 }}>
                    {step === "checking" && (
                      <Loader size={18} color="var(--text-muted)" style={{ animation: "spin 1s linear infinite" }} />
                    )}
                    {step === "available" && <CheckCircle size={18} color="var(--success)" />}
                    {step === "taken" && <XCircle size={18} color="var(--danger)" />}
                  </div>
                </div>

                {/* Status message */}
                {step === "available" && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--success)",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <CheckCircle size={14} /> @{handle} is available!
                  </div>
                )}
                {step === "taken" && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--danger)",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <XCircle size={14} /> @{handle} is already taken
                  </div>
                )}
                {errorMsg && step !== "taken" && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--danger)",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <AlertTriangle size={14} /> {errorMsg}
                  </div>
                )}

                {/* Rules */}
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 16,
                    lineHeight: 1.7,
                    background: "var(--bg-base)",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  3–32 characters · lowercase letters, numbers, _ and - only
                </div>

                {/* Register Button */}
                <button
                  onClick={registerHandle}
                  disabled={step !== "available" || !handle}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: 12,
                    border: "none",
                    background:
                      step === "available" ? "var(--accent)" : "var(--border)",
                    color: step === "available" ? "white" : "var(--text-muted)",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: step === "available" ? "pointer" : "not-allowed",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {step === "registering" ? (
                    <>
                      <Loader size={16} /> Registering...
                    </>
                  ) : (
                    "Register @" + (handle || "handle")
                  )}
                </button>
              </Card>
            )}
          </>
        )}

        {/* Success */}
        {step === "success" && (
          <Card
            style={{
              padding: "24px",
              textAlign: "center",
              marginTop: 16,
              border: "1.5px solid var(--success)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "var(--success-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <CheckCircle size={28} color="var(--success)" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
              @{myHandle} registered!
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Your handle is now permanently on-chain
            </div>
            {txSig && (
              <a
                href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12,
                  color: "var(--accent)",
                  textDecoration: "none",
                }}
              >
                View on Explorer ↗
              </a>
            )}
          </Card>
        )}

        {/* Handle rules info */}
        <Card style={{ padding: "16px", marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text-secondary)" }}>
            HANDLE RULES
          </div>
          {[
            "One wallet can only own one handle",
            "Handles are permanent and on-chain",
            "Reserved: admin, support, help, security, dpi, team",
            "Transfer is possible (frozen handles cannot be transferred)",
          ].map((rule) => (
            <div
              key={rule}
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                padding: "6px 0",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                lineHeight: 1.4,
              }}
            >
              <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }}>·</span>
              {rule}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
