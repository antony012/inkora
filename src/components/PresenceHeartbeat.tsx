"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSessionUser } from "@/hooks/useSessionUser";
import { removePresence, touchPresence } from "@/lib/presence";

export function PresenceHeartbeat() {
  const pathname = usePathname();
  const { sessionUser } = useSessionUser();

  useEffect(() => {
    if (!sessionUser) return;

    const isAuctionRoom = pathname.includes("/subasta");

    if (
      isAuctionRoom &&
      sessionUser.verificationStatus !== "verificado"
    ) {
      removePresence(sessionUser.id);
      return;
    }

    const beat = () => {
      touchPresence({
        userId: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        phone: sessionUser.phone,
        verificationStatus: sessionUser.verificationStatus,
        profilePhotoUrl: sessionUser.profilePhotoUrl,
        page: pathname,
      });
    };

    beat();
    const timer = window.setInterval(beat, 15_000);

    return () => {
      window.clearInterval(timer);
      removePresence(sessionUser.id);
    };
  }, [sessionUser, pathname]);

  return null;
}
