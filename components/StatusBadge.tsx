type Status = "success" | "warning" | "danger" | "neutral" | "accent";

interface StatusBadgeProps {
  status: Status;
  children: React.ReactNode;
}

const colors: Record<Status, { bg: string; text: string }> = {
  success: { bg: "var(--success-light)", text: "var(--success)" },
  warning: { bg: "#FFF8EC", text: "var(--warning)" },
  danger: { bg: "#FFEEED", text: "var(--danger)" },
  neutral: { bg: "var(--bg-base)", text: "var(--text-secondary)" },
  accent: { bg: "var(--accent-light)", text: "var(--accent)" },
};

export default function StatusBadge({ status, children }: StatusBadgeProps) {
  const { bg, text } = colors[status];
  return (
    <span
      style={{
        background: bg,
        color: text,
        fontSize: 12,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 99,
      }}
    >
      {children}
    </span>
  );
}
