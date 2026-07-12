"use client";

import { useEffect, useState } from "react";
import {
  getAuctionRoomUsers,
  subscribePresence,
  type PresenceEntry,
} from "@/lib/presence";

function roomUsersSignature(users: PresenceEntry[]) {
  return users
    .map(
      (u) =>
        `${u.userId}|${u.name}|${u.email}|${u.verificationStatus}|${u.page}|${u.profilePhotoUrl ?? ""}`,
    )
    .join(";");
}

export function useAuctionRoomUsers(studioSlug: string) {
  const [roomUsers, setRoomUsers] = useState<PresenceEntry[]>([]);

  useEffect(() => {
    const refresh = () => {
      const next = getAuctionRoomUsers(studioSlug);
      setRoomUsers((prev) =>
        roomUsersSignature(prev) === roomUsersSignature(next) ? prev : next,
      );
    };

    refresh();
    const unsubscribe = subscribePresence(refresh);
    const poll = window.setInterval(refresh, 3000);

    return () => {
      unsubscribe();
      window.clearInterval(poll);
    };
  }, [studioSlug]);

  return roomUsers;
}
