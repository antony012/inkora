import { mergeAuctionLists } from "@/lib/live-merge";
import {
  fetchLiveRoomFromServer,
  type LiveRoomClientState,
} from "@/lib/live-room/client-sync";
import { applyRemotePresenceMap } from "@/lib/presence";
import { writeLiveSnapshot } from "@/lib/live-sync";
import { useCarrizo } from "@/lib/store";
import type { AuctionRoomKick, TattooAuction } from "@/lib/types";

function auctionsNeedUpdate(
  local: TattooAuction[],
  merged: TattooAuction[],
) {
  if (local.length !== merged.length) return true;
  for (const auction of merged) {
    const cur = local.find((item) => item.id === auction.id);
    if (!cur) return true;
    if (cur.currentBid !== auction.currentBid) return true;
    if (cur.bids.length !== auction.bids.length) return true;
    if (cur.bids[0]?.id !== auction.bids[0]?.id) return true;
    if (cur.endsAt !== auction.endsAt) return true;
    if (cur.status !== auction.status) return true;
  }
  return false;
}

export function applyServerAuctions(remoteAuctions: TattooAuction[]) {
  if (!remoteAuctions.length) return false;
  const local = useCarrizo.getState().auctions;
  const merged = mergeAuctionLists(local, remoteAuctions);
  if (!auctionsNeedUpdate(local, merged)) return false;
  useCarrizo.setState({ auctions: merged });
  return true;
}

export function applyServerKicks(kicks: AuctionRoomKick[]) {
  const local = useCarrizo.getState().auctionRoomKicks;
  if (JSON.stringify(kicks) === JSON.stringify(local)) return;
  useCarrizo.setState({ auctionRoomKicks: kicks });
}

/** Aplica el snapshot del API (pujas + kicks + presencia) al store local. */
export function applyServerLiveRoom(remote: LiveRoomClientState) {
  applyServerAuctions(remote.auctions ?? []);
  applyServerKicks(remote.auctionRoomKicks ?? []);

  if (remote.presence && Object.keys(remote.presence).length > 0) {
    const changed = applyRemotePresenceMap(remote.presence);
    if (changed && typeof window !== "undefined") {
      window.dispatchEvent(new Event("carrizo-presence-refresh"));
    }
  }

  const state = useCarrizo.getState();
  writeLiveSnapshot({
    at: remote.updatedAt,
    auctions: state.auctions,
    auctionRoomKicks: state.auctionRoomKicks,
    users: state.users,
  });
}

export async function pullAndApplyLiveRoom() {
  const remote = await fetchLiveRoomFromServer();
  if (!remote) return null;
  applyServerLiveRoom(remote);
  return remote;
}
