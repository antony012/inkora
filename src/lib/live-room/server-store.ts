import { promises as fs } from "fs";
import path from "path";
import { mergeAuctionLists } from "@/lib/live-merge";
import type { PresenceEntry } from "@/lib/presence";
import type { AuctionRoomKick, TattooAuction } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "live-room.json");
const BLOB_STORE_NAME = "carrizo-live-room";
const BLOB_KEY = "snapshot";
const PRESENCE_TTL_MS = 60_000;

export type LiveRoomServerState = {
  updatedAt: number;
  auctions: TattooAuction[];
  auctionRoomKicks: AuctionRoomKick[];
  /** Tombstones: userId -> timestamp ms del último readmitir */
  unkickAt: Record<string, number>;
  presence: Record<string, PresenceEntry>;
};

const EMPTY: LiveRoomServerState = {
  updatedAt: 0,
  auctions: [],
  auctionRoomKicks: [],
  unkickAt: {},
  presence: {},
};

let memoryCache: LiveRoomServerState | null = null;
let writeChain: Promise<void> = Promise.resolve();

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task, task);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function prunePresence(map: Record<string, PresenceEntry>) {
  const now = Date.now();
  const next: Record<string, PresenceEntry> = {};
  for (const [id, entry] of Object.entries(map)) {
    if (now - entry.lastSeen <= PRESENCE_TTL_MS) {
      next[id] = entry;
    }
  }
  return next;
}

function mergePresence(
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
  return prunePresence(merged);
}

function applyUnkickTombstones(
  kicks: AuctionRoomKick[],
  unkickAt: Record<string, number>,
) {
  return kicks.filter((kick) => {
    const clearedAt = unkickAt[kick.userId];
    if (!clearedAt) return true;
    return new Date(kick.kickedAt).getTime() > clearedAt;
  });
}

function normalizeState(
  parsed: Partial<LiveRoomServerState> | null | undefined,
): LiveRoomServerState {
  const unkickAt = parsed?.unkickAt ?? {};
  const kicks = applyUnkickTombstones(
    Array.isArray(parsed?.auctionRoomKicks) ? parsed.auctionRoomKicks : [],
    unkickAt,
  );
  return {
    updatedAt: parsed?.updatedAt ?? 0,
    auctions: Array.isArray(parsed?.auctions) ? parsed.auctions : [],
    auctionRoomKicks: kicks,
    unkickAt,
    presence: prunePresence(parsed?.presence ?? {}),
  };
}

function pickFresher(
  a: LiveRoomServerState,
  b: LiveRoomServerState,
): LiveRoomServerState {
  return a.updatedAt >= b.updatedAt ? a : b;
}

async function readLocalFile(): Promise<LiveRoomServerState> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return normalizeState(JSON.parse(raw) as LiveRoomServerState);
  } catch {
    return structuredClone(EMPTY);
  }
}

async function writeLocalFile(state: LiveRoomServerState) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
}

async function readBlob(): Promise<LiveRoomServerState | null> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: BLOB_STORE_NAME, consistency: "strong" });
    const data = await store.get(BLOB_KEY, { type: "json" });
    // Sin datos → null para caer al archivo local (no EMPTY).
    if (!data) return null;
    return normalizeState(data as LiveRoomServerState);
  } catch {
    return null;
  }
}

async function writeBlob(state: LiveRoomServerState) {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: BLOB_STORE_NAME, consistency: "strong" });
  await store.setJSON(BLOB_KEY, state);
}

/** Siempre lee storage persistido; no confía solo en memoryCache (HMR / workers). */
async function readPersistedFresh(): Promise<LiveRoomServerState> {
  const local = await readLocalFile();
  const blob = await readBlob();
  if (blob) return pickFresher(blob, local);
  return local;
}

export async function getLiveRoomState(): Promise<LiveRoomServerState> {
  const fresh = await readPersistedFresh();
  if (memoryCache && memoryCache.updatedAt > fresh.updatedAt) {
    return normalizeState(memoryCache);
  }
  memoryCache = fresh;
  return structuredClone(fresh);
}

async function persist(state: LiveRoomServerState) {
  memoryCache = structuredClone(state);

  let blobOk = false;
  try {
    await writeBlob(state);
    blobOk = true;
  } catch {
    // Netlify Blobs no disponible en local.
  }

  // En local siempre escribe el archivo; en Netlify también como respaldo si blob falla.
  if (!blobOk) {
    try {
      await writeLocalFile(state);
    } catch (error) {
      console.error("Live room store write failed", error);
    }
  } else {
    // Mantén el JSON local alineado en desarrollo.
    try {
      await writeLocalFile(state);
    } catch {
      // Ignorar si el FS no es escribible (p.ej. serverless).
    }
  }
}

export async function mergeLiveRoomPatch(input: {
  auctions?: TattooAuction[];
  auctionRoomKicks?: AuctionRoomKick[];
  kickUser?: AuctionRoomKick;
  unkickUserId?: string;
  presenceEntry?: PresenceEntry;
  presence?: Record<string, PresenceEntry>;
}): Promise<LiveRoomServerState> {
  return enqueueWrite(async () => {
    // Obliga a releer disco/blob antes de mutar (evita que presencia pise pujas).
    memoryCache = null;
    const current = await getLiveRoomState();
    let kicks = [...current.auctionRoomKicks];
    let unkickAt = { ...current.unkickAt };

    if (input.unkickUserId) {
      unkickAt[input.unkickUserId] = Date.now();
      kicks = kicks.filter((item) => item.userId !== input.unkickUserId);
    }

    if (input.kickUser) {
      const kickedAtMs = new Date(input.kickUser.kickedAt).getTime();
      const clearedAt = unkickAt[input.kickUser.userId] ?? 0;
      if (kickedAtMs > clearedAt) {
        delete unkickAt[input.kickUser.userId];
        kicks = [
          input.kickUser,
          ...kicks.filter((item) => item.userId !== input.kickUser!.userId),
        ];
      }
    }

    const next: LiveRoomServerState = {
      updatedAt: Date.now(),
      auctions: input.auctions?.length
        ? mergeAuctionLists(current.auctions, input.auctions)
        : current.auctions,
      auctionRoomKicks: applyUnkickTombstones(kicks, unkickAt),
      unkickAt,
      presence: current.presence,
    };

    if (input.presence) {
      next.presence = mergePresence(next.presence, input.presence);
    }
    if (input.presenceEntry) {
      next.presence = mergePresence(next.presence, {
        [input.presenceEntry.userId]: input.presenceEntry,
      });
    }
    next.presence = prunePresence(next.presence);

    await persist(next);
    return structuredClone(next);
  });
}
