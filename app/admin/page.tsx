"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import Header from "@/components/Header";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import TransactionStepperModal, { StepperStage } from "@/components/TransactionStepperModal";
import { WalletMultiButton } from "@/components/WalletButton";
import { useToast } from "@/components/Toast";
import { triggerHaptic } from "@/lib/haptics";
import {
  getDpiProgram,
  fetchRegistryConfig,
  initConfig,
  freezeHandle,
  unfreezeHandle,
  reserveHandle,
  batchReserveHandles,
  recoverHandle,
  updateAdminConfig,
  getHandlePda,
  getConfigPda,
  parseAnchorError,
  validateHandleInput,
} from "@/lib/dpi-program";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  BookmarkPlus,
  Layers,
  RefreshCw,
  KeyRound,
  Loader,
  AlertTriangle,
  Search,
  UserCheck,
} from "lucide-react";

type AdminTab = "moderation" | "reservations" | "recovery" | "governance";

export default function AdminConsolePage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>("moderation");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configAdmin, setConfigAdmin] = useState<PublicKey | null>(null);
  const [isConfigInitialized, setIsConfigInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Stepper Modal State
  const [stepperOpen, setStepperOpen] = useState(false);
  const [stepperStage, setStepperStage] = useState<StepperStage>("signing");
  const [stepperTitle, setStepperTitle] = useState("");
  const [stepperSubtitle, setStepperSubtitle] = useState("");

  // Tab 1: Moderation State
  const [modSearchHandle, setModSearchHandle] = useState("");
  const [modChecking, setModChecking] = useState(false);
  const [modHandleData, setModHandleData] = useState<{
    handle: string;
    owner: string;
    frozen: boolean;
  } | null>(null);
  const [modActionLoading, setModActionLoading] = useState(false);

  // Tab 2: Reservations State
  const [singleReserveHandle, setSingleReserveHandle] = useState("");
  const [singleReserveLoading, setSingleReserveLoading] = useState(false);
  const [batchRawInput, setBatchRawInput] = useState("");
  const [batchReserveLoading, setBatchReserveLoading] = useState(false);

  // Tab 3: Emergency Recovery State
  const [recoveryHandle, setRecoveryHandle] = useState("");
  const [recoveryNewOwner, setRecoveryNewOwner] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Tab 4: Governance State
  const [newAdminKey, setNewAdminKey] = useState("");
  const [transferAdminLoading, setTransferAdminLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  // Fetch on-chain Config
  const loadConfig = useCallback(async () => {
    if (!connection) return;
    setLoadingConfig(true);
    try {
      const program = getDpiProgram(connection, wallet);
      const cfg = await fetchRegistryConfig(program);
      if (cfg) {
        setConfigAdmin(cfg.admin);
        setIsConfigInitialized(true);
        if (publicKey) {
          setIsAdmin(cfg.admin.equals(publicKey));
        } else {
          setIsAdmin(false);
        }
      } else {
        setConfigAdmin(null);
        setIsConfigInitialized(false);
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Failed fetching registry config:", err);
    } finally {
      setLoadingConfig(false);
    }
  }, [connection, wallet, publicKey]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Tab 1: Inspect handle for moderation
  const handleInspectModeration = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = modSearchHandle.trim().toLowerCase().replace(/^@/, "");
    if (!clean) return;

    setModChecking(true);
    triggerHaptic("tap");
    try {
      const program = getDpiProgram(connection, wallet);
      const [handlePda] = getHandlePda(clean);
      const acc = await (program.account as any).handleRegistry.fetchNullable(handlePda);
      if (acc) {
        setModHandleData({
          handle: clean,
          owner: acc.owner.toBase58(),
          frozen: Boolean(acc.frozen),
        });
        toast.success(`Found @${clean} on-chain!`);
      } else {
        setModHandleData(null);
        toast.info(`@${clean} is not registered.`);
      }
    } catch (err) {
      toast.error(parseAnchorError(err));
    } finally {
      setModChecking(false);
    }
  };

  // Tab 1: Freeze Handle
  const handleFreezeAction = async () => {
    if (!modHandleData || !publicKey) return;
    setModActionLoading(true);
    setStepperTitle("Freezing Handle");
    setStepperSubtitle(`Freezing transfers on @${modHandleData.handle}...`);
    setStepperStage("signing");
    setStepperOpen(true);
    triggerHaptic("selection");

    try {
      const program = getDpiProgram(connection, wallet);
      setStepperStage("broadcasting");
      const tx = await freezeHandle(program, wallet, modHandleData.handle);
      setStepperStage("confirming");
      await connection.confirmTransaction(tx, "confirmed");
      setStepperStage("done");
      toast.success(`@${modHandleData.handle} is now FROZEN.`);
      triggerHaptic("success");
      setModHandleData({ ...modHandleData, frozen: true });
    } catch (err: any) {
      setStepperOpen(false);
      toast.error(parseAnchorError(err));
    } finally {
      setModActionLoading(false);
      setTimeout(() => setStepperOpen(false), 1500);
    }
  };

  // Tab 1: Unfreeze Handle
  const handleUnfreezeAction = async () => {
    if (!modHandleData || !publicKey) return;
    setModActionLoading(true);
    setStepperTitle("Unfreezing Handle");
    setStepperSubtitle(`Re-enabling transfers on @${modHandleData.handle}...`);
    setStepperStage("signing");
    setStepperOpen(true);
    triggerHaptic("selection");

    try {
      const program = getDpiProgram(connection, wallet);
      setStepperStage("broadcasting");
      const tx = await unfreezeHandle(program, wallet, modHandleData.handle);
      setStepperStage("confirming");
      await connection.confirmTransaction(tx, "confirmed");
      setStepperStage("done");
      toast.success(`@${modHandleData.handle} is now ACTIVE.`);
      triggerHaptic("success");
      setModHandleData({ ...modHandleData, frozen: false });
    } catch (err: any) {
      setStepperOpen(false);
      toast.error(parseAnchorError(err));
    } finally {
      setModActionLoading(false);
      setTimeout(() => setStepperOpen(false), 1500);
    }
  };

  // Tab 2: Single Reservation
  const handleSingleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = singleReserveHandle.trim().toLowerCase().replace(/^@/, "");
    const validation = validateHandleInput(clean);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid handle format");
      return;
    }

    setSingleReserveLoading(true);
    setStepperTitle("Reserving Handle");
    setStepperSubtitle(`Reserving @${clean} from public registration...`);
    setStepperStage("signing");
    setStepperOpen(true);
    triggerHaptic("selection");

    try {
      const program = getDpiProgram(connection, wallet);
      setStepperStage("broadcasting");
      const tx = await reserveHandle(program, wallet, clean);
      setStepperStage("confirming");
      await connection.confirmTransaction(tx, "confirmed");
      setStepperStage("done");
      toast.success(`@${clean} successfully reserved!`);
      triggerHaptic("success");
      setSingleReserveHandle("");
    } catch (err: any) {
      setStepperOpen(false);
      toast.error(parseAnchorError(err));
    } finally {
      setSingleReserveLoading(false);
      setTimeout(() => setStepperOpen(false), 1500);
    }
  };

  // Tab 2: Batch Reservation
  const parsedBatchHandles = batchRawInput
    .split(/[\n,]+/)
    .map((h) => h.trim().toLowerCase().replace(/^@/, ""))
    .filter((h) => h.length > 0);

  const handleBatchReserve = async () => {
    if (parsedBatchHandles.length === 0) {
      toast.error("Enter at least 1 handle to reserve");
      return;
    }
    if (parsedBatchHandles.length > 20) {
      toast.error("Maximum batch size is 20 handles (Solana transaction MTU limit)");
      return;
    }

    for (const h of parsedBatchHandles) {
      const v = validateHandleInput(h);
      if (!v.valid) {
        toast.error(`Invalid handle "${h}": ${v.error}`);
        return;
      }
    }

    setBatchReserveLoading(true);
    setStepperTitle("Batch Reserving Handles");
    setStepperSubtitle(`Reserving ${parsedBatchHandles.length} handles atomically...`);
    setStepperStage("signing");
    setStepperOpen(true);
    triggerHaptic("selection");

    try {
      const program = getDpiProgram(connection, wallet);
      setStepperStage("broadcasting");
      const tx = await batchReserveHandles(program, wallet, parsedBatchHandles);
      setStepperStage("confirming");
      await connection.confirmTransaction(tx, "confirmed");
      setStepperStage("done");
      toast.success(`Successfully reserved ${parsedBatchHandles.length} handles!`);
      triggerHaptic("success");
      setBatchRawInput("");
    } catch (err: any) {
      setStepperOpen(false);
      toast.error(parseAnchorError(err));
    } finally {
      setBatchReserveLoading(false);
      setTimeout(() => setStepperOpen(false), 1500);
    }
  };

  // Tab 3: Emergency Recovery
  const handleEmergencyRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = recoveryHandle.trim().toLowerCase().replace(/^@/, "");
    if (!clean) {
      toast.error("Handle is required");
      return;
    }

    let newOwnerKey: PublicKey;
    try {
      newOwnerKey = new PublicKey(recoveryNewOwner.trim());
    } catch {
      toast.error("Invalid new owner Solana public key");
      return;
    }

    setRecoveryLoading(true);
    setStepperTitle("Recovering Handle");
    setStepperSubtitle(`Reassigning @${clean} ownership...`);
    setStepperStage("signing");
    setStepperOpen(true);
    triggerHaptic("selection");

    try {
      const program = getDpiProgram(connection, wallet);
      setStepperStage("broadcasting");
      const tx = await recoverHandle(program, wallet, clean, newOwnerKey);
      setStepperStage("confirming");
      await connection.confirmTransaction(tx, "confirmed");
      setStepperStage("done");
      toast.success(`@${clean} has been reassigned successfully!`);
      triggerHaptic("success");
      setRecoveryHandle("");
      setRecoveryNewOwner("");
    } catch (err: any) {
      setStepperOpen(false);
      toast.error(parseAnchorError(err));
    } finally {
      setRecoveryLoading(false);
      setTimeout(() => setStepperOpen(false), 1500);
    }
  };

  // Tab 4: Transfer Admin Key
  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    let newAdminPubkey: PublicKey;
    try {
      newAdminPubkey = new PublicKey(newAdminKey.trim());
    } catch {
      toast.error("Invalid new admin Solana public key");
      return;
    }

    if (configAdmin && newAdminPubkey.equals(configAdmin)) {
      toast.error("Address is already the current admin");
      return;
    }

    setTransferAdminLoading(true);
    setStepperTitle("Transferring Admin Authority");
    setStepperSubtitle("Updating protocol governance key...");
    setStepperStage("signing");
    setStepperOpen(true);
    triggerHaptic("selection");

    try {
      const program = getDpiProgram(connection, wallet);
      setStepperStage("broadcasting");
      const tx = await updateAdminConfig(program, wallet, newAdminPubkey);
      setStepperStage("confirming");
      await connection.confirmTransaction(tx, "confirmed");
      setStepperStage("done");
      toast.success("Admin authority transferred!");
      triggerHaptic("success");
      setNewAdminKey("");
      await loadConfig();
    } catch (err: any) {
      setStepperOpen(false);
      toast.error(parseAnchorError(err));
    } finally {
      setTransferAdminLoading(false);
      setTimeout(() => setStepperOpen(false), 1500);
    }
  };

  // Devnet Bootstrap: Init Config
  const handleInitConfig = async () => {
    if (!publicKey) return;
    setInitLoading(true);
    setStepperTitle("Initializing Protocol Config");
    setStepperSubtitle("Creating registry config PDA on-chain...");
    setStepperStage("signing");
    setStepperOpen(true);
    triggerHaptic("selection");

    try {
      const program = getDpiProgram(connection, wallet);
      setStepperStage("broadcasting");
      const tx = await initConfig(program, wallet);
      setStepperStage("confirming");
      await connection.confirmTransaction(tx, "confirmed");
      setStepperStage("done");
      toast.success("Protocol Config Initialized! You are now admin.");
      triggerHaptic("success");
      await loadConfig();
    } catch (err: any) {
      setStepperOpen(false);
      toast.error(parseAnchorError(err));
    } finally {
      setInitLoading(false);
      setTimeout(() => setStepperOpen(false), 1500);
    }
  };

  const [configPda] = getConfigPda();
  const shortConfigPda = `${configPda.toBase58().slice(0, 6)}...${configPda.toBase58().slice(-4)}`;
  const shortAdmin = configAdmin
    ? `${configAdmin.toBase58().slice(0, 6)}...${configAdmin.toBase58().slice(-4)}`
    : "Unset";

  return (
    <div className="w-full">
      <Header title="Admin Console" showBack onBack={() => window.history.back()} />

      <div className="px-4 py-6 flex flex-col gap-6">
        {/* Banner Header */}
        <div className="relative rounded-3xl p-6 bg-linear-to-br from-purple-950 via-[#19142C] to-[#0D0A18] border-2 border-purple-500/40 shadow-[0_10px_40px_rgba(168,85,247,0.25)] overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/25 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">
                DPI Admin Console
              </h1>
              <div className="text-xs text-purple-300/80">
                Governance, Moderation & Protocol Namespace Controls
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/10 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Config PDA
              </span>
              <span className="font-mono text-purple-200 font-semibold">{shortConfigPda}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Current Admin
              </span>
              <span className="font-mono text-purple-200 font-semibold">{shortAdmin}</span>
            </div>
          </div>
        </div>

        {/* State 1: Config Uninitialized (Devnet bootstrap prompt) */}
        {!loadingConfig && !isConfigInitialized && (
          <Card className="p-5 border-amber-500/40 bg-amber-500/10 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-sm font-bold text-white">Config PDA Not Initialized</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  The registry config account has not been initialized on this Solana cluster yet.
                  You can initialize it now to become the protocol admin authority.
                </p>
              </div>
            </div>
            {connected ? (
              <button
                onClick={handleInitConfig}
                disabled={initLoading}
                className="mt-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {initLoading ? <Loader size={15} className="animate-spin" /> : <Shield size={15} />}
                <span>Initialize Protocol Config Now</span>
              </button>
            ) : (
              <div className="mt-2 flex justify-center">
                <WalletMultiButton />
              </div>
            )}
          </Card>
        )}

        {/* State 2: Wallet Not Connected */}
        {!connected && (
          <Card className="p-8 text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
              <Lock size={26} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Connect Admin Wallet</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                You must connect a Solana wallet authorized as the DPI protocol admin.
              </p>
            </div>
            <WalletMultiButton />
          </Card>
        )}

        {/* State 3: Connected but NOT Admin */}
        {connected && isConfigInitialized && !isAdmin && !loadingConfig && (
          <Card className="p-6 border-red-500/30 bg-red-500/10 flex flex-col items-center text-center gap-3">
            <ShieldAlert size={36} className="text-red-400" />
            <div>
              <h3 className="text-base font-bold text-white">Unauthorized Access</h3>
              <p className="text-xs text-slate-300 max-w-xs mt-1">
                Connected wallet <span className="font-mono text-white font-bold">{publicKey?.toBase58().slice(0, 6)}...{publicKey?.toBase58().slice(-4)}</span> is not configured as the protocol administrator.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              Required Admin: {configAdmin ? configAdmin.toBase58() : "None"}
            </div>
          </Card>
        )}

        {/* State 4: Connected & Admin Authenticated */}
        {connected && isConfigInitialized && isAdmin && (
          <div className="flex flex-col gap-5">
            {/* Tab Navigation */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[#0F1424] border border-white/10">
              {[
                { id: "moderation", label: "Moderation", icon: Shield },
                { id: "reservations", label: "Reserve", icon: BookmarkPlus },
                { id: "recovery", label: "Recovery", icon: RefreshCw },
                { id: "governance", label: "Gov", icon: KeyRound },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    triggerHaptic("tap");
                    setActiveTab(id as AdminTab);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    activeTab === id
                      ? "bg-purple-600 text-white shadow-md shadow-purple-500/25"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* TAB 1: MODERATION */}
            {activeTab === "moderation" && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <Card className="p-5 flex flex-col gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Shield size={16} className="text-purple-400" />
                      Handle Moderation & Freeze Controls
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Inspect any registered handle and freeze or unfreeze transfer capabilities.
                    </p>
                  </div>

                  <form onSubmit={handleInspectModeration} className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 font-bold text-sm">
                        @
                      </span>
                      <input
                        value={modSearchHandle}
                        onChange={(e) => setModSearchHandle(e.target.value)}
                        placeholder="search handle to inspect..."
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-white/4 border border-white/10 text-xs text-white outline-none focus:border-purple-400/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={modChecking || !modSearchHandle.trim()}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {modChecking ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
                      <span>Inspect</span>
                    </button>
                  </form>

                  {modHandleData && (
                    <div className="p-4 rounded-2xl bg-white/3 border border-white/8 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-base font-black text-white">
                            @{modHandleData.handle}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            Owner: {modHandleData.owner.slice(0, 6)}...{modHandleData.owner.slice(-4)}
                          </div>
                        </div>
                        {modHandleData.frozen ? (
                          <StatusBadge status="danger">🔒 Frozen</StatusBadge>
                        ) : (
                          <StatusBadge status="success">✓ Active</StatusBadge>
                        )}
                      </div>

                      <div className="pt-2 border-t border-white/8 flex gap-2">
                        {modHandleData.frozen ? (
                          <button
                            onClick={handleUnfreezeAction}
                            disabled={modActionLoading}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Unlock size={14} />
                            <span>Unfreeze Handle</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleFreezeAction}
                            disabled={modActionLoading}
                            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Lock size={14} />
                            <span>Freeze Handle</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* TAB 2: RESERVATIONS */}
            {activeTab === "reservations" && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                {/* Single Reservation */}
                <Card className="p-5 flex flex-col gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <BookmarkPlus size={16} className="text-purple-400" />
                      Single Handle Reservation
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Permanently block a single trademarked or high-value handle from public registration.
                    </p>
                  </div>

                  <form onSubmit={handleSingleReserve} className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 font-bold text-sm">
                        @
                      </span>
                      <input
                        value={singleReserveHandle}
                        onChange={(e) => setSingleReserveHandle(e.target.value)}
                        placeholder="e.g. solana, google"
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-white/4 border border-white/10 text-xs text-white outline-none focus:border-purple-400/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={singleReserveLoading || !singleReserveHandle.trim()}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {singleReserveLoading ? <Loader size={14} className="animate-spin" /> : <BookmarkPlus size={14} />}
                      <span>Reserve</span>
                    </button>
                  </form>
                </Card>

                {/* Batch Reservation */}
                <Card className="p-5 flex flex-col gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Layers size={16} className="text-indigo-400" />
                        Batch Handle Reservation
                      </h2>
                      <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                        {parsedBatchHandles.length} / 20 handles
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Atomically reserve up to 20 handles in one transaction. Separate handles with commas or newlines.
                    </p>
                  </div>

                  <textarea
                    rows={4}
                    value={batchRawInput}
                    onChange={(e) => setBatchRawInput(e.target.value)}
                    placeholder="paypal, stripe, visa, mastercard, apple, microsoft, dev, finance"
                    className="w-full p-3 rounded-xl bg-white/4 border border-white/10 text-xs text-white font-mono outline-none focus:border-indigo-400/50"
                  />

                  {parsedBatchHandles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl bg-white/2 border border-white/6">
                      {parsedBatchHandles.map((h, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono text-[11px]"
                        >
                          @{h}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleBatchReserve}
                    disabled={
                      batchReserveLoading ||
                      parsedBatchHandles.length === 0 ||
                      parsedBatchHandles.length > 20
                    }
                    className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {batchReserveLoading ? (
                      <Loader size={15} className="animate-spin" />
                    ) : (
                      <Layers size={15} />
                    )}
                    <span>Reserve {parsedBatchHandles.length} Handles Atomically</span>
                  </button>
                </Card>
              </div>
            )}

            {/* TAB 3: EMERGENCY RECOVERY */}
            {activeTab === "recovery" && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <Card className="p-5 flex flex-col gap-4 border-amber-500/30">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                    <div>
                      <h2 className="text-sm font-bold text-white">
                        Emergency Handle Recovery
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Reassigns a compromised, disputed, or lost handle to a new verified owner address.
                        Automatically closes the prior owner&apos;s ReverseLookup mapping.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleEmergencyRecovery} className="flex flex-col gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Target Handle
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-sm">
                          @
                        </span>
                        <input
                          value={recoveryHandle}
                          onChange={(e) => setRecoveryHandle(e.target.value)}
                          placeholder="handle to recover"
                          className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-white/4 border border-white/10 text-xs text-white outline-none focus:border-amber-400/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        New Owner Public Key
                      </label>
                      <input
                        value={recoveryNewOwner}
                        onChange={(e) => setRecoveryNewOwner(e.target.value)}
                        placeholder="New owner Solana address (base58)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/4 border border-white/10 text-xs font-mono text-white outline-none focus:border-amber-400/50"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={recoveryLoading || !recoveryHandle || !recoveryNewOwner}
                      className="mt-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {recoveryLoading ? (
                        <Loader size={15} className="animate-spin" />
                      ) : (
                        <RefreshCw size={15} />
                      )}
                      <span>Execute Emergency Recovery</span>
                    </button>
                  </form>
                </Card>
              </div>
            )}

            {/* TAB 4: GOVERNANCE */}
            {activeTab === "governance" && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <Card className="p-5 flex flex-col gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <KeyRound size={16} className="text-purple-400" />
                      Protocol Governance & Authority Transfer
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Transfer protocol administrator rights to a new public key or multisig.
                    </p>
                  </div>

                  <form onSubmit={handleUpdateAdmin} className="flex flex-col gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        New Administrator Address
                      </label>
                      <input
                        value={newAdminKey}
                        onChange={(e) => setNewAdminKey(e.target.value)}
                        placeholder="New admin Solana public key (base58)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/4 border border-white/10 text-xs font-mono text-white outline-none focus:border-purple-400/50"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={transferAdminLoading || !newAdminKey.trim()}
                      className="py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {transferAdminLoading ? (
                        <Loader size={15} className="animate-spin" />
                      ) : (
                        <UserCheck size={15} />
                      )}
                      <span>Transfer Admin Key</span>
                    </button>
                  </form>
                </Card>

                {/* Protocol Info Card */}
                <Card className="p-5 flex flex-col gap-3">
                  <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    Program Parameters
                  </span>
                  <div className="divide-y divide-white/6 text-xs">
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-400">Program ID</span>
                      <span className="font-mono text-purple-300">{shortConfigPda}</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-400">Max Batch Size</span>
                      <span className="font-bold text-white font-mono">20 handles</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-400">Handle Length</span>
                      <span className="font-bold text-white font-mono">3 to 32 chars</span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-slate-400">Allowed Characters</span>
                      <span className="font-mono text-slate-300">[a-z0-9_-]</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stepper Modal */}
      <TransactionStepperModal
        isOpen={stepperOpen}
        stage={stepperStage}
        txTitle={stepperTitle}
        txSubtitle={stepperSubtitle}
      />
    </div>
  );
}
