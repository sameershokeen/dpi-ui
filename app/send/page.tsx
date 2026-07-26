"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useState, useEffect, Suspense, useRef } from "react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Card from "@/components/Card";
import { getHandleRegistryPDA } from "@/lib/dpi-program";
import { Send, CheckCircle, Loader, AlertTriangle, AtSign, ChevronDown, RefreshCw } from "lucide-react";

const PREDEFINED_TOKENS = {
  SOL: {
    symbol: "SOL",
    decimals: 9,
    mint: "",
    name: "Solana (Native)",
    programId: "11111111111111111111111111111111",
  },
  USDC: {
    symbol: "USDC",
    decimals: 6,
    mint: "4zMMC9zT5H24GsmVBtBq7B8RFKu1e79mksqtCRRjh482",
    name: "USD Coin (Circle Devnet)",
    programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  },
  EURC: {
    symbol: "EURC",
    decimals: 6,
    mint: "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr",
    name: "EURC (Circle Devnet)",
    programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  },
  PYUSD: {
    symbol: "PYUSD",
    decimals: 6,
    mint: "CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM",
    name: "PayPal USD (Devnet Token-2022)",
    programId: "TokenzQdBNbMcq6D7KV5u56jgG7JT4ixeraXeiqVg1y",
  },
};

