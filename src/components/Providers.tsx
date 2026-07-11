"use client";

import { useEffect } from "react";
import { ConsentBanner } from "@/components/ConsentBanner";
import { PresenceHeartbeat } from "@/components/PresenceHeartbeat";
import { MarketingScripts } from "@/components/MarketingScripts";
import { CARIZO_STORE_KEY } from "@/lib/storage-keys";
import {
  readPersistedState,
  shouldApplyRemoteAuctions,
  subscribeAuctionLive,
} from "@/lib/live-sync";
import { mergeUsers } from "@/lib/session";
import { useCarrizo } from "@/lib/store";
import type { TattooAuction, VerifiedUser } from "@/lib/types";

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
    migrateLegacyStore();
    const finish = () => {
      setHydrated(true);
      void useCarrizo.getState().ensureStudioAdmin();
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
    return subscribeAuctionLive(() => {
      const remoteState = readPersistedState<{
        auctions?: TattooAuction[];
        users?: VerifiedUser[];
        sessionUserId?: string | null;
      }>();
      if (!remoteState) return;

      const local = useCarrizo.getState();
      const next: Partial<typeof local> = {};

      if (
        remoteState.auctions &&
        shouldApplyRemoteAuctions(remoteState.auctions, local.auctions)
      ) {
        next.auctions = remoteState.auctions;
      }

      if (remoteState.users) {
        const mergedUsers = mergeUsers(local.users, remoteState.users);
        if (JSON.stringify(mergedUsers) !== JSON.stringify(local.users)) {
          next.users = mergedUsers;
        }
      }

      const users = next.users ?? local.users;

      if (
        remoteState.sessionUserId &&
        remoteState.sessionUserId !== local.sessionUserId &&
        users.some((user) => user.id === remoteState.sessionUserId)
      ) {
        next.sessionUserId = remoteState.sessionUserId;
      }

      if (Object.keys(next).length > 0) {
        useCarrizo.setState(next);
      }
    });
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
