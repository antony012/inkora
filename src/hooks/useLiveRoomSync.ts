"use client";

import { useEffect } from "react";
import { pullAndApplyLiveRoom } from "@/lib/live-room/apply-client";

/** Sincroniza pujas/presencia del servidor en el mismo módulo que la UI. */
export function useLiveRoomSync(intervalMs = 500) {
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        await pullAndApplyLiveRoom();
      } finally {
        inFlight = false;
      }
    };

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [intervalMs]);
}
