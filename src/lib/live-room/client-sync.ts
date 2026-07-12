import type { PresenceEntry } from "@/lib/presence";
import type { AuctionRoomKick, TattooAuction } from "@/lib/types";

export type LiveRoomClientState = {
  updatedAt: number;
  auctions: TattooAuction[];
  auctionRoomKicks: AuctionRoomKick[];
  presence: Record<string, PresenceEntry>;
};

export async function fetchLiveRoomFromServer(): Promise<LiveRoomClientState | null> {
  try {
    const response = await fetch(`/api/live-room?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    if (!response.ok) return null;
    return (await response.json()) as LiveRoomClientState;
  } catch (error) {
    console.error("Live room fetch failed", error);
    return null;
  }
}

export async function pushLiveRoomToServer(input: {
  auctions?: TattooAuction[];
  auctionRoomKicks?: AuctionRoomKick[];
  kickUser?: AuctionRoomKick;
  unkickUserId?: string;
  presenceEntry?: PresenceEntry;
  presence?: Record<string, PresenceEntry>;
}): Promise<LiveRoomClientState | null> {
  try {
    const response = await fetch("/api/live-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      ok?: boolean;
      state?: LiveRoomClientState;
    };
    return data.state ?? null;
  } catch (error) {
    console.error("Live room push failed", error);
    return null;
  }
}
