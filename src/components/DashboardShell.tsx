"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FileSignature,
  LayoutDashboard,
  Inbox,
  Users,
  Wallet,
  Images,
  BarChart3,
  Settings,
  ExternalLink,
  RotateCcw,
  Menu,
  X,
  Gavel,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useCarrizo } from "@/lib/store";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/solicitudes", label: "Solicitudes", icon: Inbox },
  { href: "/dashboard/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/caja", label: "Caja", icon: Wallet },
  { href: "/dashboard/consentimientos", label: "Consentimientos", icon: FileSignature },
  { href: "/dashboard/portafolio", label: "Portafolio", icon: Images },
  { href: "/dashboard/subastas", label: "Subastas", icon: Gavel },
  { href: "/dashboard/sala-admin", label: "Sala admin", icon: Eye },
  { href: "/dashboard/verificaciones", label: "Verificaciones", icon: ShieldCheck },
  { href: "/dashboard/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const studio = useCarrizo((s) => s.studio);
  const appointments = useCarrizo((s) => s.appointments);
  const users = useCarrizo((s) => s.users);
  const resetDemo = useCarrizo((s) => s.resetDemo);
  const [open, setOpen] = useState(false);

  const pending = appointments.filter((a) =>
    ["solicitud", "cotizado", "seña_pendiente"].includes(a.status),
  ).length;
  const pendingVerifications = users.filter(
    (user) => user.verificationStatus === "en_revision",
  ).length;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 border-r border-[var(--border)] bg-[#0c0c0f] p-5 transition-transform lg:static lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="mb-8 flex items-center justify-between">
            <BrandLogo href="/" showTagline variant="compact" size={40} />
            <button
              className="rounded-lg p-2 text-[var(--text-muted)] lg:hidden"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <nav className="space-y-1">
            {nav.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-[#f9731622] text-[var(--accent-glow)]"
                      : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={17} />
                    {item.label}
                  </span>
                  {item.href === "/dashboard/solicitudes" && pending > 0 ? (
                    <span className="rounded-full bg-[#f97316] px-2 py-0.5 text-[10px] font-bold text-white">
                      {pending}
                    </span>
                  ) : null}
                  {item.href === "/dashboard/verificaciones" &&
                  pendingVerifications > 0 ? (
                    <span className="rounded-full bg-[#fbbf24] px-2 py-0.5 text-[10px] font-bold text-black">
                      {pendingVerifications}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 space-y-2 border-t border-[var(--border)] pt-5">
            <Link
              href={`/estudio/${studio.slug}`}
              className="btn-secondary flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm"
            >
              <ExternalLink size={15} />
              Página pública
            </Link>
            <button
              onClick={resetDemo}
              className="flex w-full items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm text-[var(--text-dim)] hover:bg-white/5 hover:text-[var(--text-muted)]"
            >
              <RotateCcw size={15} />
              Reset demo
            </button>
          </div>
        </aside>

        {open ? (
          <button
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[#070708cc] px-4 py-3 backdrop-blur-xl lg:px-8">
            <button
              className="rounded-lg p-2 text-[var(--text-muted)] lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="hidden lg:block">
              <p className="text-sm text-[var(--text-muted)]">Panel del estudio</p>
              <p className="font-medium">{studio.city} · {studio.instagram}</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="badge badge-green">Demo en vivo</span>
              <div className="relative h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-[#d4a853] to-[#9a6b1f] text-sm font-bold text-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={studio.avatarUrl}
                  alt={studio.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
