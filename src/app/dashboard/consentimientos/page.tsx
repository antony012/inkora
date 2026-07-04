"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { FileSignature, Link2 } from "lucide-react";
import { useInkora } from "@/lib/store";

export default function ConsentimientosPage() {
  const consents = useInkora((s) => s.consents);
  const appointments = useInkora((s) => s.appointments);
  const clients = useInkora((s) => s.clients);
  const createConsentForAppointment = useInkora(
    (s) => s.createConsentForAppointment,
  );

  const pendingApts = appointments.filter(
    (a) =>
      ["confirmado", "en_curso", "seña_pendiente"].includes(a.status) &&
      !a.consentSigned,
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Consentimientos
        </h1>
        <p className="mt-1 text-[var(--text-muted)]">
          Firmas digitales con fecha, hora y declaración de salud.
        </p>
      </div>

      {pendingApts.length > 0 ? (
        <section className="card p-5">
          <h2 className="mb-4 font-medium">Pendientes de firma</h2>
          <div className="space-y-3">
            {pendingApts.map((apt) => {
              const client = clients.find((c) => c.id === apt.clientId);
              return (
                <div
                  key={apt.id}
                  className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[#0d0d10] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {client?.name} · {apt.title}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Turno{" "}
                      {format(parseISO(apt.startAt), "d MMM HH:mm", {
                        locale: es,
                      })}
                    </p>
                  </div>
                  {apt.consentId ? (
                    <Link
                      href={`/consentimiento/${apt.consentId}`}
                      className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                    >
                      <Link2 size={15} />
                      Abrir link de firma
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        const id = createConsentForAppointment(apt.id);
                        if (id) window.location.href = `/consentimiento/${id}`;
                      }}
                      className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                    >
                      <Link2 size={15} />
                      Generar link de firma
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="card overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-medium">Historial legal</h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {consents.map((consent) => (
            <div
              key={consent.id}
              className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[#e11d4822] p-2 text-[#fb7185]">
                  <FileSignature size={16} />
                </div>
                <div>
                  <p className="font-medium">{consent.clientName}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {consent.healthDeclaration || "Sin declaración"}
                  </p>
                </div>
              </div>
              <div className="text-sm">
                {consent.signedAt ? (
                  <span className="badge badge-green">
                    Firmado{" "}
                    {format(parseISO(consent.signedAt), "d MMM yyyy HH:mm", {
                      locale: es,
                    })}
                  </span>
                ) : (
                  <Link
                    href={`/consentimiento/${consent.id}`}
                    className="badge badge-amber"
                  >
                    Pendiente · firmar
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
