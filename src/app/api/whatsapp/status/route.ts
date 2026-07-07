import { NextResponse } from "next/server";
import {
  getEvolutionConfig,
  getEvolutionWebhookUrl,
  getWhatsAppProvider,
} from "@/lib/whatsapp/evolution-config";
import { getEvolutionConnectionState } from "@/lib/whatsapp/evolution-client";
import { getPublicWebhookUrl, getWhatsAppConfig } from "@/lib/whatsapp/config";
import { isWhatsAppLiveConfigured } from "@/lib/whatsapp/client";
import { listWhatsAppConversations } from "@/lib/whatsapp/store";

export async function GET(request: Request) {
  const provider = getWhatsAppProvider();
  const meta = getWhatsAppConfig();
  const evolution = getEvolutionConfig();

  let evolutionState: string | undefined;
  if (provider === "evolution" && evolution.isConfigured) {
    const state = await getEvolutionConnectionState(evolution.instance);
    evolutionState =
      (state.ok ? state.data?.instance?.state : undefined) ??
      (state.ok ? state.data?.state : undefined) ??
      undefined;
  }

  const conversations =
    isWhatsAppLiveConfigured() ? await listWhatsAppConversations() : [];

  return NextResponse.json({
    provider,
    configured: isWhatsAppLiveConfigured(),
    displayPhone: meta.displayPhone || evolution.displayPhone,
    phoneNumberId: meta.phoneNumberId,
    webhookUrl:
      provider === "evolution"
        ? getEvolutionWebhookUrl(request)
        : getPublicWebhookUrl(request),
    evolution: {
      apiUrl: evolution.apiUrl,
      instance: evolution.instance,
      connectionState: evolutionState,
    },
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    conversationCount: conversations.length,
  });
}
