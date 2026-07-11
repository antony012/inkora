import { promises as fs } from "fs";
import path from "path";
import { mergeUsers } from "@/lib/session";
import type { VerifiedUser } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "verifications.json");
const BLOB_STORE_NAME = "carrizo-verifications";
const BLOB_KEY = "users";

let memoryCache: VerifiedUser[] | null = null;

async function readLocalFile(): Promise<VerifiedUser[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as VerifiedUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalFile(users: VerifiedUser[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
}

async function readBlobUsers(): Promise<VerifiedUser[] | null> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: BLOB_STORE_NAME, consistency: "strong" });
    const data = await store.get(BLOB_KEY, { type: "json" });
    if (!data) return [];
    return Array.isArray(data) ? (data as VerifiedUser[]) : [];
  } catch {
    return null;
  }
}

async function writeBlobUsers(users: VerifiedUser[]) {
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: BLOB_STORE_NAME, consistency: "strong" });
  await store.setJSON(BLOB_KEY, users);
}

export async function listVerificationUsers(): Promise<VerifiedUser[]> {
  if (memoryCache) return structuredClone(memoryCache);

  const blobUsers = await readBlobUsers();
  if (blobUsers !== null) {
    memoryCache = blobUsers;
    return structuredClone(blobUsers);
  }

  const localUsers = await readLocalFile();
  memoryCache = localUsers;
  return structuredClone(localUsers);
}

async function persistUsers(users: VerifiedUser[]) {
  memoryCache = structuredClone(users);

  try {
    await writeBlobUsers(users);
    return;
  } catch {
    // Netlify Blobs no disponible en local: usar archivo.
  }

  try {
    await writeLocalFile(users);
  } catch (error) {
    console.error("Verification store write failed", error);
  }
}

export async function upsertVerificationUser(
  user: VerifiedUser,
): Promise<VerifiedUser> {
  const users = await listVerificationUsers();
  const existing = users.find((item) => item.id === user.id);
  const nextUser = existing ? mergeUsers([existing], [user])[0] : user;
  const nextUsers = existing
    ? users.map((item) => (item.id === user.id ? nextUser : item))
    : [nextUser, ...users];

  await persistUsers(nextUsers);
  return nextUser;
}

export async function updateVerificationUser(
  userId: string,
  patch: Partial<VerifiedUser>,
): Promise<VerifiedUser | undefined> {
  const users = await listVerificationUsers();
  const index = users.findIndex((item) => item.id === userId);
  if (index < 0) return undefined;

  const updated = { ...users[index], ...patch };
  users[index] = updated;
  await persistUsers(users);
  return updated;
}
