"use client";

import { useEffect, useState } from "react";
import {
  getAuctionRoomUsers,
  subscribePresence,
  type PresenceEntry,
} from "@/lib/presence";

export function useAuctionRoomUsers(studioSlug: string) {
  const [roomUsers, setRoomUsers] = useState<PresenceEntry[]>([]);

  useEffect(() => {
    const refresh = () => setRoomUsers(getAuctionRoomUsers(studioSlug));

    refresh();
    const unsubscribe = subscribePresence(refresh);
    const fastPoll = window.setInterval(refresh, 2000);

    return () => {
      unsubscribe();
      window.clearInterval(fastPoll);
    };
  }, [studioSlug]);

  return roomUsers;
}
