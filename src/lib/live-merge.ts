import type { AuctionRoomKick, TattooAuction } from "@/lib/types";

type AuctionSnapshot = {
  id: string;
  currentBid: number;
  endsAt: string;
  createdAt?: string;
  status?: string;
  bids: { id: string; amount: number; createdAt: string }[];
};

function auctionScore(auction: AuctionSnapshot) {
  const latestBid = auction.bids.reduce(
    (max, bid) => Math.max(max, new Date(bid.createdAt).getTime()),
    0,
  );
  return (
    auction.bids.length * 1_000_000_000_000 +
    auction.currentBid * 1_000_000 +
    latestBid +
    new Date(auction.endsAt).getTime() / 1_000_000
  );
}

function pickImage(a?: string, b?: string) {
  if (a && !a.startsWith("data:")) return a;
  if (b && !b.startsWith("data:")) return b;
  return a || b || "";
}

/** Quita data URLs para no romper el sync entre navegadores (payload enorme). */
export function sanitizeAuctionsForSync(
  auctions: TattooAuction[],
): TattooAuction[] {
  return auctions.map((auction) => ({
    ...auction,
    image: auction.image?.startsWith("data:")
      ? "/artists/enderxon/work-1.jpg"
      : auction.image,
  }));
}

function mergeBids(
  a: TattooAuction["bids"],
  b: TattooAuction["bids"],
): TattooAuction["bids"] {
  const map = new Map<string, TattooAuction["bids"][number]>();
  for (const bid of [...a, ...b]) {
    const prev = map.get(bid.id);
    if (!prev || bid.amount >= prev.amount) {
      map.set(bid.id, bid);
    }
  }
  return Array.from(map.values()).sort((x, y) => {
    if (y.amount !== x.amount) return y.amount - x.amount;
    return new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime();
  });
}

/** Une subastas por id, fusiona pujas y conserva la versión más activa. */
export function mergeAuctionLists(
  local: TattooAuction[],
  remote: TattooAuction[],
): TattooAuction[] {
  const map = new Map<string, TattooAuction>();

  for (const auction of [...local, ...remote]) {
    const existing = map.get(auction.id);
    if (!existing) {
      map.set(auction.id, auction);
      continue;
    }
    const winner =
      auctionScore(auction) >= auctionScore(existing) ? auction : existing;
    const other = winner === auction ? existing : auction;
    const bids = mergeBids(winner.bids, other.bids);
    const top = bids[0]?.amount ?? 0;
    const endsAt =
      new Date(winner.endsAt).getTime() >= new Date(other.endsAt).getTime()
        ? winner.endsAt
        : other.endsAt;
    // No resucitar en_vivo desde la copia perdedora (evita reabrir el seed).
    const status =
      winner.status === "cancelada" || other.status === "cancelada"
        ? ("cancelada" as const)
        : winner.status;

    map.set(auction.id, {
      ...winner,
      bids,
      currentBid: Math.max(winner.currentBid, other.currentBid, top),
      endsAt,
      image: pickImage(winner.image, other.image),
      status,
      winnerName:
        status === "finalizada" || status === "cancelada"
          ? bids[0]?.bidderName ??
            winner.winnerName ??
            other.winnerName
          : winner.winnerName ?? other.winnerName,
      winnerPhone:
        status === "finalizada" || status === "cancelada"
          ? bids[0]?.bidderPhone ??
            winner.winnerPhone ??
            other.winnerPhone
          : winner.winnerPhone ?? other.winnerPhone,
    });
  }

  return Array.from(map.values())
    .map((auction, _i, all) => {
      const hasCustomLive = all.some(
        (item) =>
          item.id !== "auction-live-1" &&
          item.status !== "cancelada" &&
          item.status !== "finalizada" &&
          new Date(item.endsAt).getTime() > Date.now(),
      );
      if (
        hasCustomLive &&
        auction.id === "auction-live-1" &&
        auction.status === "en_vivo"
      ) {
        const top = [...auction.bids].sort((a, b) => {
          if (b.amount !== a.amount) return b.amount - a.amount;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        })[0];
        return {
          ...auction,
          status: "finalizada" as const,
          winnerName: auction.winnerName ?? top?.bidderName,
          winnerPhone: auction.winnerPhone ?? top?.bidderPhone,
          currentBid: top?.amount ?? auction.currentBid,
        };
      }

      // Rellena ganador faltante si ya está finalizada y hay pujas.
      if (
        (auction.status === "finalizada" ||
          new Date(auction.endsAt).getTime() <= Date.now()) &&
        auction.bids.length > 0 &&
        !auction.winnerName
      ) {
        const top = [...auction.bids].sort((a, b) => {
          if (b.amount !== a.amount) return b.amount - a.amount;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        })[0];
        return {
          ...auction,
          status: "finalizada" as const,
          winnerName: top?.bidderName,
          winnerPhone: top?.bidderPhone,
          currentBid: Math.max(auction.currentBid, top?.amount ?? 0),
        };
      }

      return auction;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function mergeAuctionRoomKicks(
  local: AuctionRoomKick[] = [],
  remote: AuctionRoomKick[] = [],
): AuctionRoomKick[] {
  const map = new Map<string, AuctionRoomKick>();
  for (const kick of [...local, ...remote]) {
    const existing = map.get(kick.userId);
    if (
      !existing ||
      new Date(kick.kickedAt).getTime() >= new Date(existing.kickedAt).getTime()
    ) {
      map.set(kick.userId, kick);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.kickedAt).getTime() - new Date(a.kickedAt).getTime(),
  );
}

export function shouldApplyRemoteAuctions(
  remote: AuctionSnapshot[] | null,
  local: AuctionSnapshot[],
) {
  if (!remote?.length) return false;
  if (!local.length) return true;
  if (remote.length !== local.length) return true;

  const localMap = new Map(local.map((item) => [item.id, item]));
  for (const auction of remote) {
    const current = localMap.get(auction.id);
    if (!current) return true;
    if (auction.bids.length !== current.bids.length) return true;
    if (auction.currentBid !== current.currentBid) return true;
    if (auctionScore(auction) !== auctionScore(current)) return true;
    if (auction.status !== current.status) return true;
    if (auction.endsAt !== current.endsAt) return true;
  }
  return false;
}
