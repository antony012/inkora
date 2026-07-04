import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "rose",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "rose" | "gold" | "green" | "blue";
}) {
  const tones = {
    rose: "text-[var(--accent-glow)] bg-[#f9731622]",
    gold: "text-[var(--gold)] bg-[#facc1522]",
    green: "text-[#6ee7b7] bg-[#34d39922]",
    blue: "text-[#93c5fd] bg-[#60a5fa22]",
  };

  return (
    <div className="card p-5 card-hover">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--text-muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {hint ? (
            <p className="mt-1 text-xs text-[var(--text-dim)]">{hint}</p>
          ) : null}
        </div>
        <div className={`rounded-xl p-2.5 ${tones[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}
