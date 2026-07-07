import Image from "next/image";
import { BRAND } from "@/lib/brand";

export function SceneFallback({
  label = "Enderxon Carrizo 3D",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`portfolio-tile relative overflow-hidden rounded-[2rem] border border-[var(--border)] ${
        compact ? "min-h-72" : "min-h-[420px]"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#e85d0418,transparent_42%)]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="logo-float relative h-40 w-40 overflow-hidden rounded-full border border-[var(--border)] bg-[#0a0a0c] shadow-[0_0_60px_#00000088]">
          <Image
            src={BRAND.logo}
            alt={BRAND.name}
            fill
            className="object-cover"
            sizes="160px"
          />
        </div>
      </div>
      <div className="relative z-10 flex h-full min-h-72 items-end p-6">
        <div>
          <span className="badge badge-rose">Cargando 3D</span>
          <p className="mt-3 text-2xl font-semibold">{label}</p>
          <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
            Escena oscura con profundidad sutil.
          </p>
        </div>
      </div>
    </div>
  );
}
