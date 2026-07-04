"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Gavel,
  Radio,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import {
  auctionStatusLabel,
  formatCountdown,
  leadingBid,
  nextMinBid,
  resolveAuctionStatus,
  sortBids,
} from "@/lib/auction";
import { trackMarketingEvent } from "@/lib/analytics";
import { formatMoney, styleLabel } from "@/lib/quote-engine";
import { useSessionUser } from "@/hooks/useSessionUser";
import { useInkora } from "@/lib/store";
import {
  canBid,
  verificationBadge,
  verificationLabel,
} from "@/lib/verification";
import type { TattooAuction } from "@/lib/types";

function statusBadge(status: ReturnType<typeof resolveAuctionStatus>) {
  if (status === "en_vivo") return "badge-rose";
  if (status === "programada") return "badge-blue";
  if (status === "finalizada") return "badge-green";
  return "badge-gray";
}

export function LiveAuctionRoom({ auctionId }: { auctionId?: string }) {
  const auctions = useInkora((s) => s.auctions);
  const placeBid = useInkora((s) => s.placeBid);
  const syncAuctionStatuses = useInkora((s) => s.syncAuctionStatuses);
  const bumpAuctionViewers = useInkora((s) => s.bumpAuctionViewers);
  const { hydrated, sessionUser } = useSessionUser();

  const auction = useMemo(() => {
    if (auctionId) return auctions.find((item) => item.id === auctionId);
    return (
      auctions.find((item) => resolveAuctionStatus(item) === "en_vivo") ??
      auctions[0]
    );
  }, [auctionId, auctions]);

  const [now, setNow] = useState(Date.now());
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pulse, setPulse] = useState(false);
  const [lastBidId, setLastBidId] = useState<string | null>(null);

  const rankedBids = useMemo(
    () => (auction ? sortBids(auction.bids) : []),
    [auction],
  );
  const leader = auction ? leadingBid(auction) : undefined;

  useEffect(() => {
    if (!auction) return;
    bumpAuctionViewers(auction.id);
    trackMarketingEvent("ViewContent", {
      source: "studio",
      metadata: { section: "live_auction", auctionId: auction.id },
    });
    // Solo una vez al entrar a la sala.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
      syncAuctionStatuses();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [syncAuctionStatuses]);

  useEffect(() => {
    if (!auction) return;
    setAmount(String(nextMinBid(auction)));
  }, [auction?.id, auction?.currentBid, auction?.bids.length]);

  useEffect(() => {
    const newest = rankedBids[0]?.id;
    if (!newest || newest === lastBidId) return;
    if (lastBidId) {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 700);
    }
    setLastBidId(newest);
  }, [rankedBids, lastBidId]);

  if (!auction) {
    return (
      <div className="card p-8 text-center text-[var(--text-muted)]">
        No hay subastas activas por ahora. El artista publicará la próxima pieza
        en vivo desde el panel.
      </div>
    );
  }

  const status = resolveAuctionStatus(auction, now);
  const minimum = nextMinBid(auction);

  const onBid = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const bidAmount = Number(amount);
    if (!Number.isFinite(bidAmount)) {
      setError("Monto inválido.");
      return;
    }

    const result = placeBid({
      auctionId: auction.id,
      amount: bidAmount,
    });

    if (!result.ok) {
      setError(result.error ?? "No se pudo registrar la oferta.");
      return;
    }

    setSuccess(`Oferta registrada: ${formatMoney(bidAmount)}`);
    trackMarketingEvent("Lead", {
      source: "studio",
      value: bidAmount,
      metadata: {
        section: "live_auction_bid",
        auctionId: auction.id,
        title: auction.title,
      },
      user: {
        name: sessionUser?.name,
        phone: sessionUser?.phone,
        email: sessionUser?.email,
      },
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="card overflow-hidden">
        <div className="relative h-80 sm:h-[28rem]">
          <Image
            src={auction.image}
            alt={auction.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className={`badge ${statusBadge(status)}`}>
              {status === "en_vivo" ? (
                <span className="mr-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-[#fb7185]" />
              ) : null}
              {auctionStatusLabel(status)}
            </span>
            <span className="badge badge-gold">
              <Users size={12} /> {auction.viewers} en sala
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="text-sm text-white/70">
              {styleLabel(auction.style)} · {auction.size.replaceAll("_", " ")}
            </p>
            <h2 className="mt-1 text-3xl font-semibold">{auction.title}</h2>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              {auction.description}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div
          className={`card p-5 transition ${
            pulse ? "border-[#e11d48] shadow-[0_0_40px_#e11d4833]" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Oferta actual</p>
              <p className="mt-1 text-4xl font-semibold text-[#d4a853]">
                {formatMoney(auction.currentBid)}
              </p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {leader
                  ? `Va ganando ${leader.bidderName}`
                  : `Precio base ${formatMoney(auction.startingPrice)}`}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] px-4 py-3 text-right">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--text-dim)]">
                <Timer size={13} /> Tiempo
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[#fb7185]">
                {status === "en_vivo"
                  ? formatCountdown(auction.endsAt, now)
                  : status === "programada"
                    ? "Pronto"
                    : "00:00"}
              </p>
            </div>
          </div>

          {status === "finalizada" ? (
            <div className="mt-5 rounded-2xl border border-[#34d39944] bg-[#34d39914] p-4">
              <p className="inline-flex items-center gap-2 font-medium text-[#6ee7b7]">
                <Trophy size={16} /> Subasta finalizada
              </p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {auction.winnerName
                  ? `Ganador: ${auction.winnerName} por ${formatMoney(auction.currentBid)}. Enderson te contactará para agendar la sesión.`
                  : "La subasta terminó sin ofertas."}
              </p>
            </div>
          ) : null}

          {status === "en_vivo" ? (
            <div className="mt-5 space-y-3">
              {!hydrated ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4 text-sm text-[var(--text-muted)]">
                  Cargando tu sesión...
                </div>
              ) : !sessionUser ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4">
                  <p className="font-medium">Acceso verificado requerido</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Para pujar debes iniciar sesión y subir tu documento de
                    identidad para revisión del equipo.
                  </p>
                  <Link
                    href="/acceso"
                    className="btn-primary mt-4 inline-flex px-4 py-2 text-sm"
                  >
                    Completar acceso
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[#0d0d10] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{sessionUser.name}</p>
                      <p className="text-xs text-[var(--text-dim)]">
                        {sessionUser.email}
                      </p>
                    </div>
                    <span
                      className={`badge ${verificationBadge(sessionUser.verificationStatus)}`}
                    >
                      {verificationLabel(sessionUser.verificationStatus)}
                    </span>
                  </div>

                  {!canBid(sessionUser.verificationStatus) ? (
                    <div className="rounded-2xl border border-[#fbbf2444] bg-[#fbbf2414] p-4 text-sm text-[#fcd34d]">
                      {sessionUser.verificationStatus === "pendiente_documento"
                        ? "Sube tu documento de identidad para completar el login."
                        : sessionUser.verificationStatus === "en_revision"
                          ? "Tu identidad está en revisión. Aún no puedes pujar."
                          : "Tu verificación fue rechazada. Vuelve a subir un documento válido."}
                      <Link
                        href="/acceso"
                        className="mt-3 block text-[var(--accent-glow)] underline"
                      >
                        Ir a verificación
                      </Link>
                    </div>
                  ) : (
                    <form onSubmit={onBid} className="space-y-3">
                      <div>
                        <label className="label">
                          Tu oferta (mínimo {formatMoney(minimum)})
                        </label>
                        <input
                          className="input"
                          type="number"
                          min={minimum}
                          step={auction.minIncrement}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[0, 1, 2].map((step) => {
                          const quick = minimum + step * auction.minIncrement;
                          return (
                            <button
                              key={quick}
                              type="button"
                              onClick={() => setAmount(String(quick))}
                              className="btn-secondary px-3 py-1.5 text-xs"
                            >
                              {formatMoney(quick)}
                            </button>
                          );
                        })}
                      </div>
                      {error ? (
                        <p className="text-sm text-[var(--accent-glow)]">{error}</p>
                      ) : null}
                      {success ? (
                        <p className="text-sm text-[#6ee7b7]">{success}</p>
                      ) : null}
                      <button
                        type="submit"
                        className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3"
                      >
                        <Gavel size={16} />
                        Pujar ahora
                      </button>
                      <p className="text-xs text-[var(--text-dim)]">
                        Si pujas en el último minuto, el reloj se extiende 60
                        segundos para evitar robos de último segundo.
                      </p>
                    </form>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h3 className="inline-flex items-center gap-2 font-medium">
              <Radio size={16} className="text-[#fb7185]" />
              Actividad en vivo
            </h3>
            <span className="text-xs text-[var(--text-dim)]">
              Incremento {formatMoney(auction.minIncrement)}
            </span>
          </div>
          <div className="max-h-72 divide-y divide-[var(--border)] overflow-auto scrollbar-thin">
            {rankedBids.length === 0 ? (
              <p className="p-5 text-sm text-[var(--text-muted)]">
                Sé el primero en ofertar.
              </p>
            ) : (
              rankedBids.map((bid, index) => (
                <div
                  key={bid.id}
                  className={`flex items-center justify-between gap-3 px-5 py-3 transition ${
                    index === 0 ? "bg-[#e11d4814]" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">
                      {bid.bidderName}
                      {index === 0 ? (
                        <span className="ml-2 badge badge-gold">Líder</span>
                      ) : null}
                      {bid.verificationStatus ? (
                        <span
                          className={`ml-2 badge ${verificationBadge(bid.verificationStatus)}`}
                        >
                          {verificationLabel(bid.verificationStatus)}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[var(--text-dim)]">
                      {new Date(bid.createdAt).toLocaleTimeString("es-CL")}
                    </p>
                  </div>
                  <p className="font-semibold text-[#d4a853]">
                    {formatMoney(bid.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export function AuctionCard({
  auction,
  href,
}: {
  auction: TattooAuction;
  href: string;
}) {
  const status = resolveAuctionStatus(auction);
  return (
    <Link href={href} className="card card-hover block overflow-hidden">
      <div className="relative h-44">
        <Image
          src={auction.image}
          alt={auction.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute left-3 top-3">
          <span className={`badge ${statusBadge(status)}`}>
            {auctionStatusLabel(status)}
          </span>
        </div>
      </div>
      <div className="p-4">
        <p className="font-medium">{auction.title}</p>
        <p className="mt-1 text-sm text-[#d4a853]">
          {formatMoney(auction.currentBid)}
        </p>
        <p className="mt-1 text-xs text-[var(--text-dim)]">
          {auction.bids.length} ofertas · {auction.viewers} en sala
        </p>
      </div>
    </Link>
  );
}
