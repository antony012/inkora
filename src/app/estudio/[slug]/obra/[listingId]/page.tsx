"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  Lock,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { UserCard } from "@/components/UserCard";
import { useSessionUser } from "@/hooks/useSessionUser";
import { trackMarketingEvent, trackPageView } from "@/lib/analytics";
import { listingStatusLabel, listingStatusTone } from "@/lib/marketplace";
import { formatMoney, styleLabel } from "@/lib/quote-engine";
import { useCarrizo } from "@/lib/store";

const LEGACY_SLUGS = new Set(["nueva-temporada", "santiago-ink"]);

export default function MarketplaceListingPage() {
  const params = useParams<{ slug: string; listingId: string }>();
  const router = useRouter();
  const studio = useCarrizo((s) => s.studio);
  const artists = useCarrizo((s) => s.artists);
  const listings = useCarrizo((s) => s.marketplaceListings);
  const orders = useCarrizo((s) => s.marketplaceOrders);
  const hydrated = useCarrizo((s) => s.hydrated);
  const bumpListingView = useCarrizo((s) => s.bumpListingView);
  const trackListingClick = useCarrizo((s) => s.trackListingClick);
  const purchaseListing = useCarrizo((s) => s.purchaseListing);
  const markOrderPaid = useCarrizo((s) => s.markMarketplaceOrderPaid);
  const { sessionUser } = useSessionUser();
  const [message, setMessage] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const listing = listings.find((item) => item.id === params.listingId);
  const artist = artists.find((item) => item.id === listing?.artistId) ?? artists[0];
  const order = useMemo(
    () =>
      createdOrderId
        ? orders.find((item) => item.id === createdOrderId)
        : orders.find((item) => item.listingId === params.listingId),
    [createdOrderId, orders, params.listingId],
  );

  useEffect(() => {
    if (LEGACY_SLUGS.has(params.slug)) {
      router.replace(`/estudio/${studio.slug}/obra/${params.listingId}`);
      return;
    }
    trackPageView("marketplace");
  }, [params.slug, params.listingId, router, studio.slug]);

  useEffect(() => {
    if (!hydrated || !listing) return;
    bumpListingView(listing.id);
    trackMarketingEvent("ViewContent", {
      source: "marketplace",
      value: listing.price,
      metadata: {
        listingId: listing.id,
        artistId: listing.artistId,
        page: "listing_detail",
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, listing?.id]);

  if (!hydrated || LEGACY_SLUGS.has(params.slug)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Cargando publicación...
      </div>
    );
  }

  if (params.slug !== studio.slug || !listing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Publicación no encontrada.
      </div>
    );
  }

  const canBuy = listing.status === "publicada";
  const verified = sessionUser?.verificationStatus === "verificado";

  const onPurchase = () => {
    trackListingClick(listing.id);
    trackMarketingEvent("InitiateCheckout", {
      source: "marketplace",
      value: listing.price,
      metadata: { listingId: listing.id, artistId: listing.artistId },
    });

    const result = purchaseListing({ listingId: listing.id });
    if (!result.ok) {
      setMessage(result.error ?? "No se pudo iniciar la compra.");
      return;
    }

    setCreatedOrderId(result.orderId ?? null);
    setMessage(
      "Obra reservada. El estudio confirmará el pago y coordinará la sesión contigo.",
    );
  };

  const onPay = () => {
    if (!order) return;
    markOrderPaid(order.id);
    trackMarketingEvent("Purchase", {
      source: "marketplace",
      value: order.amount,
      metadata: {
        listingId: order.listingId,
        orderId: order.id,
      },
    });
    setMessage("Pago confirmado. El estudio coordinará la sesión contigo.");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0a0c] text-[var(--text)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[#0a0a0cee] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <Link
            href={`/estudio/${studio.slug}/tienda`}
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent-glow)]"
          >
            <ArrowLeft size={16} />
            Marketplace
          </Link>
          <UserCard compact />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-0 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-6 lg:px-4 lg:py-6">
        <section className="bg-[#111114] lg:self-start lg:overflow-hidden lg:rounded-2xl">
          <div className="flex w-full items-center justify-center bg-[#0d0d10]">
            <Image
              src={listing.image}
              alt={listing.title}
              width={1600}
              height={2000}
              priority
              className="h-auto max-h-[min(85vh,920px)] w-full object-contain"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          </div>
        </section>

        <aside className="space-y-0 border-t border-[var(--border)] bg-[#0a0a0c] px-4 py-5 sm:px-5 lg:space-y-4 lg:border-0 lg:bg-transparent lg:p-0">
          <section className="space-y-3 lg:rounded-2xl lg:border lg:border-[var(--border)] lg:bg-[#111114] lg:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${listingStatusTone(listing.status)}`}>
                {listingStatusLabel(listing.status)}
              </span>
              <span className="badge badge-gray">Pieza única</span>
            </div>

            <p className="text-3xl font-bold tracking-tight text-[var(--accent-glow)] sm:text-4xl">
              {formatMoney(listing.price)}
            </p>
            <h1 className="text-xl font-semibold leading-snug sm:text-2xl">
              {listing.title}
            </h1>
            <p className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
              <MapPin size={14} />
              En venta en {studio.city}
            </p>
            <p className="text-sm text-[var(--text-dim)]">
              {styleLabel(listing.style)}
              {listing.size ? ` · ${listing.size.replaceAll("_", " ")}` : ""}
            </p>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              {!sessionUser ? (
                <Link
                  href="/acceso?from=marketplace&mode=login"
                  className="btn-primary flex flex-1 items-center justify-center gap-2 py-3"
                >
                  Iniciar sesión para comprar
                </Link>
              ) : !verified ? (
                <Link
                  href="/acceso?from=marketplace"
                  className="btn-primary flex flex-1 items-center justify-center gap-2 py-3"
                >
                  <Lock size={15} />
                  Verificar para comprar
                </Link>
              ) : canBuy ? (
                <button
                  type="button"
                  onClick={onPurchase}
                  className="btn-primary flex flex-1 items-center justify-center gap-2 py-3"
                >
                  <CreditCard size={16} />
                  Comprar
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn-secondary flex-1 py-3 opacity-60"
                >
                  {listingStatusLabel(listing.status)}
                </button>
              )}
              <a
                href={`https://wa.me/${studio.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `Hola, me interesa "${listing.title}" en Marketplace (${formatMoney(listing.price)}).`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary inline-flex flex-1 items-center justify-center gap-2 py-3"
              >
                <MessageCircle size={16} />
                Mensaje
              </a>
            </div>

            {order?.status === "pendiente_pago" ? (
              <button
                type="button"
                onClick={onPay}
                className="btn-secondary w-full py-3"
              >
                Simular pago MercadoPago
              </button>
            ) : null}

            {message ? (
              <p className="rounded-xl border border-[#34d39944] bg-[#34d39911] p-3 text-sm text-[#6ee7b7]">
                {message}
              </p>
            ) : null}
          </section>

          <section className="mt-5 border-t border-[var(--border)] pt-5 lg:mt-0 lg:rounded-2xl lg:border lg:border-[var(--border)] lg:bg-[#111114] lg:p-5 lg:pt-5">
            <p className="mb-3 text-sm font-semibold">Información del vendedor</p>
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full bg-[#1c1c22]">
                {artist?.photoUrl ? (
                  <Image
                    src={artist.photoUrl}
                    alt={artist.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-medium">
                  {artist?.name}
                  <BadgeCheck size={15} className="text-[var(--accent-glow)]" />
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {artist?.role ?? "Artista"} · {studio.name}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-5 border-t border-[var(--border)] pt-5 lg:mt-0 lg:rounded-2xl lg:border lg:border-[var(--border)] lg:bg-[#111114] lg:p-5 lg:pt-5">
            <p className="mb-2 text-sm font-semibold">Detalles</p>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {listing.description}
            </p>
            {listing.story ? (
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">
                {listing.story}
              </p>
            ) : null}
            <p className="mt-4 text-xs text-[var(--text-dim)]">
              Tras confirmar la compra, el estudio coordina adaptación al cuerpo y fecha
              de sesión.
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}
