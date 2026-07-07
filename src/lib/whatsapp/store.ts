import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_CRM_BOT_CONFIG, type CrmBotConfig } from "../bot-knowledge";
import type { WhatsAppConversation } from "../types";

export type WhatsAppServerData = {
  conversations: WhatsAppConversation[];
  botConfig: CrmBotConfig;
  processedMessageIds: string[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "whatsapp.json");

const emptyData = (): WhatsAppServerData => ({
  conversations: [],
  botConfig: DEFAULT_CRM_BOT_CONFIG,
  processedMessageIds: [],
});

let memoryCache: WhatsAppServerData | null = null;

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(emptyData(), null, 2), "utf8");
  }
}

async function readData(): Promise<WhatsAppServerData> {
  if (memoryCache) return structuredClone(memoryCache);
  try {
    await ensureDataFile();
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<WhatsAppServerData>;
    memoryCache = {
      conversations: parsed.conversations ?? [],
      botConfig: { ...DEFAULT_CRM_BOT_CONFIG, ...parsed.botConfig },
      processedMessageIds: parsed.processedMessageIds ?? [],
    };
    return structuredClone(memoryCache);
  } catch {
    memoryCache = emptyData();
    return structuredClone(memoryCache);
  }
}

async function writeData(data: WhatsAppServerData) {
  memoryCache = structuredClone(data);
  try {
    await ensureDataFile();
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("WhatsApp store write failed", error);
  }
}

export async function listWhatsAppConversations(): Promise<WhatsAppConversation[]> {
  const data = await readData();
  return data.conversations
    .filter((c) => !c.archived)
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
}

export async function getWhatsAppConversation(
  id: string,
): Promise<WhatsAppConversation | undefined> {
  const data = await readData();
  return data.conversations.find((c) => c.id === id);
}

export async function getWhatsAppBotConfig(): Promise<CrmBotConfig> {
  const data = await readData();
  return data.botConfig;
}

export async function setWhatsAppBotConfig(
  patch: Partial<CrmBotConfig>,
): Promise<CrmBotConfig> {
  const data = await readData();
  data.botConfig = { ...data.botConfig, ...patch };
  await writeData(data);
  return data.botConfig;
}

export async function upsertWhatsAppConversation(
  conversation: WhatsAppConversation,
): Promise<WhatsAppConversation> {
  const data = await readData();
  const index = data.conversations.findIndex((c) => c.id === conversation.id);
  if (index >= 0) {
    data.conversations[index] = conversation;
  } else {
    data.conversations.unshift(conversation);
  }
  await writeData(data);
  return conversation;
}

export async function updateWhatsAppConversation(
  id: string,
  patch: Partial<WhatsAppConversation>,
): Promise<WhatsAppConversation | undefined> {
  const data = await readData();
  const index = data.conversations.findIndex((c) => c.id === id);
  if (index < 0) return undefined;
  data.conversations[index] = { ...data.conversations[index], ...patch };
  await writeData(data);
  return data.conversations[index];
}

export async function hasProcessedMessage(messageId: string): Promise<boolean> {
  const data = await readData();
  return data.processedMessageIds.includes(messageId);
}

export async function markMessageProcessed(messageId: string): Promise<void> {
  const data = await readData();
  if (data.processedMessageIds.includes(messageId)) return;
  data.processedMessageIds = [messageId, ...data.processedMessageIds].slice(0, 500);
  await writeData(data);
}
