"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSessionUser } from "@/hooks/useSessionUser";
import { pushLiveRoomToServer } from "@/lib/live-room/client-sync";
import { touchPresence } from "@/lib/presence";

export function PresenceHeartbeat() {
  const pathname = usePathname();
  const { sessionUser } = useSessionUser();

  useEffect(() => {
    if (!sessionUser) return;

    const beat = () => {
      const entry = {
        userId: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        phone: sessionUser.phone,
        verificationStatus: sessionUser.verificationStatus,
        profilePhotoUrl: sessionUser.profilePhotoUrl,
        page: pathname,
        lastSeen: Date.now(),
      };
      touchPresence({
        userId: entry.userId,
        name: entry.name,
        email: entry.email,
        phone: entry.phone,
        verificationStatus: entry.verificationStatus,
        profilePhotoUrl: entry.profilePhotoUrl,
        page: entry.page,
      });
      void pushLiveRoomToServer({ presenceEntry: entry });
    };

    beat();
    const timer = window.setInterval(beat, 5_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [sessionUser, pathname]);

  return null;
}
