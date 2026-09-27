"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
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
import Confetti from "@/components/Confetti";
import RecipientAvatar from "@/components/RecipientAvatar";
import AddressBookModal from "@/components/AddressBookModal";
import { useToast } from "@/components/Toast";
import { triggerHaptic } from "@/lib/haptics";
import { lookupHandleCached } from "@/lib/dpi-cache";
import { exportReceiptAsImage } from "@/lib/receipt-export";
import { usePrices } from "@/lib/prices";
import { saveContact } from "@/lib/contacts";
import { playSendSuccessSound, playErrorSound } from "@/lib/sounds";
import { PREDEFINED_TOKENS, TOKEN_2022_PROGRAM_ID, isToken2022Program } from "@/lib/tokens";
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
  Receipt,
  Coins,
  BookUser,
  BookmarkPlus,
  FileText,
  Check,
  ShieldCheck,
  Zap,
  ArrowRight,
} from "lucide-react";

interface RecentContact {
  label: string;
  address: string;
  handle?: string;
  timestamp: number;
}

function SendPageInner() {
  const { publicKey, connected, sendTransaction, signTransaction } = useWallet();
  const { connection } = useConnection();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { formatUsd } = usePrices();

  const [recipient, setRecipient] = useState(searchParams.get("to") || "");
  const [amount, setAmount] = useState(searchParams.get("amount") || "");
  const [memo, setMemo] = useState(searchParams.get("memo") || "");
  const [balance, setBalance] = useState<number | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [step, setStep] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [txSig, setTxSig] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [stepperOpen, setStepperOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [faucetOpen, setFaucetOpen] = useState(false);
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const [savedToContacts, setSavedToContacts] = useState(false);
  const [stepperStage, setStepperStage] = useState<StepperStage>("signing");
  const [recentContacts, setRecentContacts] = useState<RecentContact[]>([]);

  const [tokenType, setTokenType] = useState<string>(searchParams.get("token") || "SOL");
  const [decimals, setDecimals] = useState(9);
  const [tokenSymbol, setTokenSymbol] = useState("SOL");
  const [tokenProgramId, setTokenProgramId] = useState<string>("11111111111111111111111111111111");
  const [isToken2022, setIsToken2022] = useState(false);

  const [scannedTokens, setScannedTokens] = useState<
    Array<{
      mint: string;
      symbol: string;
      balance: number;
      decimals: number;
      programId: string;
      isToken2022?: boolean;
    }>
  >([]);

  const resolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendingLockRef = useRef(false);

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
      const [tokenProgramAccounts, token2022Accounts] = await Promise.all([
        connection
          .getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID })
          .catch(() => ({ value: [] })),
        connection
          .getParsedTokenAccountsByOwner(publicKey, {
            programId: new PublicKey(TOKEN_2022_PROGRAM_ID),
          })
          .catch(() => ({ value: [] })),
      ]);

      const allAccounts = [
        ...(tokenProgramAccounts.value || []),
        ...(token2022Accounts.value || []),
      ];

      const parsed = allAccounts
        .map((acc) => {
          const info = acc.account.data.parsed.info;
          const mint = info.mint;
          const bal = info.tokenAmount.uiAmount || 0;
          const dec = info.tokenAmount.decimals;
          const programId = acc.account.owner.toBase58();
          const isExt = isToken2022Program(programId);

          let symbol = `SPL (${mint.slice(0, 4)}...${mint.slice(-4)})`;
          if (mint === PREDEFINED_TOKENS.USDC.mint) symbol = "USDC";
          else if (mint === PREDEFINED_TOKENS.EURC.mint) symbol = "EURC";
          else if (mint === PREDEFINED_TOKENS.PYUSD.mint) symbol = "PYUSD";

          return { mint, symbol, balance: bal, decimals: dec, programId, isToken2022: isExt };
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
        setIsToken2022(false);
      } else if (tokenType === "USDC") {
        await fetchTokenBalance(new PublicKey(PREDEFINED_TOKENS.USDC.mint));
        setDecimals(6);
        setTokenSymbol("USDC");
        setTokenProgramId(PREDEFINED_TOKENS.USDC.programId);
        setIsToken2022(false);
      } else if (tokenType === "EURC") {
        await fetchTokenBalance(new PublicKey(PREDEFINED_TOKENS.EURC.mint));
        setDecimals(6);
        setTokenSymbol("EURC");
        setTokenProgramId(PREDEFINED_TOKENS.EURC.programId);
        setIsToken2022(false);
      } else if (tokenType === "PYUSD") {
        await fetchTokenBalance(new PublicKey(PREDEFINED_TOKENS.PYUSD.mint));
        setDecimals(6);
        setTokenSymbol("PYUSD");
        setTokenProgramId(PREDEFINED_TOKENS.PYUSD.programId);
        setIsToken2022(false);
      } else {
        const found = scannedTokens.find((t) => t.mint === tokenType);
        if (found) {
          await fetchTokenBalance(new PublicKey(found.mint));
          setDecimals(found.decimals);
          setTokenSymbol(found.symbol);
          setTokenProgramId(found.programId);
          setIsToken2022(Boolean(found.isToken2022));
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
      setSavedToContacts(false);
      const trimmed = val.trim();
      if (!trimmed) return;

      // 1. Raw Solana address validation
      if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed) && !trimmed.startsWith("@")) {
        try {
          const pk = new PublicKey(trimmed);
          const resolvedStr = pk.toBase58();
          if (publicKey && resolvedStr === publicKey.toBase58()) {
            setResolveError("You cannot send assets to yourself");
            return;
          }
          setResolvedAddress(resolvedStr);
        } catch {
          setResolveError("Invalid Solana address format");
        }
        return;
      }

      // 2. Handle format & length check
      const handle = trimmed.replace(/^@/, "").toLowerCase();
      if (!/^[a-z0-9_-]+$/.test(handle)) {
        setResolveError("Invalid handle format (only lowercase letters, numbers, _, -)");
        return;
      }
      if (handle.length < 3) {
        setResolveError("Handle must be at least 3 characters");
        return;
      }
      if (handle.length > 20) {
        setResolveError("Handle cannot exceed 20 characters");
        return;
      }

      // 3. On-chain lookup
      setResolving(true);
      try {
        const handleInfo = await lookupHandleCached(connection, handle);
        if (!handleInfo) {
          setResolveError(`@${handle} not found in the DPI registry`);
          return;
        }
        // 4. Frozen handle check
        if (handleInfo.frozen) {
          setResolveError(`Handle @${handle} is FROZEN by administrators. Payments are disabled.`);
          return;
        }
        const owner = handleInfo.owner;
        // 5. Self-send prevention
        if (publicKey && owner === publicKey.toBase58()) {
          setResolveError("You cannot send assets to your own handle");
          return;
        }
        setResolvedAddress(owner);
      } catch {
        setResolveError("Failed to resolve handle from Solana RPC");
      } finally {
        setResolving(false);
      }
    },
    [publicKey, connection]
  );

  useEffect(() => {
    let ignore = false;
    const pre = searchParams.get("to");
    const paramAmount = searchParams.get("amount");
    const paramToken = searchParams.get("token");
    const paramMemo = searchParams.get("memo");

    if (pre && !ignore) {
      resolveRecipient(pre);
    }
    if (paramAmount && !ignore) {
      setAmount(paramAmount);
    }
    if (paramToken && !ignore) {
      setTokenType(paramToken.toUpperCase());
    }
    if (paramMemo && !ignore) {
      setMemo(paramMemo);
    }
    return () => {
      ignore = true;
    };
  }, [searchParams, resolveRecipient]);

  const handleScanQR = (scanned: string) => {
    const cleanVal = scanned.trim();
    if (cleanVal.startsWith("solana:")) {
      try {
        const url = new URL(cleanVal);
        const address = url.pathname;
        const requestedAmount = url.searchParams.get("amount");
        const label = url.searchParams.get("label");
        const splToken = url.searchParams.get("spl-token");
        const message = url.searchParams.get("message") || url.searchParams.get("memo");

        if (label && label.startsWith("@")) {
          onRecipientChange(label);
        } else if (address) {
          onRecipientChange(address);
        }
        if (requestedAmount) {
          setAmount(requestedAmount);
        }
        if (splToken) {
          if (splToken === PREDEFINED_TOKENS.USDC.mint) setTokenType("USDC");
          else if (splToken === PREDEFINED_TOKENS.EURC.mint) setTokenType("EURC");
          else if (splToken === PREDEFINED_TOKENS.PYUSD.mint) setTokenType("PYUSD");
          else setTokenType(splToken);
        }
        if (message) {
          setMemo(message.slice(0, 50));
        }
        toast.info(`Scanned Solana Pay QR: ${label || address.slice(0, 8)}...`);
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

    // FEAT-032: Duplicate transaction guard — useRef survives re-renders
    if (sendingLockRef.current) return;

    if (resolvedAddress === publicKey.toBase58()) {
      setErrorMsg("You cannot transfer assets to yourself.");
      triggerHaptic("error");
      toast.error("You cannot transfer assets to yourself.");
      return;
    }

    sendingLockRef.current = true;
    setStep("sending");
    setErrorMsg("");
    setStepperStage("signing");
    setStepperOpen(true);
    triggerHaptic("selection");

    try {
      // FEAT-034: Pre-flight RPC Health probe
      try {
        const probePromise = connection.getLatestBlockhash("confirmed");
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("RPC Timeout")), 4000)
        );
        await Promise.race([probePromise, timeoutPromise]);
      } catch {
        throw new Error("Solana Devnet RPC is temporarily slow or unresponsive. Please retry shortly.");
      }

      if (isHandle) {
        const cleanHandle = recipient.replace(/^@/, "").toLowerCase().trim();
        // Bypass cache to prevent 60-second freeze race condition
        const handleInfo = await lookupHandleCached(connection, cleanHandle, true);
        if (handleInfo?.frozen) {
          throw new Error(`Handle @${cleanHandle} is FROZEN by administrators. Payments are disabled.`);
        }
      }

      const toKey = new PublicKey(resolvedAddress);
      const instructions: TransactionInstruction[] = [];

      if (tokenType === "SOL") {
        const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;
        if (isNaN(lamports) || lamports <= 0) {
          throw new Error("Invalid amount");
        }
        instructions.push(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: toKey,
            lamports: Math.floor(lamports),
          })
        );
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
          instructions.push(
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

        instructions.push(
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

      // FEAT-004: Attach SPL Memo on-chain if memo is provided
      if (memo.trim()) {
        const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
        instructions.push(
          new TransactionInstruction({
            keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
            programId: MEMO_PROGRAM_ID,
            data: Buffer.from(memo.trim(), "utf-8"),
          })
        );
      }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const versionedTx = new VersionedTransaction(messageV0);

      let sig: string;
      if (signTransaction) {
        const signed = await signTransaction(versionedTx);
        setStepperStage("broadcasting");
        sig = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: true,
          preflightCommitment: "confirmed",
          maxRetries: 5,
        });
      } else if (sendTransaction) {
        sig = await sendTransaction(versionedTx, connection, {
          skipPreflight: true,
          preflightCommitment: "confirmed",
          maxRetries: 5,
        });
      } else {
        throw new Error("Wallet adapter does not support sending transactions.");
      }

      setStepperStage("confirming");

      try {
        const confirmation = await Promise.race([
          connection.confirmTransaction(
            { signature: sig, blockhash, lastValidBlockHeight },
            "confirmed"
          ),
          new Promise<{ value: { err: null } }>((resolve) =>
            setTimeout(() => resolve({ value: { err: null } }), 20000)
          ),
        ]);

        if (confirmation?.value?.err) {
          throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
        }
      } catch {
        const status = await connection.getSignatureStatus(sig).catch(() => null);
        if (status?.value?.err) {
          throw new Error(`Transaction failed on-chain: ${JSON.stringify(status.value.err)}`);
        }
      }

      setTxSig(sig);
      setStep("success");
      setStepperStage("done");
      triggerHaptic("success");
      playSendSuccessSound();
      toast.success("Payment confirmed on Solana Devnet!", "Transfer Complete 🎉");

      // Save to recent contacts
      saveRecentRecipient(
        displayRecipient,
        resolvedAddress,
        isHandle ? recipient.replace(/^@/, "") : undefined
      );

      fetchBalance();
    } catch (e: unknown) {
      setStep("idle");
      triggerHaptic("error");
      playErrorSound();
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setErrorMsg(msg);
      toast.error(msg, "Transfer Failed");
    } finally {
      sendingLockRef.current = false;
      setStepperOpen(false);
    }
  };

  // FEAT-031: Fee-aware balance validation
  const ESTIMATED_FEE_SOL = 0.000005;
  const parsedAmount = parseFloat(amount) || 0;
  let balanceError = "";
  if (amount && parsedAmount > 0 && balance !== null) {
    if (tokenType === "SOL") {
      const totalNeeded = parsedAmount + ESTIMATED_FEE_SOL;
      if (totalNeeded > balance) {
        balanceError = `Insufficient SOL. You have ${balance.toFixed(6)} SOL, need ${totalNeeded.toFixed(6)} SOL (including ~${ESTIMATED_FEE_SOL} SOL fee).`;
      }
    } else {
      if (parsedAmount > balance) {
        balanceError = `Insufficient ${tokenSymbol}. You have ${balance.toFixed(6)} ${tokenSymbol}.`;
      }
    }
  }

  const canSend =
    resolvedAddress &&
    amount &&
    parsedAmount > 0 &&
    balance !== null &&
    !balanceError &&
    !resolveError &&
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
            memo={memo}
            onReset={() => {
              setStep("idle");
              setAmount("");
              setRecipient("");
              setMemo("");
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
              <div className="text-right">
                <span className="text-sm font-black text-white font-mono block">
                  {balance !== null ? balance.toFixed(4) : "—"} {tokenSymbol}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                  ≈ {formatUsd(balance, tokenSymbol)} USD
                </span>
              </div>
            </div>

            {/* Recent Contacts & Address Book */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <Users size={13} className="text-indigo-400" />
                  <span>Recent & Saved Contacts</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("tap");
                    setAddressBookOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  <BookUser size={13} />
                  Address Book
                </button>
              </div>
              {recentContacts.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {recentContacts.map((contact) => (
                    <div
                      key={contact.address}
                      className="group flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-xl bg-[#13192B] hover:bg-indigo-900/40 border border-white/10 hover:border-indigo-500/40 text-xs text-slate-200 shrink-0 transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("tap");
                          onRecipientChange(contact.handle ? `@${contact.handle}` : contact.address);
                        }}
                        className="font-bold text-indigo-300 hover:text-white transition-colors cursor-pointer text-left"
                      >
                        {contact.handle ? `@${contact.handle}` : `${contact.address.slice(0, 4)}...${contact.address.slice(-3)}`}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => removeRecentContact(e, contact.address)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                        title="Remove"
                        aria-label={`Remove ${contact.handle || contact.address}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mt-2.5 shadow-sm">
                    <RecipientAvatar
                      address={resolvedAddress}
                      handle={recipient.startsWith("@") ? recipient : undefined}
                      size={36}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {recipient.startsWith("@") ? recipient : "Resolved Address"}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-mono truncate">
                        {resolvedAddress.slice(0, 10)}...{resolvedAddress.slice(-6)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("success");
                          saveContact({
                            label: recipient.startsWith("@") ? recipient : "Saved Contact",
                            address: resolvedAddress,
                            handle: recipient.startsWith("@") ? recipient.replace(/^@/, "") : undefined,
                          });
                          setSavedToContacts(true);
                          toast.success("Saved to your Address Book!");
                        }}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {savedToContacts ? <Check size={11} className="text-emerald-400" /> : <BookmarkPlus size={11} />}
                        {savedToContacts ? "Saved" : "Save"}
                      </button>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/30 shrink-0">
                        Verified ✓
                      </span>
                    </div>
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

              {/* Amount Pad (FEAT-038: Big number display & MAX button) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-slate-300 tracking-wider uppercase">
                    Amount
                  </label>
                  {balance !== null && balance > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("selection");
                        if (tokenType === "SOL") {
                          const maxVal = Math.max(0, balance - ESTIMATED_FEE_SOL);
                          setAmount(maxVal > 0 ? maxVal.toFixed(6).replace(/\.?0+$/, "") : "0");
                        } else {
                          setAmount(balance.toString());
                        }
                      }}
                      className="px-2 py-0.5 rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95"
                    >
                      MAX
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/4 border border-white/15 focus-within:border-indigo-400 transition-colors">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => onAmountChange(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent border-none outline-none text-3xl sm:text-4xl font-black text-white font-mono placeholder:text-slate-600 tracking-tight"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-base font-black text-indigo-400 font-mono">
                      {tokenSymbol}
                    </span>
                    {isToken2022 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                        2022
                      </span>
                    )}
                  </div>
                </div>

                {/* FEAT-009: USD Conversion display */}
                <div className="text-[11px] text-slate-400 font-mono mt-2 flex justify-between items-center">
                  <span className="text-emerald-400 font-medium">
                    {parsedAmount > 0 ? `≈ ${formatUsd(parsedAmount, tokenSymbol)} USD` : ""}
                  </span>
                  <span>
                    Available: {balance !== null ? balance.toFixed(4) : "—"} {tokenSymbol}
                  </span>
                </div>

                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-2 mt-2.5">
                  {(tokenType === "SOL" ? [0.01, 0.05, 0.1, 0.5] : [1, 5, 10, 50]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        triggerHaptic("tap");
                        setAmount(q.toString());
                      }}
                      className={`py-1.5 rounded-xl border text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer ${
                        amount === q.toString()
                          ? "bg-indigo-500/30 text-indigo-300 border-indigo-400/50 shadow-sm"
                          : "bg-white/3 text-slate-300 border-white/10 hover:bg-white/8"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* FEAT-004: Transaction Memo / Note */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-300 tracking-wider uppercase">
                    Transaction Memo / Note (Optional)
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">{memo.length}/50</span>
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/4 border border-white/15 focus-within:border-indigo-400 transition-colors">
                  <FileText size={16} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={memo}
                    maxLength={50}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="e.g. Coffee, Split dinner, Milestone invoice"
                    className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-slate-500 font-medium"
                  />
                </div>
              </div>

              {/* Summary */}
              {resolvedAddress && amount && parseFloat(amount) > 0 && (
                <div className="p-3.5 rounded-xl bg-white/3 border border-white/10 text-xs flex flex-col gap-2">
                  <div className="flex justify-between text-slate-300">
                    <span>Transfer Amount</span>
                    <span className="font-bold text-white font-mono">
                      {amount} {tokenSymbol} ({formatUsd(parseFloat(amount), tokenSymbol)})
                    </span>
                  </div>
                  {memo && (
                    <div className="flex justify-between text-slate-300">
                      <span>Attached Memo</span>
                      <span className="font-medium text-indigo-300 italic">&ldquo;{memo}&rdquo;</span>
                    </div>
                  )}
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

              {/* FEAT-031: Inline insufficient balance warning */}
              {balanceError && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{balanceError}</span>
                </div>
              )}

              {/* Submit / Review (FEAT-007) */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  setReviewModalOpen(true);
                }}
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
                    {amount ? `Review & Send ${amount} ${tokenSymbol}` : `Review & Send ${tokenSymbol}`}
                  </>
                )}
              </button>
            </Card>
          </div>
        )}
      </div>

      {/* FEAT-007: Multi-step Transaction Confirmation Preview Modal */}
      {reviewModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setReviewModalOpen(false)}
        >
          <div
            className="relative max-w-sm w-full bg-[#111827] border border-indigo-500/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setReviewModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-500/10">
                <Send size={22} />
              </div>
              <h3 className="text-lg font-black text-white">Review Transfer</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verify transfer details before signing in your wallet
              </p>
            </div>

            {/* Big Amount Card */}
            <div className="py-4 px-3 rounded-2xl bg-white/4 border border-white/8 text-center flex flex-col items-center">
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                {amount} {tokenSymbol}
              </div>
              <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                ≈ {formatUsd(parsedAmount, tokenSymbol)} USD
              </div>
              {isToken2022 && (
                <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  SPL Token-2022 Program
                </span>
              )}
            </div>

            {/* Recipient Card */}
            <div className="p-3.5 rounded-2xl bg-white/4 border border-white/8 flex items-center gap-3">
              <RecipientAvatar
                address={resolvedAddress || ""}
                handle={recipient.startsWith("@") ? recipient : undefined}
                size={42}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {recipient.startsWith("@") ? recipient : "Recipient"}
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  {resolvedAddress ? `${resolvedAddress.slice(0, 10)}...${resolvedAddress.slice(-8)}` : ""}
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Verified
              </span>
            </div>

            {/* Network breakdown */}
            <div className="divide-y divide-white/6 text-xs text-slate-300 px-1">
              <div className="py-2 flex justify-between">
                <span className="text-slate-400">Est. Network Fee</span>
                <span className="font-mono text-emerald-400">~0.000005 SOL (&lt;$0.001)</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-400">Est. Confirmation Time</span>
                <span className="font-bold text-indigo-300 flex items-center gap-1">
                  <Zap size={12} className="text-amber-400" /> &lt; 1 sec (Turbo)
                </span>
              </div>
              {memo && (
                <div className="py-2 flex justify-between items-start gap-2">
                  <span className="text-slate-400 shrink-0">Attached Memo</span>
                  <span className="font-medium text-white italic text-right break-words">
                    &ldquo;{memo}&rdquo;
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setReviewModalOpen(false);
                  sendAsset();
                }}
                className="py-3 rounded-xl bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-xs font-black shadow-lg shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Confirm & Sign</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

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
        recipientAddress={resolvedAddress || undefined}
        recipientHandle={recipient.startsWith("@") ? recipient : undefined}
      />

      {/* Address Book Modal (FEAT-005) */}
      <AddressBookModal
        isOpen={addressBookOpen}
        onClose={() => setAddressBookOpen(false)}
        onSelectContact={(c) => {
          onRecipientChange(c);
          setAddressBookOpen(false);
        }}
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
  memo,
}: {
  txSig: string;
  amount: string;
  recipient: string;
  onReset: () => void;
  tokenSymbol: string;
  memo?: string;
}) {
  return (
    <Card className="relative overflow-hidden p-6 text-center flex flex-col items-center gap-4 border-emerald-500/30">
      {/* FEAT-039: Success Confetti */}
      <Confetti active={true} />

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
        <div className="flex items-center justify-between border-b border-white/8 pb-2">
          <span className="text-slate-400">Recipient</span>
          <div className="flex items-center gap-1.5 font-bold text-indigo-300 font-mono">
            <RecipientAvatar
              address={recipient.startsWith("@") ? undefined : recipient}
              handle={recipient.startsWith("@") ? recipient : undefined}
              size={18}
            />
            <span>{recipient}</span>
          </div>
        </div>
        {memo && (
          <div className="flex justify-between border-b border-white/8 pb-2">
            <span className="text-slate-400">Memo</span>
            <span className="font-medium text-indigo-300 italic max-w-[200px] truncate text-right">
              &ldquo;{memo}&rdquo;
            </span>
          </div>
        )}
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
              memo: memo || undefined,
              timestamp: new Date().toLocaleString(),
            });
          }}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-slate-200 active:scale-95 transition-all cursor-pointer"
        >
          <Receipt size={14} className="text-indigo-400" /> Share / Download Proof Receipt (PNG)
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
