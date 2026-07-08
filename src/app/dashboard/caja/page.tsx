"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { formatMoney } from "@/lib/quote-engine";
import { STUDIO_MARKETPLACE_FEE_PERCENT } from "@/lib/marketplace";
import { useCarrizo } from "@/lib/store";

export default function CajaPage() {
  const payments = useCarrizo((s) => s.payments);
  const clients = useCarrizo((s) => s.clients);
  const artists = useCarrizo((s) => s.artists);
  const marketplaceOrders = useCarrizo((s) => s.marketplaceOrders);

  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const byType = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + p.amount;
    return acc;
  }, {});

  const commissions = artists.map((artist) => {
    const artistPayments = payments.filter((p) => p.artistId === artist.id);
    const revenue = artistPayments.reduce((sum, p) => sum + p.amount, 0);
    const marketplacePayout = marketplaceOrders
      .filter(
        (order) =>
          order.artistId === artist.id &&
          (order.status === "pagado" || order.status === "entregado"),
      )
      .reduce((sum, order) => sum + order.artistPayout, 0);
    const marketplaceFee = marketplaceOrders
      .filter(
        (order) =>
          order.artistId === artist.id &&
          (order.status === "pagado" || order.status === "entregado"),
      )
      .reduce((sum, order) => sum + order.platformFee, 0);
    const serviceRevenue = artistPayments
      .filter((p) => p.type !== "producto")
      .reduce((sum, p) => sum + p.amount, 0);
    const serviceArtistShare = Math.round(
      (serviceRevenue * artist.commissionPercent) / 100,
    );
    const artistShare = serviceArtistShare + marketplacePayout;
    const studioShare = revenue - artistShare;
    return { artist, revenue, artistShare, studioShare, marketplaceFee };
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
        {(["seña", "saldo", "producto"] as const).map((type) => (
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
          {commissions.map(({ artist, revenue, artistShare, studioShare, marketplaceFee }) => (
            <div
              key={artist.id}
              className="grid gap-3 px-5 py-4 sm:grid-cols-4 sm:items-center"
            >
              <div>
                <p className="font-medium">{artist.name}</p>
                <p className="text-xs text-[var(--text-dim)]">
                  {artist.commissionPercent}% sesiones · marketplace fee{" "}
                  {STUDIO_MARKETPLACE_FEE_PERCENT}%
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
                {marketplaceFee > 0 ? (
                  <p className="mt-1 text-[10px] text-[var(--text-dim)]">
                    Incluye {formatMoney(marketplaceFee)} de fees marketplace
                  </p>
                ) : null}
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
            const order = payment.marketplaceOrderId
              ? marketplaceOrders.find((item) => item.id === payment.marketplaceOrderId)
              : undefined;
            const clientName = client?.name ?? order?.buyerName ?? "Comprador marketplace";
            return (
              <div
                key={payment.id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium capitalize">
                    {payment.type} · {clientName}
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
