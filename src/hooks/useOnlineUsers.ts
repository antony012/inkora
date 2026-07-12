"use client";

import { useEffect, useState } from "react";
import { getOnlineUsers, subscribePresence } from "@/lib/presence";
import type { PresenceEntry } from "@/lib/presence";

export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<PresenceEntry[]>([]);

  useEffect(() => {
    const refresh = () => setOnlineUsers(getOnlineUsers());

    refresh();
    const unsubscribe = subscribePresence(refresh);
    const fastPoll = window.setInterval(refresh, 2000);

    return () => {
      unsubscribe();
      window.clearInterval(fastPoll);
    };
  }, []);

  return onlineUsers;
}
