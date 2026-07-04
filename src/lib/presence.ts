import type { VerificationStatus } from "./types";

export const PRESENCE_STORAGE_KEY = "inkora-online-presence";
export const PRESENCE_TICK_KEY = "inkora-presence-tick";
const PRESENCE_CHANNEL = "inkora-presence-live";
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

function writeMap(map: Record<string, PresenceEntry>) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(map));
    localStorage.setItem(PRESENCE_TICK_KEY, String(Date.now()));
  } catch {
    // localStorage bloqueado.
  }
}

function broadcastPresence() {
  if (typeof window === "undefined") return;

  try {
    const channel = new BroadcastChannel(PRESENCE_CHANNEL);
    channel.postMessage({ type: "presence-update", at: Date.now() });
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

export function touchPresence(
  entry: Omit<PresenceEntry, "lastSeen">,
) {
  const map = readMap();
  map[entry.userId] = { ...entry, lastSeen: Date.now() };
  prune(map);
  writeMap(map);
  broadcastPresence();
}

export function removePresence(userId: string) {
  const map = readMap();
  if (!map[userId]) return;
  delete map[userId];
  writeMap(map);
  broadcastPresence();
}

export function getOnlineUsers(now = Date.now()) {
  return Object.values(readMap())
    .filter((entry) => now - entry.lastSeen <= ONLINE_TTL_MS)
    .sort((a, b) => b.lastSeen - a.lastSeen);
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

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(PRESENCE_CHANNEL);
    channel.onmessage = () => onUpdate();
  } catch {
    channel = null;
  }

  window.addEventListener("storage", handleStorage);
  const poll = window.setInterval(onUpdate, 5000);

  return () => {
    window.removeEventListener("storage", handleStorage);
    channel?.close();
    window.clearInterval(poll);
  };
}
