import type { Artist, ArtworkListing, MarketplaceOrder } from "./types";

export function listingStatusLabel(status: ArtworkListing["status"]) {
  const labels: Record<ArtworkListing["status"], string> = {
    borrador: "Borrador",
    publicada: "Disponible",
    reservada: "Reservada",
    vendida: "Vendida",
    pausada: "Pausada",
  };
  return labels[status];
}

export function orderStatusLabel(status: MarketplaceOrder["status"]) {
  const labels: Record<MarketplaceOrder["status"], string> = {
    pendiente_pago: "Pago pendiente",
    pagado: "Pagada",
    entregado: "Entregada",
    cancelado: "Cancelada",
  };
  return labels[status];
}

export function listingStatusTone(status: ArtworkListing["status"]) {
  if (status === "publicada") return "badge-green";
  if (status === "reservada") return "badge-gold";
  if (status === "vendida") return "badge-gray";
  if (status === "pausada") return "badge-rose";
  return "badge-gray";
}

export const STUDIO_MARKETPLACE_FEE_PERCENT = 30;

export function studioMarketplaceSplit(price: number) {
  const feePercent = STUDIO_MARKETPLACE_FEE_PERCENT;
  const platformFee = Math.round((price * feePercent) / 100);
  return {
    feePercent,
    platformFee,
    artistPayout: price - platformFee,
  };
}

export function marketplaceFeePercent(artist?: Artist) {
  return STUDIO_MARKETPLACE_FEE_PERCENT;
}

export function marketplaceSplit(price: number, _artist?: Artist) {
  return studioMarketplaceSplit(price);
}

export function listingCtr(listing: ArtworkListing) {
  if (listing.views <= 0) return 0;
  return Math.round((listing.clicks / listing.views) * 1000) / 10;
}

export function requiresArtistSaleContract(artistId: string) {
  return artistId !== "artist-1";
}
