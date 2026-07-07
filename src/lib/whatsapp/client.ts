import { getEvolutionConfig, getWhatsAppProvider } from "./evolution-config";
import { getWhatsAppConfig } from "./config";
import { sendEvolutionText } from "./evolution-client";
import { normalizeWaId } from "./phone";

type SendResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

export async function sendWhatsAppText(
  toWaId: string,
  body: string,
): Promise<SendResult> {
  const provider = getWhatsAppProvider();

  if (provider === "evolution") {
    const result = await sendEvolutionText(toWaId, body);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, messageId: result.data?.key?.id };
  }

  const { accessToken, phoneNumberId, apiVersion, isConfigured } =
    getWhatsAppConfig();

  if (!isConfigured || !accessToken || !phoneNumberId) {
    return { ok: false, error: "WhatsApp API no configurada." };
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizeWaId(toWaId),
      type: "text",
      text: { preview_url: false, body },
    }),
  });

  const data = (await response.json()) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    return {
      ok: false,
      error: data.error?.message ?? `Error HTTP ${response.status}`,
    };
  }

  return { ok: true, messageId: data.messages?.[0]?.id };
}

export async function markWhatsAppMessageRead(messageId: string): Promise<void> {
  if (getWhatsAppProvider() === "evolution") return;

  const { accessToken, phoneNumberId, apiVersion, isConfigured } =
    getWhatsAppConfig();
  if (!isConfigured || !accessToken || !phoneNumberId) return;

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  }).catch(() => undefined);
}

export function isWhatsAppLiveConfigured(): boolean {
  const provider = getWhatsAppProvider();
  if (provider === "evolution") return getEvolutionConfig().isConfigured;
  if (provider === "meta") return getWhatsAppConfig().isConfigured;
  return false;
}
