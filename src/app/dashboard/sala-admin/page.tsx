"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Gavel,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react";
import {
  auctionStatusLabel,
  formatCountdown,
  leadingBid,
  resolveAuctionStatus,
  sortBids,
} from "@/lib/auction";
import { formatMoney, styleLabel } from "@/lib/quote-engine";
import { useInkora } from "@/lib/store";
import {
  verificationBadge,
  verificationLabel,
} from "@/lib/verification";

export default function SalaAdminPage() {
  const studio = useInkora((s) => s.studio);
  const auctions = useInkora((s) => s.auctions);
  const users = useInkora((s) => s.users);
  const syncAuctionStatuses = useInkora((s) => s.syncAuctionStatuses);
  const cancelAuction = useInkora((s) => s.cancelAuction);

  const [now, setNow] = useState(Date.now());
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [query, setQuery] = useState("");

  const auction = useMemo(
    () =>
      auctions.find((item) => resolveAuctionStatus(item) === "en_vivo") ??
      auctions[0],
    [auctions],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
      syncAuctionStatuses();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [syncAuctionStatuses]);

  const rankedBids = useMemo(
    () => (auction ? sortBids(auction.bids) : []),
    [auction],
  );

  const filteredBids = useMemo(() => {
    return rankedBids.filter((bid) => {
      if (onlyVerified && bid.verificationStatus !== "verificado") return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        bid.bidderName.toLowerCase().includes(q) ||
        (bid.bidderPhone ?? "").includes(q) ||
        (bid.bidderUserId ?? "").includes(q)
      );
    });
  }, [rankedBids, onlyVerified, query]);

  const unverifiedBids = rankedBids.filter(
    (bid) => bid.verificationStatus && bid.verificationStatus !== "verificado",
  ).length;

  const pendingUsers = users.filter((u) => u.verificationStatus === "en_revision").length;

  if (!auction) {
    return (
      <div className="card p-8 text-center text-[var(--text-muted)]">
        No hay salas activas para monitorear.
      </div>
    );
  }

  const status = resolveAuctionStatus(auction, now);
  const leader = leadingBid(auction);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sala admin en vivo
          </h1>
          <p className="mt-1 text-[var(--text-muted)]">
            Monitorea pujas, identidad de postores y actividad de la sala.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-rose">
            <Radio size={12} /> {auctionStatusLabel(status)}
          </span>
          <span className="badge badge-gold">
            <Users size={12} /> {auction.viewers} en sala
          </span>
          <span className="badge badge-amber">
            <ShieldAlert size={12} /> {pendingUsers} por verificar
          </span>
          <Link
            href={`/estudio/${studio.slug}/subasta`}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            Vista pública
          </Link>
          <Link
            href="/dashboard/verificaciones"
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            Revisar identidades
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <section className="card overflow-hidden">
          <div className="relative h-64">
            <Image
              src={auction.image}
              alt={auction.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <p className="text-sm text-white/70">
                {styleLabel(auction.style)} · {auction.size}
              </p>
              <h2 className="text-2xl font-semibold">{auction.title}</h2>
            </div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4">
              <p className="text-xs text-[var(--text-dim)]">Oferta actual</p>
              <p className="mt-1 text-2xl font-semibold text-[#d4a853]">
                {formatMoney(auction.currentBid)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4">
              <p className="inline-flex items-center gap-1 text-xs text-[var(--text-dim)]">
                <Timer size={12} /> Tiempo
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[#fb7185]">
                {status === "en_vivo"
                  ? formatCountdown(auction.endsAt, now)
                  : "00:00"}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4">
              <p className="text-xs text-[var(--text-dim)]">Líder</p>
              <p className="mt-1 text-lg font-semibold">
                {leader?.bidderName ?? "Sin ofertas"}
              </p>
            </div>
          </div>
          {status === "en_vivo" ? (
            <div className="border-t border-[var(--border)] px-5 py-4">
              <button
                onClick={() => cancelAuction(auction.id)}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Cerrar / cancelar sala
              </button>
            </div>
          ) : null}
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Eye size={16} className="text-[#fb7185]" />
            <h3 className="font-medium">Filtros de monitoreo</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">Buscar postor</label>
              <input
                className="input"
                placeholder="Nombre, teléfono o ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={onlyVerified}
                onChange={(e) => setOnlyVerified(e.target.checked)}
              />
              Solo mostrar pujas de usuarios verificados
            </label>
            <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4 text-sm text-[var(--text-muted)]">
              <p className="inline-flex items-center gap-2 text-[#fcd34d]">
                <ShieldAlert size={15} />
                Alertas de sala
              </p>
              <p className="mt-2">
                {unverifiedBids} pujas históricas con identidad incompleta o en
                revisión. Las nuevas pujas solo se aceptan si el usuario está
                verificado.
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h3 className="inline-flex items-center gap-2 font-medium">
            <Gavel size={16} className="text-[#fb7185]" />
            Feed de pujas en vivo
          </h3>
          <span className="text-xs text-[var(--text-dim)]">
            {filteredBids.length} visibles
          </span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {filteredBids.length === 0 ? (
            <p className="p-5 text-sm text-[var(--text-muted)]">
              No hay pujas con el filtro actual.
            </p>
          ) : (
            filteredBids.map((bid, index) => {
              const user = users.find((item) => item.id === bid.bidderUserId);
              const statusBid = bid.verificationStatus ?? user?.verificationStatus;
              return (
                <div
                  key={bid.id}
                  className="grid gap-3 px-5 py-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{bid.bidderName}</p>
                      {index === 0 ? (
                        <span className="badge badge-gold">Líder</span>
                      ) : null}
                      {statusBid ? (
                        <span className={`badge ${verificationBadge(statusBid)}`}>
                          {verificationLabel(statusBid)}
                        </span>
                      ) : (
                        <span className="badge badge-gray">Sin cuenta</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">
                      {bid.bidderPhone || "Sin teléfono"} ·{" "}
                      {new Date(bid.createdAt).toLocaleTimeString("es-CL")}
                    </p>
                  </div>
                  <div className="text-sm text-[var(--text-muted)]">
                    {user ? (
                      <>
                        <p>{user.email}</p>
                        <p>RUT {user.rut}</p>
                      </>
                    ) : (
                      <p>Postor sin ficha verificable</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[#d4a853]">
                      {formatMoney(bid.amount)}
                    </p>
                    {user?.verificationStatus === "en_revision" ? (
                      <Link
                        href="/dashboard/verificaciones"
                        className="text-xs text-[#fb7185] hover:underline"
                      >
                        Revisar identidad
                      </Link>
                    ) : null}
                    {statusBid === "verificado" ? (
                      <p className="inline-flex items-center gap-1 text-xs text-[#6ee7b7]">
                        <ShieldCheck size={12} /> OK para pujar
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
