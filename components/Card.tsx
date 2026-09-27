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
          ? "bg-(--bg-card) border-indigo-500/50 shadow-[0_0_25px_rgba(99,102,241,0.25)]"
          : "bg-(--bg-card) border-(--border) hover:border-(--border-bright) shadow-(--shadow-md)"
      } backdrop-blur-2xl ${
        onClick ? "cursor-pointer active:scale-[0.985] active:bg-(--bg-card-hover)" : ""
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
