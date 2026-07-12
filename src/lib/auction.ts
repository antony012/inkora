import type { AuctionBid, AuctionStatus, TattooAuction } from "./types";

export function resolveAuctionStatus(
  auction: Pick<TattooAuction, "status" | "startsAt" | "endsAt">,
  now = Date.now(),
): AuctionStatus {
  if (auction.status === "cancelada") return "cancelada";
  if (auction.status === "finalizada") return "finalizada";

  const starts = new Date(auction.startsAt).getTime();
  const ends = new Date(auction.endsAt).getTime();

  if (now < starts) return "programada";
  if (now >= ends) return "finalizada";
  return "en_vivo";
}

export function formatCountdown(endsAt: string, now = Date.now()) {
  const diff = Math.max(0, new Date(endsAt).getTime() - now);
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function sortBids(bids: AuctionBid[]) {
  return [...bids].sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function leadingBid(auction: TattooAuction) {
  return sortBids(auction.bids)[0];
}

export function nextMinBid(auction: TattooAuction) {
  const leader = leadingBid(auction);
  if (!leader) return auction.startingPrice;
  const top = Math.max(auction.currentBid, leader.amount);
  return top + auction.minIncrement;
}

export function auctionActivityScore(auction: TattooAuction) {
  const latestBid = auction.bids.reduce(
    (max, bid) => Math.max(max, new Date(bid.createdAt).getTime()),
    0,
  );
  return Math.max(latestBid, new Date(auction.createdAt).getTime());
}

/** Subasta en vivo más reciente (prioriza la creada última, no el seed demo). */
export function getPrimaryLiveAuction(
  auctions: TattooAuction[],
  now = Date.now(),
) {
  const live = auctions.filter(
    (item) => resolveAuctionStatus(item, now) === "en_vivo",
  );
  if (!live.length) return auctions[0];

  return [...live].sort((a, b) => {
    const createdDiff =
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (createdDiff !== 0) return createdDiff;
    return auctionActivityScore(b) - auctionActivityScore(a);
  })[0];
}

export function auctionStatusLabel(status: AuctionStatus) {
  const map: Record<AuctionStatus, string> = {
    programada: "Programada",
    en_vivo: "En vivo",
    finalizada: "Finalizada",
    cancelada: "Cancelada",
  };
  return map[status];
}
