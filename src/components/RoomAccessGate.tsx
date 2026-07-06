"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useSessionUser } from "@/hooks/useSessionUser";
import {
  auctionAccessMessage,
  canEnterAuctionRoom,
} from "@/lib/user-access";
import {
  verificationBadge,
  verificationLabel,
} from "@/lib/verification";

type RoomAccessGateProps = {
  roomName: string;
  children: React.ReactNode;
};

export function RoomAccessGate({ roomName, children }: RoomAccessGateProps) {
  const { hydrated, sessionUser } = useSessionUser();

  if (!hydrated) {
    return (
      <div className="card flex min-h-[320px] items-center justify-center p-8 text-[var(--text-muted)]">
        Cargando acceso a la sala...
      </div>
    );
  }

  if (canEnterAuctionRoom(sessionUser)) {
    return <>{children}</>;
  }

  const access = auctionAccessMessage(sessionUser);

  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[#0d0d10]">
        <ShieldCheck size={28} className="text-[var(--accent-glow)]" />
      </div>
      <span className="badge badge-rose mb-3">Sala protegida</span>
      <h2 className="text-xl font-semibold">Acceso a {roomName}</h2>
      <p className="mt-2 font-medium">{access.title}</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
        {access.detail}
      </p>

      {sessionUser ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-[var(--text-dim)]">
            {sessionUser.name}
          </span>
          <span
            className={`badge ${verificationBadge(sessionUser.verificationStatus)}`}
          >
            {verificationLabel(sessionUser.verificationStatus)}
          </span>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {!sessionUser ? (
          <Link href="/acceso" className="btn-primary px-5 py-2.5 text-sm">
            Iniciar sesión
          </Link>
        ) : (
          <Link href="/acceso" className="btn-primary px-5 py-2.5 text-sm">
            {sessionUser.verificationStatus === "pendiente_documento" ||
            sessionUser.verificationStatus === "rechazado"
              ? "Subir documento"
              : "Ver estado en Acceso"}
          </Link>
        )}
      </div>
    </div>
  );
}
