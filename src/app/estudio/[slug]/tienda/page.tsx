"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  ShoppingBag,
  Star,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { SocialStrip } from "@/components/SocialStrip";
import { UserCard } from "@/components/UserCard";
import { trackMarketingEvent, trackPageView } from "@/lib/analytics";
import {
  listingStatusLabel,
  listingStatusTone,
} from "@/lib/marketplace";
import { formatMoney, styleLabel } from "@/lib/quote-engine";
import { useCarrizo } from "@/lib/store";
import type { Artist, ArtworkListing } from "@/lib/types";

const LEGACY_SLUGS = new Set(["nueva-temporada", "santiago-ink"]);

export default function MarketplaceStorePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const studio = useCarrizo((s) => s.studio);
  const artists = useCarrizo((s) => s.artists);
  const listings = useCarrizo((s) => s.marketplaceListings);
  const hydrated = useCarrizo((s) => s.hydrated);
  const resident = artists.find((item) => item.id === "artist-1") ?? artists[0];

  const visibleListings = useMemo(
    () =>
      listings
        .filter((item) => item.status !== "borrador" && item.status !== "pausada")
        .sort((a, b) => {
          if (a.status === "publicada" && b.status !== "publicada") return -1;
          if (b.status === "publicada" && a.status !== "publicada") return 1;
          return (
            new Date(b.publishedAt ?? b.createdAt).getTime() -
            new Date(a.publishedAt ?? a.createdAt).getTime()
          );
        }),
    [listings],
  );

  const activeArtists = useMemo(() => {
    const withListings = artists.filter(
      (artist) =>
        artist.active &&
        visibleListings.some((listing) => listing.artistId === artist.id),
    );
    return withListings.length ? withListings : artists.filter((item) => item.active);
  }, [artists, visibleListings]);

  const listingsByArtist = useMemo(() => {
    const map = new Map<string, ArtworkListing[]>();
    for (const listing of visibleListings) {
      const bucket = map.get(listing.artistId) ?? [];
      bucket.push(listing);
      map.set(listing.artistId, bucket);
    }
    return map;
  }, [visibleListings]);

  const availableCount = visibleListings.filter(
    (item) => item.status === "publicada",
  ).length;

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
        Cargando tienda de obras únicas...
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
    <div className="ink-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/estudio/${studio.slug}`}
          className="text-sm text-[var(--text-muted)] hover:text-white"
        >
          ← {studio.name}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <UserCard />
          <span className="badge badge-green">
            <ShoppingBag size={12} /> Obras únicas
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        <section className="card overflow-hidden">
          <div className="grid gap-8 p-6 lg:grid-cols-[1fr_0.8fr] lg:p-8">
            <div>
              <span className="badge badge-gold mb-3">
                Curaduría {studio.name}
              </span>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                Marketplace de obras únicas
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
                {resident?.name ?? studio.name} cura y administra piezas de artistas
                residentes e invitados. Cada obra se vende una sola vez: eliges la pieza,
                reservas con tu cuenta verificada y el estudio confirma pago, fecha y
                adaptación al cuerpo.
              </p>

              {resident?.story ? (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                  {resident.story}
                </p>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <MetricCard label="Artistas" value={activeArtists.length.toString()} />
                <MetricCard label="Disponibles" value={availableCount.toString()} />
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[#0d0d10] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#34d39922] text-[#6ee7b7]">
                  <ShieldCheck />
                </div>
                <div>
                  <p className="font-semibold">Confianza de compra</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Identidad verificada, pago trazable y estado de orden.
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm text-[var(--text-muted)]">
                <p className="flex items-center gap-2">
                  <BadgeCheck size={16} className="text-[#6ee7b7]" />
                  Estudio curado · {activeArtists.length} artistas activos
                </p>
                <p className="flex items-center gap-2">
                  <Star size={16} className="text-[#facc15]" />
                  Compra protegida y coordinación de sesión con el estudio
                </p>
              </div>
              <div className="mt-5">
                <SocialStrip studio={studio} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 space-y-10">
          {activeArtists.map((artist) => {
            const artistListings = listingsByArtist.get(artist.id) ?? [];
            if (!artistListings.length) return null;
            return (
              <ArtistSection
                key={artist.id}
                artist={artist}
                listings={artistListings}
                studioSlug={studio.slug}
              />
            );
          })}
        </section>

        <section className="mt-10 text-center">
          <Link
            href={`/estudio/${studio.slug}/reservar`}
            className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
          >
            Quiero algo personalizado
            <ArrowRight size={14} />
          </Link>
        </section>
      </main>
    </div>
  );
}

function ArtistSection({
  artist,
  listings,
  studioSlug,
}: {
  artist: Artist;
  listings: ArtworkListing[];
  studioSlug: string;
}) {
  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[#0d0d10] p-5 sm:flex-row sm:items-center">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
          <Image
            src={artist.photoUrl ?? "/artists/enderxon/avatar.jpg"}
            alt={artist.name}
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold">{artist.name}</h2>
            <span className="badge badge-gray">{artist.role}</span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">
            {artist.story ?? artist.bio}
          </p>
          <p className="mt-2 text-xs text-[var(--text-dim)]">
            {listings.filter((item) => item.status === "publicada").length} disponibles
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <Link
            key={listing.id}
            href={`/estudio/${studioSlug}/obra/${listing.id}`}
            onClick={() =>
              trackMarketingEvent("ViewContent", {
                source: "marketplace",
                value: listing.price,
                metadata: {
                  listingId: listing.id,
                  artistId: listing.artistId,
                  cta: "marketplace_grid_card",
                },
              })
            }
            className="card-hover group overflow-hidden rounded-3xl border border-[var(--border)] bg-[#0d0d10]"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={listing.image}
                alt={listing.title}
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute left-3 top-3 flex gap-2">
                <span className={`badge ${listingStatusTone(listing.status)}`}>
                  {listingStatusLabel(listing.status)}
                </span>
                <span className="badge badge-gray">Única</span>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <h3 className="line-clamp-1 font-semibold">{listing.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
                  {listing.description}
                </p>
                {listing.story ? (
                  <p className="mt-2 line-clamp-2 text-xs text-[var(--text-dim)]">
                    {listing.story}
                  </p>
                ) : null}
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-[var(--text-dim)]">
                    {styleLabel(listing.style)} · {listing.size ?? "única"}
                  </p>
                  <p className="text-xl font-semibold">{formatMoney(listing.price)}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
