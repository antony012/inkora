"use client";

import { useMemo } from "react";
import { useInkora } from "@/lib/store";

export function useSessionUser() {
  const hydrated = useInkora((s) => s.hydrated);
  const sessionUserId = useInkora((s) => s.sessionUserId);
  const users = useInkora((s) => s.users);

  const sessionUser = useMemo(() => {
    if (!hydrated || !sessionUserId) return null;
    return users.find((user) => user.id === sessionUserId) ?? null;
  }, [hydrated, sessionUserId, users]);

  return { hydrated, sessionUser, sessionUserId };
}
