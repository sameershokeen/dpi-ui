"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import Header from "@/components/Header";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import QRCodeModal from "@/components/QRCodeModal";
import TransactionStepperModal, { StepperStage } from "@/components/TransactionStepperModal";
import { useToast } from "@/components/Toast";
import { triggerHaptic } from "@/lib/haptics";
import { DPI_PROGRAM_ID, getHandleRegistryPDA, getReverseLookupPDA } from "@/lib/dpi-program";
import { lookupHandleCached, invalidateHandleCache } from "@/lib/dpi-cache";
import {
  Send,
  Copy,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Loader,
  QrCode,
  Share2,
  Globe,
  MessageCircle,
  Edit3,
  ArrowRightLeft,
  Shield,
  X,
  Code2,
} from "lucide-react";
import Link from "next/link";

interface HandleData {
  owner: string;
  handle: string;
  frozen: boolean;
}

interface SocialBio {
  bio?: string;
  twitter?: string;
  github?: string;
  telegram?: string;
  website?: string;
}

export default function HandlePublicPage() {
  const params = useParams();
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const toast = useToast();

  const rawHandle = (params?.handle as string) || "";
  const handle = rawHandle.replace(/^@/, "");

  const [data, setData] = useState<HandleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  // Social Bio state
  const [bioData, setBioData] = useState<SocialBio>({});
  const [editingBio, setEditingBio] = useState(false);
  const [editBioForm, setEditBioForm] = useState<SocialBio>({});

  // Transfer Handle state
  const [transferOpen, setTransferOpen] = useState(false);
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [stepperOpen, setStepperOpen] = useState(false);
  const [stepperStage, setStepperStage] = useState<StepperStage>("signing");

  const isOwner = publicKey && data?.owner && publicKey.toBase58() === data.owner;

  const fetchHandleData = useCallback(async () => {
    if (!handle) return;
    setLoading(true);
    setNotFound(false);
    try {
      const handleInfo = await lookupHandleCached(connection, handle);
      if (!handleInfo) {
        setNotFound(true);
        return;
      }
      setData({ owner: handleInfo.owner, handle, frozen: handleInfo.frozen });

      const storedAvatar = localStorage.getItem(`dpi_avatar_${handleInfo.owner}`);
      setProfilePhoto(storedAvatar);

      const storedBio = localStorage.getItem(`dpi_bio_${handle}`);
      if (storedBio) {
        try {
          const parsed = JSON.parse(storedBio);
          setBioData(parsed);
          setEditBioForm(parsed);
        } catch {}
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [handle, connection]);

  useEffect(() => {
    fetchHandleData();
  }, [fetchHandleData]);

  const copyAddress = () => {
    if (data?.owner) {
      triggerHaptic("tap");
      navigator.clipboard.writeText(data.owner);
      setCopied(true);
      toast.success("Owner address copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    triggerHaptic("selection");
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareText = `Send SOL & tokens to me instantly using @${handle} on DPI (Solana)!`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `DPI: @${handle}`,
          text: shareText,
          url: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(
              shareText
            )}&url=${encodeURIComponent(shareUrl)}`,
            "_blank"
          );
        }
      }
    } else {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          shareText
        )}&url=${encodeURIComponent(shareUrl)}`,
        "_blank"
      );
    }
  };

  const handleSaveBio = () => {
    triggerHaptic("success");
    localStorage.setItem(`dpi_bio_${handle}`, JSON.stringify(editBioForm));
    setBioData(editBioForm);
    setEditingBio(false);
    toast.success("Profile bio & social links saved!");
  };

  const handleTransferHandle = async () => {
    if (!publicKey || (!sendTransaction && !signTransaction) || !data || !newOwnerAddress) return;

    let targetPubKey: PublicKey;
    try {
      targetPubKey = new PublicKey(newOwnerAddress.trim());
    } catch {
      toast.error("Invalid Solana address for new owner");
      return;
    }

    if (targetPubKey.toBase58() === publicKey.toBase58()) {
      toast.error("You are already the owner of this handle");
      return;
    }

    setTransferring(true);
    setStepperStage("signing");
    setStepperOpen(true);
    triggerHaptic("selection");

    try {
      const [handlePDA] = getHandleRegistryPDA(data.handle);
      const [currentReversePDA] = getReverseLookupPDA(publicKey);
      const [newReversePDA] = getReverseLookupPDA(targetPubKey);

      // Discriminator for transfer_handle (sha256("global:transfer_handle")[0..8])
      const discriminator = Buffer.from([0x26, 0x14, 0x16, 0x76, 0x6e, 0x05, 0x88, 0x6f]);

      const instruction = new TransactionInstruction({
        programId: DPI_PROGRAM_ID,
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: false },
          { pubkey: handlePDA, isSigner: false, isWritable: true },
          { pubkey: currentReversePDA, isSigner: false, isWritable: true },
          { pubkey: newReversePDA, isSigner: false, isWritable: true },
          { pubkey: targetPubKey, isSigner: false, isWritable: false },
        ],
        data: discriminator,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      tx.add(instruction);

      let sig: string;
      if (sendTransaction) {
        setStepperStage("broadcasting");
        sig = await sendTransaction(tx, connection, { skipPreflight: false });
      } else if (signTransaction) {
        const signed = await signTransaction(tx);
        setStepperStage("broadcasting");
        sig = await connection.sendRawTransaction(signed.serialize({ requireAllSignatures: false }));
      } else {
        throw new Error("Wallet adapter does not support sending transactions.");
      }

      setStepperStage("confirming");

      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      invalidateHandleCache(data.handle, publicKey);
      invalidateHandleCache(data.handle, targetPubKey);

      setStepperStage("done");
      triggerHaptic("success");
      toast.success(`@${data.handle} transferred to ${newOwnerAddress.slice(0, 8)}...`);
      setTransferOpen(false);
      fetchHandleData();
    } catch (err: any) {
      triggerHaptic("error");
      toast.error(err.message || "Failed to transfer handle", "Transfer Error");
    } finally {
      setTransferring(false);
      setStepperOpen(false);
    }
  };

  const shortAddr = data?.owner
    ? `${data.owner.slice(0, 8)}...${data.owner.slice(-6)}`
    : "";

  return (
    <div className="w-full">
      <Header showBack onBack={() => router.back()} />
      <div className="px-4 py-4 flex flex-col gap-4">
        {loading && (
          <div className="text-center py-16 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader size={16} className="animate-spin text-indigo-400" />
            Loading @{handle} on Solana...
          </div>
        )}

        {notFound && !loading && (
          <Card className="p-8 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-lg font-black text-white">@{handle} Not Found</h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              This handle hasn&apos;t been registered on Solana Devnet yet. You can be the first to claim it!
            </p>
            <Link
              href="/handle"
              className="mt-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-500/25 active:scale-95 transition-all"
            >
              Claim @{handle} Now
            </Link>
          </Card>
        )}

        {data && !loading && (
          <>
            {/* Identity Card */}
            <Card className="p-6 text-center flex flex-col items-center gap-3 bg-linear-to-b from-[#161D2E] to-[#101422] border-indigo-500/20">
              <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-black text-white text-3xl shadow-[0_0_30px_rgba(99,102,241,0.35)] overflow-hidden border border-white/20">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  data.handle[0].toUpperCase()
                )}
              </div>

              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  @{data.handle}
                </h1>
                <div className="mt-1 flex items-center justify-center gap-2">
                  {data.frozen ? (
                    <StatusBadge status="danger">🔒 Frozen</StatusBadge>
                  ) : (
                    <StatusBadge status="success">✓ Active On-Chain</StatusBadge>
                  )}
                  {isOwner && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      You own this
                    </span>
                  )}
                </div>
              </div>

              {/* Bio if exists */}
              {bioData.bio && (
                <p className="text-xs text-slate-300 max-w-xs leading-relaxed italic px-2">
                  &ldquo;{bioData.bio}&rdquo;
                </p>
              )}

              {/* Social Link Badges */}
              {(bioData.twitter || bioData.github || bioData.telegram || bioData.website) && (
                <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                  {bioData.twitter && (
                    <a
                      href={`https://twitter.com/${bioData.twitter.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-sky-400 transition-colors"
                      title="Twitter / X"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  )}
                  {bioData.github && (
                    <a
                      href={`https://github.com/${bioData.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                      title="GitHub"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    </a>
                  )}
                  {bioData.telegram && (
                    <a
                      href={`https://t.me/${bioData.telegram.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-400 transition-colors"
                      title="Telegram"
                    >
                      <MessageCircle size={14} />
                    </a>
                  )}
                  {bioData.website && (
                    <a
                      href={bioData.website.startsWith("http") ? bioData.website : `https://${bioData.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-emerald-400 transition-colors"
                      title="Website"
                    >
                      <Globe size={14} />
                    </a>
                  )}
                </div>
              )}

              {/* Address & Action Buttons */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/4 border border-white/10 text-xs font-mono text-slate-300 hover:bg-white/8 active:scale-95 transition-all cursor-pointer"
                >
                  {copied ? (
                    <CheckCircle size={14} className="text-emerald-400" />
                  ) : (
                    <Copy size={14} />
                  )}
                  {shortAddr}
                </button>

                <button
                  onClick={() => {
                    triggerHaptic("tap");
                    setQrOpen(true);
                  }}
                  className="p-1.5 rounded-xl bg-white/4 border border-white/10 text-slate-300 hover:text-white hover:bg-white/8 active:scale-95 transition-all cursor-pointer"
                  title="Show QR Code"
                >
                  <QrCode size={16} />
                </button>

                <button
                  onClick={handleShare}
                  className="p-1.5 rounded-xl bg-white/4 border border-white/10 text-slate-300 hover:text-white hover:bg-white/8 active:scale-95 transition-all cursor-pointer"
                  title="Share Profile"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </Card>

            {/* Quick Payment Action */}
            <Link
              href={`/send?to=${data.handle}`}
              className="py-4 px-6 rounded-2xl bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 active:scale-[0.99] hover:brightness-110 transition-all text-center"
            >
              <Send size={18} />
              Send SOL / Tokens to @{data.handle}
            </Link>

            {/* Owner Governance Controls */}
            {isOwner && (
              <Card className="p-4 flex flex-col gap-3 border-indigo-500/30 bg-linear-to-br from-indigo-950/20 to-purple-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                    <Shield size={15} />
                    <span>Handle Management (Owner)</span>
                  </div>
                  <button
                    onClick={() => setEditingBio(!editingBio)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 size={12} />
                    {editingBio ? "Cancel" : "Edit Bio"}
                  </button>
                </div>

                {/* Edit Bio Form */}
                {editingBio && (
                  <div className="flex flex-col gap-2.5 pt-2 border-t border-white/8 animate-in fade-in">
                    <input
                      placeholder="Short bio or description"
                      value={editBioForm.bio || ""}
                      onChange={(e) =>
                        setEditBioForm({ ...editBioForm, bio: e.target.value })
                      }
                      maxLength={120}
                      className="px-3 py-2 rounded-xl bg-white/4 border border-white/10 text-xs text-white outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="Twitter handle (e.g. alice)"
                        value={editBioForm.twitter || ""}
                        onChange={(e) =>
                          setEditBioForm({ ...editBioForm, twitter: e.target.value })
                        }
                        className="px-3 py-2 rounded-xl bg-white/4 border border-white/10 text-xs text-white outline-none"
                      />
                      <input
                        placeholder="GitHub handle"
                        value={editBioForm.github || ""}
                        onChange={(e) =>
                          setEditBioForm({ ...editBioForm, github: e.target.value })
                        }
                        className="px-3 py-2 rounded-xl bg-white/4 border border-white/10 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="Telegram handle"
                        value={editBioForm.telegram || ""}
                        onChange={(e) =>
                          setEditBioForm({ ...editBioForm, telegram: e.target.value })
                        }
                        className="px-3 py-2 rounded-xl bg-white/4 border border-white/10 text-xs text-white outline-none"
                      />
                      <input
                        placeholder="Website URL"
                        value={editBioForm.website || ""}
                        onChange={(e) =>
                          setEditBioForm({ ...editBioForm, website: e.target.value })
                        }
                        className="px-3 py-2 rounded-xl bg-white/4 border border-white/10 text-xs text-white outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSaveBio}
                      className="mt-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      Save Profile Bio
                    </button>
                  </div>
                )}

                {/* Transfer Handle Action */}
                <button
                  onClick={() => setTransferOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-white/4 hover:bg-white/8 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <ArrowRightLeft size={14} className="text-amber-400" />
                  Transfer Handle Ownership
                </button>
              </Card>
            )}

            {/* On-Chain Record Info */}
            <Card className="p-4 flex flex-col gap-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Registry Details
              </div>
              <div className="divide-y divide-white/6 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Handle</span>
                  <span className="font-bold text-white">@{data.handle}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Owner Public Key</span>
                  <span className="font-mono text-indigo-300">{shortAddr}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Network</span>
                  <span className="font-semibold text-emerald-400">Solana Devnet</span>
                </div>
              </div>
              <a
                href={`https://explorer.solana.com/address/${data.owner}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold pt-1"
              >
                View Owner on Solana Explorer <ExternalLink size={12} />
              </a>
            </Card>
          </>
        )}
      </div>

      {/* QR Code Modal */}
      {data && (
        <QRCodeModal
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          title={`@${data.handle}`}
          subtitle="Scan to send SOL / SPL tokens directly"
          value={typeof window !== "undefined" ? window.location.href : ""}
          handle={data.handle}
        />
      )}

      {/* Transfer Handle Modal */}
      {transferOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setTransferOpen(false)}
        >
          <div
            className="relative max-w-sm w-full bg-[#111827] border border-amber-500/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setTransferOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ArrowRightLeft size={18} />
              </div>
              <h3 className="text-base font-black text-white">Transfer @{handle}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Transfer ownership to another Solana wallet address. This action is irreversible.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1.5">
                New Owner Solana Address
              </label>
              <input
                value={newOwnerAddress}
                onChange={(e) => setNewOwnerAddress(e.target.value)}
                placeholder="New wallet public key (base58)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/4 border border-white/10 text-xs font-mono text-white outline-none focus:border-amber-400/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => setTransferOpen(false)}
                className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferHandle}
                disabled={transferring || !newOwnerAddress}
                className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {transferring ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stepper modal */}
      <TransactionStepperModal
        isOpen={stepperOpen}
        stage={stepperStage}
        txTitle="Transferring Handle"
        txSubtitle={`Transferring @${handle} to new owner...`}
      />
    </div>
  );
}

