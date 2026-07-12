import { CARIZO_STORE_KEY, CARIZO_LIVE_TICK_KEY } from "./storage-keys";
import {
  mergeAuctionLists,
  mergeAuctionRoomKicks,
  sanitizeAuctionsForSync,
  shouldApplyRemoteAuctions,
} from "./live-merge";
import { pushLiveRoomToServer } from "./live-room/client-sync";
import type { AuctionRoomKick, TattooAuction, VerifiedUser } from "./types";

export {
  mergeAuctionLists,
  mergeAuctionRoomKicks,
  sanitizeAuctionsForSync,
  shouldApplyRemoteAuctions,
} from "./live-merge";

const CHANNEL = "carrizo-auction-live";
export const AUCTION_STORAGE_KEY = CARIZO_STORE_KEY;
export const AUCTION_SNAPSHOT_KEY = "carrizo-auction-live-snapshot";
const TICK_KEY = CARIZO_LIVE_TICK_KEY;

export type LiveAuctionSnapshot = {
  at: number;
  auctions: TattooAuction[];
  auctionRoomKicks: AuctionRoomKick[];
  users?: VerifiedUser[];
};

type SnapshotGetter = () => {
  auctions: TattooAuction[];
  auctionRoomKicks: AuctionRoomKick[];
  users: VerifiedUser[];
};

let snapshotGetter: SnapshotGetter | null = null;

export function registerLiveSnapshotGetter(getter: SnapshotGetter) {
  snapshotGetter = getter;
}

export function broadcastAuctionUpdate(options?: { pushServer?: boolean }) {
  if (typeof window === "undefined") return;

  const incoming = snapshotGetter?.();
  let snapshot: LiveAuctionSnapshot | null = null;
  // Solo empujar al servidor cuando se pide explícito (puja/crear/extender).
  const shouldPush = options?.pushServer === true;

  if (incoming) {
    const previous = readLiveSnapshot();
    snapshot = {
      at: Date.now(),
      auctions: mergeAuctionLists(previous?.auctions ?? [], incoming.auctions),
      auctionRoomKicks: incoming.auctionRoomKicks,
      users: incoming.users,
    };

    writeLiveSnapshot(snapshot);

    if (shouldPush) {
      void pushLiveRoomToServer({
        auctions: sanitizeAuctionsForSync(snapshot.auctions),
      });
    }
  }

  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(
      snapshot
        ? { type: "auction-snapshot", ...snapshot }
        : { type: "auction-update", at: Date.now() },
    );
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

export function readLiveSnapshot(): LiveAuctionSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUCTION_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LiveAuctionSnapshot;
  } catch {
    return null;
  }
}

export function writeLiveSnapshot(snapshot: LiveAuctionSnapshot) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUCTION_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage bloqueado o lleno.
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

type UserSnapshot = {
  id: string;
  verificationStatus: string;
  submittedAt?: string;
  reviewedAt?: string;
};

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

  return (
    score(remote) >= score(local) &&
    JSON.stringify(remote) !== JSON.stringify(local)
  );
}

type LiveMessage =
  | ({ type: "auction-snapshot" } & LiveAuctionSnapshot)
  | { type: "auction-update"; at: number };

export function subscribeAuctionLive(
  onUpdate: (snapshot?: LiveAuctionSnapshot | null) => void,
) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === AUCTION_STORAGE_KEY ||
      event.key === TICK_KEY ||
      event.key === AUCTION_SNAPSHOT_KEY
    ) {
      onUpdate(readLiveSnapshot());
    }
  };

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent<LiveMessage>) => {
      const data = event.data;
      if (data?.type === "auction-snapshot") {
        onUpdate({
          at: data.at,
          auctions: data.auctions,
          auctionRoomKicks: data.auctionRoomKicks,
          users: data.users,
        });
        return;
      }
      onUpdate(readLiveSnapshot());
    };
  } catch {
    channel = null;
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    channel?.close();
  };
}
