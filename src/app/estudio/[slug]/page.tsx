"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  AtSign,
  ExternalLink,
  Gavel,
  MapPin,
  Phone,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { DynamicStudioScene } from "@/components/3d/DynamicScenes";
import { CarrizoArtLogo } from "@/components/CarrizoArtLogo";
import { SocialIconLinks, SocialStrip } from "@/components/SocialStrip";
import { UserCard } from "@/components/UserCard";
import { TikTokVideoCarousel } from "@/components/TikTokVideoCarousel";
import { AuctionCard } from "@/components/LiveAuctionRoom";
import { PubgRouletteTeaser } from "@/components/PubgRoulette";
import { useSessionUser } from "@/hooks/useSessionUser";
import { resolveAuctionStatus } from "@/lib/auction";
import { trackMarketingEvent, trackPageView } from "@/lib/analytics";
import { styleLabel } from "@/lib/quote-engine";
import { useCarrizo } from "@/lib/store";

const LEGACY_SLUGS = new Set(["nueva-temporada", "santiago-ink"]);

export default function EstudioPublicPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const studio = useCarrizo((s) => s.studio);
  const artists = useCarrizo((s) => s.artists);
  const portfolio = useCarrizo((s) => s.portfolio);
  const auctions = useCarrizo((s) => s.auctions);
  const marketplaceListings = useCarrizo((s) => s.marketplaceListings);
  const hydrated = useCarrizo((s) => s.hydrated);
  const { sessionUser } = useSessionUser();
  const isLoggedIn = Boolean(sessionUser);
  const artist = artists[0];
  const featuredListings = marketplaceListings
    .filter((item) => item.status === "publicada")
    .slice(0, 3);
  const liveAuction = useMemo(
    () =>
      auctions.find((item) => resolveAuctionStatus(item) === "en_vivo") ??
      auctions[0],
    [auctions],
  );
  const accesoLogin = `/acceso?from=estudio&mode=login`;
  const accesoRegister = `/acceso?from=estudio&mode=register`;

  useEffect(() => {
    if (LEGACY_SLUGS.has(params.slug)) {
      router.replace(`/estudio/${studio.slug}`);
      return;
    }
    trackPageView("studio");
  }, [params.slug, router, studio.slug]);

  if (!hydrated || LEGACY_SLUGS.has(params.slug)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Cargando perfil del artista...
      </div>
    );
  }

  if (params.slug !== studio.slug) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Artista no encontrado.
      </div>
    );
  }

  return (
    <div className="ink-grid min-h-screen overflow-x-hidden">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:py-5">
        <div className="min-w-0 shrink-0">
          <CarrizoArtLogo
            href="/"
            variant="neon"
            size="md"
            align="left"
            showGlow
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <SocialIconLinks studio={studio} />

          <span className="hidden h-5 w-px bg-[var(--border)] sm:block" aria-hidden />

          {isLoggedIn ? (
            <>
              <nav className="flex items-center gap-2">
                <Link
                  href={`/estudio/${studio.slug}/tienda`}
                  onClick={() =>
                    trackMarketingEvent("ViewContent", {
                      source: "marketplace",
                      metadata: { cta: "artist_header_marketplace" },
                    })
                  }
                  className="btn-secondary px-3 py-2 text-xs sm:px-4 sm:text-sm"
                >
                  Tienda
                </Link>
                <Link
                  href={`/estudio/${studio.slug}/subasta`}
                  onClick={() =>
                    trackMarketingEvent("ViewContent", {
                      source: "studio",
                      metadata: { cta: "artist_header_auction" },
                    })
                  }
                  className="btn-secondary px-3 py-2 text-xs sm:px-4 sm:text-sm"
                >
                  Subasta
                </Link>
              </nav>

              <span className="hidden h-5 w-px bg-[var(--border)] md:block" aria-hidden />

              <UserCard />

              <Link
                href={`/estudio/${studio.slug}/reservar`}
                onClick={() =>
                  trackMarketingEvent("Lead", {
                    source: "studio",
                    metadata: { cta: "artist_header_booking" },
                  })
                }
                className="btn-primary px-3 py-2 text-xs sm:px-4 sm:text-sm"
              >
                Reservar turno
              </Link>
            </>
          ) : (
            <>
              <Link
                href={accesoLogin}
                className="btn-secondary px-3 py-2 text-xs sm:px-4 sm:text-sm"
              >
                Iniciar sesión
              </Link>
              <Link
                href={accesoRegister}
                className="btn-primary px-3 py-2 text-xs sm:px-4 sm:text-sm"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16">
        <section className="card w-full overflow-hidden">
          <div className="relative h-48 w-full sm:h-72">
            <Image
              src={studio.coverUrl}
              alt={`${studio.name} portada`}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070708] via-[#07070888] to-transparent" />
          </div>

          <div className="relative -mt-14 grid w-full gap-6 px-4 pb-6 sm:-mt-16 sm:gap-8 sm:px-8 sm:pb-8 lg:grid-cols-[1.2fr_0.65fr] lg:items-start">
            <div className="min-w-0">
              <div className="mb-4">
                <span className="badge badge-gold mb-2">Artista en Santiago</span>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">
                  {studio.name}
                </h1>
                <p className="mt-1 text-sm text-[var(--text-muted)] sm:text-base">
                  {studio.tagline}
                </p>
              </div>

              <p className="text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
                {studio.bio}
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-sm text-[var(--text-muted)] sm:gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[#0d0d10] px-3 py-1.5">
                  <MapPin size={14} /> {studio.city}
                </span>
                {isLoggedIn ? (
                  <>
                    <a
                      href={`tel:${studio.phone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[#0d0d10] px-3 py-1.5 hover:border-[#f9731666]"
                    >
                      <Phone size={14} /> {studio.phone}
                    </a>
                    <a
                      href={studio.instagramUrl || "https://www.instagram.com/carrizo_artist"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[#0d0d10] px-3 py-1.5 hover:border-[#e11d4866]"
                    >
                      <AtSign size={14} /> {studio.instagram}
                    </a>
                  </>
                ) : null}
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[#0d0d10] px-3 py-1.5">
                  <Sparkles size={14} /> {studio.followersLabel}
                </span>
              </div>

              <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={`/estudio/${studio.slug}/reservar`}
                  onClick={() =>
                    trackMarketingEvent("Lead", {
                      source: "studio",
                      metadata: { cta: "hero_booking" },
                    })
                  }
                  className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3"
                >
                  Reservar turno
                  <ArrowRight size={16} />
                </Link>
                {isLoggedIn ? (
                  <>
                    <a
                      href={studio.facebook}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() =>
                        trackMarketingEvent("Contact", {
                          source: "studio",
                          metadata: { channel: "facebook" },
                        })
                      }
                      className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3"
                    >
                      Ver Facebook
                      <ExternalLink size={15} />
                    </a>
                    <Link
                      href={`/estudio/${studio.slug}/tienda`}
                      onClick={() =>
                        trackMarketingEvent("CTAClick", {
                          source: "marketplace",
                          metadata: { cta: "hero_marketplace" },
                        })
                      }
                      className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3"
                    >
                      Obras únicas
                      <ShoppingBag size={15} />
                    </Link>
                  </>
                ) : null}
              </div>

              {artist ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {artist.specialties.map((style) => (
                    <span key={style} className="badge badge-gray">
                      {styleLabel(style)}
                    </span>
                  ))}
                </div>
              ) : null}

              {isLoggedIn ? (
                <div className="mt-6">
                  <SocialStrip studio={studio} />
                </div>
              ) : null}
            </div>

            <div className="hidden min-w-0 lg:sticky lg:top-6 lg:block lg:self-start">
              <DynamicStudioScene />
            </div>
          </div>
        </section>

        {liveAuction ? (
          <section className="mt-10">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="inline-flex items-center gap-2 text-2xl font-semibold">
                  <Gavel className="text-[var(--accent-glow)]" size={22} />
                  Subasta en vivo
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Enderxon publica un tatuaje y se lo lleva el mejor postor.
                </p>
              </div>
              <Link
                href={`/estudio/${studio.slug}/subasta`}
                onClick={() =>
                  trackMarketingEvent("ViewContent", {
                    source: "studio",
                    metadata: { cta: "auction_section" },
                  })
                }
                className="btn-primary px-4 py-2 text-sm"
              >
                Entrar a la sala
              </Link>
            </div>
            <div className="grid gap-4">
              <AuctionCard
                auction={liveAuction}
                href={`/estudio/${studio.slug}/subasta`}
              />
            </div>
          </section>
        ) : null}

        {featuredListings.length > 0 ? (
          <section className="mt-10">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="inline-flex items-center gap-2 text-2xl font-semibold">
                  <ShoppingBag className="text-[var(--accent-glow)]" size={22} />
                  Marketplace de obras únicas
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Compra directa estilo marketplace: pieza única, precio fijo y
                  reserva protegida.
                </p>
              </div>
              <Link
                href={`/estudio/${studio.slug}/tienda`}
                onClick={() =>
                  trackMarketingEvent("CTAClick", {
                    source: "marketplace",
                    metadata: { cta: "marketplace_section" },
                  })
                }
                className="btn-primary px-4 py-2 text-sm"
              >
                Ver tienda
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
              {featuredListings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/estudio/${studio.slug}/obra/${listing.id}`}
                  onClick={() =>
                    trackMarketingEvent("ViewContent", {
                      source: "marketplace",
                      value: listing.price,
                      metadata: { listingId: listing.id, cta: "studio_featured_listing" },
                    })
                  }
                  className="group overflow-hidden rounded-xl border border-transparent bg-[#16161a] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-glow)] hover:bg-[#1a1a20] hover:shadow-[0_8px_28px_#f9731622]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#0d0d10]">
                    <Image
                      src={listing.image}
                      alt={listing.title}
                      fill
                      className="object-contain object-center transition duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#f9731622] via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                  </div>
                  <div className="space-y-0.5 p-2.5 sm:p-3">
                    <p className="text-base font-bold leading-tight text-[var(--accent-glow)]">
                      {listing.price.toLocaleString("es-CL", {
                        style: "currency",
                        currency: "CLP",
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="line-clamp-2 text-sm leading-snug transition group-hover:text-white">
                      {listing.title}
                    </p>
                    <p className="truncate text-xs text-[var(--text-dim)] group-hover:text-[var(--accent-glow)]">
                      {studio.city} · {styleLabel(listing.style)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-10">
          <PubgRouletteTeaser href={`/estudio/${studio.slug}/ruleta`} />
        </section>

        <section className="mt-10">
          <TikTokVideoCarousel profileUrl={studio.tiktokUrl} />
        </section>

        <section className="mt-10">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Portafolio</h2>
              <p className="text-sm text-[var(--text-muted)]">
                Trabajos reales de Enderxon Carrizo. Toca una pieza para registrar interés.
              </p>
            </div>
            <Link
              href={`/estudio/${studio.slug}/reservar`}
              onClick={() =>
                trackMarketingEvent("Lead", {
                  source: "studio",
                  metadata: { cta: "portfolio_booking" },
                })
              }
              className="btn-secondary px-4 py-2 text-sm"
            >
              Cotizar mi idea
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  trackMarketingEvent("ViewContent", {
                    source: "studio",
                    metadata: { portfolio: item.title, style: item.style },
                  })
                }
                className="card tilt-card overflow-hidden text-left"
              >
                <div className="relative h-56">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    unoptimized={item.image.startsWith("data:")}
                    className="object-cover transition duration-300 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-lg font-semibold">{item.title}</p>
                    <p className="text-sm text-white/75">{styleLabel(item.style)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["1", "Cuéntame tu idea", "Estilo, zona, tamaño y referencias."],
            ["2", "Recibe cotización", "Precio estimado y abono en CLP."],
            ["3", "Confirma tu sesión", "Agenda bloqueada al pagar el abono."],
          ].map(([step, title, text]) => (
            <div key={step} className="card p-5">
              <span className="badge badge-rose mb-3">Paso {step}</span>
              <h3 className="font-medium">{title}</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
