import type { EvolutionWebhookPayload, WhatsAppInboundMessage } from "./types";

type EvolutionMessageData = {
  key?: {
    remoteJid?: string;
    fromMe?: boolean;
    id?: string;
  };
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
  };
  messageTimestamp?: number | string;
};

type EvolutionConnectionData = {
  state?: string;
  status?: string;
};

function normalizeEvolutionEvent(event?: string): string {
  return (event ?? "").toUpperCase().replace(/[.\-]/g, "_");
}

function jidToPhone(remoteJid: string): string {
  return remoteJid.split("@")[0]?.replace(/\D/g, "") ?? "";
}

function collectEvolutionMessageData(raw: unknown): EvolutionMessageData[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as EvolutionMessageData[];
  const record = raw as Record<string, unknown>;
  if (Array.isArray(record.messages)) {
    return record.messages as EvolutionMessageData[];
  }
  return [raw as EvolutionMessageData];
}

function extractMessageText(data: EvolutionMessageData): string | null {
  const msg = data.message;
  if (!msg) return null;
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage) {
    return msg.imageMessage.caption || "📷 Foto de referencia del diseño";
  }
  if (msg.videoMessage) {
    return msg.videoMessage.caption || "🎥 Video de referencia del diseño";
  }
  return null;
}

function hasReferenceMedia(data: EvolutionMessageData): boolean {
  return Boolean(data.message?.imageMessage || data.message?.videoMessage);
}

export function parseEvolutionWebhook(
  payload: EvolutionWebhookPayload,
): WhatsAppInboundMessage[] {
  const event = normalizeEvolutionEvent(payload.event);
  if (event !== "MESSAGES_UPSERT") return [];

  const items = collectEvolutionMessageData(payload.data);

  const messages: WhatsAppInboundMessage[] = [];

  for (const data of items) {
    const key = data.key;
    if (!key?.remoteJid || key.fromMe) continue;
    if (key.remoteJid.includes("@g.us")) continue;

    const from = jidToPhone(key.remoteJid);
    if (!from) continue;

    const hasImage = hasReferenceMedia(data);
    const text = extractMessageText(data);
    if (!text && !hasImage) continue;

    const timestamp = String(data.messageTimestamp ?? Math.floor(Date.now() / 1000));

    if (hasImage) {
      messages.push({
        kind: "image",
        from,
        messageId: key.id ?? `evo-${from}-${timestamp}`,
        timestamp,
        contactName: data.pushName ?? "Contacto WhatsApp",
        caption: data.message?.imageMessage?.caption,
        mediaId: key.id ?? "",
      });
    } else if (text) {
      messages.push({
        kind: "text",
        from,
        messageId: key.id ?? `evo-${from}-${timestamp}`,
        timestamp,
        contactName: data.pushName ?? "Contacto WhatsApp",
        body: text,
      });
    }
  }

  return messages;
}

export function parseEvolutionConnectionState(
  payload: EvolutionWebhookPayload,
): string | null {
  const event = normalizeEvolutionEvent(payload.event);
  if (event !== "CONNECTION_UPDATE") return null;
  const data = payload.data as EvolutionConnectionData | undefined;
  return data?.state ?? data?.status ?? null;
}
