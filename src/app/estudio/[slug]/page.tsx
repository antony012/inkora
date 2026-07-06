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
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { DynamicStudioScene } from "@/components/3d/DynamicScenes";
import { CarrizoArtLogo } from "@/components/CarrizoArtLogo";
import { SocialStrip } from "@/components/SocialStrip";
import { UserCard } from "@/components/UserCard";
import { TikTokVideoCarousel } from "@/components/TikTokVideoCarousel";
import { AuctionCard } from "@/components/LiveAuctionRoom";
import { PubgRouletteTeaser } from "@/components/PubgRoulette";
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
  const hydrated = useCarrizo((s) => s.hydrated);
  const artist = artists[0];
  const liveAuction = useMemo(
    () =>
      auctions.find((item) => resolveAuctionStatus(item) === "en_vivo") ??
      auctions[0],
    [auctions],
  );

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
    <div className="ink-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <CarrizoArtLogo
          href="/"
          variant="neon"
          size="md"
          align="left"
          showGlow
        />
        <div className="flex items-center gap-2">
          <UserCard />
          <a
            href={studio.facebook}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary px-4 py-2 text-sm"
          >
            Facebook
          </a>
          <Link
            href={`/estudio/${studio.slug}/subasta`}
            onClick={() =>
              trackMarketingEvent("ViewContent", {
                source: "studio",
                metadata: { cta: "artist_header_auction" },
              })
            }
            className="btn-secondary px-4 py-2 text-sm"
          >
            Subasta
          </Link>
          <Link
            href={`/estudio/${studio.slug}/reservar`}
            onClick={() =>
              trackMarketingEvent("Lead", {
                source: "studio",
                metadata: { cta: "artist_header_booking" },
              })
            }
            className="btn-primary px-4 py-2 text-sm"
          >
            Reservar turno
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        <section className="card overflow-hidden">
          <div className="relative h-56 sm:h-72">
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

          <div className="relative -mt-16 grid gap-8 px-5 pb-8 sm:px-8 lg:grid-cols-[1fr_0.85fr] lg:items-start">
            <div>
              <div className="mb-4">
                <span className="badge badge-gold mb-2">Artista en Santiago</span>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {studio.name}
                </h1>
                <p className="mt-1 text-[var(--text-muted)]">{studio.tagline}</p>
              </div>

              <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
                {studio.bio}
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[#0d0d10] px-3 py-1.5">
                  <MapPin size={14} /> {studio.city}
                </span>
                <a
                  href={`tel:${studio.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[#0d0d10] px-3 py-1.5 hover:border-[#f9731666]"
                >
                  <Phone size={14} /> {studio.phone}
                </a>
                <a
                  href="https://instagram.com/carrizo_artist"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[#0d0d10] px-3 py-1.5 hover:border-[#e11d4866]"
                >
                  <AtSign size={14} /> {studio.instagram}
                </a>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[#0d0d10] px-3 py-1.5">
                  <Sparkles size={14} /> {studio.followersLabel}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/estudio/${studio.slug}/reservar`}
                  onClick={() =>
                    trackMarketingEvent("Lead", {
                      source: "studio",
                      metadata: { cta: "hero_booking" },
                    })
                  }
                  className="btn-primary inline-flex items-center gap-2 px-6 py-3"
                >
                  Solicitar turno
                  <ArrowRight size={16} />
                </Link>
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
                  className="btn-secondary inline-flex items-center gap-2 px-6 py-3"
                >
                  Ver Facebook
                  <ExternalLink size={15} />
                </a>
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

              <div className="mt-6">
                <SocialStrip studio={studio} />
              </div>
            </div>

            <DynamicStudioScene />
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
                  Enderson publica un tatuaje y se lo lleva el mejor postor.
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
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <AuctionCard
                auction={liveAuction}
                href={`/estudio/${studio.slug}/subasta`}
              />
              <div className="card flex flex-col justify-center p-6">
                <span className="badge badge-rose mb-3 w-fit">En tiempo real</span>
                <h3 className="text-xl font-semibold">
                  Puja por una pieza exclusiva
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                  Ves la oferta actual, el reloj y el historial de pujas. Si
                  ofertas en el último minuto, el tiempo se extiende para que
                  nadie robe la pieza a último segundo.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    ["1", "Entras a la sala"],
                    ["2", "Pujas en vivo"],
                    ["3", "Ganas y agendas"],
                  ].map(([step, text]) => (
                    <div
                      key={step}
                      className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-3"
                    >
                      <p className="text-xs text-[var(--text-dim)]">Paso {step}</p>
                      <p className="mt-1 text-sm font-medium">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
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
                Trabajos reales de Enderson Carrizo. Toca una pieza para registrar interés.
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
