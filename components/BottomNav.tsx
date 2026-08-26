"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, AtSign, Send, Users, User } from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/handle", icon: AtSign, label: "Handles" },
  { href: "/send", icon: Send, label: "Send" },
  { href: "/community", icon: Users, label: "Community" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-120 z-50 px-3 pb-[calc(10px+env(safe-area-inset-bottom,12px))] pt-2 bg-[#0A0E1A]/95 backdrop-blur-2xl border-t border-x border-white/12 shadow-[0_-10px_35px_rgba(0,0,0,0.7)]">
      <div className="flex justify-around items-center">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-150 active:scale-95 ${
                active
                  ? "text-indigo-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  active
                    ? "bg-indigo-500/25 text-indigo-300 shadow-[0_0_18px_rgba(99,102,241,0.4)] border border-indigo-400/40"
                    : "bg-transparent text-slate-400"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span
                className={`text-[10px] tracking-wide ${
                  active ? "font-bold text-white" : "font-medium text-slate-400"
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
