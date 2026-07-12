"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  Eye,
  Gavel,
  Radio,
  ShieldAlert,
  Upload,
  UserX,
  Users,
} from "lucide-react";
import {
  auctionStatusLabel,
  formatCountdown,
  getPrimaryLiveAuction,
  leadingBid,
  resolveAuctionStatus,
  sortBids,
} from "@/lib/auction";
import {
  BidFlashOverlay,
  useBidFlash,
} from "@/components/BidFlashOverlay";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuctionRoomUsers } from "@/hooks/useAuctionRoomUsers";
import { useLiveRoomSync } from "@/hooks/useLiveRoomSync";
import { formatMoney, styleLabel } from "@/lib/quote-engine";
import { useCarrizo } from "@/lib/store";
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

const MAX_IMAGE_BYTES = 2_500_000;

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

type TabId = "crear" | "sala";

export default function SalaAdminPage() {
  const studio = useCarrizo((s) => s.studio);
  const portfolio = useCarrizo((s) => s.portfolio);
  const auctions = useCarrizo((s) => s.auctions);
  const users = useCarrizo((s) => s.users);
  const auctionRoomKicks = useCarrizo((s) => s.auctionRoomKicks);
  const createAuction = useCarrizo((s) => s.createAuction);
  const cancelAuction = useCarrizo((s) => s.cancelAuction);
  const extendAuction = useCarrizo((s) => s.extendAuction);
  const kickAuctionUser = useCarrizo((s) => s.kickAuctionUser);
  const unkickAuctionUser = useCarrizo((s) => s.unkickAuctionUser);
  const syncAuctionStatuses = useCarrizo((s) => s.syncAuctionStatuses);
  const roomUsers = useAuctionRoomUsers(studio.slug);
  useLiveRoomSync(500);

  const [tab, setTab] = useState<TabId>("crear");
  const [now, setNow] = useState(Date.now());
  const [query, setQuery] = useState("");
  const [kickMessage, setKickMessage] = useState("");

  const [title, setTitle] = useState("Flash exclusivo de la noche");
  const [description, setDescription] = useState(
    "Pieza única de Enderxon Carrizo. El mejor postor agenda la sesión.",
  );
  const [style, setStyle] = useState<TattooStyle>("blackwork");
  const [size, setSize] = useState<TattooSize>("mediano");
  const [image, setImage] = useState(
    portfolio[0]?.image ?? "/artists/enderxon/work-1.jpg",
  );
  const [imageName, setImageName] = useState("");
  const [imageError, setImageError] = useState("");
  const [startingPrice, setStartingPrice] = useState("80000");
  const [minIncrement, setMinIncrement] = useState("5000");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [createdId, setCreatedId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const auction = useMemo(
    () => getPrimaryLiveAuction(auctions, now),
    [auctions, now],
  );

  const liveCount = useMemo(
    () => auctions.filter((a) => resolveAuctionStatus(a) === "en_vivo").length,
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
  const leader = auction ? leadingBid(auction) : undefined;
  const bidFlash = useBidFlash(leader);

  const filteredBids = useMemo(() => {
    return rankedBids.filter((bid) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        bid.bidderName.toLowerCase().includes(q) ||
        (bid.bidderPhone ?? "").includes(q) ||
        (bid.bidderUserId ?? "").includes(q)
      );
    });
  }, [rankedBids, query]);

  const pendingUsers = users.filter(
    (u) => u.verificationStatus === "en_revision",
  ).length;

  const kickedIds = useMemo(
    () => new Set(auctionRoomKicks.map((item) => item.userId)),
    [auctionRoomKicks],
  );

  const onImageUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Solo se permiten imágenes.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("La imagen no puede superar 2,5 MB.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setImage(dataUrl);
      setImageName(file.name);
      setImageError("");
    } catch {
      setImageError("No se pudo cargar la imagen.");
    }
  };

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!image) {
      setImageError("Selecciona o carga una imagen.");
      return;
    }
    syncAuctionStatuses();

    const auctionId = createAuction({
      title: sanitizeText(title, 120),
      description: sanitizeText(description, 500),
      style,
      size,
      image,
      startingPrice: sanitizeNumber(startingPrice, 1000) ?? 80000,
      minIncrement: sanitizeNumber(minIncrement, 1000) ?? 5000,
      durationMinutes: sanitizeNumber(durationMinutes, 1, 720) ?? 30,
    });

    setCreatedId(auctionId);
    setKickMessage("");
    setTab("sala");
  };

  const onKick = (userId: string, name: string) => {
    const ok = window.confirm(
      `¿Expulsar a ${name} de la sala de subasta? No podrá pujar hasta que lo readmitas.`,
    );
    if (!ok) return;
    const result = kickAuctionUser({
      userId,
      reason: "Expulsado de la sala por el administrador",
    });
    setKickMessage(
      result.ok
        ? `${name} fue expulsado de la sala.`
        : result.error ?? "No se pudo expulsar.",
    );
  };

  const status = auction ? resolveAuctionStatus(auction, now) : null;

  return (
    <div className="space-y-6 animate-fade-up">
      <BidFlashOverlay flash={bidFlash} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sala Admin subastas
          </h1>
          <p className="mt-1 text-[var(--text-muted)]">
            Crea subastas, define el tiempo, carga la imagen y controla quién
            permanece en la sala.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-rose">
            <Radio size={12} /> {liveCount} en vivo
          </span>
          <span className="badge badge-gold">
            <Users size={12} /> {roomUsers.length} en sala
          </span>
          <span className="badge badge-amber">
            <ShieldAlert size={12} /> {pendingUsers} por verificar
          </span>
          <Link
            href={`/estudio/${studio.slug}/subasta`}
            className="btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs"
          >
            Vista pública
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("crear")}
          className={
            tab === "crear"
              ? "btn-primary px-4 py-2 text-sm"
              : "btn-secondary px-4 py-2 text-sm"
          }
        >
          <span className="inline-flex items-center gap-2">
            <Gavel size={14} /> Crear subasta
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab("sala")}
          className={
            tab === "sala"
              ? "btn-primary px-4 py-2 text-sm"
              : "btn-secondary px-4 py-2 text-sm"
          }
        >
          <span className="inline-flex items-center gap-2">
            <Eye size={14} /> Sala en vivo
          </span>
        </button>
      </div>

      {tab === "crear" ? (
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
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label className="btn-secondary inline-flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                  <Upload size={14} />
                  Cargar imagen
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      onImageUpload(e.target.files?.[0] ?? null)
                    }
                  />
                </label>
                {imageName ? (
                  <span className="truncate text-xs text-[var(--text-dim)]">
                    {imageName}
                  </span>
                ) : null}
              </div>
              {imageError ? (
                <p className="mb-2 text-sm text-[#fb7185]">{imageError}</p>
              ) : null}
              <div className="relative mb-3 h-40 overflow-hidden rounded-2xl border border-[var(--border)] bg-[#0d0d10]">
                {image ? (
                  <Image
                    src={image}
                    alt="Vista previa subasta"
                    fill
                    unoptimized={image.startsWith("data:")}
                    className="object-cover"
                    sizes="480px"
                  />
                ) : null}
              </div>
              {portfolio.length ? (
                <>
                  <p className="mb-2 text-xs text-[var(--text-dim)]">
                    O elige una del portafolio
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {portfolio.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setImage(item.image);
                          setImageName("");
                          setImageError("");
                          if (fileRef.current) fileRef.current.value = "";
                        }}
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
                          unoptimized={item.image.startsWith("data:")}
                          className="object-cover"
                          sizes="120px"
                        />
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
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
                  max={720}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  required
                />
                <p className="mt-1 text-[11px] text-[var(--text-dim)]">
                  Hasta 12 horas (720 min)
                </p>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3">
              Abrir subasta en vivo
            </button>

            {createdId ? (
              <p className="text-sm text-[#6ee7b7]">
                Subasta creada. Pasa a la pestaña Sala en vivo para monitorear.
              </p>
            ) : null}
          </form>

          <section className="card overflow-hidden">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="font-medium">Historial y salas</h2>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {auctions.length === 0 ? (
                <p className="p-5 text-sm text-[var(--text-muted)]">
                  Aún no hay subastas.
                </p>
              ) : (
                auctions.map((item) => {
                  const itemStatus = resolveAuctionStatus(item, now);
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14 overflow-hidden rounded-xl">
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            unoptimized={item.image.startsWith("data:")}
                            className="object-cover"
                            sizes="56px"
                          />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{item.title}</p>
                            <span
                              className={`badge ${
                                itemStatus === "en_vivo"
                                  ? "badge-rose"
                                  : itemStatus === "finalizada"
                                    ? "badge-green"
                                    : "badge-gray"
                              }`}
                            >
                              {auctionStatusLabel(itemStatus)}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text-muted)]">
                            {formatMoney(item.currentBid)} · {item.bids.length}{" "}
                            ofertas ·{" "}
                            {itemStatus === "en_vivo"
                              ? formatCountdown(item.endsAt, now)
                              : item.winnerName
                                ? `Ganó ${item.winnerName}`
                                : "Sin ganador"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setTab("sala")}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          Ver sala
                        </button>
                        {itemStatus === "en_vivo" ? (
                          <button
                            type="button"
                            onClick={() => cancelAuction(item.id)}
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
      ) : !auction ? (
        <div className="card p-8 text-center text-[var(--text-muted)]">
          No hay salas activas. Crea una subasta desde la pestaña Crear.
        </div>
      ) : (
        <>
          <section className="card overflow-hidden">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src={auction.image}
                    alt={auction.title}
                    fill
                    unoptimized={auction.image.startsWith("data:")}
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{auction.title}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {formatMoney(auction.currentBid)} ·{" "}
                    {leader?.bidderName ?? "Sin ofertas"} ·{" "}
                    {status === "en_vivo"
                      ? formatCountdown(auction.endsAt, now)
                      : "Finalizada"}
                  </p>
                </div>
              </div>
              {status === "en_vivo" ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => extendAuction(auction.id, 5)}
                    className="btn-secondary px-3 py-2 text-xs"
                  >
                    +5 min
                  </button>
                  <button
                    type="button"
                    onClick={() => extendAuction(auction.id, 10)}
                    className="btn-secondary px-3 py-2 text-xs"
                  >
                    +10 min
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelAuction(auction.id)}
                    className="btn-secondary px-3 py-2 text-xs"
                  >
                    Cerrar sala
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <section className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 sm:px-5">
                <h3 className="inline-flex items-center gap-2 font-medium">
                  <Gavel size={16} className="text-[#fb7185]" />
                  Pujas en vivo
                </h3>
                <span className="text-xs text-[var(--text-dim)]">
                  {filteredBids.length} ofertas
                </span>
              </div>
              <div className="border-b border-[var(--border)] px-4 py-3 sm:px-5">
                <input
                  className="input"
                  placeholder="Buscar postor…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="max-h-[32rem] divide-y divide-[var(--border)] overflow-auto scrollbar-thin">
                {filteredBids.length === 0 ? (
                  <p className="p-5 text-sm text-[var(--text-muted)]">
                    Aún no hay pujas.
                  </p>
                ) : (
                  filteredBids.map((bid, index) => {
                    const kicked =
                      bid.bidderUserId != null &&
                      kickedIds.has(bid.bidderUserId);
                    return (
                      <div
                        key={bid.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium">
                              {bid.bidderName}
                            </p>
                            {index === 0 ? (
                              <span className="badge badge-gold">Líder</span>
                            ) : null}
                            {kicked ? (
                              <span className="badge badge-rose">Expulsado</span>
                            ) : null}
                          </div>
                          <p className="text-xs text-[var(--text-dim)]">
                            {new Date(bid.createdAt).toLocaleTimeString("es-CL")}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-semibold text-[#d4a853]">
                            {formatMoney(bid.amount)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:px-5">
                <h3 className="inline-flex items-center gap-2 font-medium">
                  <Users size={16} className="text-[#34d399]" />
                  En la sala
                </h3>
                <span className="badge badge-gold">
                  {roomUsers.length} en vivo
                </span>
              </div>
              <div className="max-h-[32rem] divide-y divide-[var(--border)] overflow-auto scrollbar-thin">
                {roomUsers.length === 0 ? (
                  <p className="p-5 text-sm text-[var(--text-muted)]">
                    Nadie en la sala ahora.
                  </p>
                ) : (
                  roomUsers.map((online) => {
                    const user = users.find((item) => item.id === online.userId);
                    const statusUser =
                      user?.verificationStatus ?? online.verificationStatus;
                    const kicked = kickedIds.has(online.userId);
                    return (
                      <div
                        key={online.userId}
                        className="flex items-center gap-3 px-4 py-3 sm:px-5"
                      >
                        <UserAvatar
                          name={online.name}
                          profilePhotoUrl={
                            user?.profilePhotoUrl ?? online.profilePhotoUrl
                          }
                          verificationStatus={statusUser}
                          size="md"
                          showOnlineDot={!kicked}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium">{online.name}</p>
                            {kicked ? (
                              <span className="badge badge-rose">Expulsado</span>
                            ) : (
                              <span className="badge badge-green">En sala</span>
                            )}
                          </div>
                          <p className="truncate text-xs text-[var(--text-dim)]">
                            {online.email}
                          </p>
                        </div>
                        {user && user.role !== "studio_admin" ? (
                          kicked ? (
                            <button
                              type="button"
                              onClick={() => unkickAuctionUser(online.userId)}
                              className="btn-secondary shrink-0 px-2.5 py-1 text-xs"
                            >
                              Readmitir
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                onKick(online.userId, online.name)
                              }
                              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#fb718533] px-2.5 py-1 text-xs text-[#fb7185] hover:bg-[#fb718514]"
                            >
                              <UserX size={12} />
                              Expulsar
                            </button>
                          )
                        ) : null}
                      </div>
                    );
                  })
                )}

                {auctionRoomKicks.length ? (
                  <div className="border-t border-[var(--border)] bg-[#0d0d10] px-4 py-3 sm:px-5">
                    <p className="mb-2 text-xs font-medium text-[var(--text-dim)]">
                      Expulsados
                    </p>
                    <div className="space-y-2">
                      {auctionRoomKicks.map((kick) => {
                        const user = users.find(
                          (item) => item.id === kick.userId,
                        );
                        if (roomUsers.some((u) => u.userId === kick.userId)) {
                          return null;
                        }
                        return (
                          <div
                            key={kick.userId}
                            className="flex items-center justify-between gap-2"
                          >
                            <p className="truncate text-sm">
                              {user?.name ?? kick.userId}
                            </p>
                            <button
                              type="button"
                              onClick={() => unkickAuctionUser(kick.userId)}
                              className="text-xs text-[var(--accent-glow)] hover:underline"
                            >
                              Readmitir
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              {kickMessage ? (
                <p className="border-t border-[var(--border)] px-4 py-2 text-sm text-[#fb7185] sm:px-5">
                  {kickMessage}
                </p>
              ) : null}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
