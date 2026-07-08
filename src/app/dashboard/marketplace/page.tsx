"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  PackageCheck,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  ShoppingBag,
  FileText,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import {
  listingCtr,
  listingStatusLabel,
  listingStatusTone,
  marketplaceSplit,
  orderStatusLabel,
  requiresArtistSaleContract,
  STUDIO_MARKETPLACE_FEE_PERCENT,
} from "@/lib/marketplace";
import { formatMoney, styleLabel } from "@/lib/quote-engine";
import { useCarrizo } from "@/lib/store";
import type { Artist, ArtistSaleContract, ArtworkListing, TattooSize, TattooStyle } from "@/lib/types";
import { sanitizeNumber, sanitizeText } from "@/lib/validation";

const styles: TattooStyle[] = [
  "blackwork",
  "realismo",
  "fine_line",
  "tradicional",
  "minimalista",
  "otro",
];

const sizes: TattooSize[] = ["pequeño", "mediano", "grande", "manga"];

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

type TabId = "artistas" | "publicar" | "obras" | "contratos" | "ordenes";

export default function MarketplaceDashboardPage() {
  const studio = useCarrizo((s) => s.studio);
  const artists = useCarrizo((s) => s.artists);
  const portfolio = useCarrizo((s) => s.portfolio);
  const listings = useCarrizo((s) => s.marketplaceListings);
  const orders = useCarrizo((s) => s.marketplaceOrders);
  const contracts = useCarrizo((s) => s.artistSaleContracts);
  const upsertArtist = useCarrizo((s) => s.upsertMarketplaceArtist);
  const updateArtist = useCarrizo((s) => s.updateMarketplaceArtist);
  const createListing = useCarrizo((s) => s.createMarketplaceListing);
  const updateListing = useCarrizo((s) => s.updateMarketplaceListing);
  const updateListingStatus = useCarrizo((s) => s.updateMarketplaceListingStatus);
  const markPaid = useCarrizo((s) => s.markMarketplaceOrderPaid);
  const markDelivered = useCarrizo((s) => s.markMarketplaceOrderDelivered);
  const cancelOrder = useCarrizo((s) => s.cancelMarketplaceOrder);
  const ensureArtistSaleContract = useCarrizo((s) => s.ensureArtistSaleContract);

  const [tab, setTab] = useState<TabId>("artistas");
  const [filterArtistId, setFilterArtistId] = useState("all");
  const [contractFilter, setContractFilter] = useState<"all" | "pending" | "signed">("all");
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [editingArtistId, setEditingArtistId] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState("");
  const [createdContractLink, setCreatedContractLink] = useState("");
  const [contractCopied, setContractCopied] = useState(false);

  const defaultArtistId = artists[0]?.id ?? "artist-1";
  const [publishArtistId, setPublishArtistId] = useState(defaultArtistId);
  const [title, setTitle] = useState("Obra única disponible");
  const [description, setDescription] = useState(
    "Pieza exclusiva con compra directa, stock único y coordinación de sesión con el estudio.",
  );
  const [story, setStory] = useState(
    "Diseño pensado para adaptarse al cuerpo del cliente sin perder fuerza visual.",
  );
  const [style, setStyle] = useState<TattooStyle>("blackwork");
  const [size, setSize] = useState<TattooSize>("mediano");
  const [image, setImage] = useState(
    portfolio[0]?.image ?? "/artists/enderxon/work-1.jpg",
  );
  const [portfolioItemId, setPortfolioItemId] = useState(portfolio[0]?.id ?? "");
  const [price, setPrice] = useState("180000");

  const [artistName, setArtistName] = useState("");
  const [artistRole, setArtistRole] = useState("Artista invitado · Marketplace");
  const [artistBio, setArtistBio] = useState("");
  const [artistStory, setArtistStory] = useState("");
  const [artistPhoto, setArtistPhoto] = useState("/artists/enderxon/work-1.jpg");
  const [artistPhotoName, setArtistPhotoName] = useState("");
  const [artistSpecialties, setArtistSpecialties] = useState<TattooStyle[]>([
    "fine_line",
  ]);

  const publishArtist = artists.find((item) => item.id === publishArtistId) ?? artists[0];
  const artistPortfolio = portfolio.filter(
    (item) => item.artistId === publishArtistId || item.artistId === "artist-1",
  );

  const stats = useMemo(() => {
    const available = listings.filter((item) => item.status === "publicada").length;
    const sold = listings.filter((item) => item.status === "vendida").length;
    const views = listings.reduce((acc, item) => acc + item.views, 0);
    const clicks = listings.reduce((acc, item) => acc + item.clicks, 0);
    const paidOrders = orders.filter(
      (item) => item.status === "pagado" || item.status === "entregado",
    );
    const revenue = paidOrders.reduce((acc, item) => acc + item.amount, 0);
    const conversion = clicks > 0 ? Math.round((paidOrders.length / clicks) * 1000) / 10 : 0;
    return { available, sold, views, clicks, revenue, conversion, artistCount: artists.length };
  }, [listings, orders, artists.length]);

  const contractStats = useMemo(() => {
    const pending = contracts.filter((item) => !item.signedAt).length;
    const signed = contracts.filter((item) => item.signedAt).length;
    return { pending, signed, total: contracts.length };
  }, [contracts]);

  const listingsNeedingContract = useMemo(
    () =>
      listings.filter(
        (item) =>
          requiresArtistSaleContract(item.artistId) &&
          !item.contractId &&
          item.status !== "vendida",
      ),
    [listings],
  );

  const sortedContracts = useMemo(() => {
    const items = [...contracts];
    if (contractFilter === "pending") {
      return items.filter((item) => !item.signedAt);
    }
    if (contractFilter === "signed") {
      return items.filter((item) => item.signedAt);
    }
    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [contracts, contractFilter]);

  const filteredListings = useMemo(() => {
    if (filterArtistId === "all") return listings;
    return listings.filter((item) => item.artistId === filterArtistId);
  }, [listings, filterArtistId]);

  const listingsByArtist = useMemo(() => {
    const map = new Map<string, ArtworkListing[]>();
    for (const listing of listings) {
      const bucket = map.get(listing.artistId) ?? [];
      bucket.push(listing);
      map.set(listing.artistId, bucket);
    }
    return map;
  }, [listings]);

  useEffect(() => {
    if (!publishArtistId && defaultArtistId) {
      setPublishArtistId(defaultArtistId);
    }
  }, [defaultArtistId, publishArtistId]);

  const resetArtistForm = () => {
    setEditingArtistId(null);
    setArtistName("");
    setArtistRole("Artista invitado · Marketplace");
    setArtistBio("");
    setArtistStory("");
    setArtistPhoto("/artists/enderxon/work-1.jpg");
    setArtistPhotoName("");
    setArtistSpecialties(["fine_line"]);
  };

  const loadArtistForEdit = (artist: Artist) => {
    setEditingArtistId(artist.id);
    setArtistName(artist.name);
    setArtistRole(artist.role);
    setArtistBio(artist.bio);
    setArtistStory(artist.story ?? "");
    setArtistPhoto(artist.photoUrl ?? "/artists/enderxon/work-1.jpg");
    setArtistSpecialties(artist.specialties);
    setTab("artistas");
  };

  const onSaveArtist = (event: FormEvent) => {
    event.preventDefault();
    const artistId = upsertArtist({
      id: editingArtistId ?? undefined,
      name: sanitizeText(artistName, 80),
      role: sanitizeText(artistRole, 120),
      bio: sanitizeText(artistBio, 400),
      story: sanitizeText(artistStory, 800),
      photoUrl: artistPhoto,
      marketplaceFeePercent: STUDIO_MARKETPLACE_FEE_PERCENT,
      specialties: artistSpecialties,
    });
    if (!editingArtistId) {
      setPublishArtistId(artistId);
    }
    resetArtistForm();
  };

  const onPhotoUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2_500_000) return;
    const dataUrl = await fileToDataUrl(file);
    setArtistPhoto(dataUrl);
    setArtistPhotoName(file.name);
  };

  const copyContractLink = async (contractId: string) => {
    const link = `${window.location.origin}/contrato-artista/${contractId}`;
    try {
      await navigator.clipboard.writeText(link);
      setContractCopied(true);
      window.setTimeout(() => setContractCopied(false), 2000);
    } catch {
      setContractCopied(false);
    }
  };

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    const listingId = createListing({
      artistId: publishArtistId,
      title: sanitizeText(title, 120),
      description: sanitizeText(description, 500),
      story: sanitizeText(story, 500),
      style,
      size,
      image,
      price: sanitizeNumber(price, 10000, 5000000) ?? 180000,
      portfolioItemId: portfolioItemId || undefined,
    });
    setCreatedId(listingId);
    setContractCopied(false);
    const listing = useCarrizo.getState().marketplaceListings.find(
      (item) => item.id === listingId,
    );
    if (listing?.contractId) {
      setCreatedContractLink(`/contrato-artista/${listing.contractId}`);
      setTab("contratos");
    } else {
      setCreatedContractLink("");
      setTab("obras");
    }
  };

  const onSelectPortfolio = (itemId: string) => {
    const item = artistPortfolio.find((entry) => entry.id === itemId);
    if (!item) return;
    setPortfolioItemId(item.id);
    setImage(item.image);
    setTitle(item.title);
    setStyle(item.style);
  };

  const toggleSpecialty = (value: TattooStyle) => {
    setArtistSpecialties((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Marketplace · curaduría multi-artista
          </h1>
          <p className="mt-1 max-w-2xl text-[var(--text-muted)]">
            Enderxon administra artistas invitados, publica obras con su historia y
            controla ventas, comisiones y estados desde un solo panel.
          </p>
        </div>
        <Link
          href={`/estudio/${studio.slug}/tienda`}
          className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          Ver tienda pública
          <ExternalLink size={14} />
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <StatCard label="Artistas" value={stats.artistCount.toString()} />
        <StatCard label="Disponibles" value={stats.available.toString()} />
        <StatCard label="Vendidas" value={stats.sold.toString()} />
        <StatCard label="Ingresos" value={formatMoney(stats.revenue)} />
        <StatCard label="Conversión" value={`${stats.conversion}%`} />
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "artistas"} onClick={() => setTab("artistas")}>
          <Users size={14} /> Artistas
        </TabButton>
        <TabButton active={tab === "publicar"} onClick={() => setTab("publicar")}>
          <Plus size={14} /> Publicar obra
        </TabButton>
        <TabButton active={tab === "obras"} onClick={() => setTab("obras")}>
          <TrendingUp size={14} /> Administrar obras
        </TabButton>
        <TabButton active={tab === "contratos"} onClick={() => setTab("contratos")}>
          <FileText size={14} /> Contratos
          {contractStats.pending > 0 ? (
            <span className="rounded-full bg-[#fbbf24] px-1.5 py-0.5 text-[10px] font-semibold text-black">
              {contractStats.pending}
            </span>
          ) : null}
        </TabButton>
        <TabButton active={tab === "ordenes"} onClick={() => setTab("ordenes")}>
          <ShoppingBag size={14} /> Órdenes
        </TabButton>
      </div>

      {tab === "artistas" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <section className="space-y-4">
            <div className="card p-5">
              <h2 className="font-medium">Artistas del marketplace</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Residentes e invitados con historia, bio y comisión propia.
              </p>
              <div className="mt-4 space-y-3">
                {artists.map((artist) => {
                  const artistListings = listingsByArtist.get(artist.id) ?? [];
                  const published = artistListings.filter(
                    (item) => item.status === "publicada",
                  ).length;
                  return (
                    <div
                      key={artist.id}
                      className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4 sm:grid-cols-[72px_1fr_auto]"
                    >
                      <div className="relative h-16 w-16 overflow-hidden rounded-2xl">
                        <Image
                          src={artist.photoUrl ?? "/artists/enderxon/avatar.jpg"}
                          alt={artist.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{artist.name}</p>
                          <span className="badge badge-gray">{artist.role}</span>
                          {!artist.active ? (
                            <span className="badge badge-gray">Inactivo</span>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
                          {artist.story ?? artist.bio}
                        </p>
                        <p className="mt-2 text-xs text-[var(--text-dim)]">
                          {published} publicadas · {artistListings.length} obras · comisión{" "}
                          {STUDIO_MARKETPLACE_FEE_PERCENT}%
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => loadArtistForEdit(artist)}
                          className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
                        >
                          <Pencil size={12} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPublishArtistId(artist.id);
                            setTab("publicar");
                          }}
                          className="btn-primary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
                        >
                          <Plus size={12} />
                          Publicar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <form onSubmit={onSaveArtist} className="card space-y-4 p-5">
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-[#6ee7b7]" />
              <h2 className="font-medium">
                {editingArtistId ? "Editar artista" : "Agregar artista invitado"}
              </h2>
            </div>

            <div>
              <label className="label">Nombre</label>
              <input
                className="input"
                value={artistName}
                onChange={(event) => setArtistName(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Rol / etiqueta</label>
              <input
                className="input"
                value={artistRole}
                onChange={(event) => setArtistRole(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Bio corta</label>
              <textarea
                className="input min-h-20"
                value={artistBio}
                onChange={(event) => setArtistBio(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Historia del artista</label>
              <textarea
                className="input min-h-28"
                value={artistStory}
                onChange={(event) => setArtistStory(event.target.value)}
                placeholder="Narrativa que verá el comprador en la tienda pública."
                required
              />
            </div>

            <div>
              <label className="label">Foto del artista</label>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-[var(--border)]">
                  <Image
                    src={artistPhoto}
                    alt={artistName || "Artista"}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="input"
                    onChange={(event) =>
                      void onPhotoUpload(event.target.files?.[0] ?? null)
                    }
                  />
                  <p className="mt-1 text-xs text-[var(--text-dim)]">
                    {artistPhotoName || "JPG o PNG, máximo 2.5 MB. Se guarda en el panel."}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Comisión estudio Enderxon</label>
              <input
                type="number"
                className="input"
                value={STUDIO_MARKETPLACE_FEE_PERCENT}
                readOnly
                disabled
              />
              <p className="mt-1 text-xs text-[var(--text-dim)]">
                Fijo al {STUDIO_MARKETPLACE_FEE_PERCENT}% del valor de cada obra vendida.
              </p>
            </div>

            <div>
              <label className="label">Especialidades</label>
              <div className="flex flex-wrap gap-2">
                {styles.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleSpecialty(item)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      artistSpecialties.includes(item)
                        ? "border-[#6ee7b7] bg-[#6ee7b722] text-[#6ee7b7]"
                        : "border-[var(--border)] text-[var(--text-muted)]"
                    }`}
                  >
                    {styleLabel(item)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1 py-3">
                {editingArtistId ? "Guardar cambios" : "Crear artista"}
              </button>
              {editingArtistId ? (
                <button
                  type="button"
                  onClick={resetArtistForm}
                  className="btn-secondary px-4 py-3"
                >
                  Cancelar
                </button>
              ) : null}
            </div>

            {editingArtistId ? (
              <button
                type="button"
                onClick={() =>
                  updateArtist(editingArtistId, {
                    active: !artists.find((item) => item.id === editingArtistId)?.active,
                  })
                }
                className="btn-secondary w-full py-2 text-sm"
              >
                {artists.find((item) => item.id === editingArtistId)?.active
                  ? "Desactivar en marketplace"
                  : "Reactivar en marketplace"}
              </button>
            ) : null}
          </form>
        </div>
      ) : null}

      {tab === "publicar" ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={onCreate} className="card space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Plus size={18} className="text-[#6ee7b7]" />
              <h2 className="font-medium">Publicar obra única</h2>
            </div>

            <div>
              <label className="label">Artista dueño de la obra</label>
              <select
                value={publishArtistId}
                onChange={(event) => setPublishArtistId(event.target.value)}
                className="input"
              >
                {artists
                  .filter((item) => item.active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.id === "artist-1" ? " (residente)" : " (invitado)"}
                    </option>
                  ))}
              </select>
              {publishArtist?.story ? (
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                  {publishArtist.story}
                </p>
              ) : null}
            </div>

            <div>
              <label className="label">Usar imagen del portafolio</label>
              <select
                value={portfolioItemId}
                onChange={(event) => onSelectPortfolio(event.target.value)}
                className="input"
              >
                {artistPortfolio.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[var(--border)]">
              <Image src={image} alt={title} fill className="object-cover" sizes="480px" />
            </div>

            <div>
              <label className="label">Título</label>
              <input
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Descripción comercial</label>
              <textarea
                className="input min-h-24"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Historia de la obra</label>
              <textarea
                className="input min-h-24"
                value={story}
                onChange={(event) => setStory(event.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label">Estilo</label>
                <select
                  className="input"
                  value={style}
                  onChange={(event) => setStyle(event.target.value as TattooStyle)}
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
                  onChange={(event) => setSize(event.target.value as TattooSize)}
                >
                  {sizes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Precio CLP</label>
                <input
                  type="number"
                  min={10000}
                  className="input"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-3 text-sm text-[var(--text-muted)]">
              {(() => {
                const split = marketplaceSplit(Number(price) || 0, publishArtist);
                return (
                  <>
                    Artista: {publishArtist?.name} · Comisión estudio ({split.feePercent}%):{" "}
                    {formatMoney(split.platformFee)} · Payout artista:{" "}
                    {formatMoney(split.artistPayout)}
                    {requiresArtistSaleContract(publishArtistId)
                      ? " · Requiere contrato firmado antes de publicar."
                      : null}
                  </>
                );
              })()}
            </div>

            <button type="submit" className="btn-primary w-full py-3">
              Publicar en marketplace
            </button>

            {createdId ? (
              <div className="space-y-2 text-sm">
                <p className="text-[#6ee7b7]">
                  Obra registrada. ID: <span className="font-mono">{createdId}</span>
                </p>
                {createdContractLink ? (
                  <div className="rounded-xl border border-[#fbbf2444] bg-[#fbbf2411] p-3">
                    <p className="text-[#fcd34d]">
                      Envía este enlace al artista para firmar el contrato de responsabilidad
                      (30% estudio) antes de que la obra quede visible.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={createdContractLink}
                        className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
                      >
                        <Link2 size={12} />
                        Abrir contrato
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          const contractId = createdContractLink.split("/").pop();
                          if (contractId) void copyContractLink(contractId);
                        }}
                        className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
                      >
                        {contractCopied ? <Check size={12} /> : <Copy size={12} />}
                        {contractCopied ? "Copiado" : "Copiar enlace"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[var(--text-muted)]">Publicada directamente en tienda.</p>
                )}
              </div>
            ) : null}
          </form>

          <section className="card p-5">
            <h2 className="font-medium">Vista previa del artista</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Así se verá su historia en la tienda pública.
            </p>
            {publishArtist ? (
              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 overflow-hidden rounded-2xl">
                    <Image
                      src={publishArtist.photoUrl ?? "/artists/enderxon/avatar.jpg"}
                      alt={publishArtist.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div>
                    <p className="font-semibold">{publishArtist.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{publishArtist.role}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  {publishArtist.story ?? publishArtist.bio}
                </p>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab === "obras" ? (
        <section className="card p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-medium">Administración de obras</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Filtra por artista, edita historia y controla estados de venta.
              </p>
            </div>
            <select
              value={filterArtistId}
              onChange={(event) => setFilterArtistId(event.target.value)}
              className="input max-w-xs"
            >
              <option value="all">Todos los artistas</option>
              {artists.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredListings.map((listing) => {
              const listingArtist =
                artists.find((item) => item.id === listing.artistId) ?? artists[0];
              const contract = contracts.find((item) => item.id === listing.contractId);
              return (
                <ListingRow
                  key={listing.id}
                  listing={listing}
                  artistName={listingArtist?.name ?? "Artista"}
                  studioSlug={studio.slug}
                  contract={contract}
                  editing={editingListingId === listing.id}
                  onCopyContract={copyContractLink}
                  onEdit={() =>
                    setEditingListingId(
                      editingListingId === listing.id ? null : listing.id,
                    )
                  }
                  onSave={(patch) => {
                    updateListing(listing.id, patch);
                    setEditingListingId(null);
                  }}
                  onStatus={updateListingStatus}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {tab === "contratos" ? (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Contratos totales" value={contractStats.total.toString()} />
            <StatCard label="Firma pendiente" value={contractStats.pending.toString()} />
            <StatCard label="Firmados" value={contractStats.signed.toString()} />
          </div>

          {listingsNeedingContract.length > 0 ? (
            <div className="card p-5">
              <h2 className="font-medium">Obras sin contrato generado</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Estas obras de artistas invitados aún no tienen ficha de contrato. Genera
                una para enviarla al artista.
              </p>
              <div className="mt-4 space-y-3">
                {listingsNeedingContract.map((listing) => {
                  const listingArtist = artists.find((item) => item.id === listing.artistId);
                  return (
                    <div
                      key={listing.id}
                      className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{listing.title}</p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {listingArtist?.name} · {formatMoney(listing.price)} ·{" "}
                          {listingStatusLabel(listing.status)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const result = ensureArtistSaleContract(listing.id);
                          if (result.ok && result.contractId) {
                            void copyContractLink(result.contractId);
                            setTab("contratos");
                          }
                        }}
                        className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                      >
                        <FileText size={14} />
                        Generar contrato
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="card p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-medium">Contratos de responsabilidad</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Comisión estudio {STUDIO_MARKETPLACE_FEE_PERCENT}% · firma del artista
                  antes de publicar en tienda.
                </p>
              </div>
              <select
                value={contractFilter}
                onChange={(event) =>
                  setContractFilter(event.target.value as "all" | "pending" | "signed")
                }
                className="input max-w-xs"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendientes de firma</option>
                <option value="signed">Firmados</option>
              </select>
            </div>

            {sortedContracts.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                Aún no hay contratos. Publica una obra de un artista invitado o usa
                &quot;Generar contrato&quot; en una obra existente.
              </p>
            ) : (
              <div className="space-y-3">
                {sortedContracts.map((contract) => (
                  <ContractRow
                    key={contract.id}
                    contract={contract}
                    listing={listings.find((item) => item.id === contract.listingId)}
                    onCopy={copyContractLink}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {tab === "ordenes" ? (
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingBag size={18} className="text-[#f97316]" />
            <h2 className="font-medium">Órdenes y cobros</h2>
          </div>

          {orders.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Aún no hay órdenes de marketplace.
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const listing = listings.find((item) => item.id === order.listingId);
                const orderArtist = artists.find((item) => item.id === order.artistId);
                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{listing?.title ?? "Obra"}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {order.buyerName} · {orderArtist?.name ?? "Artista"} ·{" "}
                          {orderStatusLabel(order.status)}
                        </p>
                        <p className="mt-1 text-sm">
                          {formatMoney(order.amount)} · comisión{" "}
                          {formatMoney(order.platformFee)} · artista{" "}
                          {formatMoney(order.artistPayout)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.status === "pendiente_pago" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => markPaid(order.id)}
                              className="btn-primary px-3 py-1.5 text-xs"
                            >
                              Marcar pago
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelOrder(order.id)}
                              className="btn-secondary px-3 py-1.5 text-xs"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : null}
                        {order.status === "pagado" ? (
                          <button
                            type="button"
                            onClick={() => markDelivered(order.id)}
                            className="btn-secondary px-3 py-1.5 text-xs"
                          >
                            Entregada
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
        active
          ? "border-[#6ee7b7] bg-[#6ee7b722] text-[#6ee7b7]"
          : "border-[var(--border)] text-[var(--text-muted)] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function ListingRow({
  listing,
  artistName,
  studioSlug,
  contract,
  editing,
  onEdit,
  onSave,
  onStatus,
  onCopyContract,
}: {
  listing: ArtworkListing;
  artistName: string;
  studioSlug: string;
  contract?: {
    id: string;
    signedAt?: string;
  };
  editing: boolean;
  onEdit: () => void;
  onSave: (
    patch: Partial<
      Pick<
        ArtworkListing,
        "title" | "description" | "story" | "price" | "image" | "style" | "size"
      >
    >,
  ) => void;
  onStatus: (listingId: string, status: ArtworkListing["status"]) => void;
  onCopyContract: (contractId: string) => void;
}) {
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [story, setStory] = useState(listing.story ?? "");
  const [price, setPrice] = useState(String(listing.price));

  useEffect(() => {
    setTitle(listing.title);
    setDescription(listing.description);
    setStory(listing.story ?? "");
    setPrice(String(listing.price));
  }, [listing]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-3">
      <div className="grid gap-3 sm:grid-cols-[96px_1fr_auto] sm:items-center">
        <div className="relative h-24 overflow-hidden rounded-xl">
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{listing.title}</p>
            <span className="badge badge-gray">{artistName}</span>
            <span className={`badge ${listingStatusTone(listing.status)}`}>
              {listingStatusLabel(listing.status)}
            </span>
            {contract && !contract.signedAt ? (
              <span className="badge badge-gold">Firma pendiente</span>
            ) : null}
            {contract?.signedAt ? (
              <span className="badge badge-green">Contrato firmado</span>
            ) : null}
          </div>
          {!editing ? (
            <>
              <p className="mt-1 line-clamp-1 text-sm text-[var(--text-muted)]">
                {listing.description}
              </p>
              {listing.story ? (
                <p className="mt-1 line-clamp-1 text-xs text-[var(--text-dim)]">
                  {listing.story}
                </p>
              ) : null}
            </>
          ) : (
            <div className="mt-2 space-y-2">
              <input
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <textarea
                className="input min-h-16"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <textarea
                className="input min-h-16"
                value={story}
                onChange={(event) => setStory(event.target.value)}
                placeholder="Historia de la obra"
              />
              <input
                type="number"
                className="input"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
          )}
          <p className="mt-2 text-xs text-[var(--text-dim)]">
            {formatMoney(listing.price)} · {listing.views} vistas · {listing.clicks} clics ·{" "}
            {listingCtr(listing)}% CTR
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {contract && !contract.signedAt ? (
            <>
              <Link
                href={`/contrato-artista/${contract.id}`}
                className="btn-primary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
              >
                <Link2 size={12} />
                Contrato
              </Link>
              <button
                type="button"
                onClick={() => onCopyContract(contract.id)}
                className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
              >
                <Copy size={12} />
                Enlace
              </button>
            </>
          ) : null}
          <Link
            href={`/estudio/${studioSlug}/obra/${listing.id}`}
            className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
          >
            Ver
            <ExternalLink size={12} />
          </Link>
          {editing ? (
            <button
              type="button"
              onClick={() =>
                onSave({
                  title: sanitizeText(title, 120),
                  description: sanitizeText(description, 500),
                  story: sanitizeText(story, 500),
                  price: sanitizeNumber(price, 10000, 5000000) ?? listing.price,
                })
              }
              className="btn-primary px-3 py-1.5 text-xs"
            >
              Guardar
            </button>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
            >
              <Pencil size={12} />
              Editar
            </button>
          )}
          {listing.status === "publicada" ? (
            <button
              type="button"
              onClick={() => onStatus(listing.id, "pausada")}
              className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
            >
              <PauseCircle size={12} />
              Pausar
            </button>
          ) : listing.status === "pausada" ? (
            <button
              type="button"
              onClick={() => onStatus(listing.id, "publicada")}
              className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
            >
              <PlayCircle size={12} />
              Publicar
            </button>
          ) : null}
          {listing.status === "reservada" ? (
            <button
              type="button"
              onClick={() => onStatus(listing.id, "vendida")}
              className="btn-primary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
            >
              <PackageCheck size={12} />
              Vendida
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ContractRow({
  contract,
  listing,
  onCopy,
}: {
  contract: ArtistSaleContract;
  listing?: ArtworkListing;
  onCopy: (contractId: string) => void;
}) {
  const signed = Boolean(contract.signedAt);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{contract.artworkTitle}</p>
            {signed ? (
              <span className="badge badge-green">Firmado</span>
            ) : (
              <span className="badge badge-gold">Pendiente</span>
            )}
            {listing ? (
              <span className={`badge ${listingStatusTone(listing.status)}`}>
                {listingStatusLabel(listing.status)}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Artista: {contract.artistName}
          </p>
          <p className="mt-2 text-sm">
            {formatMoney(contract.artworkPrice)} · Estudio {contract.studioFeePercent}% (
            {formatMoney(contract.studioFee)}) · Artista{" "}
            {formatMoney(contract.artistPayout)}
          </p>
          <p className="mt-2 text-xs text-[var(--text-dim)]">
            Creado{" "}
            {format(parseISO(contract.createdAt), "d MMM yyyy HH:mm", { locale: es })}
            {contract.signedAt
              ? ` · Firmado ${format(parseISO(contract.signedAt), "d MMM yyyy HH:mm", { locale: es })}`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Link
            href={`/contrato-artista/${contract.id}`}
            className="btn-primary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
          >
            <FileText size={12} />
            {signed ? "Ver contrato" : "Abrir firma"}
          </Link>
          <button
            type="button"
            onClick={() => onCopy(contract.id)}
            className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
          >
            <Copy size={12} />
            Copiar enlace
          </button>
        </div>
      </div>
    </div>
  );
}
