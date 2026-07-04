import { mergeUsers, resolveSessionUserId } from "./session";

const CHANNEL = "inkora-auction-live";
export const AUCTION_STORAGE_KEY = "inkora-store-v5-verify";
const TICK_KEY = "inkora-auction-tick";

export function broadcastAuctionUpdate() {
  if (typeof window === "undefined") return;

  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ type: "auction-update", at: Date.now() });
    channel.close();
  } catch {
    // BroadcastChannel no disponible.
  }

  try {
    localStorage.setItem(TICK_KEY, String(Date.now()));
  } catch {
    // localStorage bloqueado.
  }
}

export function readPersistedState<T extends object = Record<string, unknown>>() {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(AUCTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: T };
    return parsed.state ?? null;
  } catch {
    return null;
  }
}

export function readPersistedAuctions<T = unknown>(): T | null {
  const state = readPersistedState<{ auctions?: T }>();
  return state?.auctions ?? null;
}

type AuctionSnapshot = {
  id: string;
  currentBid: number;
  endsAt: string;
  bids: { id: string; amount: number; createdAt: string }[];
};

type UserSnapshot = {
  id: string;
  verificationStatus: string;
  submittedAt?: string;
  reviewedAt?: string;
};

export function shouldApplyRemoteAuctions(
  remote: AuctionSnapshot[] | null,
  local: AuctionSnapshot[],
) {
  if (!remote) return false;

  const score = (items: AuctionSnapshot[]) =>
    items.reduce((total, auction) => {
      const latestBid = auction.bids.reduce(
        (max, bid) => Math.max(max, new Date(bid.createdAt).getTime()),
        0,
      );
      return (
        total +
        auction.bids.length * 1_000_000_000 +
        auction.currentBid * 1000 +
        latestBid / 1_000_000 +
        new Date(auction.endsAt).getTime() / 1_000_000_000_000
      );
    }, 0);

  return score(remote) > score(local);
}

export function shouldApplyRemoteUsers(
  remote: UserSnapshot[] | null,
  local: UserSnapshot[],
) {
  if (!remote) return false;

  const score = (items: UserSnapshot[]) =>
    items.reduce((total, user) => {
      const submitted = user.submittedAt
        ? new Date(user.submittedAt).getTime()
        : 0;
      const reviewed = user.reviewedAt ? new Date(user.reviewedAt).getTime() : 0;
      const statusWeight =
        user.verificationStatus === "verificado"
          ? 4
          : user.verificationStatus === "en_revision"
            ? 3
            : user.verificationStatus === "rechazado"
              ? 2
              : 1;
      return total + statusWeight * 1_000_000_000 + submitted + reviewed;
    }, items.length);

  return score(remote) >= score(local) && JSON.stringify(remote) !== JSON.stringify(local);
}

export function subscribeAuctionLive(onUpdate: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === AUCTION_STORAGE_KEY || event.key === TICK_KEY) {
      onUpdate();
    }
  };

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => onUpdate();
  } catch {
    channel = null;
  }

  window.addEventListener("storage", handleStorage);

  // Fallback: mantiene la sala sincronizada aunque el evento storage no dispare.
  const poll = window.setInterval(onUpdate, 700);

  return () => {
    window.removeEventListener("storage", handleStorage);
    channel?.close();
    window.clearInterval(poll);
  };
}
