"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Home,
  AtSign,
  Send,
  Users,
  User,
  ExternalLink,
  Coins,
  Shield,
  X,
  Command,
  ArrowRight,
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

interface CommandItem {
  id: string;
  label: string;
  category: "Navigation" | "Action" | "Links";
  icon: typeof Home;
  shortcut?: string;
  action: () => void;
}

export default function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: "nav-home",
        label: "Go to Home",
        category: "Navigation",
        icon: Home,
        shortcut: "⌘1",
        action: () => router.push("/"),
      },
      {
        id: "nav-handle",
        label: "Claim / Lookup @handle",
        category: "Navigation",
        icon: AtSign,
        shortcut: "⌘H",
        action: () => router.push("/handle"),
      },
      {
        id: "nav-send",
        label: "Send SOL & Tokens",
        category: "Navigation",
        icon: Send,
        shortcut: "⌘S",
        action: () => router.push("/send"),
      },
      {
        id: "nav-community",
        label: "Community Directory & Governance",
        category: "Navigation",
        icon: Users,
        shortcut: "⌘C",
        action: () => router.push("/community"),
      },
      {
        id: "nav-profile",
        label: "User Profile & Security",
        category: "Navigation",
        icon: User,
        shortcut: "⌘P",
        action: () => router.push("/profile"),
      },
      {
        id: "act-faucet",
        label: "Open Devnet Faucet (Airdrop)",
        category: "Action",
        icon: Coins,
        action: () => router.push("/send?faucet=true"),
      },
      {
        id: "link-explorer",
        label: "View Verified Contract on Explorer",
        category: "Links",
        icon: ExternalLink,
        action: () =>
          window.open(
            "https://explorer.solana.com/address/CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc?cluster=devnet",
            "_blank"
          ),
      },
      {
        id: "link-docs",
        label: "Protocol Specifications & Architecture",
        category: "Links",
        icon: Shield,
        action: () => router.push("/community"),
      },
    ],
    [router]
  );

  // Filter commands by search query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Global Keyboard Listener (Cmd+K, Cmd+S, Cmd+H, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Palette: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        triggerHaptic("selection");
        return;
      }

      // Quick Nav: Cmd+H
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "h") {
        e.preventDefault();
        router.push("/handle");
        setIsOpen(false);
        return;
      }

      // Quick Nav: Cmd+S
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        router.push("/send");
        setIsOpen(false);
        return;
      }

      // Close on Escape
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      if (!isOpen) return;

      // Navigate results with Arrow keys
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? (filtered.length || 1) - 1 : prev - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        // If query starts with @ or is a handle lookup
        const clean = query.trim().replace(/^@/, "");
        if (filtered.length > 0 && filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          setIsOpen(false);
        } else if (clean) {
          router.push(`/handle?search=${encodeURIComponent(clean)}`);
          setIsOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, query, router]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 px-4"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="relative max-w-lg w-full bg-[#0D1220] border border-indigo-500/30 rounded-3xl shadow-[0_20px_60px_rgba(99,102,241,0.25)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search bar header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-[#080B14]">
          <Search size={18} className="text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search @handle..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-400 border border-white/10">
            ESC
          </span>
        </div>

        {/* Results list */}
        <div className="max-h-72 overflow-y-auto p-2 flex flex-col gap-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center gap-2">
              <AtSign size={24} className="text-indigo-400 animate-pulse" />
              <div className="text-xs text-slate-300 font-medium">
                Search handle{" "}
                <span className="text-indigo-300 font-bold">
                  @{query.replace(/^@/, "")}
                </span>{" "}
                on Solana
              </div>
              <button
                type="button"
                onClick={() => {
                  router.push(`/handle?search=${encodeURIComponent(query.replace(/^@/, ""))}`);
                  setIsOpen(false);
                }}
                className="mt-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Lookup Handle</span>
                <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-white/5 text-indigo-400"
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">
                        {item.label}
                      </div>
                      <div
                        className={`text-[10px] ${
                          isSelected ? "text-indigo-100" : "text-slate-500"
                        }`}
                      >
                        {item.category}
                      </div>
                    </div>
                  </div>

                  {item.shortcut && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-white/5 text-slate-400 border border-white/5"
                      }`}
                    >
                      {item.shortcut}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Keyboard shortcut footer */}
        <div className="px-4 py-2 bg-[#080B14] border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="px-1 rounded bg-white/10 text-slate-400">↑↓</span>{" "}
              navigate
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1 rounded bg-white/10 text-slate-400">↵</span>{" "}
              select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command size={10} /> + K
          </span>
        </div>
      </div>
    </div>
  );
}
