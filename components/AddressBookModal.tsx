"use client";

import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { lookupHandleCached } from "@/lib/dpi-cache";
import { triggerHaptic } from "@/lib/haptics";
import RecipientAvatar from "./RecipientAvatar";
import {
  Contact,
  getSavedContacts,
  saveContact,
  deleteContact,
} from "@/lib/contacts";
import {
  X,
  BookUser,
  Plus,
  Search,
  Trash2,
  Check,
  UserCheck,
  Loader,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface AddressBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact: (recipient: string) => void;
}

export default function AddressBookModal({
  isOpen,
  onClose,
  onSelectContact,
}: AddressBookModalProps) {
  const { connection } = useConnection();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // New contact form state
  const [newLabel, setNewLabel] = useState("");
  const [newIdentifier, setNewIdentifier] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [formError, setFormError] = useState("");

  const refreshContacts = () => {
    setContacts(getSavedContacts());
  };

  useEffect(() => {
    if (isOpen) {
      refreshContacts();
      setIsAdding(false);
      setFormError("");
      setNewLabel("");
      setNewIdentifier("");
      setResolvedAddress(null);
    }
  }, [isOpen]);

  const handleIdentifierChange = async (val: string) => {
    setNewIdentifier(val);
    setFormError("");
    setResolvedAddress(null);

    const trimmed = val.trim();
    if (!trimmed) return;

    // Check if raw Solana address
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed) && !trimmed.startsWith("@")) {
      try {
        new PublicKey(trimmed);
        setResolvedAddress(trimmed);
      } catch {
        setFormError("Invalid Solana address format");
      }
      return;
    }

    // Check if handle
    const handle = trimmed.replace(/^@/, "").toLowerCase();
    if (handle.length < 3) return;

    setResolving(true);
    try {
      const info = await lookupHandleCached(connection, handle);
      if (info) {
        setResolvedAddress(info.owner);
      } else {
        setFormError(`@${handle} not found on-chain`);
      }
    } catch {
      setFormError("Failed to lookup handle");
    } finally {
      setResolving(false);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) {
      setFormError("Please enter a name or label");
      return;
    }
    if (!resolvedAddress) {
      setFormError("Valid recipient address or registered @handle required");
      return;
    }

    triggerHaptic("success");
    const isHandle = newIdentifier.startsWith("@") || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(newIdentifier);
    saveContact({
      label: newLabel.trim(),
      address: resolvedAddress,
      handle: isHandle ? newIdentifier.replace(/^@/, "").toLowerCase() : undefined,
    });

    refreshContacts();
    setIsAdding(false);
    setNewLabel("");
    setNewIdentifier("");
    setResolvedAddress(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic("warning");
    deleteContact(id);
    refreshContacts();
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.handle && c.handle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-[#0d1222] border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <BookUser size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Address Book</h2>
              <p className="text-[11px] text-slate-400">Save and quickly send to trusted contacts</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic("tap");
              onClose();
            }}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {!isAdding ? (
            <>
              {/* Search & Add Bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, handle, or address..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-400 transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("tap");
                    setIsAdding(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shrink-0 shadow-sm cursor-pointer"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>

              {/* Contacts List */}
              {contacts.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl bg-white/2 border border-dashed border-white/10">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                    <BookUser size={22} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">No contacts saved yet</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
                    Save frequent recipients with custom nicknames or @handles for instant transfers.
                  </p>
                  <button
                    onClick={() => setIsAdding(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus size={14} /> Add First Contact
                  </button>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No contacts matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => {
                        triggerHaptic("selection");
                        onSelectContact(contact.handle ? `@${contact.handle}` : contact.address);
                        onClose();
                      }}
                      className="group flex items-center justify-between p-3 rounded-2xl bg-white/4 hover:bg-indigo-950/40 border border-white/10 hover:border-indigo-400/40 transition-all cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <RecipientAvatar
                          address={contact.address}
                          handle={contact.handle ? `@${contact.handle}` : undefined}
                          size={38}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                            {contact.label}
                            {contact.handle && (
                              <span className="text-[11px] font-bold text-indigo-300 font-mono">
                                @{contact.handle}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate">
                            {contact.address.slice(0, 8)}...{contact.address.slice(-6)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(contact.id, e)}
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete contact"
                          aria-label={`Delete ${contact.label}`}
                        >
                          <Trash2 size={15} />
                        </button>
                        <span className="text-[11px] font-bold text-indigo-400 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                          Select
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Add Contact Form */
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Contact Name / Nickname
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Alice, Coffee Shop, Mom"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400 transition-colors font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  @Handle or Solana Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newIdentifier}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    placeholder="@handle or 32-44 character address"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400 transition-colors font-mono"
                  />
                  {resolving && (
                    <Loader size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-indigo-400" />
                  )}
                  {resolvedAddress && !resolving && (
                    <Check size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400" />
                  )}
                </div>
                {resolvedAddress && (
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center gap-2">
                    <RecipientAvatar address={resolvedAddress} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="text-emerald-300 font-bold">Resolved Address</div>
                      <div className="text-slate-300 font-mono text-[10px] truncate">{resolvedAddress}</div>
                    </div>
                  </div>
                )}
                {formError && (
                  <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertCircle size={13} />
                    {formError}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newLabel.trim() || !resolvedAddress}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                    newLabel.trim() && resolvedAddress
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25"
                      : "bg-white/5 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <UserCheck size={14} />
                  Save Contact
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
