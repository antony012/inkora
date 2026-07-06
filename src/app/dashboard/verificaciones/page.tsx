"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useCarrizo } from "@/lib/store";
import {
  verificationBadge,
  verificationLabel,
} from "@/lib/verification";
import type { VerificationStatus } from "@/lib/types";

const filters: Array<VerificationStatus | "todos"> = [
  "todos",
  "en_revision",
  "verificado",
  "rechazado",
  "pendiente_documento",
];

export default function VerificacionesPage() {
  const users = useCarrizo((s) => s.users);
  const reviewVerification = useCarrizo((s) => s.reviewVerification);
  const [filter, setFilter] = useState<VerificationStatus | "todos">("en_revision");
  const [note, setNote] = useState("Documento ilegible o datos no coinciden.");

  const pendingCount = users.filter((u) => u.verificationStatus === "en_revision").length;

  const list = useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
    });
    if (filter === "todos") return sorted;
    return sorted.filter((user) => user.verificationStatus === filter);
  }, [users, filter]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Verificación de identidad
          </h1>
          <p className="mt-1 text-[var(--text-muted)]">
            Filtro del equipo para validar documentos antes de habilitar pujas.
          </p>
        </div>
        <span className="badge badge-amber">
          <ShieldCheck size={12} /> {pendingCount} en revisión
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={
              filter === item
                ? "btn-primary px-3 py-1.5 text-xs"
                : "btn-secondary px-3 py-1.5 text-xs"
            }
          >
            {item === "todos" ? "Todos" : verificationLabel(item)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {list.length === 0 ? (
          <div className="card p-8 text-center text-[var(--text-muted)]">
            No hay usuarios en este filtro.
          </div>
        ) : (
          list.map((user) => (
            <article key={user.id} className="card grid gap-4 p-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-medium">{user.name}</h2>
                  <span className={`badge ${verificationBadge(user.verificationStatus)}`}>
                    {verificationLabel(user.verificationStatus)}
                  </span>
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  {[
                    ["Email", user.email],
                    ["WhatsApp", user.phone],
                    ["RUT / ID", user.rut],
                    ["Documento", user.documentType],
                    ["Archivo", user.documentFileName || "Sin archivo"],
                    [
                      "Enviado",
                      user.submittedAt
                        ? new Date(user.submittedAt).toLocaleString("es-CL")
                        : "—",
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 border-b border-[var(--border)] pb-2">
                      <dt className="text-[var(--text-dim)]">{label}</dt>
                      <dd className="text-right font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>

                {user.verificationStatus === "en_revision" ||
                user.verificationStatus === "rechazado" ? (
                  <div className="mt-4 space-y-2">
                    <label className="label">Nota de revisión</label>
                    <input
                      className="input"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          reviewVerification({
                            userId: user.id,
                            status: "verificado",
                            reviewNote: "Identidad validada por el equipo.",
                          })
                        }
                        className="btn-primary px-4 py-2 text-sm"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() =>
                          reviewVerification({
                            userId: user.id,
                            status: "rechazado",
                            reviewNote: note,
                          })
                        }
                        className="btn-secondary px-4 py-2 text-sm"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-3">
                {user.documentDataUrl ? (
                  <div className="relative h-72 overflow-hidden rounded-xl">
                    {user.documentDataUrl.startsWith("data:") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.documentDataUrl}
                        alt={`Documento de ${user.name}`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Image
                        src={user.documentDataUrl}
                        alt={`Documento de ${user.name}`}
                        fill
                        className="object-contain"
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex h-72 items-center justify-center text-sm text-[var(--text-dim)]">
                    Sin documento cargado
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
