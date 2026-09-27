"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { PublicKey } from "@solana/web3.js";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import QRCodeModal from "@/components/QRCodeModal";
import TransferHandleModal from "@/components/TransferHandleModal";
import TransactionStepperModal, { StepperStage } from "@/components/TransactionStepperModal";
import { WalletMultiButton } from "@/components/WalletButton";
import { useToast } from "@/components/Toast";
import { triggerHaptic } from "@/lib/haptics";
import {
  getDpiProgram,
  registerHandle as registerHandleSDK,
  transferHandle as transferHandleSDK,
  checkHandleAvailability,
  parseAnchorError,
  validateHandle,
  confirmTx,
} from "@/lib/dpi-program";
import { lookupHandleCached, lookupReverseCached, invalidateHandleCache } from "@/lib/dpi-cache";
import {
  CheckCircle,
  XCircle,
  Loader,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Search,
  Send,
  User,
  ArrowRightLeft,
  QrCode,
  Check,
  Globe,
  X,
  Copy,
  Share2,
} from "lucide-react";
import Link from "next/link";

type SearchState = "idle" | "checking" | "available" | "taken" | "reserved" | "error";

const POPULAR_SEARCH_SUGGESTIONS = ["solana", "satoshi", "vitalik", "alice", "bob", "pay", "dpi"];

