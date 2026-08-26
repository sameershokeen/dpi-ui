"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useState, useEffect, Suspense, useRef, useCallback } from "react";
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
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Card from "@/components/Card";
import QRScannerModal from "@/components/QRScannerModal";
import TransactionStepperModal, { StepperStage } from "@/components/TransactionStepperModal";
import TokenFaucetModal from "@/components/TokenFaucetModal";
import { useToast } from "@/components/Toast";
import { triggerHaptic } from "@/lib/haptics";
import { getHandleRegistryPDA } from "@/lib/dpi-program";
import { lookupHandleCached } from "@/lib/dpi-cache";
import { exportReceiptAsImage } from "@/lib/receipt-export";
import {
  Send,
  CheckCircle,
  Loader,
  AlertTriangle,
  AtSign,
  ChevronDown,
  ExternalLink,
  QrCode,
  Users,
  X,
  Sparkles,
  Receipt,
  Coins,
} from "lucide-react";

interface RecentContact {
  label: string;
  address: string;
  handle?: string;
  timestamp: number;
}

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
    name: "PayPal USD (Devnet)",
    programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  },
};

function SendPageInner() {
  const { publicKey, connected, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const [recipient, setRecipient] = useState(searchParams.get("to") || "");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [step, setStep] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [txSig, setTxSig] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [stepperOpen, setStepperOpen] = useState(false);
  const [faucetOpen, setFaucetOpen] = useState(false);
  const [stepperStage, setStepperStage] = useState<StepperStage>("signing");
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);

  const [tokenType, setTokenType] = useState<string>("SOL");
  const [decimals, setDecimals] = useState(9);
  const [tokenSymbol, setTokenSymbol] = useState("SOL");
  const [tokenProgramId, setTokenProgramId] = useState<string>("11111111111111111111111111111111");

  const [scannedTokens, setScannedTokens] = useState<
    Array<{
      mint: string;
      symbol: string;
      balance: number;
      decimals: number;
      programId: string;
    }>
  >([]);

  const resolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent contacts
  useEffect(() => {
    try {
      const stored = localStorage.getItem("dpi_recent_recipients");
      if (stored) {
        setRecentContacts(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const saveRecentRecipient = useCallback((label: string, address: string, handle?: string) => {
    try {
      const stored = localStorage.getItem("dpi_recent_recipients");
      const existing: RecentContact[] = stored ? JSON.parse(stored) : [];
      const updated = [
        { label, address, handle, timestamp: Date.now() },
        ...existing.filter((c) => c.address !== address && (!handle || c.handle !== handle)),
      ].slice(0, 6); // Keep top 6
      localStorage.setItem("dpi_recent_recipients", JSON.stringify(updated));
      setRecentContacts(updated);
    } catch {}
  }, []);

  const removeRecentContact = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    triggerHaptic("tap");
    const updated = recentContacts.filter((c) => c.address !== address);
    localStorage.setItem("dpi_recent_recipients", JSON.stringify(updated));
    setRecentContacts(updated);
    toast.info("Contact removed from recents");
  };

  const fetchTokenBalance = useCallback(
    async (mintPubKey: PublicKey) => {
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
    },
    [publicKey, connection]
  );

  const scanAssets = useCallback(async () => {
    if (!publicKey || !connection) return;
    try {
      const tokenProgramAccounts = await connection
        .getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID })
        .catch(() => ({ value: [] }));

      const allAccounts = tokenProgramAccounts.value || [];

      const parsed = allAccounts
        .map((acc) => {
          const info = acc.account.data.parsed.info;
          const mint = info.mint;
          const bal = info.tokenAmount.uiAmount || 0;
          const dec = info.tokenAmount.decimals;
          const programId = acc.account.owner.toBase58();

          let symbol = `SPL (${mint.slice(0, 4)}...${mint.slice(-4)})`;
          if (mint === PREDEFINED_TOKENS.USDC.mint) symbol = "USDC";
          else if (mint === PREDEFINED_TOKENS.EURC.mint) symbol = "EURC";
          else if (mint === PREDEFINED_TOKENS.PYUSD.mint) symbol = "PYUSD";

          return { mint, symbol, balance: bal, decimals: dec, programId };
        })
        .filter((t) => t.balance > 0)
        .filter(
          (t) =>
            t.mint !== PREDEFINED_TOKENS.USDC.mint &&
            t.mint !== PREDEFINED_TOKENS.EURC.mint &&
            t.mint !== PREDEFINED_TOKENS.PYUSD.mint
        );

      setScannedTokens(parsed);
    } catch {
      // Ignore scan glitches
    }
  }, [publicKey, connection]);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connection) return;

    try {
      if (tokenType === "SOL") {
        const b = await connection.getBalance(publicKey);
        setBalance(b / LAMPORTS_PER_SOL);
        setDecimals(9);
        setTokenSymbol("SOL");
        setTokenProgramId("11111111111111111111111111111111");
      } else if (tokenType === "USDC") {
        await fetchTokenBalance(new PublicKey(PREDEFINED_TOKENS.USDC.mint));
        setDecimals(6);
        setTokenSymbol("USDC");
        setTokenProgramId(PREDEFINED_TOKENS.USDC.programId);
      } else if (tokenType === "EURC") {
        await fetchTokenBalance(new PublicKey(PREDEFINED_TOKENS.EURC.mint));
        setDecimals(6);
        setTokenSymbol("EURC");
        setTokenProgramId(PREDEFINED_TOKENS.EURC.programId);
      } else if (tokenType === "PYUSD") {
        await fetchTokenBalance(new PublicKey(PREDEFINED_TOKENS.PYUSD.mint));
        setDecimals(6);
        setTokenSymbol("PYUSD");
        setTokenProgramId(PREDEFINED_TOKENS.PYUSD.programId);
      } else {
        const found = scannedTokens.find((t) => t.mint === tokenType);
        if (found) {
          await fetchTokenBalance(new PublicKey(found.mint));
          setDecimals(found.decimals);
          setTokenSymbol(found.symbol);
          setTokenProgramId(found.programId);
        }
      }
    } catch {
      setBalance(null);
    }
  }, [publicKey, connection, tokenType, scannedTokens, fetchTokenBalance]);

  useEffect(() => {
    let ignore = false;
    if (publicKey && connection && !ignore) {
      scanAssets();
    }
    return () => {
      ignore = true;
    };
  }, [publicKey, connection, scanAssets]);

  useEffect(() => {
    let ignore = false;
    if (publicKey && connection && !ignore) {
      fetchBalance();
    }
    return () => {
      ignore = true;
    };
  }, [publicKey, connection, tokenType, fetchBalance]);

  const resolveRecipient = useCallback(
    async (val: string) => {
      setResolvedAddress(null);
      setResolveError("");
      if (!val) return;

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

      const handle = val.replace(/^@/, "").toLowerCase();
      if (handle.length < 3) return;

      setResolving(true);
      try {
        const handleInfo = await lookupHandleCached(connection, handle);
        if (!handleInfo) {
          setResolveError(`@${handle} not registered`);
          return;
        }
        const owner = handleInfo.owner;
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
    },
    [publicKey, connection]
  );

  useEffect(() => {
    let ignore = false;
    const pre = searchParams.get("to");
    if (pre && !ignore) {
      resolveRecipient(pre);
    }
    return () => {
      ignore = true;
    };
  }, [searchParams, resolveRecipient]);

  const handleScanQR = (scanned: string) => {
    let cleanVal = scanned.trim();
    if (cleanVal.startsWith("solana:")) {
      try {
        const url = new URL(cleanVal);
        const address = url.pathname;
        const requestedAmount = url.searchParams.get("amount");
        const label = url.searchParams.get("label");
        
        if (label && label.startsWith("@")) {
          onRecipientChange(label);
        } else if (address) {
          onRecipientChange(address);
        }
        if (requestedAmount) {
          setAmount(requestedAmount);
        }
        toast.info(`Scanned ${label || address.slice(0, 8)}...`);
        return;
      } catch {}
    }
    
    onRecipientChange(cleanVal);
  };

  const onRecipientChange = (val: string) => {
    setRecipient(val);
    setResolvedAddress(null);
    setResolveError("");

    if (resolveTimeoutRef.current) {
      clearTimeout(resolveTimeoutRef.current);
    }
    resolveTimeoutRef.current = setTimeout(() => resolveRecipient(val), 300);
  };

  const onAmountChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, "");
    const parts = clean.split(".");
    if (parts.length > 2) return;
    setAmount(clean);
  };

  const isHandle = recipient.startsWith("@") || !/^[1-9A-HJ-NP-Za-km-z]/.test(recipient);
  const displayRecipient = isHandle
    ? "@" + recipient.replace(/^@/, "")
    : `${recipient.slice(0, 8)}...${recipient.slice(-6)}`;

  const sendAsset = async () => {
    if (!publicKey || (!sendTransaction && !signTransaction) || !resolvedAddress || !amount) return;

    if (resolvedAddress === publicKey.toBase58()) {
      setErrorMsg("You cannot transfer assets to yourself.");
      triggerHaptic("error");
      toast.error("You cannot transfer assets to yourself.");
      return;
    }

    setStep("sending");
    setErrorMsg("");
    setStepperStage("signing");
    setStepperOpen(true);
    triggerHaptic("selection");

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
        let mintAddress = "";
        if (tokenType === "USDC") mintAddress = PREDEFINED_TOKENS.USDC.mint;
        else if (tokenType === "EURC") mintAddress = PREDEFINED_TOKENS.EURC.mint;
        else if (tokenType === "PYUSD") mintAddress = PREDEFINED_TOKENS.PYUSD.mint;
        else mintAddress = tokenType;

        if (!mintAddress) throw new Error("Mint address is missing");

        const mintPubKey = new PublicKey(mintAddress);
        const parsedAmount = parseFloat(amount) * Math.pow(10, decimals);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new Error("Invalid amount");
        }

        const activeProgramId = new PublicKey(tokenProgramId);

        const senderATA = getAssociatedTokenAddressSync(
          mintPubKey,
          publicKey,
          false,
          activeProgramId,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        const recipientATA = getAssociatedTokenAddressSync(
          mintPubKey,
          toKey,
          false,
          activeProgramId,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const recipientATAInfo = await connection.getAccountInfo(recipientATA);
        if (!recipientATAInfo) {
          tx.add(
            createAssociatedTokenAccountInstruction(
              publicKey,
              recipientATA,
              toKey,
              mintPubKey,
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

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      let sig: string;
      if (sendTransaction) {
        setStepperStage("broadcasting");
        sig = await sendTransaction(tx, connection, {
          skipPreflight: false,
        });
      } else if (signTransaction) {
        const signed = await signTransaction(tx);
        setStepperStage("broadcasting");
        sig = await connection.sendRawTransaction(signed.serialize({ requireAllSignatures: false }), {
          skipPreflight: false,
        });
      } else {
        throw new Error("Wallet adapter does not support sending transactions.");
      }

      setStepperStage("confirming");

      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      setTxSig(sig);
      setStep("success");
      setStepperStage("done");
      triggerHaptic("success");
      toast.success("Payment confirmed on Solana Devnet!", "Transfer Complete 🎉");

      // Save to recent contacts
      saveRecentRecipient(
        displayRecipient,
        resolvedAddress,
        isHandle ? recipient.replace(/^@/, "") : undefined
      );

      fetchBalance();
    } catch (e: unknown) {
      setStep("error");
      triggerHaptic("error");
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setErrorMsg(msg);
      toast.error(msg, "Transfer Failed");
    } finally {
      setStepperOpen(false);
    }
  };

  const canSend =
    resolvedAddress &&
    amount &&
    parseFloat(amount) > 0 &&
    balance !== null &&
    parseFloat(amount) <= balance &&
    step !== "sending";

  return (
    <div className="w-full">
      <Header title="Send Assets" showBack onBack={() => router.back()} />
      <div className="px-4 py-4">
        {!connected ? (
          <Card className="p-8 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <Send size={24} />
            </div>
            <h2 className="text-lg font-bold text-white">Connect Your Wallet</h2>
            <p className="text-xs text-slate-400 max-w-xs">
              Connect your Solana Devnet wallet to send instant payments via @handle or address.
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
          <div className="flex flex-col gap-4">
            {/* Balance strip */}
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-linear-to-r from-indigo-950/80 to-purple-950/60 border border-indigo-400/40 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-indigo-300">Available Balance</span>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("tap");
                    setFaucetOpen(true);
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Coins size={10} /> Faucet
                </button>
              </div>
              <span className="text-sm font-black text-white font-mono">
                {balance !== null ? balance.toFixed(4) : "—"} {tokenSymbol}
              </span>
            </div>

            {/* Recent Contacts Chips */}
            {recentContacts.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <Users size={13} className="text-indigo-400" />
                  <span>Recent Contacts</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {recentContacts.map((contact) => (
                    <button
                      key={contact.address}
                      type="button"
                      onClick={() => {
                        triggerHaptic("tap");
                        onRecipientChange(contact.handle ? `@${contact.handle}` : contact.address);
                      }}
                      className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#13192B] hover:bg-indigo-900/40 border border-white/10 hover:border-indigo-500/40 text-xs text-slate-200 shrink-0 active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="font-bold text-indigo-300">
                        {contact.handle ? `@${contact.handle}` : `${contact.address.slice(0, 4)}...${contact.address.slice(-3)}`}
                      </span>
                      <span
                        onClick={(e) => removeRecentContact(e, contact.address)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                        title="Remove"
                      >
                        <X size={12} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Card className="p-5 flex flex-col gap-5 border-white/20">
              {/* Recipient */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-slate-300 tracking-wider uppercase">
                    Recipient
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("tap");
                      setScannerOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    <QrCode size={13} />
                    Scan QR
                  </button>
                </div>
                <div
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/4 border ${
                    resolvedAddress
                      ? "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      : resolveError
                      ? "border-rose-500/50"
                      : "border-white/15"
                  } transition-all`}
                >
                  <AtSign size={18} className="text-indigo-400 shrink-0" />
                  <input
                    value={recipient}
                    onChange={(e) => onRecipientChange(e.target.value)}
                    placeholder="@handle or Solana address"
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 font-medium"
                  />
                  {resolving && <Loader size={16} className="animate-spin text-indigo-400" />}
                  {resolvedAddress && !resolving && (
                    <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  )}
                </div>
                {resolvedAddress && (
                  <div className="text-[11px] text-emerald-400 mt-1.5 font-mono">
                    ✓ Resolved: {resolvedAddress.slice(0, 12)}...{resolvedAddress.slice(-6)}
                  </div>
                )}
                {resolveError && (
                  <div className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertTriangle size={12} /> {resolveError}
                  </div>
                )}
              </div>

              {/* Asset Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 tracking-wider uppercase block mb-2">
                  Select Asset
                </label>
                <div className="relative">
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
                      }
                      setAmount("");
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-white/4 border border-white/15 text-sm font-bold text-white outline-none appearance-none cursor-pointer pr-10"
                  >
                    <optgroup label="Popular Devnet Tokens" className="bg-[#121626] text-white">
                      <option value="SOL">SOL (Native Solana)</option>
                      <option value="USDC">USDC (Circle Devnet)</option>
                      <option value="EURC">EURC (Circle Devnet)</option>
                      <option value="PYUSD">PYUSD (PayPal Devnet)</option>
                    </optgroup>
                    {scannedTokens.length > 0 && (
                      <optgroup label="Detected in Your Wallet" className="bg-[#121626] text-white">
                        {scannedTokens.map((t) => (
                          <option key={t.mint} value={t.mint}>
                            {t.symbol} ({t.balance.toFixed(4)})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none text-slate-400">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>

              {/* Amount Pad */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 tracking-wider uppercase block mb-2">
                  Amount
                </label>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/4 border border-white/15">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => onAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent border-none outline-none text-2xl font-black text-white font-mono placeholder:text-slate-600"
                  />
                  <span className="text-sm font-bold text-indigo-400 font-mono">
                    {tokenSymbol}
                  </span>
                </div>

                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {(tokenType === "SOL" ? [0.01, 0.05, 0.1, 0.5] : [1, 5, 10, 50]).map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        triggerHaptic("tap");
                        setAmount(q.toString());
                      }}
                      className={`py-1.5 rounded-lg border text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer ${
                        amount === q.toString()
                          ? "bg-indigo-500/30 text-indigo-300 border-indigo-400/50"
                          : "bg-white/3 text-slate-300 border-white/10 hover:bg-white/8"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {resolvedAddress && amount && parseFloat(amount) > 0 && (
                <div className="p-3.5 rounded-xl bg-white/3 border border-white/10 text-xs flex flex-col gap-2">
                  <div className="flex justify-between text-slate-300">
                    <span>Transfer Amount</span>
                    <span className="font-bold text-white font-mono">
                      {amount} {tokenSymbol}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Est. Network Fee</span>
                    <span className="font-mono text-emerald-400">~0.000005 SOL</span>
                  </div>
                </div>
              )}

              {step === "error" && errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={sendAsset}
                disabled={!canSend}
                className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                  canSend
                    ? "bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-indigo-500/25 active:scale-[0.99] hover:brightness-110"
                    : "bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed"
                }`}
              >
                {step === "sending" ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Sending on Solana...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    {amount ? `Send ${amount} ${tokenSymbol}` : `Send ${tokenSymbol}`}
                  </>
                )}
              </button>
            </Card>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScanQR}
      />

      {/* Token Faucet Modal */}
      <TokenFaucetModal
        isOpen={faucetOpen}
        onClose={() => setFaucetOpen(false)}
      />

      {/* Transaction Stepper Modal */}
      <TransactionStepperModal
        isOpen={stepperOpen}
        stage={stepperStage}
        txTitle={`Sending ${amount || ""} ${tokenSymbol}`}
        txSubtitle={`Transferring to ${displayRecipient} on Solana Devnet...`}
      />
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
    <Card className="p-6 text-center flex flex-col items-center gap-4 border-emerald-500/30">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
        <CheckCircle size={32} />
      </div>

      <div>
        <h2 className="text-xl font-black text-white">Payment Sent!</h2>
        <p className="text-xs text-slate-300 mt-1">
          Your transaction was confirmed on Solana Devnet
        </p>
      </div>

      <div className="w-full p-4 rounded-2xl bg-white/3 border border-white/10 flex flex-col gap-2.5 text-xs text-left">
        <div className="flex justify-between border-b border-white/8 pb-2">
          <span className="text-slate-400">Amount</span>
          <span className="font-bold text-white font-mono">
            {amount} {tokenSymbol}
          </span>
        </div>
        <div className="flex justify-between border-b border-white/8 pb-2">
          <span className="text-slate-400">Recipient</span>
          <span className="font-bold text-indigo-300 font-mono">{recipient}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Status</span>
          <span className="font-bold text-emerald-400">Confirmed ✓</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 w-full mt-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("tap");
            exportReceiptAsImage({
              txSig,
              amount,
              tokenSymbol,
              recipient,
              timestamp: new Date().toLocaleString(),
            });
          }}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-slate-200 active:scale-95 transition-all cursor-pointer"
        >
          <Receipt size={14} className="text-indigo-400" /> Download Proof Receipt (PNG)
        </button>

        <div className="grid grid-cols-2 gap-3 w-full">
          <a
            href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-slate-300 transition-all"
          >
            Explorer <ExternalLink size={12} />
          </a>
          <button
            onClick={onReset}
            className="py-3 px-4 rounded-xl bg-linear-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            Send Another
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function SendPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader size={16} className="animate-spin text-indigo-400" /> Loading send module...
        </div>
      }
    >
      <SendPageInner />
    </Suspense>
  );
}
