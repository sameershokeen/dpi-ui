import { ReactNode, CSSProperties } from "react";

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  className?: string;
}

export default function Card({ children, style, onClick, className }: CardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: "var(--bg-elevated)",
        borderRadius: 16,
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        cursor: onClick ? "pointer" : undefined,
        transition: onClick ? "box-shadow 0.15s, transform 0.15s" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
