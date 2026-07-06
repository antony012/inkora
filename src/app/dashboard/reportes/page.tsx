"use client";

import { formatMoney } from "@/lib/quote-engine";
import { useCarrizo } from "@/lib/store";

export default function ReportesPage() {
  const appointments = useCarrizo((s) => s.appointments);
  const payments = useCarrizo((s) => s.payments);
  const artists = useCarrizo((s) => s.artists);
  const clients = useCarrizo((s) => s.clients);

  const completed = appointments.filter((a) => a.status === "completado").length;
  const cancelled = appointments.filter((a) =>
    ["cancelado", "no_show"].includes(a.status),
  ).length;
  const requests = appointments.filter((a) => a.status === "solicitud").length;
  const confirmed = appointments.filter((a) =>
    ["confirmado", "en_curso", "completado"].includes(a.status),
  ).length;
  const conversion =
    appointments.length === 0
      ? 0
      : Math.round((confirmed / appointments.length) * 100);

  const revenueByArtist = artists.map((artist) => {
    const amount = payments
      .filter((p) => p.artistId === artist.id)
      .reduce((sum, p) => sum + p.amount, 0);
    return { artist, amount };
  });
  const maxRevenue = Math.max(...revenueByArtist.map((r) => r.amount), 1);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        <p className="mt-1 text-[var(--text-muted)]">
          Métricas accionables: conversión, ingresos y rendimiento del equipo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Conversión", `${conversion}%`],
          ["Completados", String(completed)],
          ["Cancelados / no-show", String(cancelled)],
          ["Clientes activos", String(clients.length)],
        ].map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-sm text-[var(--text-muted)]">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-medium">Ingresos por artista</h2>
          <div className="space-y-4">
            {revenueByArtist.map(({ artist, amount }) => (
              <div key={artist.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{artist.name}</span>
                  <span className="text-[#d4a853]">{formatMoney(amount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#1c1c22]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#e11d48] to-[#d4a853]"
                    style={{ width: `${(amount / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-medium">Embudo de reservas</h2>
          <div className="space-y-3">
            {[
              ["Solicitudes abiertas", requests],
              ["Confirmados / en curso / hechos", confirmed],
              ["Completados", completed],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[#0d0d10] px-4 py-3"
              >
                <span className="text-sm text-[var(--text-muted)]">{label}</span>
                <span className="text-lg font-semibold">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-[var(--text-dim)]">
            Insight: cobrar seña antes de bloquear agenda es el mayor reductor de
            no-shows. Carrizo lo hace nativo.
          </p>
        </section>
      </div>
    </div>
  );
}
