"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatMoney } from "@/lib/quote-engine";
import { useCarrizo } from "@/lib/store";
import { initials } from "@/lib/utils";

export default function ClientesPage() {
  const clients = useCarrizo((s) => s.clients);
  const appointments = useCarrizo((s) => s.appointments);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q),
    );
  }, [clients, query]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-[var(--text-muted)]">
            CRM con historial, alergias y valor de vida del cliente.
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
          />
          <input
            className="input pl-9"
            placeholder="Buscar por nombre, email o teléfono"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((client) => {
          const history = appointments.filter((a) => a.clientId === client.id);
          return (
            <article key={client.id} className="card card-hover p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1c1c22] text-sm font-semibold text-[#d4a853]">
                  {initials(client.name)}
                </div>
                <div className="min-w-0">
                  <h2 className="font-medium">{client.name}</h2>
                  <p className="truncate text-sm text-[var(--text-muted)]">
                    {client.email}
                  </p>
                  <p className="text-sm text-[var(--text-dim)]">{client.phone}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#0d0d10] p-3">
                  <p className="text-xs text-[var(--text-dim)]">Gastado</p>
                  <p className="font-semibold text-[#d4a853]">
                    {formatMoney(client.totalSpent)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#0d0d10] p-3">
                  <p className="text-xs text-[var(--text-dim)]">Visitas</p>
                  <p className="font-semibold">{client.visits}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="text-[var(--text-dim)]">Alergias: </span>
                  {client.allergies || "Sin registrar"}
                </p>
                <p>
                  <span className="text-[var(--text-dim)]">Notas: </span>
                  {client.notes || "—"}
                </p>
                <p className="text-[var(--text-dim)]">
                  {history.length} citas ·{" "}
                  {client.lastVisit
                    ? `Última: ${format(parseISO(client.lastVisit), "d MMM yyyy", { locale: es })}`
                    : "Sin visitas aún"}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
