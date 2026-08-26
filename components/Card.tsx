import { ReactNode, CSSProperties } from "react";

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  className?: string;
  glow?: boolean;
}

export default function Card({
  children,
  style,
  onClick,
  className = "",
  glow = false,
}: CardProps) {
  return (
    <div
      className={`relative rounded-2xl border transition-all duration-200 ${
        glow
          ? "bg-[#111827]/85 border-indigo-400/50 shadow-[0_0_25px_rgba(99,102,241,0.25)]"
          : "bg-[#111827]/70 border-white/16 hover:border-white/28 shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
      } backdrop-blur-2xl ${
        onClick ? "cursor-pointer active:scale-[0.985] active:bg-[#1A233A]/90" : ""
      } ${className}`}
      onClick={onClick}
      style={{
        ...style,
      }}
    >
      {children}
    </div>
  );
}
