"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  Lock,
  ShieldCheck,
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
    // Solo cuenta una vista por montaje de esta ficha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, listing?.id]);

  if (!hydrated || LEGACY_SLUGS.has(params.slug)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Cargando obra...
      </div>
    );
  }

  if (params.slug !== studio.slug || !listing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Obra no encontrada.
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
    <div className="ink-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/estudio/${studio.slug}/tienda`}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-white"
        >
          <ArrowLeft size={14} />
          Volver a la tienda
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <UserCard />
          <span className={`badge ${listingStatusTone(listing.status)}`}>
            {listingStatusLabel(listing.status)}
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 lg:grid-cols-[1fr_0.75fr]">
        <section className="card overflow-hidden">
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={listing.image}
              alt={listing.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          </div>
          <div className="space-y-5 p-5 sm:p-7">
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-gray">{styleLabel(listing.style)}</span>
              <span className="badge badge-gray">{listing.size ?? "pieza única"}</span>
              <span className="badge badge-gold">Stock 1</span>
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{listing.title}</h1>
              <p className="mt-3 text-[var(--text-muted)]">{listing.description}</p>
            </div>

            {listing.story ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[#0d0d10] p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">
                  Historia de la obra
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                  {listing.story}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card space-y-5 p-5">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Precio fijo</p>
              <p className="text-4xl font-semibold">{formatMoney(listing.price)}</p>
              <p className="mt-1 text-xs text-[var(--text-dim)]">
                Compra directa de obra única. Sin pujas ni subastas.
              </p>
            </div>

            {!sessionUser ? (
              <Link
                href="/acceso?from=marketplace"
                className="btn-primary flex w-full items-center justify-center gap-2 py-3"
              >
                Iniciar sesión para comprar
              </Link>
            ) : !verified ? (
              <div className="rounded-2xl border border-[#fbbf2444] bg-[#fbbf2411] p-4 text-sm text-[#fcd34d]">
                <p className="flex items-center gap-2 font-medium">
                  <Lock size={15} /> Verificación requerida
                </p>
                <p className="mt-1 text-xs">
                  Protegemos compras únicas con identidad verificada. Completa tu documento
                  en Acceso.
                </p>
              </div>
            ) : canBuy ? (
              <button
                type="button"
                onClick={onPurchase}
                className="btn-primary flex w-full items-center justify-center gap-2 py-3"
              >
                <CreditCard size={16} />
                Comprar ahora
              </button>
            ) : (
              <button type="button" disabled className="btn-secondary w-full py-3 opacity-60">
                {listingStatusLabel(listing.status)}
              </button>
            )}

            {order?.status === "pendiente_pago" ? (
              <button type="button" onClick={onPay} className="btn-secondary w-full py-3">
                Simular pago MercadoPago
              </button>
            ) : null}

            {message ? (
              <p className="rounded-xl border border-[#34d39944] bg-[#34d39911] p-3 text-sm text-[#6ee7b7]">
                {message}
              </p>
            ) : null}
          </section>

          <section className="card space-y-4 p-5">
            <div className="flex items-center gap-3">
              {artist?.photoUrl ? (
                <div className="relative h-12 w-12 overflow-hidden rounded-2xl">
                  <Image
                    src={artist.photoUrl}
                    alt={artist.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#34d39922] text-[#6ee7b7]">
                  <ShieldCheck />
                </div>
              )}
              <div>
                <p className="font-semibold">{artist?.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{artist?.role}</p>
              </div>
            </div>
            {artist?.story ? (
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                {artist.story}
              </p>
            ) : null}
            <div className="space-y-2 text-sm text-[var(--text-muted)]">
              <p className="flex items-center gap-2">
                <BadgeCheck size={15} className="text-[#6ee7b7]" />
                Artista curado por {studio.name}
              </p>
              <p>
                Tras confirmar la compra, el estudio coordina adaptación al cuerpo y fecha
                de sesión.
              </p>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
