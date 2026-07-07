import { scoreLead } from "../chat-bot";
import { REFERENCE_RECEIVED_REPLY } from "../gemini-education";
import { generateSalesAgentReply } from "../sales-agent";
import { artists, studio } from "../seed";
import type { ChatMessage, WhatsAppConversation } from "../types";
import { markWhatsAppMessageRead, sendWhatsAppText } from "./client";
import {
  conversationIdForWa,
  formatDisplayPhone,
} from "./phone";
import {
  getWhatsAppBotConfig,
  getWhatsAppConversation,
  hasProcessedMessage,
  markMessageProcessed,
  upsertWhatsAppConversation,
} from "./store";
import type { WhatsAppInboundMessage } from "./types";

const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

function activeArtist() {
  return artists.find((a) => a.active) ?? artists[0];
}

function waTimestampToIso(timestamp: string) {
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds)) return new Date().toISOString();
  return new Date(seconds * 1000).toISOString();
}

function avatarHueFromPhone(phone: string) {
  let hash = 0;
  for (let i = 0; i < phone.length; i += 1) {
    hash = phone.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

async function createConversation(
  inbound: WhatsAppInboundMessage,
): Promise<WhatsAppConversation> {
  const now = waTimestampToIso(inbound.timestamp);
  return {
    id: conversationIdForWa(inbound.from),
    contactName: inbound.contactName,
    phone: formatDisplayPhone(inbound.from),
    waContactId: inbound.from,
    source: "whatsapp",
    avatarHue: avatarHueFromPhone(inbound.from),
    botEnabled: true,
    temperature: "nuevo",
    score: 0,
    unread: 0,
    tags: ["whatsapp"],
    referenceStatus: "sin_referencia",
    qualification: {
      hasReference: false,
      intent: "explorando",
    },
    messages: [],
    createdAt: now,
    lastMessageAt: now,
  };
}

function inboundToClientMessage(inbound: WhatsAppInboundMessage): ChatMessage {
  const now = waTimestampToIso(inbound.timestamp);
  if (inbound.kind === "image") {
    return {
      id: uid("msg"),
      author: "cliente",
      text: inbound.caption || "📷 Foto de referencia del diseño",
      createdAt: now,
      hasImage: true,
    };
  }
  return {
    id: uid("msg"),
    author: "cliente",
    text: inbound.body,
    createdAt: now,
  };
}

export async function runBotForConversation(
  conversation: WhatsAppConversation,
): Promise<WhatsAppConversation> {
  const artist = activeArtist();
  if (!artist || !conversation.botEnabled) return conversation;

  const botConfig = await getWhatsAppBotConfig();
  const reply = await generateSalesAgentReply({
    conversation,
    studio,
    artist,
    botConfig,
  });

  const now = new Date().toISOString();
  const botMessage: ChatMessage = {
    id: uid("msg"),
    author: "bot",
    text: reply.text,
    createdAt: now,
    quotePrice: reply.quotePrice,
  };

  const messages = [...conversation.messages, botMessage];
  const tags = Array.from(new Set([...conversation.tags, ...reply.tags]));
  const { score, temperature } = scoreLead(reply.qualification, messages);

  const updated: WhatsAppConversation = {
    ...conversation,
    messages,
    tags,
    qualification: reply.qualification,
    score,
    temperature,
    lastMessageAt: now,
  };

  if (conversation.waContactId) {
    const sent = await sendWhatsAppText(conversation.waContactId, reply.text);
    if (!sent.ok) {
      console.error("WhatsApp bot send failed", sent.error);
    }
  }

  return upsertWhatsAppConversation(updated);
}

async function sendReferenceReviewAck(
  conversation: WhatsAppConversation,
): Promise<WhatsAppConversation> {
  const now = new Date().toISOString();
  const botMessage: ChatMessage = {
    id: uid("msg"),
    author: "bot",
    text: REFERENCE_RECEIVED_REPLY,
    createdAt: now,
  };

  const updated: WhatsAppConversation = {
    ...conversation,
    messages: [...conversation.messages, botMessage],
    lastMessageAt: now,
    tags: Array.from(new Set([...conversation.tags, "referencia pendiente"])),
  };

  if (conversation.waContactId) {
    const sent = await sendWhatsAppText(
      conversation.waContactId,
      REFERENCE_RECEIVED_REPLY,
    );
    if (!sent.ok) {
      console.error("WhatsApp reference ack failed", sent.error);
    }
  }

  return upsertWhatsAppConversation(updated);
}

export async function reviewWhatsAppReference(
  conversationId: string,
  status: "aprobada" | "rechazada",
): Promise<{ ok: boolean; error?: string; conversation?: WhatsAppConversation }> {
  const conversation = await getWhatsAppConversation(conversationId);
  if (!conversation) {
    return { ok: false, error: "Conversación no encontrada." };
  }

  const followUp =
    status === "aprobada"
      ? "Listo, revisé tu referencia y el diseño se puede hacer. Si quieres, vemos fecha y te explico cómo apartar cupo con el 30% del valor."
      : "Revisé la imagen y para ese diseño necesitaríamos ajustar tamaño o detalle. Si quieres, mándame otra referencia o lo conversamos.";

  const now = new Date().toISOString();
  const tags = conversation.tags.filter((t) => t !== "referencia pendiente");
  if (status === "aprobada") tags.push("referencia aprobada");
  if (status === "rechazada") tags.push("referencia rechazada");

  const updated = await upsertWhatsAppConversation({
    ...conversation,
    referenceStatus: status,
    unread: 0,
    tags,
    messages: [
      ...conversation.messages,
      {
        id: uid("msg"),
        author: "artista",
        text: followUp,
        createdAt: now,
      },
    ],
    lastMessageAt: now,
  });

  if (conversation.waContactId) {
    const sent = await sendWhatsAppText(conversation.waContactId, followUp);
    if (!sent.ok) return { ok: false, error: sent.error };
  }

  return { ok: true, conversation: updated };
}

export async function handleInboundWhatsAppMessage(
  inbound: WhatsAppInboundMessage,
): Promise<void> {
  if (await hasProcessedMessage(inbound.messageId)) return;
  await markMessageProcessed(inbound.messageId);
  void markWhatsAppMessageRead(inbound.messageId);

  const convId = conversationIdForWa(inbound.from);
  let conversation =
    (await getWhatsAppConversation(convId)) ??
    (await createConversation(inbound));

  const clientMessage = inboundToClientMessage(inbound);
  const messages = [...conversation.messages, clientMessage];
  const { score, temperature } = scoreLead(conversation.qualification, messages);
  const tags = new Set(conversation.tags);
  if (inbound.kind === "image") tags.add("referencia pendiente");

  conversation = await upsertWhatsAppConversation({
    ...conversation,
    contactName: inbound.contactName || conversation.contactName,
    messages,
    score,
    temperature,
    unread: conversation.unread + 1,
    lastMessageAt: clientMessage.createdAt,
    referenceStatus:
      inbound.kind === "image" ? "pendiente" : conversation.referenceStatus,
    qualification:
      inbound.kind === "image"
        ? { ...conversation.qualification, hasReference: true }
        : conversation.qualification,
    tags: Array.from(tags),
  });

  if (conversation.botEnabled) {
    if (inbound.kind === "image") {
      await sendReferenceReviewAck(conversation);
      return;
    }
    await runBotForConversation(conversation);
  }
}

export async function sendArtistWhatsAppMessage(
  conversationId: string,
  text: string,
): Promise<{ ok: boolean; error?: string; conversation?: WhatsAppConversation }> {
  const value = text.trim();
  if (!value) return { ok: false, error: "Mensaje vacío." };

  const conversation = await getWhatsAppConversation(conversationId);
  if (!conversation?.waContactId) {
    return { ok: false, error: "Conversación no encontrada." };
  }

  const sent = await sendWhatsAppText(conversation.waContactId, value);
  if (!sent.ok) return { ok: false, error: sent.error };

  const now = new Date().toISOString();
  const updated = await upsertWhatsAppConversation({
    ...conversation,
    messages: [
      ...conversation.messages,
      {
        id: uid("msg"),
        author: "artista",
        text: value,
        createdAt: now,
      },
    ],
    lastMessageAt: now,
    unread: 0,
  });

  return { ok: true, conversation: updated };
}
