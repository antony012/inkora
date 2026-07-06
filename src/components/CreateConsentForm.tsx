"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Copy, Link2, Plus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useCarrizo } from "@/lib/store";

type LinkMode = "appointment" | "manual" | "none";

export function CreateConsentForm() {
  const clients = useCarrizo((s) => s.clients);
  const appointments = useCarrizo((s) => s.appointments);
  const createConsent = useCarrizo((s) => s.createConsent);

  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [linkMode, setLinkMode] = useState<LinkMode>("appointment");
  const [appointmentId, setAppointmentId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionAt, setSessionAt] = useState("");
  const [error, setError] = useState("");
  const [createdConsentId, setCreatedConsentId] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedClient = clients.find((client) => client.id === clientId);

  const availableAppointments = useMemo(() => {
    if (!clientId) return [];
    return appointments.filter(
      (apt) =>
        apt.clientId === clientId &&
        !apt.consentSigned &&
        !apt.consentId,
    );
  }, [appointments, clientId]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setCreatedConsentId("");
    setCopied(false);

    if (!selectedClient) {
      setError("Selecciona un cliente.");
      return;
    }

    if (linkMode === "appointment") {
      if (!appointmentId) {
        setError("Selecciona un turno o cambia a sesión manual.");
        return;
      }
    }

    if (linkMode === "manual" && !sessionTitle.trim()) {
      setError("Indica el título de la sesión.");
      return;
    }

    const result = createConsent({
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      appointmentId: linkMode === "appointment" ? appointmentId : undefined,
      sessionTitle: linkMode === "manual" ? sessionTitle : undefined,
      sessionAt:
        linkMode === "manual" && sessionAt
          ? new Date(sessionAt).toISOString()
          : undefined,
    });

    if (!result.ok || !result.consentId) {
      setError(result.error ?? "No se pudo crear el consentimiento.");
      return;
    }

    setCreatedConsentId(result.consentId);
  };

  const createdLink = createdConsentId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/consentimiento/${createdConsentId}`
    : "";

  const copyLink = async () => {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar el enlace.");
    }
  };

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-xl bg-[#34d39922] p-2 text-[#6ee7b7]">
          <Plus size={16} />
        </div>
        <div>
          <h2 className="font-medium">Crear consentimiento</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Genera un link de firma para enviar al cliente por WhatsApp.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">Cliente</label>
          <select
            className="input"
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
              setAppointmentId("");
            }}
            required
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} · {client.phone}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["appointment", "Vincular a turno"],
              ["manual", "Sesión manual"],
              ["none", "Solo consentimiento"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setLinkMode(mode)}
              className={
                linkMode === mode
                  ? "btn-primary px-3 py-2 text-sm"
                  : "btn-secondary px-3 py-2 text-sm"
              }
            >
              {label}
            </button>
          ))}
        </div>

        {linkMode === "appointment" ? (
          <div>
            <label className="label">Turno</label>
            {availableAppointments.length > 0 ? (
              <select
                className="input"
                value={appointmentId}
                onChange={(event) => setAppointmentId(event.target.value)}
                required
              >
                <option value="">Seleccionar turno...</option>
                {availableAppointments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.title} ·{" "}
                    {format(parseISO(apt.startAt), "d MMM yyyy HH:mm", {
                      locale: es,
                    })}
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-xl border border-[var(--border)] bg-[#0d0d10] px-4 py-3 text-sm text-[var(--text-muted)]">
                Este cliente no tiene turnos pendientes de consentimiento. Usa
                sesión manual o crea el consentimiento sin turno.
              </p>
            )}
          </div>
        ) : null}

        {linkMode === "manual" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Título de la sesión</label>
              <input
                className="input"
                value={sessionTitle}
                onChange={(event) => setSessionTitle(event.target.value)}
                placeholder="Ej: Pieza antebrazo"
                required
              />
            </div>
            <div>
              <label className="label">Fecha y hora (opcional)</label>
              <input
                className="input"
                type="datetime-local"
                value={sessionAt}
                onChange={(event) => setSessionAt(event.target.value)}
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-[var(--accent-glow)]">{error}</p>
        ) : null}

        <button type="submit" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5">
          <Link2 size={16} />
          Generar link de firma
        </button>
      </form>

      {createdConsentId ? (
        <div className="mt-5 rounded-2xl border border-[#34d39944] bg-[#34d39914] p-4">
          <p className="text-sm font-medium text-[#6ee7b7]">
            Consentimiento creado para {selectedClient?.name}
          </p>
          <p className="mt-2 break-all text-xs text-[var(--text-muted)]">
            {createdLink}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copiado" : "Copiar link"}
            </button>
            <Link
              href={`/consentimiento/${createdConsentId}`}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Link2 size={15} />
              Abrir firma
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
