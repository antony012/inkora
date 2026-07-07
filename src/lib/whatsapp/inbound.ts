import type { WhatsAppInboundMessage, WhatsAppWebhookPayload } from "./types";

export function parseWhatsAppWebhook(
  payload: WhatsAppWebhookPayload,
): WhatsAppInboundMessage[] {
  const messages: WhatsAppInboundMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages?.length) continue;

      const contactName =
        value.contacts?.[0]?.profile?.name ?? "Contacto WhatsApp";

      for (const msg of value.messages) {
        if (msg.type === "text" && msg.text?.body) {
          messages.push({
            kind: "text",
            from: msg.from,
            messageId: msg.id,
            timestamp: msg.timestamp,
            contactName,
            body: msg.text.body,
          });
        }

        if (msg.type === "image" && msg.image?.id) {
          messages.push({
            kind: "image",
            from: msg.from,
            messageId: msg.id,
            timestamp: msg.timestamp,
            contactName,
            caption: msg.image.caption,
            mediaId: msg.image.id,
          });
        }
      }
    }
  }

  return messages;
}
