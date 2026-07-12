"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { UserCard } from "@/components/UserCard";
import { trackMarketingEvent, trackPageView } from "@/lib/analytics";
import { formatMoney, styleLabel } from "@/lib/quote-engine";
import { useCarrizo } from "@/lib/store";
import type { ArtworkListing, TattooStyle } from "@/lib/types";

const LEGACY_SLUGS = new Set(["nueva-temporada", "santiago-ink"]);

type SortId = "recientes" | "precio_asc" | "precio_desc";

const STYLE_FILTERS: Array<{ id: "todos" | TattooStyle; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "realismo", label: "Realismo" },
  { id: "blackwork", label: "Blackwork" },
  { id: "fine_line", label: "Fine line" },
  { id: "tradicional", label: "Tradicional" },
  { id: "japones", label: "Japonés" },
  { id: "minimalista", label: "Minimalista" },
  { id: "otro", label: "Otro" },
];

export default function MarketplaceStorePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const studio = useCarrizo((s) => s.studio);
  const artists = useCarrizo((s) => s.artists);
  const listings = useCarrizo((s) => s.marketplaceListings);
  const hydrated = useCarrizo((s) => s.hydrated);

  const [query, setQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState<"todos" | TattooStyle>("todos");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [sort, setSort] = useState<SortId>("recientes");
  const [showFilters, setShowFilters] = useState(false);

  const visibleListings = useMemo(() => {
    let items = listings.filter(
      (item) => item.status !== "borrador" && item.status !== "pausada",
    );

    if (onlyAvailable) {
      items = items.filter((item) => item.status === "publicada");
    }

    if (styleFilter !== "todos") {
      items = items.filter((item) => item.style === styleFilter);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter((item) => {
        const artist = artists.find((a) => a.id === item.artistId);
        return (
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          styleLabel(item.style).toLowerCase().includes(q) ||
          (artist?.name.toLowerCase().includes(q) ?? false)
        );
      });
    }

    items = [...items].sort((a, b) => {
      if (sort === "precio_asc") return a.price - b.price;
      if (sort === "precio_desc") return b.price - a.price;
      return (
        new Date(b.publishedAt ?? b.createdAt).getTime() -
        new Date(a.publishedAt ?? a.createdAt).getTime()
      );
    });

    return items;
  }, [artists, listings, onlyAvailable, query, sort, styleFilter]);

  useEffect(() => {
    if (LEGACY_SLUGS.has(params.slug)) {
      router.replace(`/estudio/${studio.slug}/tienda`);
      return;
    }
    trackPageView("marketplace");
  }, [params.slug, router, studio.slug]);

  if (!hydrated || LEGACY_SLUGS.has(params.slug)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Cargando Marketplace...
      </div>
    );
  }

  if (params.slug !== studio.slug) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Marketplace no encontrado.
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0a0c] text-[var(--text)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[#0a0a0cee] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-3 py-3 sm:px-4">
          <Link
            href={`/estudio/${studio.slug}`}
            className="shrink-0 text-sm text-[var(--text-muted)] hover:text-white"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-none">Marketplace</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--text-dim)]">
              <MapPin size={11} />
              {studio.city}
            </p>
          </div>
          <UserCard compact />
        </div>

        <div className="mx-auto w-full max-w-6xl px-3 pb-3 sm:px-4">
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en Marketplace"
                className="w-full rounded-full border border-[var(--border)] bg-[#16161a] py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--text-dim)] focus:border-[var(--border-strong)]"
              />
            </label>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm ${
                showFilters
                  ? "border-[var(--accent-glow)] bg-[var(--accent-soft)] text-[var(--accent-glow)]"
                  : "border-[var(--border)] bg-[#16161a] text-[var(--text-muted)] hover:border-[var(--accent-glow)] hover:text-[var(--accent-glow)]"
              }`}
              aria-label="Filtros"
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">Filtros</span>
            </button>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STYLE_FILTERS.map((item) => {
              const active = styleFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStyleFilter(item.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-[var(--accent)] text-white shadow-[0_0_16px_#f9731633]"
                      : "bg-[#16161a] text-[var(--text-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-glow)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {showFilters ? (
            <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[#111114] p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">Filtros</p>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="rounded-full p-1 text-[var(--text-dim)] hover:bg-white/5"
                  aria-label="Cerrar filtros"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-xl bg-[#0d0d10] px-3 py-2.5 text-sm">
                  <span>Solo disponibles</span>
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) => setOnlyAvailable(e.target.checked)}
                    className="h-4 w-4 accent-[var(--accent-glow)]"
                  />
                </label>
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-dim)]">
                    Ordenar por
                  </label>
                  <select
                    className="input py-2 text-sm"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortId)}
                  >
                    <option value="recientes">Más recientes</option>
                    <option value="precio_asc">Precio: menor a mayor</option>
                    <option value="precio_desc">Precio: mayor a menor</option>
                  </select>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-muted)]">
            {visibleListings.length}{" "}
            {visibleListings.length === 1 ? "resultado" : "resultados"}
            {onlyAvailable ? " · Hoy en Santiago" : ""}
          </p>
          <select
            className="rounded-lg border border-[var(--border)] bg-[#16161a] px-2 py-1.5 text-xs text-[var(--text-muted)] outline-none sm:hidden"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
          >
            <option value="recientes">Recientes</option>
            <option value="precio_asc">Menor precio</option>
            <option value="precio_desc">Mayor precio</option>
          </select>
        </div>

        {visibleListings.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[#111114] px-4 py-16 text-center">
            <p className="font-medium">No hay publicaciones</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Prueba otra búsqueda o quita filtros.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStyleFilter("todos");
                setOnlyAvailable(false);
              }}
              className="btn-secondary mt-5 px-4 py-2 text-sm"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
            {visibleListings.map((listing) => {
              const artist = artists.find((a) => a.id === listing.artistId);
              return (
                <MarketplaceCard
                  key={listing.id}
                  listing={listing}
                  sellerName={artist?.name ?? studio.name}
                  sellerPhotoUrl={
                    artist?.photoUrl ?? studio.avatarUrl ?? studio.logoUrl
                  }
                  sellerInitials={artist?.avatar}
                  city={studio.city}
                  studioSlug={studio.slug}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function MarketplaceCard({
  listing,
  sellerName,
  sellerPhotoUrl,
  sellerInitials,
  city,
  studioSlug,
}: {
  listing: ArtworkListing;
  sellerName: string;
  sellerPhotoUrl?: string;
  sellerInitials?: string;
  city: string;
  studioSlug: string;
}) {
  const soldOut = listing.status !== "publicada";
  const initials =
    sellerInitials ||
    sellerName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

  return (
    <Link
      href={`/estudio/${studioSlug}/obra/${listing.id}`}
      onClick={() =>
        trackMarketingEvent("ViewContent", {
          source: "marketplace",
          value: listing.price,
          metadata: {
            listingId: listing.id,
            artistId: listing.artistId,
            cta: "marketplace_fb_card",
          },
        })
      }
      className="group overflow-hidden rounded-xl border border-transparent bg-[#16161a] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-glow)] hover:bg-[#1a1a20] hover:shadow-[0_8px_28px_#f9731622]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#0d0d10]">
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          className={`object-contain object-center transition duration-300 group-hover:scale-[1.02] ${
            soldOut ? "opacity-55 grayscale" : ""
          }`}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
          <div className="absolute inset-0 bg-gradient-to-t from-[#f9731622] via-transparent to-transparent" />
        </div>
        {soldOut ? (
          <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            {listing.status === "vendida" ? "Vendido" : "Reservado"}
          </span>
        ) : null}
      </div>
      <div className="space-y-0.5 p-2.5 sm:p-3">
        <p className="text-base font-bold leading-tight text-[var(--accent-glow)] sm:text-lg">
          {formatMoney(listing.price)}
        </p>
        <p className="line-clamp-2 text-sm leading-snug text-[var(--text)] transition group-hover:text-white">
          {listing.title}
        </p>
        <div className="flex min-w-0 items-center gap-1.5 pt-0.5">
          <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[#0a0a0c]">
            {sellerPhotoUrl ? (
              <Image
                src={sellerPhotoUrl}
                alt={sellerName}
                fill
                className="object-cover"
                sizes="20px"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[8px] font-semibold text-[var(--accent-glow)]">
                {initials}
              </span>
            )}
          </span>
          <p className="truncate text-xs text-[var(--text-dim)] group-hover:text-[var(--accent-glow)]">
            {city} · {sellerName}
          </p>
        </div>
      </div>
    </Link>
  );
}
