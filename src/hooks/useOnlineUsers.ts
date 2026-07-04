"use client";

import { useEffect, useState } from "react";
import { getOnlineUsers, subscribePresence } from "@/lib/presence";
import type { PresenceEntry } from "@/lib/presence";

export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<PresenceEntry[]>([]);

  useEffect(() => {
    const refresh = () => setOnlineUsers(getOnlineUsers());

    refresh();
    return subscribePresence(refresh);
  }, []);

  return onlineUsers;
}
