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

export function auctionStatusLabel(status: AuctionStatus) {
  const map: Record<AuctionStatus, string> = {
    programada: "Programada",
    en_vivo: "En vivo",
    finalizada: "Finalizada",
    cancelada: "Cancelada",
  };
  return map[status];
}
