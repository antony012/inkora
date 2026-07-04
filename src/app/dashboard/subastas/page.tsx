"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ExternalLink, Gavel, Radio } from "lucide-react";
import {
  auctionStatusLabel,
  formatCountdown,
  resolveAuctionStatus,
} from "@/lib/auction";
import { formatMoney, styleLabel } from "@/lib/quote-engine";
import { useInkora } from "@/lib/store";
import { sanitizeNumber, sanitizeText } from "@/lib/validation";
import type { TattooSize, TattooStyle } from "@/lib/types";

const styles: TattooStyle[] = [
  "blackwork",
  "realismo",
  "fine_line",
  "tradicional",
  "otro",
];

const sizes: TattooSize[] = ["pequeño", "mediano", "grande"];

export default function SubastasDashboardPage() {
  const studio = useInkora((s) => s.studio);
  const portfolio = useInkora((s) => s.portfolio);
  const auctions = useInkora((s) => s.auctions);
  const createAuction = useInkora((s) => s.createAuction);
  const cancelAuction = useInkora((s) => s.cancelAuction);
  const syncAuctionStatuses = useInkora((s) => s.syncAuctionStatuses);

  const [title, setTitle] = useState("Flash exclusivo de la noche");
  const [description, setDescription] = useState(
    "Pieza única de Enderson Carrizo. El mejor postor agenda la sesión.",
  );
  const [style, setStyle] = useState<TattooStyle>("blackwork");
  const [size, setSize] = useState<TattooSize>("mediano");
  const [image, setImage] = useState(portfolio[0]?.image ?? "/artists/enderson/work-1.jpg");
  const [startingPrice, setStartingPrice] = useState("80000");
  const [minIncrement, setMinIncrement] = useState("5000");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [createdId, setCreatedId] = useState("");
  const [now] = useState(Date.now());

  const liveCount = useMemo(
    () => auctions.filter((a) => resolveAuctionStatus(a) === "en_vivo").length,
    [auctions],
  );

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    syncAuctionStatuses();

    const auctionId = createAuction({
      title: sanitizeText(title, 120),
      description: sanitizeText(description, 500),
      style,
      size,
      image,
      startingPrice: sanitizeNumber(startingPrice, 1000) ?? 80000,
      minIncrement: sanitizeNumber(minIncrement, 1000) ?? 5000,
      durationMinutes: sanitizeNumber(durationMinutes, 1, 240) ?? 30,
    });

    setCreatedId(auctionId);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subastas en vivo</h1>
          <p className="mt-1 text-[var(--text-muted)]">
            Publica un tatuaje y ábrelo al mejor postor en tiempo real.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-rose">
            <Radio size={12} /> {liveCount} en vivo
          </span>
          <Link
            href={`/estudio/${studio.slug}/subasta`}
            className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
          >
            Ver sala pública
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={onCreate} className="card space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Gavel size={18} className="text-[#fb7185]" />
            <h2 className="font-medium">Publicar tatuaje a subasta</h2>
          </div>

          <div>
            <label className="label">Título</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input min-h-24"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Estilo</label>
              <select
                className="input"
                value={style}
                onChange={(e) => setStyle(e.target.value as TattooStyle)}
              >
                {styles.map((item) => (
                  <option key={item} value={item}>
                    {styleLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tamaño</label>
              <select
                className="input"
                value={size}
                onChange={(e) => setSize(e.target.value as TattooSize)}
              >
                {sizes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Imagen del tatuaje</label>
            <div className="grid grid-cols-3 gap-2">
              {portfolio.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setImage(item.image)}
                  className={`relative h-20 overflow-hidden rounded-xl border ${
                    image === item.image
                      ? "border-[#e11d48]"
                      : "border-[var(--border)]"
                  }`}
                >
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Precio base (CLP)</label>
              <input
                className="input"
                type="number"
                min={1000}
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Incremento mínimo</label>
              <input
                className="input"
                type="number"
                min={1000}
                value={minIncrement}
                onChange={(e) => setMinIncrement(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Duración (min)</label>
              <input
                className="input"
                type="number"
                min={1}
                max={240}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-3">
            Abrir subasta en vivo
          </button>

          {createdId ? (
            <p className="text-sm text-[#6ee7b7]">
              Subasta creada.{" "}
              <Link
                href={`/estudio/${studio.slug}/subasta`}
                className="underline"
              >
                Abrir sala pública
              </Link>
            </p>
          ) : null}
        </form>

        <section className="card overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-medium">Historial y salas activas</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {auctions.length === 0 ? (
              <p className="p-5 text-sm text-[var(--text-muted)]">
                Aún no hay subastas.
              </p>
            ) : (
              auctions.map((auction) => {
                const status = resolveAuctionStatus(auction);
                return (
                  <div
                    key={auction.id}
                    className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 overflow-hidden rounded-xl">
                        <Image
                          src={auction.image}
                          alt={auction.title}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{auction.title}</p>
                          <span
                            className={`badge ${
                              status === "en_vivo"
                                ? "badge-rose"
                                : status === "finalizada"
                                  ? "badge-green"
                                  : "badge-gray"
                            }`}
                          >
                            {auctionStatusLabel(status)}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-muted)]">
                          {formatMoney(auction.currentBid)} · {auction.bids.length}{" "}
                          ofertas ·{" "}
                          {status === "en_vivo"
                            ? formatCountdown(auction.endsAt, now)
                            : auction.winnerName
                              ? `Ganó ${auction.winnerName}`
                              : "Sin ganador"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/estudio/${studio.slug}/subasta`}
                        className="btn-secondary px-3 py-1.5 text-xs"
                      >
                        Ver sala
                      </Link>
                      {status === "en_vivo" ? (
                        <button
                          onClick={() => cancelAuction(auction.id)}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
