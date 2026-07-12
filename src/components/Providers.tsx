"use client";

import { useEffect } from "react";
import { ConsentBanner } from "@/components/ConsentBanner";
import { PresenceHeartbeat } from "@/components/PresenceHeartbeat";
import { MarketingScripts } from "@/components/MarketingScripts";
import { CARIZO_STORE_KEY } from "@/lib/storage-keys";
import {
  readLiveSnapshot,
  registerLiveSnapshotGetter,
  subscribeAuctionLive,
} from "@/lib/live-sync";
import {
  applyServerAuctions,
  pullAndApplyLiveRoom,
} from "@/lib/live-room/apply-client";
import { readTabSessionUserId } from "@/lib/session";
import { useCarrizo } from "@/lib/store";

const LEGACY_STORE_KEYS = [
  "inkora-store-v6-password",
  "inkora-store-v5-verify",
  "carrizo-store-v7",
] as const;
const STORE_KEY = CARIZO_STORE_KEY;

function migrateLegacyStore() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORE_KEY)) return;

  for (const legacyKey of LEGACY_STORE_KEYS) {
    const raw = localStorage.getItem(legacyKey);
    if (!raw) continue;
    localStorage.setItem(STORE_KEY, raw);
    break;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const setHydrated = useCarrizo((s) => s.setHydrated);

  useEffect(() => {
    registerLiveSnapshotGetter(() => {
      const state = useCarrizo.getState();
      return {
        auctions: state.auctions,
        auctionRoomKicks: state.auctionRoomKicks,
        users: state.users,
      };
    });
  }, []);

  useEffect(() => {
    migrateLegacyStore();
    const finish = () => {
      const tabSession = readTabSessionUserId();
      useCarrizo.setState({ sessionUserId: tabSession });
      setHydrated(true);
      void useCarrizo.getState().ensureStudioAdmin();
      void useCarrizo.getState().ensureDemoUserPasswords();
      const snap = readLiveSnapshot();
      if (snap?.auctions?.length) {
        applyServerAuctions(snap.auctions);
      }
      // Solo pull; no empujar al hidratar (evita pisar pujas con estado viejo).
      void pullAndApplyLiveRoom();
    };

    if (useCarrizo.persist.hasHydrated()) {
      finish();
      return;
    }

    return useCarrizo.persist.onFinishHydration(finish);
  }, [setHydrated]);

  useEffect(() => {
    void useCarrizo.getState().syncVerificationsFromServer();
    const interval = window.setInterval(() => {
      void useCarrizo.getState().syncVerificationsFromServer();
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return subscribeAuctionLive((snapshot) => {
      if (snapshot?.auctions?.length) {
        applyServerAuctions(snapshot.auctions);
      }
    });
  }, []);

  useEffect(() => {
    void pullAndApplyLiveRoom();
    const timer = window.setInterval(() => {
      void pullAndApplyLiveRoom();
    }, 800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <MarketingScripts />
      <PresenceHeartbeat />
      {children}
      <ConsentBanner />
    </>
  );
}
