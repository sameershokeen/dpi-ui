"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, AtSign, Send, Users, User } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/handle", icon: AtSign, label: "Handles" },
  { href: "/send", icon: Send, label: "Send" },
  { href: "/community", icon: Users, label: "Community" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  const activeIndex = navItems.findIndex(
    ({ href }) => pathname === href || (href !== "/" && pathname.startsWith(href))
  );
  const validIndex = activeIndex === -1 ? 0 : activeIndex;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-120 z-50 px-3 pb-[calc(10px+env(safe-area-inset-bottom,12px))] pt-2 bg-[#0A0E1A]/95 backdrop-blur-2xl border-t border-x border-white/12 shadow-[0_-10px_35px_rgba(0,0,0,0.7)]">
      <div className="relative grid grid-cols-5 items-center">
        {/* FEAT-041: Animated Sliding Pill Indicator */}
        <div
          aria-hidden="true"
          className="absolute top-0.5 bottom-0.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 shadow-[0_0_15px_rgba(99,102,241,0.45)] pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            width: "20%",
            transform: `translateX(${validIndex * 100}%)`,
          }}
        />

        {navItems.map(({ href, icon: Icon, label }, idx) => {
          const active = idx === validIndex;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => triggerHaptic("tap")}
              className={`relative z-10 flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                active
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200 filter grayscale-[0.4] hover:grayscale-0 opacity-70 hover:opacity-100"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-200 ${
                  active ? "scale-110 text-indigo-300" : "scale-100 text-slate-400"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span
                className={`text-[10px] tracking-wide transition-all duration-150 ${
                  active ? "font-bold text-white scale-105" : "font-medium text-slate-400"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