export function HandlePageContent() {
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const { connection } = useConnection();
  const toast = useToast();
  const searchParams = useSearchParams();

  // Search & Checker state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchOwner, setSearchOwner] = useState<string | null>(null);
  const [searchError, setSearchError] = useState("");
  const [takenSuggestions, setTakenSuggestions] = useState<string[]>([]);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // User's own registered handle
  const [myHandle, setMyHandle] = useState<string | null>(null);
  const [myHandleFrozen, setMyHandleFrozen] = useState(false);
  const [loadingMyHandle, setLoadingMyHandle] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  // Registration modal & stepper state
  const [registering, setRegistering] = useState(false);
  const [stepperOpen, setStepperOpen] = useState(false);
  const [stepperStage, setStepperStage] = useState<StepperStage>("signing");
  const [txSig, setTxSig] = useState("");

  // Transfer Handle Modal State
  const [transferOpen, setTransferOpen] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch current user's registered handle
  const loadMyHandle = useCallback(async () => {
    if (!publicKey || !connection) return;
    setLoadingMyHandle(true);
    try {
      const handleStr = await lookupReverseCached(connection, publicKey);
      if (!isMountedRef.current) return;
      if (handleStr) {
        setMyHandle(handleStr);
        const hrData = await lookupHandleCached(connection, handleStr);
        if (!isMountedRef.current) return;
        if (hrData) {
          setMyHandleFrozen(hrData.frozen);
        }
      } else {
        setMyHandle(null);
        setMyHandleFrozen(false);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.warn("Failed reading my handle", err);
      setMyHandle(null);
    } finally {
      if (isMountedRef.current) {
        setLoadingMyHandle(false);
      }
    }
  }, [publicKey, connection]);

  useEffect(() => {
    let ignore = false;
    if (connected && publicKey) {
      loadMyHandle();
      try {
        const stored = localStorage.getItem(`dpi_avatar_${publicKey.toBase58()}`);
        if (!ignore) setProfilePhoto(stored);
      } catch (e) {
        console.warn("Failed reading avatar from localStorage", e);
      }
    } else {
      setMyHandle(null);
      setProfilePhoto(null);
    }
    return () => {
      ignore = true;
    };
  }, [connected, publicKey, loadMyHandle]);

  // Handle checking logic
  const checkAvailability = useCallback(
    async (h: string) => {
      setSearchState("checking");
      setSearchOwner(null);
      setSearchError("");

      const lower = h.toLowerCase().trim();
      const validation = validateHandle(lower);
      if (validation) {
        const errorMsg = typeof validation === "string" ? validation : (validation as any)?.error || "Invalid handle";
        if (errorMsg.toLowerCase().includes("reserved")) {
          setSearchState("reserved");
        } else {
          setSearchState("error");
          setSearchError(errorMsg);
        }
        return;
      }

      try {
        const program = getDpiProgram(connection);
        const status = await checkHandleAvailability(program, lower);
        if (status.state === "RESERVED") {
          setSearchState("reserved");
          setTakenSuggestions([]);
          triggerHaptic("warning");
        } else if (status.state === "REGISTERED") {
          setSearchState("taken");
          setSearchOwner(status.owner.toBase58());
          triggerHaptic("warning");
          // FEAT-011: Generate variants when taken
          const candidates = [
            `${lower}_sol`,
            `${lower}1`,
            `${lower}_pay`,
            `${lower}dev`,
          ].filter((c) => c.length >= 3 && c.length <= 20);
          setTakenSuggestions(candidates);
        } else {
          setSearchState("available");
          setTakenSuggestions([]);
          triggerHaptic("tap");
        }
      } catch (err: any) {
        setSearchState("error");
        setTakenSuggestions([]);
        setSearchError(parseAnchorError(err) || "Failed to query Solana RPC");
      }
    },
    [connection]
  );

  const onSearchInputChange = useCallback(
    (val: string) => {
      const lower = val.toLowerCase().replace(/[^a-z0-9_-]/g, "");
      setSearchTerm(lower);
      setSearchError("");

      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);

      if (!lower) {
        setSearchState("idle");
        setSearchOwner(null);
        setTakenSuggestions([]);
        return;
      }

      if (lower.length < 3) {
        setSearchState("idle");
        return;
      }

      setSearchState("checking");
      checkTimerRef.current = setTimeout(() => {
        checkAvailability(lower);
      }, 250);
    },
    [checkAvailability]
  );

  useEffect(() => {
    const q = searchParams.get("search") || searchParams.get("q");
    if (q) {
      onSearchInputChange(q);
    }
  }, [searchParams, onSearchInputChange]);

  const handleSuggestionClick = (suggestion: string) => {
    triggerHaptic("tap");
    setSearchTerm(suggestion);
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    checkAvailability(suggestion);
  };

  // Claim / Register handle
  const registerHandle = async (targetHandle: string) => {
    if (!publicKey) {
      toast.info("Please connect your Solana wallet first");
      return;
    }

    const validationError = validateHandle(targetHandle);
    if (validationError) {
      const errorMsg = typeof validationError === "string" ? validationError : (validationError as any)?.error || "Invalid Handle";
      setSearchError(errorMsg);
      triggerHaptic("error");
      toast.error(errorMsg, "Invalid Handle");
      return;
    }

    if (myHandle) {
      toast.error(
        `This wallet already owns @${myHandle}. You can only own 1 handle per wallet.`,
        "Already Claimed"
      );
      return;
    }

    setRegistering(true);
    setSearchError("");
    setStepperStage("signing");
    setStepperOpen(true);
    triggerHaptic("selection");

    try {
      const program = getDpiProgram(connection, wallet);
      setStepperStage("broadcasting");
      const tx = await registerHandleSDK(program, wallet, targetHandle);
      setStepperStage("confirming");
      await confirmTx(connection, tx, "confirmed");

      setTxSig(tx);
      setMyHandle(targetHandle);
      setSearchState("taken");
      setSearchOwner(publicKey.toBase58());
      setStepperStage("done");
      triggerHaptic("success");

      invalidateHandleCache(targetHandle, publicKey);
      toast.success(`@${targetHandle} is now claimed on Solana Devnet!`, "Handle Registered 🎉");
    } catch (e: any) {
      triggerHaptic("error");
      const friendlyError = parseAnchorError(e);
      setSearchError(friendlyError);
      toast.error(friendlyError, "Registration Failed");
      setStepperOpen(false);
    } finally {
      setRegistering(false);
      setTimeout(() => setStepperOpen(false), 1500);
    }
  };



  const copyMyHandle = () => {
    if (!myHandle) return;
    triggerHaptic("tap");
    navigator.clipboard.writeText(`@${myHandle}`);
    setCopiedHandle(true);
    toast.success("Handle copied to clipboard!");
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  return (
    <div className="w-full">
      <Header title="Handles & Identity" />

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* User's Registered Identity Card */}
        {connected && loadingMyHandle && (
          <div className="rounded-3xl p-5 bg-white/4 border border-white/10 flex items-center justify-center gap-2 text-xs text-indigo-300">
            <Loader size={15} className="animate-spin" />
            <span>Resolving registered handle...</span>
          </div>
        )}
        {connected && !loadingMyHandle && myHandle && (
          <div className="relative rounded-3xl p-5 bg-linear-to-br from-[#161D33] via-[#121728] to-[#0D101C] border-2 border-indigo-500/35 shadow-[0_8px_30px_rgba(99,102,241,0.25)] overflow-hidden backdrop-blur-2xl">
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} />
                Your Primary Identity
              </span>
              {myHandleFrozen ? (
                <StatusBadge status="danger">🔒 Frozen</StatusBadge>
              ) : (
                <StatusBadge status="success">✓ Active On-Chain</StatusBadge>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-500/25 overflow-hidden border border-white/20">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    myHandle[0].toUpperCase()
                  )}
                </div>
                <div>
                  <div className="text-xl font-black text-white tracking-tight">@{myHandle}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {publicKey
                      ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}`
                      : ""}
                  </div>
                </div>
              </div>

              <button
                onClick={copyMyHandle}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 active:scale-95 transition-all cursor-pointer"
                title="Copy @handle"
              >
                {copiedHandle ? (
                  <Check size={16} className="text-emerald-400" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>

            {/* Action buttons (FEAT-015: Share button added) */}
            <div className="grid grid-cols-4 gap-2">
              <Link
                href={`/handle/${myHandle}`}
                className="py-2 px-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all text-center"
              >
                <Globe size={13} />
                Profile
              </Link>
              <button
                type="button"
                onClick={async () => {
                  triggerHaptic("selection");
                  const shareUrl = `${window.location.origin}/send?to=@${myHandle}`;
                  if (typeof navigator !== "undefined" && navigator.share) {
                    try {
                      await navigator.share({
                        title: `Send payment to @${myHandle} on DPI`,
                        text: `Send me SOL or USDC directly using @${myHandle} on Solana Devnet!`,
                        url: shareUrl,
                      });
                      toast.success("Shared successfully!");
                      return;
                    } catch (e: any) {
                      if (e.name === "AbortError") return;
                    }
                  }
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Payment link copied!");
                }}
                className="py-2 px-2 rounded-xl bg-white/6 hover:bg-white/12 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                <Share2 size={13} />
                Share
              </button>
              <button
                onClick={() => {
                  triggerHaptic("tap");
                  setQrOpen(true);
                }}
                className="py-2 px-2 rounded-xl bg-white/6 hover:bg-white/12 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                <QrCode size={13} />
                QR
              </button>
              <button
                onClick={() => {
                  triggerHaptic("tap");
                  setTransferOpen(true);
                }}
                className="py-2 px-2 rounded-xl bg-white/6 hover:bg-white/12 border border-white/10 text-amber-300 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                <ArrowRightLeft size={13} />
                Transfer
              </button>
            </div>
          </div>
        )}

        {/* Universal Handle Checker & Explorer Card */}
        <Card className="p-5 flex flex-col gap-4 border-indigo-500/30 bg-linear-to-b from-[#13192B]/95 to-[#0F1322]/95 shadow-xl">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Search size={18} className="text-indigo-400" />
                Handle Availability & Lookup
              </h2>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Universal Checker
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Search any handle to check availability on Solana Devnet or explore user pages.
            </p>
          </div>

          {/* Search Input */}
          <div
            className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-white/4 border ${
              searchState === "available"
                ? "border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                : searchState === "taken"
                ? "border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.25)]"
                : searchState === "reserved" || searchError
                ? "border-rose-500/50"
                : "border-white/12 hover:border-white/20"
            } transition-all`}
          >
            <span className="text-lg font-black text-indigo-400 select-none">@</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchInputChange(e.target.value)}
              placeholder="search-or-check-handle"
              maxLength={32}
              className="flex-1 bg-transparent border-none outline-none text-base font-bold text-white placeholder:text-slate-600 tracking-tight"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSearchState("idle");
                  setSearchError("");
                  setSearchOwner(null);
                }}
                className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
            <div className="w-6 shrink-0 flex items-center justify-center">
              {searchState === "checking" && (
                <Loader size={16} className="animate-spin text-indigo-400" />
              )}
              {searchState === "available" && (
                <CheckCircle size={18} className="text-emerald-400" />
              )}
              {searchState === "taken" && <User size={18} className="text-indigo-400" />}
              {(searchState === "reserved" || searchError) && (
                <XCircle size={18} className="text-rose-400" />
              )}
            </div>
          </div>

          {/* Quick Suggestions Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 font-medium">Try checking:</span>
            {POPULAR_SEARCH_SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => handleSuggestionClick(sug)}
                className={`text-[11px] px-2 py-0.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                  searchTerm === sug
                    ? "bg-indigo-500/30 text-indigo-300 border-indigo-400/50"
                    : "bg-white/3 text-slate-400 border-white/8 hover:text-white hover:bg-white/8"
                }`}
              >
                @{sug}
              </button>
            ))}
          </div>

          {/* Dynamic Result Panel */}
          {searchState === "available" && searchTerm && (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">@{searchTerm} is Available!</div>
                    <div className="text-[10px] text-emerald-300">Ready to claim on Solana</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                  Available
                </span>
              </div>

              {/* Action depending on wallet state */}
              {!connected ? (
                <div className="flex flex-col gap-2 pt-1 border-t border-emerald-500/20">
                  <p className="text-xs text-slate-300">
                    Connect your Solana Devnet wallet to register this handle.
                  </p>
                  <div className="scale-95 origin-left">
                    <WalletMultiButton />
                  </div>
                </div>
              ) : !myHandle ? (
                <button
                  onClick={() => registerHandle(searchTerm)}
                  disabled={registering}
                  className="w-full py-3.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-[0.99] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {registering ? (
                    <>
                      <Loader size={16} className="animate-spin" /> Claiming on Solana...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Claim @{searchTerm} for Your Wallet
                    </>
                  )}
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-slate-300 leading-relaxed">
                  <div className="font-bold text-indigo-300 mb-0.5">Wallet Already Registered</div>
                  Your current wallet already registered{" "}
                  <span className="text-white font-bold">@{myHandle}</span>. To register @{searchTerm}
                  , switch to a different wallet or transfer your existing handle.
                </div>
              )}
            </div>
          )}

          {searchState === "taken" && searchTerm && (
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold">
                    @{searchTerm[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">@{searchTerm} is Claimed</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Owner:{" "}
                      {searchOwner
                        ? `${searchOwner.slice(0, 6)}...${searchOwner.slice(-4)}`
                        : "Registered On-Chain"}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase">
                  Registered
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-indigo-500/20">
                <Link
                  href={`/handle/${searchTerm}`}
                  className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center shadow-sm"
                >
                  <Globe size={13} />
                  View Public Page
                </Link>
                <Link
                  href={`/send?to=${searchTerm}`}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center shadow-sm"
                >
                  <Send size={13} />
                  Send Payment
                </Link>
              </div>

              {/* FEAT-011: Alternative Suggestions */}
              {takenSuggestions.length > 0 && (
                <div className="pt-2.5 border-t border-indigo-500/20">
                  <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-amber-400" />
                    <span>Suggested Available Alternatives:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {takenSuggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleSuggestionClick(sug)}
                        className="text-xs font-mono font-semibold px-2.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-400/30 hover:border-indigo-400/60 text-indigo-200 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                      >
                        <span>@{sug}</span>
                        <span className="text-[10px] text-emerald-400 font-bold ml-0.5">Try →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {searchState === "reserved" && searchTerm && (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">@{searchTerm} is Reserved</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  This handle is part of the protected DPI governance namespace and cannot be claimed
                  by individual wallets.
                </div>
              </div>
            </div>
          )}

          {searchError && searchState !== "taken" && searchState !== "available" && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{searchError}</span>
            </div>
          )}
        </Card>

        {/* Claim First Handle Call-To-Action for Unclaimed Users */}
        {connected && !myHandle && (
          <Card className="p-5 border-indigo-500/30 bg-linear-to-br from-indigo-950/40 via-[#13192B] to-[#0F1322]">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-1">
              <Sparkles size={16} />
              <span>You don&apos;t have a registered handle yet</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Type your desired name in the checker above to check availability and register it
              permanently to your Solana wallet.
            </p>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 bg-white/3 p-2.5 rounded-xl border border-white/6 font-mono">
              <span>Your Wallet:</span>
              <span className="text-indigo-300 font-bold">
                {publicKey
                  ? `${publicKey.toBase58().slice(0, 8)}...${publicKey.toBase58().slice(-6)}`
                  : ""}
              </span>
            </div>
          </Card>
        )}

        {/* Protocol Rules & Standards */}
        <Card className="p-4 flex flex-col gap-2.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            DPI Protocol Guidelines
          </div>
          {[
            "1:1 Identity: Each Solana wallet can claim exactly 1 handle on-chain.",
            "Character Constraints: 3–32 chars (lowercase letters, numbers, _, -).",
            "Instant Routing: Anyone can send SOL or SPL tokens directly using @handle.",
            "Transferable: Owners can transfer handle ownership to another wallet anytime.",
          ].map((r, i) => (
            <div key={i} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
              <span className="text-indigo-400 font-bold">·</span>
              <span>{r}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Transfer Handle Modal */}
      {myHandle && (
        <TransferHandleModal
          isOpen={transferOpen}
          onClose={() => setTransferOpen(false)}
          handle={myHandle}
          isFrozen={Boolean(myHandleFrozen)}
          onSuccess={() => {
            setMyHandle(null);
            loadMyHandle();
          }}
        />
      )}

      {/* QR Code Modal for user's own handle */}
      {myHandle && (
        <QRCodeModal
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          title={`@${myHandle}`}
          subtitle="Scan to view public page or send payment"
          value={
            typeof window !== "undefined"
              ? `${window.location.origin}/handle/${myHandle}`
              : `${process.env.NEXT_PUBLIC_APP_URL || ""}/handle/${myHandle}`
          }
          handle={myHandle}
        />
      )}

      {/* Registration Stepper Modal */}
      <TransactionStepperModal
        isOpen={stepperOpen}
        stage={stepperStage}
        txTitle={transferOpen ? "Transferring Handle" : "Registering @Handle"}
        txSubtitle={
          transferOpen
            ? `Transferring @${myHandle} to new owner...`
            : `Claiming @${searchTerm} on Solana Devnet...`
        }
        txSig={txSig}
      />
    </div>
  );
}

export default function HandlePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3 p-8 text-indigo-400">
          <Loader className="animate-spin" size={28} />
          <span className="text-xs text-slate-400">Loading handles...</span>
        </div>
      }
    >
      <HandlePageContent />
    </Suspense>
  );
}
