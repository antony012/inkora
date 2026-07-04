"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { formatMoney } from "@/lib/quote-engine";
import { useInkora } from "@/lib/store";

export default function CajaPage() {
  const payments = useInkora((s) => s.payments);
  const clients = useInkora((s) => s.clients);
  const artists = useInkora((s) => s.artists);

  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const byType = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + p.amount;
    return acc;
  }, {});

  const commissions = artists.map((artist) => {
    const artistPayments = payments.filter((p) => p.artistId === artist.id);
    const revenue = artistPayments.reduce((sum, p) => sum + p.amount, 0);
    const artistShare = Math.round((revenue * artist.commissionPercent) / 100);
    const studioShare = revenue - artistShare;
    return { artist, revenue, artistShare, studioShare };
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Caja</h1>
        <p className="mt-1 text-[var(--text-muted)]">
          Señas, saldos, propinas y split automático de comisiones.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm text-[var(--text-muted)]">Total registrado</p>
          <p className="mt-2 text-2xl font-semibold text-[#d4a853]">
            {formatMoney(total)}
          </p>
        </div>
        {(["seña", "saldo", "propina"] as const).map((type) => (
          <div key={type} className="card p-5">
            <p className="text-sm capitalize text-[var(--text-muted)]">{type}s</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatMoney(byType[type] ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-medium">Comisiones por artista</h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {commissions.map(({ artist, revenue, artistShare, studioShare }) => (
            <div
              key={artist.id}
              className="grid gap-3 px-5 py-4 sm:grid-cols-4 sm:items-center"
            >
              <div>
                <p className="font-medium">{artist.name}</p>
                <p className="text-xs text-[var(--text-dim)]">
                  {artist.commissionPercent}% artista
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-dim)]">Facturado</p>
                <p>{formatMoney(revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-dim)]">Artista</p>
                <p className="text-[#6ee7b7]">{formatMoney(artistShare)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-dim)]">Estudio</p>
                <p className="text-[#fb7185]">{formatMoney(studioShare)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-medium">Movimientos</h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {payments.map((payment) => {
            const client = clients.find((c) => c.id === payment.clientId);
            const artist = artists.find((a) => a.id === payment.artistId);
            return (
              <div
                key={payment.id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium capitalize">
                    {payment.type} · {client?.name}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {artist?.name} · {payment.method} ·{" "}
                    {format(parseISO(payment.createdAt), "d MMM yyyy HH:mm", {
                      locale: es,
                    })}
                  </p>
                </div>
                <p className="font-semibold text-[#d4a853]">
                  {formatMoney(payment.amount)}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
