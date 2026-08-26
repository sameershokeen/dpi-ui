type Status = "success" | "warning" | "danger" | "neutral" | "accent";

interface StatusBadgeProps {
  status: Status;
  children: React.ReactNode;
}

const statusStyles: Record<Status, { bg: string; text: string; border: string }> = {
  success: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  warning: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  danger: {
    bg: "bg-rose-500/15",
    text: "text-rose-400",
    border: "border-rose-500/30",
  },
  neutral: {
    bg: "bg-white/10",
    text: "text-slate-300",
    border: "border-white/10",
  },
  accent: {
    bg: "bg-indigo-500/20",
    text: "text-indigo-300",
    border: "border-indigo-500/30",
  },
};

export default function StatusBadge({ status, children }: StatusBadgeProps) {
  const s = statusStyles[status] || statusStyles.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.bg} ${s.text} ${s.border} backdrop-blur-md`}
    >
      {children}
    </span>
  );
}
