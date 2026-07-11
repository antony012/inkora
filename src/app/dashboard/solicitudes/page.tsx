"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Sparkles, Wallet } from "lucide-react";
import {
  formatMoney,
  sessionHoursLabel,
  sessionPackageLabel,
  styleLabel,
} from "@/lib/quote-engine";
import { useCarrizo } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";

export default function SolicitudesPage() {
  const appointments = useCarrizo((s) => s.appointments);
  const clients = useCarrizo((s) => s.clients);
  const artists = useCarrizo((s) => s.artists);
  const approveQuote = useCarrizo((s) => s.approveQuote);
  const markDepositPaid = useCarrizo((s) => s.markDepositPaid);
  const updateAppointmentStatus = useCarrizo((s) => s.updateAppointmentStatus);

  const pipeline = appointments
    .filter((a) =>
      ["solicitud", "cotizado", "seña_pendiente"].includes(a.status),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Solicitudes</h1>
        <p className="mt-1 text-[var(--text-muted)]">
          Del DM caótico al pipeline profesional: cotizá, cobrá seña y confirmá.
        </p>
      </div>

      <div className="space-y-4">
        {pipeline.length === 0 ? (
          <div className="card p-8 text-center text-[var(--text-muted)]">
            No hay solicitudes pendientes.{" "}
            <Link
              href="/estudio/nueva-temporada/reservar"
              className="text-[#fb7185] hover:underline"
            >
              Crear una desde la página pública
            </Link>
          </div>
        ) : (
          pipeline.map((apt) => {
            const client = clients.find((c) => c.id === apt.clientId);
            const artist = artists.find((a) => a.id === apt.artistId);
            return (
              <article key={apt.id} className="card p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-medium">{client?.name}</h2>
                      <StatusBadge status={apt.status} />
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                      {apt.sessionPackage
                        ? `${sessionPackageLabel(apt.sessionPackage)} · `
                        : ""}
                      {styleLabel(apt.style)} · {apt.zone} · {apt.size} ·{" "}
                      {artist?.name}
                    </p>
                    <p className="max-w-2xl text-sm leading-relaxed">
                      {apt.description}
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm text-[var(--text-dim)]">
                      <span>{client?.email}</span>
                      <span>{client?.phone}</span>
                      {apt.budget ? (
                        <span>Presupuesto: {formatMoney(apt.budget)}</span>
                      ) : null}
                    </div>
                    {apt.references[0] ? (
                      <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[#0d0d10] p-2">
                        <p className="mb-2 text-xs uppercase tracking-wide text-[var(--text-dim)]">
                          Referencia visual
                        </p>
                        <div className="relative h-40 w-full max-w-xs overflow-hidden rounded-lg">
                          {apt.references[0].startsWith("data:") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={apt.references[0]}
                              alt={`Referencia de ${client?.name ?? "cliente"}`}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Image
                              src={apt.references[0]}
                              alt={`Referencia de ${client?.name ?? "cliente"}`}
                              fill
                              className="object-contain"
                            />
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-[220px] rounded-xl border border-[var(--border)] bg-[#0d0d10] p-4">
                    <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">
                      Cotización Carrizo
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-[#d4a853]">
                      {formatMoney(apt.quotedPrice)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {apt.sessionPackage
                        ? `${sessionHoursLabel(apt.sessionPackage)} · `
                        : `${apt.estimatedHours}h estimadas · `}
                      Seña {formatMoney(apt.depositAmount)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {apt.status === "solicitud" ? (
                    <>
                      <button
                        onClick={() =>
                          updateAppointmentStatus(apt.id, "cotizado")
                        }
                        className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        <Sparkles size={15} />
                        Marcar cotizado
                      </button>
                      <button
                        onClick={() => approveQuote(apt.id)}
                        className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        <CheckCircle2 size={15} />
                        Aprobar y pedir seña
                      </button>
                    </>
                  ) : null}

                  {apt.status === "cotizado" ? (
                    <button
                      onClick={() => approveQuote(apt.id)}
                      className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                    >
                      <CheckCircle2 size={15} />
                      Enviar seña al cliente
                    </button>
                  ) : null}

                  {apt.status === "seña_pendiente" ? (
                    <button
                      onClick={() => markDepositPaid(apt.id)}
                      className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                    >
                      <Wallet size={15} />
                      Registrar seña pagada
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
