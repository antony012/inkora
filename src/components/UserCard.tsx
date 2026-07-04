"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Gavel,
  LogOut,
  Settings2,
  Sparkles,
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { useSessionUser } from "@/hooks/useSessionUser";
import { useInkora } from "@/lib/store";
import { userAccessMessage } from "@/lib/user-access";
import { cn } from "@/lib/utils";
import {
  verificationBadge,
  verificationLabel,
} from "@/lib/verification";

export function UserCard({
  showAccessLink = true,
  compact = false,
}: {
  showAccessLink?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const studio = useInkora((s) => s.studio);
  const logoutUser = useInkora((s) => s.logoutUser);
  const { hydrated, sessionUser } = useSessionUser();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!hydrated) {
    return (
      <div className="h-10 w-28 animate-pulse rounded-2xl bg-[#141418]" />
    );
  }

  if (!sessionUser) {
    return showAccessLink ? (
      <Link href="/acceso" className="btn-secondary px-3 py-2 text-xs">
        Iniciar sesión
      </Link>
    ) : null;
  }

  const access = userAccessMessage(sessionUser);

  const handleLogout = () => {
    logoutUser();
    setOpen(false);
    router.push("/acceso");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[#0d0d10] text-left transition hover:border-[var(--border-strong)]",
          compact ? "px-2.5 py-1.5" : "px-3 py-2",
        )}
      >
        <UserAvatar
          name={sessionUser.name}
          profilePhotoUrl={sessionUser.profilePhotoUrl}
          verificationStatus={sessionUser.verificationStatus}
          size="sm"
          showOnlineDot
        />

        {!compact ? (
          <div className="min-w-0 pr-1">
            <p className="truncate text-sm font-medium text-white">
              {sessionUser.name}
            </p>
            <p className="truncate text-[11px] text-[var(--text-dim)]">
              {verificationLabel(sessionUser.verificationStatus)}
            </p>
          </div>
        ) : null}

        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-[var(--text-dim)] transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[var(--border)] bg-[#0c0c0f] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
        >
          <div className="border-b border-[var(--border)] bg-gradient-to-br from-[#141418] to-[#0c0c0f] p-4">
            <div className="flex items-start gap-3">
              <UserAvatar
                name={sessionUser.name}
                profilePhotoUrl={sessionUser.profilePhotoUrl}
                verificationStatus={sessionUser.verificationStatus}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">
                  {sessionUser.name}
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {sessionUser.email}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--text-dim)]">
                  {sessionUser.phone}
                </p>
                <span
                  className={cn(
                    "badge mt-2",
                    verificationBadge(sessionUser.verificationStatus),
                  )}
                >
                  {verificationLabel(sessionUser.verificationStatus)}
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
              {access.detail}
            </p>
            <Link
              href="/acceso"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex text-xs text-[var(--accent-glow)] hover:underline"
            >
              Editar foto de perfil
            </Link>
          </div>

          <div className="space-y-1 p-2">
            <Link
              href="/acceso"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-muted)] transition hover:bg-[#141418] hover:text-white"
            >
              <Settings2 size={16} />
              Mi cuenta y verificación
            </Link>
            <Link
              href={`/estudio/${studio.slug}/subasta`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-muted)] transition hover:bg-[#141418] hover:text-white"
            >
              <Gavel size={16} />
              Subasta en vivo
            </Link>
            <Link
              href={`/estudio/${studio.slug}/reservar`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-muted)] transition hover:bg-[#141418] hover:text-white"
            >
              <Sparkles size={16} />
              Reservar turno
            </Link>
          </div>

          <div className="border-t border-[var(--border)] p-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#fb7185] transition hover:bg-[#fb718514]"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
