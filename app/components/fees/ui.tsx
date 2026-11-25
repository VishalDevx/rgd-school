import type { ReactNode } from "react";
import { AlertCircle, Ban, CheckCircle2, Clock, CalendarClock } from "lucide-react";
import { formatINR } from "@/lib/fees/calc";
import { cn } from "@/app/lib/utils";

// ------------------------------------------------------------------ formatting

/** ₹ with Indian digit grouping. */
export function inr(value: number | null | undefined): string {
  return `₹${formatINR(Number(value ?? 0))}`;
}

export function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export const PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online" },
] as const;

export function modeLabel(mode: string | null | undefined): string {
  return PAYMENT_MODES.find((m) => m.value === mode)?.label ?? mode ?? "—";
}

/** Download rows as a CSV file (client side). */
export function downloadCsv(filename: string, rows: Array<Record<string, string | number | null | undefined>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ------------------------------------------------------------------ badges

type BadgeKind = "PAID" | "PARTIAL" | "PENDING" | "OVERDUE" | "VOID";

const BADGE: Record<BadgeKind, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  PAID: { label: "Paid", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", Icon: CheckCircle2 },
  PARTIAL: { label: "Partial", className: "bg-amber-50 text-amber-700 ring-amber-600/20", Icon: Clock },
  PENDING: { label: "Pending", className: "bg-slate-100 text-slate-700 ring-slate-500/20", Icon: AlertCircle },
  OVERDUE: { label: "Overdue", className: "bg-red-50 text-red-700 ring-red-600/20", Icon: CalendarClock },
  VOID: { label: "Void", className: "bg-gray-100 text-gray-500 ring-gray-400/30 line-through", Icon: Ban },
};

export function FeeStatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = BADGE[status as BadgeKind] ?? BADGE.PENDING;
  const { Icon } = cfg;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        cfg.className,
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {cfg.label}
    </span>
  );
}

// ------------------------------------------------------------------ layout pieces

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const TONES = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  slate: "bg-slate-100 text-slate-600",
} as const;

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {icon ? <span className={cn("rounded-lg p-2", TONES[tone])}>{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

/** Thin progress bar for paid / payable. */
export function PaidBar({ paid, payable, className }: { paid: number; payable: number; className?: string }) {
  const pct = payable > 0 ? Math.min(100, Math.round((paid / payable) * 100)) : 100;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-gray-100", className)} aria-label={`${pct}% paid`}>
      <div
        className={cn("h-full rounded-full", pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-blue-500" : "bg-gray-300")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? <div className="mb-3 text-gray-300">{icon}</div> : null}
      <p className="font-medium text-gray-900">{title}</p>
      {children ? <div className="mt-1 max-w-sm text-sm text-gray-500">{children}</div> : null}
    </div>
  );
}
