import type { VerificationStatus } from "./types";

export const PRESENCE_STORAGE_KEY = "carrizo-online-presence";
export const PRESENCE_TICK_KEY = "carrizo-presence-tick";
const PRESENCE_CHANNEL = "carrizo-presence-live";
export const ONLINE_TTL_MS = 45_000;

export type PresenceEntry = {
  userId: string;
  name: string;
  email: string;
  phone: string;
  verificationStatus: VerificationStatus;
  profilePhotoUrl?: string;
  page: string;
  lastSeen: number;
};

export function auctionRoomPath(studioSlug: string) {
  return `/estudio/${studioSlug}/subasta`;
}

export function isInAuctionRoom(entry: PresenceEntry, _studioSlug: string) {
  return entry.page.includes("/subasta");
}

export function getAuctionRoomUsers(studioSlug: string, now = Date.now()) {
  return getOnlineUsers(now).filter((entry) =>
    isInAuctionRoom(entry, studioSlug),
  );
}

function readMap(): Record<string, PresenceEntry> {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(PRESENCE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PresenceEntry>;
  } catch {
    return {};
  }
}

function writeMap(
  map: Record<string, PresenceEntry>,
  options: { broadcast?: boolean } = {},
) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(map));
    localStorage.setItem(PRESENCE_TICK_KEY, String(Date.now()));
  } catch {
    // localStorage bloqueado.
  }

  if (options.broadcast !== false) {
    broadcastPresence(map);
  }
}

function broadcastPresence(map: Record<string, PresenceEntry>) {
  if (typeof window === "undefined") return;

  try {
    const channel = new BroadcastChannel(PRESENCE_CHANNEL);
    channel.postMessage({
      type: "presence-snapshot",
      at: Date.now(),
      map,
    });
    channel.close();
  } catch {
    // BroadcastChannel no disponible.
  }
}

function prune(map: Record<string, PresenceEntry>) {
  const now = Date.now();
  for (const [id, entry] of Object.entries(map)) {
    if (now - entry.lastSeen > ONLINE_TTL_MS * 2) {
      delete map[id];
    }
  }
}

function mergePresenceMaps(
  local: Record<string, PresenceEntry>,
  remote: Record<string, PresenceEntry>,
) {
  const merged: Record<string, PresenceEntry> = { ...local };
  for (const [id, entry] of Object.entries(remote)) {
    const current = merged[id];
    if (!current || entry.lastSeen >= current.lastSeen) {
      merged[id] = entry;
    }
  }
  prune(merged);
  return merged;
}

export function touchPresence(entry: Omit<PresenceEntry, "lastSeen">) {
  const map = readMap();
  map[entry.userId] = { ...entry, lastSeen: Date.now() };
  prune(map);
  writeMap(map);
}

export function removePresence(userId: string) {
  const map = readMap();
  if (!map[userId]) return;
  delete map[userId];
  writeMap(map);
}

export function getOnlineUsers(now = Date.now()) {
  return Object.values(readMap())
    .filter((entry) => now - entry.lastSeen <= ONLINE_TTL_MS)
    .sort((a, b) => {
      // Orden estable: no usar lastSeen (el heartbeat reordenaba la lista).
      const byName = a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      if (byName !== 0) return byName;
      return a.userId.localeCompare(b.userId);
    });
}

/** Aplica presencia remota (servidor u otro navegador) al mapa local.
 *  @returns true si cambió la lista visible (no solo lastSeen). */
export function applyRemotePresenceMap(remote: Record<string, PresenceEntry>) {
  if (typeof window === "undefined") return false;
  const current = readMap();
  const merged = mergePresenceMaps(current, remote);

  // Evita reescribir/notificar si solo cambió lastSeen de los mismos usuarios.
  const samePeople =
    Object.keys(current).length === Object.keys(merged).length &&
    Object.keys(merged).every((id) => {
      const a = current[id];
      const b = merged[id];
      return (
        a &&
        b &&
        a.name === b.name &&
        a.email === b.email &&
        a.page === b.page &&
        a.verificationStatus === b.verificationStatus &&
        a.profilePhotoUrl === b.profilePhotoUrl
      );
    });

  if (samePeople) {
    // Actualiza lastSeen en silencio (sin tick ni broadcast).
    try {
      localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // localStorage bloqueado.
    }
    return false;
  }

  writeMap(merged, { broadcast: false });
  return true;
}

export function subscribePresence(onUpdate: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === PRESENCE_STORAGE_KEY ||
      event.key === PRESENCE_TICK_KEY
    ) {
      onUpdate();
    }
  };

  const handleCustom = () => onUpdate();

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(PRESENCE_CHANNEL);
    channel.onmessage = (
      event: MessageEvent<{
        type?: string;
        map?: Record<string, PresenceEntry>;
      }>,
    ) => {
      if (event.data?.type === "presence-snapshot" && event.data.map) {
        const merged = mergePresenceMaps(readMap(), event.data.map);
        writeMap(merged, { broadcast: false });
      }
      onUpdate();
    };
  } catch {
    channel = null;
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener("carrizo-presence-refresh", handleCustom);
  const poll = window.setInterval(onUpdate, 1000);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("carrizo-presence-refresh", handleCustom);
    channel?.close();
    window.clearInterval(poll);
  };
}