function SendPageInner() {
  const { publicKey, connected, signTransaction } = useWallet();
  const { connection } = useConnection();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [recipient, setRecipient] = useState(searchParams.get("to") || "");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [step, setStep] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [txSig, setTxSig] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [tokenType, setTokenType] = useState<string>("SOL");
  const [customMint, setCustomMint] = useState("");
  const [decimals, setDecimals] = useState(9); // SOL has 9 decimals
  const [tokenSymbol, setTokenSymbol] = useState("SOL");
  const [tokenProgramId, setTokenProgramId] = useState<string>("11111111111111111111111111111111");
  const [loadingToken, setLoadingToken] = useState(false);
  const [tokenError, setTokenError] = useState("");

  // Scanned wallet tokens
  const [scannedTokens, setScannedTokens] = useState<Array<{
    mint: string;
    symbol: string;
    balance: number;
    decimals: number;
    programId: string;
  }>>([]);
  const [scanning, setScanning] = useState(false);

  const heliusRpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || "";
  const resolveTimeoutRef = useRef<any>(null);

  const fetchTokenBalance = async (mintPubKey: PublicKey, dec: number) => {
    if (!publicKey || !connection) return;
    try {
      const response = await connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: mintPubKey,
      });
      if (response.value.length > 0) {
        const uiAmount = response.value[0].account.data.parsed.info.tokenAmount.uiAmount;
        setBalance(uiAmount ?? 0);
      } else {
        setBalance(0);
      }
    } catch {
      setBalance(0);
    }
  };

  const resolveCustomToken = async (mintAddr: string) => {
    setTokenError("");
    setLoadingToken(true);
    if (!mintAddr) {
      setLoadingToken(false);
      return;
    }

    try {
      const mintPubKey = new PublicKey(mintAddr);
      const mintInfo = await connection.getParsedAccountInfo(mintPubKey);
      
      if (!mintInfo.value) {
        setTokenError("Token mint address not found on Devnet");
        setBalance(null);
        setLoadingToken(false);
        return;
      }

      const parsedData = (mintInfo.value.data as any)?.parsed;
      if (parsedData?.type === "mint") {
        const dec = parsedData.info.decimals;
        setDecimals(dec);
        setTokenSymbol("Custom");
        const ownerProgram = mintInfo.value.owner.toBase58();
        setTokenProgramId(ownerProgram);
        await fetchTokenBalance(mintPubKey, dec);
      } else {
        setTokenError("Not a valid token mint account");
        setBalance(null);
      }
    } catch (err) {
      setTokenError("Invalid mint address public key");
      setBalance(null);
    } finally {
      setLoadingToken(false);
    }
  };

  const scanAssets = async () => {
    if (!publicKey || !connection) return;
    setScanning(true);
    try {
      // 1. Try Helius DAS API if configured
      if (heliusRpcUrl && heliusRpcUrl.trim()) {
        try {
          const response = await fetch(heliusRpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "scan-tokens",
              method: "getAssetsByOwner",
              params: {
                ownerAddress: publicKey.toBase58(),
                page: 1,
                limit: 100,
                displayOptions: {
                  showFungible: true,
                },
              },
            }),
          });
          const data = await response.json();
          if (data?.result?.items) {
            const items = data.result.items;
            const parsed = items
              .filter((item: any) => item.interface === "FungibleToken" || item.token_info)
              .map((item: any) => {
                const mint = item.id;
                const tokenInfo = item.token_info;
                const balance = tokenInfo?.balance / Math.pow(10, tokenInfo?.decimals || 0) || 0;
                const dec = tokenInfo?.decimals || 0;
                const symbol = tokenInfo?.symbol || `SPL (${mint.slice(0, 4)}...${mint.slice(-4)})`;
                const programId = tokenInfo?.token_program || TOKEN_PROGRAM_ID.toBase58();
                return { mint, symbol, balance, decimals: dec, programId };
              })
              .filter((t: any) => t.balance > 0);

            const filtered = parsed.filter(
              (t: any) =>
                t.mint !== PREDEFINED_TOKENS.USDC.mint &&
                t.mint !== PREDEFINED_TOKENS.EURC.mint &&
                t.mint !== PREDEFINED_TOKENS.PYUSD.mint
            );
            setScannedTokens(filtered);
            setScanning(false);
            return;
          }
        } catch (err) {
          console.warn("Helius scanning failed, falling back to standard RPC", err);
        }
      }

      // 2. Standard RPC Fallback (Token & Token-2022)
      let tokenProgramAccounts: any = { value: [] };
      try {
        tokenProgramAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        });
      } catch (err) {
        console.warn("Failed fetching standard Token accounts:", err);
      }

      let token2022Accounts: any = { value: [] };
      try {
        token2022Accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_2022_PROGRAM_ID,
        });
      } catch (err) {
        console.warn("Failed fetching Token-2022 accounts:", err);
      }

      const allAccounts = [...(tokenProgramAccounts.value || []), ...(token2022Accounts.value || [])];
      const parsed = allAccounts
        .map((acc) => {
          const info = acc.account.data.parsed.info;
          const mint = info.mint;
          const balance = info.tokenAmount.uiAmount || 0;
          const dec = info.tokenAmount.decimals;
          const programId = acc.account.owner.toBase58();

          let symbol = `SPL (${mint.slice(0, 4)}...${mint.slice(-4)})`;
          if (mint === PREDEFINED_TOKENS.USDC.mint) symbol = "USDC";
          else if (mint === PREDEFINED_TOKENS.EURC.mint) symbol = "EURC";
          else if (mint === PREDEFINED_TOKENS.PYUSD.mint) symbol = "PYUSD";

          return { mint, symbol, balance, decimals: dec, programId };
        })
        .filter((t) => t.balance > 0)
        .filter(
          (t) =>
            t.mint !== PREDEFINED_TOKENS.USDC.mint &&
            t.mint !== PREDEFINED_TOKENS.EURC.mint &&
            t.mint !== PREDEFINED_TOKENS.PYUSD.mint
        );

      setScannedTokens(parsed);
    } catch (e) {
      console.error("Error scanning tokens", e);
    } finally {
      setScanning(false);
    }
  };

  const fetchBalance = async () => {
    if (!publicKey || !connection) return;
    setLoadingToken(true);
    setTokenError("");

    try {
      if (tokenType === "SOL") {
        const b = await connection.getBalance(publicKey);
        setBalance(b / LAMPORTS_PER_SOL);
        setDecimals(9);
        setTokenSymbol("SOL");
        setTokenProgramId("11111111111111111111111111111111");
      } else if (tokenType === "USDC") {
        await fetchTokenBalance(new PublicKey(PREDEFINED_TOKENS.USDC.mint), 6);
        setDecimals(6);
        setTokenSymbol("USDC");
        setTokenProgramId(PREDEFINED_TOKENS.USDC.programId);
      } else if (tokenType === "EURC") {
        await fetchTokenBalance(new PublicKey(PREDEFINED_TOKENS.EURC.mint), 6);
        setDecimals(6);
        setTokenSymbol("EURC");
        setTokenProgramId(PREDEFINED_TOKENS.EURC.programId);
      } else if (tokenType === "PYUSD") {
        await fetchTokenBalance(new PublicKey(PREDEFINED_TOKENS.PYUSD.mint), 6);
        setDecimals(6);
        setTokenSymbol("PYUSD");
        setTokenProgramId(PREDEFINED_TOKENS.PYUSD.programId);
      } else if (tokenType === "CUSTOM") {
        if (customMint) {
          await resolveCustomToken(customMint);
        } else {
          setBalance(null);
        }
      } else {
        // Scanned token selected
        const found = scannedTokens.find((t) => t.mint === tokenType);
        if (found) {
          await fetchTokenBalance(new PublicKey(found.mint), found.decimals);
          setDecimals(found.decimals);
          setTokenSymbol(found.symbol);
          setTokenProgramId(found.programId);
        }
      }
    } catch {
      setBalance(null);
    } finally {
      setLoadingToken(false);
    }
  };

  useEffect(() => {
    if (publicKey && connection) {
      scanAssets();
    } else {
      setScannedTokens([]);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (publicKey && connection) {
      fetchBalance();
    }
  }, [publicKey, connection, tokenType]);

  useEffect(() => {
    if (tokenType === "CUSTOM" && customMint && publicKey && connection) {
      const delayDebounceFn = setTimeout(() => {
        resolveCustomToken(customMint);
      }, 600);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [customMint, tokenType, publicKey, connection]);

  // Auto-resolve handle if pre-filled
  useEffect(() => {
    const pre = searchParams.get("to");
    if (pre) resolveRecipient(pre);
  }, []);

  const resolveRecipient = async (val: string) => {
    setResolvedAddress(null);
    setResolveError("");
    if (!val) return;

    // If it looks like a pubkey (base58, ~44 chars)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(val) && !val.startsWith("@")) {
      try {
        const pk = new PublicKey(val);
        const resolvedStr = pk.toBase58();
        if (publicKey && resolvedStr === publicKey.toBase58()) {
          setResolveError("You cannot send assets to yourself");
          return;
        }
        setResolvedAddress(resolvedStr);
      } catch {
        setResolveError("Invalid address");
      }
      return;
    }

    // Resolve handle
    const handle = val.replace(/^@/, "").toLowerCase();
    if (handle.length < 3) return;

    setResolving(true);
    try {
      const [handlePDA] = getHandleRegistryPDA(handle);
      const info = await connection.getAccountInfo(handlePDA);
      if (!info?.data) {
        setResolveError(`@${handle} not found`);
        return;
      }
      const d = info.data;
      const owner = new PublicKey(d.slice(8, 40)).toBase58();
      if (publicKey && owner === publicKey.toBase58()) {
        setResolveError("You cannot send assets to your own handle");
        return;
      }
      setResolvedAddress(owner);
    } catch {
      setResolveError("Failed to resolve handle");
    } finally {
      setResolving(false);
    }
  };

  const onRecipientChange = (val: string) => {
    setRecipient(val);
    setResolvedAddress(null);
    setResolveError("");

    if (resolveTimeoutRef.current) {
      clearTimeout(resolveTimeoutRef.current);
    }
    resolveTimeoutRef.current = setTimeout(() => resolveRecipient(val), 600);
  };

  const sendAsset = async () => {
    if (!publicKey || !signTransaction || !resolvedAddress || !amount) return;

    if (resolvedAddress === publicKey.toBase58()) {
      setErrorMsg("You cannot transfer assets to yourself.");
      return;
    }

    setStep("sending");
    setErrorMsg("");

    try {
      const toKey = new PublicKey(resolvedAddress);
      const tx = new Transaction();

      if (tokenType === "SOL") {
        const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;
        if (isNaN(lamports) || lamports <= 0) {
          throw new Error("Invalid amount");
        }
        const instruction = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: toKey,
          lamports: Math.floor(lamports),
        });
        tx.add(instruction);
      } else {
        // SPL token transfer
        let mintAddress = "";
        if (tokenType === "USDC") mintAddress = PREDEFINED_TOKENS.USDC.mint;
        else if (tokenType === "EURC") mintAddress = PREDEFINED_TOKENS.EURC.mint;
        else if (tokenType === "PYUSD") mintAddress = PREDEFINED_TOKENS.PYUSD.mint;
        else if (tokenType === "CUSTOM") mintAddress = customMint;
        else mintAddress = tokenType; // Scanned token mint

        if (!mintAddress) {
          throw new Error("Mint address is missing");
        }

        const mintPubKey = new PublicKey(mintAddress);
        const parsedAmount = parseFloat(amount) * Math.pow(10, decimals);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new Error("Invalid amount");
        }

        const activeProgramId = new PublicKey(tokenProgramId);

        // Get sender ATA
        const senderATA = getAssociatedTokenAddressSync(
          mintPubKey,
          publicKey,
          false,
          activeProgramId,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        // Get recipient ATA
        const recipientATA = getAssociatedTokenAddressSync(
          mintPubKey,
          toKey,
          false,
          activeProgramId,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Check if recipient ATA exists
        const recipientATAInfo = await connection.getAccountInfo(recipientATA);
        if (!recipientATAInfo) {
          tx.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              recipientATA, // associatedTokenAddress
              toKey, // owner
              mintPubKey, // mint
              activeProgramId,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        tx.add(
          createTransferCheckedInstruction(
            senderATA,
            mintPubKey,
            recipientATA,
            publicKey,
            Math.floor(parsedAmount),
            decimals,
            [],
            activeProgramId
          )
        );
      }

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, "confirmed");

      setTxSig(sig);
      setStep("success");

      // Refresh balance
      fetchBalance();
    } catch (e: unknown) {
      setStep("error");
      setErrorMsg(e instanceof Error ? e.message : "Transaction failed");
    }
  };

  const canSend =
    resolvedAddress &&
    amount &&
    parseFloat(amount) > 0 &&
    balance !== null &&
    parseFloat(amount) <= balance &&
    step !== "sending" &&
    !loadingToken &&
    !tokenError;

  const isHandle = recipient.startsWith("@") || !/^[1-9A-HJ-NP-Za-km-z]/.test(recipient);
  const displayRecipient = isHandle
    ? "@" + recipient.replace(/^@/, "")
    : `${recipient.slice(0, 8)}...${recipient.slice(-6)}`;

  return (
    <div>
      <Header title="Send Asset" showBack onBack={() => router.back()} />
      <div style={{ padding: "20px" }}>
        {!connected ? (
          <Card style={{ padding: "32px", textAlign: "center" }}>
            <Send size={32} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "var(--text-secondary)" }}>
              Connect your wallet to send assets
            </p>
          </Card>
        ) : step === "success" ? (
          <SuccessView
            txSig={txSig}
            amount={amount}
            recipient={displayRecipient}
            tokenSymbol={tokenSymbol}
            onReset={() => {
              setStep("idle");
              setAmount("");
              setRecipient("");
              setResolvedAddress(null);
              setTxSig("");
            }}
          />
        ) : (
          <>
            {/* Balance bar */}
            <div
              style={{
                background: "var(--accent-light)",
                borderRadius: 12,
                padding: "10px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <span style={{ fontSize: 13, color: "var(--accent)" }}>Available</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>
                {balance !== null ? balance.toFixed(4) : "—"} {tokenSymbol}
              </span>
            </div>

            <Card style={{ padding: "20px", marginBottom: 16 }}>
              {/* Recipient */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  TO
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "var(--bg-base)",
                    borderRadius: 12,
                    border: `1.5px solid ${resolvedAddress ? "var(--success)" : resolveError ? "var(--danger)" : "var(--border)"}`,
                    padding: "0 14px",
                    gap: 8,
                  }}
                >
                  <AtSign size={16} color="var(--text-muted)" />
                  <input
                    value={recipient}
                    onChange={(e) => onRecipientChange(e.target.value)}
                    placeholder="@handle or wallet address"
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: 15,
                      color: "var(--text-primary)",
                      padding: "13px 0",
                    }}
                  />
                  {resolving && <Loader size={16} color="var(--text-muted)" />}
                  {resolvedAddress && !resolving && <CheckCircle size={16} color="var(--success)" />}
                </div>
                {resolvedAddress && (
                  <div style={{ fontSize: 12, color: "var(--success)", marginTop: 6 }}>
                    Resolved: {resolvedAddress.slice(0, 12)}...{resolvedAddress.slice(-6)}
                  </div>
                )}
                {resolveError && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--danger)",
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <AlertTriangle size={12} /> {resolveError}
                  </div>
                )}
              </div>

              {/* Asset Selector */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  ASSET
                </label>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    background: "var(--bg-base)",
                    borderRadius: 12,
                    border: "1.5px solid var(--border)",
                    padding: "0 16px",
                  }}
                >
                  <select
                    value={tokenType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTokenType(val);
                      if (val === "SOL") {
                        setTokenSymbol("SOL");
                        setDecimals(9);
                      } else if (val === "USDC") {
                        setTokenSymbol("USDC");
                        setDecimals(6);
                      } else if (val === "EURC") {
                        setTokenSymbol("EURC");
                        setDecimals(6);
                      } else if (val === "PYUSD") {
                        setTokenSymbol("PYUSD");
                        setDecimals(6);
                      } else if (val === "CUSTOM") {
                        setTokenSymbol("Custom");
                      } else {
                        // Dynamic Scanned Token
                        const found = scannedTokens.find((t) => t.mint === val);
                        if (found) {
                          setTokenSymbol(found.symbol);
                          setDecimals(found.decimals);
                        }
                      }
                      setAmount("");
                    }}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      padding: "13px 0",
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    <optgroup label="Predefined Assets">
                      <option value="SOL">SOL (Native)</option>
                      <option value="USDC">USDC (Circle Devnet)</option>
                      <option value="EURC">EURC (Circle Devnet)</option>
                      <option value="PYUSD">PYUSD (PayPal Devnet)</option>
                    </optgroup>
                    
                    {scannedTokens.length > 0 && (
                      <optgroup label="Scanned from Wallet">
                        {scannedTokens.map((t) => (
                          <option key={t.mint} value={t.mint}>
                            {t.symbol} ({t.balance.toFixed(4)})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="Other Options">
                      <option value="CUSTOM">Custom SPL Token...</option>
                    </optgroup>
                  </select>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 8, position: "absolute", right: 16 }}>
                    <button
                      onClick={scanAssets}
                      disabled={scanning}
                      type="button"
                      title="Scan Wallet Tokens"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 4,
                        borderRadius: 4,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <RefreshCw size={14} style={{ animation: scanning ? "spin 1s linear infinite" : "none" }} />
                    </button>
                    <ChevronDown
                      size={16}
                      color="var(--text-secondary)"
                      style={{ pointerEvents: "none" }}
                    />
                  </div>
                </div>
              </div>

              {/* Custom Mint Address (if selected) */}
              {tokenType === "CUSTOM" && (
                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    TOKEN MINT ADDRESS (DEVNET)
                  </label>
                  <input
                    value={customMint}
                    onChange={(e) => setCustomMint(e.target.value)}
                    placeholder="Enter Mint Address..."
                    style={{
                      width: "100%",
                      background: "var(--bg-base)",
                      borderRadius: 12,
                      border: `1.5px solid ${tokenError ? "var(--danger)" : "var(--border)"}`,
                      padding: "13px 16px",
                      fontSize: 14,
                      outline: "none",
                      color: "var(--text-primary)",
                    }}
                  />
                  {loadingToken && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      <Loader size={12} style={{ animation: "spin 1s linear infinite" }} /> Verifying token mint...
                    </div>
                  )}
                  {tokenError && (
                    <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={12} /> {tokenError}
                    </div>
                  )}
                </div>
              )}

              {/* Amount */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  AMOUNT
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "var(--bg-base)",
                    borderRadius: 12,
                    border: "1.5px solid var(--border)",
                    padding: "0 16px",
                    gap: 8,
                  }}
                >
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="any"
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: 24,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      padding: "13px 0",
                    }}
                  />
                  <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-muted)" }}>
                    {tokenSymbol}
                  </span>
                </div>
                {/* Quick amounts */}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {(tokenType === "SOL" ? [0.01, 0.05, 0.1, 0.5] : [1, 5, 10, 50]).map((q) => (
                    <button
                      key={q}
                      onClick={() => setAmount(q.toString())}
                      style={{
                        flex: 1,
                        padding: "6px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: amount === q.toString() ? "var(--accent-light)" : "var(--bg-card)",
                        color: amount === q.toString() ? "var(--accent)" : "var(--text-secondary)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary row */}
              {resolvedAddress && amount && parseFloat(amount) > 0 && (
                <div
                  style={{
                    background: "var(--bg-base)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    marginBottom: 16,
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "var(--text-muted)" }}>Sending</span>
                    <span style={{ fontWeight: 700 }}>{amount} {tokenSymbol}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Network fee</span>
                    <span>~0.000005 SOL</span>
                  </div>
                </div>
              )}

              {step === "error" && errorMsg && (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--danger)",
                    marginBottom: 12,
                    padding: "10px 12px",
                    background: "#FFEEED",
                    borderRadius: 8,
                    display: "flex",
                    gap: 6,
                    alignItems: "flex-start",
                  }}
                >
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {errorMsg}
                </div>
              )}

              {/* Send button */}
              <button
                onClick={sendAsset}
                disabled={!canSend}
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: 12,
                  border: "none",
                  background: canSend ? "var(--accent)" : "var(--border)",
                  color: canSend ? "white" : "var(--text-muted)",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: canSend ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s",
                }}
              >
                {step === "sending" ? (
                  <>
                    <Loader size={18} style={{ animation: "spin 1s linear infinite" }} /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    {amount ? `Send ${amount} ${tokenSymbol}` : `Send ${tokenSymbol}`}
                  </>
                )}
              </button>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function SuccessView({
  txSig,
  amount,
  recipient,
  onReset,
  tokenSymbol,
}: {
  txSig: string;
  amount: string;
  recipient: string;
  onReset: () => void;
  tokenSymbol: string;
}) {
  return (
    <Card style={{ padding: "32px", textAlign: "center" }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 22,
          background: "var(--success-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <CheckCircle size={36} color="var(--success)" />
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
        Payment Sent!
      </div>
      <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24 }}>
        Your payment has been successfully processed
      </div>

      <div
        style={{
          background: "var(--bg-base)",
          borderRadius: 14,
          padding: "16px",
          marginBottom: 20,
          textAlign: "left",
        }}
      >
        {[
          { label: "Amount", value: `${amount} ${tokenSymbol}`, bold: true },
          { label: "Payment Status", value: "Successful", color: "var(--success)" },
          { label: "To", value: recipient },
          { label: "Network", value: "Solana Devnet" },
        ].map(({ label, value, bold, color }) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px dashed var(--border)",
              fontSize: 14,
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>{label}</span>
            <span
              style={{
                fontWeight: bold ? 700 : 600,
                color: color || "var(--text-primary)",
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <a
          href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            padding: "12px",
            border: "1px solid var(--border)",
            borderRadius: 12,
            color: "var(--accent)",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          View on Explorer
        </a>
        <button
          onClick={onReset}
          style={{
            flex: 1,
            padding: "12px",
            background: "var(--accent)",
            border: "none",
            borderRadius: 12,
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Send Again
        </button>
      </div>
    </Card>
  );
}

export default function SendPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>}>
      <SendPageInner />
    </Suspense>
  );
}
